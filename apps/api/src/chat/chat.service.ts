import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { FirebaseAdminService } from './firebase-admin.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import * as admin from 'firebase-admin';

export interface ChatRoom {
  id: string;
  participants: string[];
  participantDetails: Record<string, { name: string; photoUrl?: string; type: string }>;
  orderId?: string;
  createdAt: admin.firestore.Timestamp;
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: admin.firestore.Timestamp;
  };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: admin.firestore.Timestamp;
  read: boolean;
}

/**
 * Gestiona salas de chat y mensajes en Firestore.
 * Soporta B2C, B2B y C2C — cualquier combinación de userId/companyId.
 *
 * Separación importante:
 * - Firestore: mensajes y salas de chat (tiempo real)
 * - PostgreSQL: datos de usuarios, empresas, pedidos (fuente de verdad)
 *
 * TODO: al crear un chat, validar que los participantes existen en PostgreSQL
 *       llamando a UsersService / CompaniesService
 * TODO: integrar notificaciones push cuando se reciba un mensaje nuevo
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly firebase: FirebaseAdminService) {}

  private get db(): admin.firestore.Firestore {
    return this.firebase.firestore;
  }

  /**
   * Crea una sala de chat entre dos participantes.
   * Si ya existe un chat entre esos participantes (con el mismo orderId), lo devuelve.
   * @param dto Datos del chat a crear
   * @returns Sala de chat creada o existente
   */
  async createChat(dto: CreateChatDto, requesterUserId: string): Promise<ChatRoom> {
    if (!dto.participants.includes(requesterUserId)) {
      throw new ForbiddenException('El solicitante debe ser uno de los participantes');
    }
    const sortedParticipants = [...dto.participants].sort();

    // Evitar chats duplicados entre los mismos participantes para el mismo pedido
    const existing = await this.db
      .collection('chats')
      .where('participants', '==', sortedParticipants)
      .where('orderId', '==', dto.orderId ?? null)
      .limit(1)
      .get();

    if (!existing.empty) {
      const doc = existing.docs[0];
      return { id: doc.id, ...doc.data() } as ChatRoom;
    }

    const chatData: Omit<ChatRoom, 'id'> = {
      participants: sortedParticipants,
      participantDetails: dto.participantDetails,
      ...(dto.orderId !== undefined && { orderId: dto.orderId }),
      createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
    };

    const ref = await this.db.collection('chats').add(chatData);
    this.logger.log(`Chat creado: ${ref.id} entre ${sortedParticipants.join(' ↔ ')}`);

    return { id: ref.id, ...chatData };
  }

  /**
   * Devuelve todos los chats en los que participa un usuario/empresa.
   * @param participantId userId o companyId de PostgreSQL
   */
  async getChatsForParticipant(participantId: string): Promise<ChatRoom[]> {
    const snapshot = await this.db
      .collection('chats')
      .where('participants', 'array-contains', participantId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ChatRoom));
  }

  /**
   * Devuelve los mensajes de un chat (paginados).
   * @param chatId ID del chat en Firestore
   * @param participantId Quien solicita — debe ser participante
   * @param limit Número de mensajes (default 50)
   * @param before Timestamp para paginación — mensajes anteriores a este
   */
  async getMessages(
    chatId: string,
    participantId: string,
    limit = 50,
    before?: admin.firestore.Timestamp,
  ): Promise<ChatMessage[]> {
    await this.assertParticipant(chatId, participantId);

    let query = this.db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (before) {
      query = query.startAfter(before);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ChatMessage));
  }

  /**
   * Envía un mensaje en nombre del backend (ej: mensajes automáticos de sistema).
   * Los mensajes normales los envía el frontend directamente a Firestore.
   * @param chatId ID del chat
   * @param dto Datos del mensaje
   */
  async sendMessage(chatId: string, dto: SendMessageDto): Promise<ChatMessage> {
    await this.assertParticipant(chatId, dto.senderId);

    const messageData: Omit<ChatMessage, 'id'> = {
      senderId: dto.senderId,
      text: dto.text,
      createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      read: false,
    };

    const ref = await this.db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .add(messageData);

    // Actualizar lastMessage en la sala para facilitar listado
    await this.db.collection('chats').doc(chatId).update({
      lastMessage: {
        text: dto.text,
        senderId: dto.senderId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });

    return { id: ref.id, ...messageData };
  }

  /**
   * Marca todos los mensajes no leídos de un participante como leídos.
   * TODO: implementar cuando se requiera indicador "leído/no leído" en UI
   */
  async markAsRead(chatId: string, participantId: string): Promise<void> {
    await this.assertParticipant(chatId, participantId);

    const unread = await this.db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .where('read', '==', false)
      .where('senderId', '!=', participantId)
      .get();

    const batch = this.db.batch();
    unread.docs.forEach((doc) => batch.update(doc.ref, { read: true }));
    await batch.commit();
  }

  /**
   * Emite un Firebase Custom Token usando el user.id de PostgreSQL como uid.
   * Esto permite que el frontend autentique Firestore sin depender de Google OAuth.
   * @param userId PostgreSQL user.id (se convierte en Firebase uid)
   * @param role Rol del usuario (se incluye como claim no sensible)
   */
  async issueFirebaseToken(userId: string, role: string): Promise<string> {
    return this.firebase.createCustomToken(userId, { role });
  }

  /**
   * Registra una denuncia sobre el chat.
   * TODO: persistir en BD y notificar al equipo de moderación por correo.
   * @param chatId Chat denunciado
   * @param reporterId Usuario que denuncia (debe ser participante)
   * @param reason Motivo de la denuncia
   */
  async reportChat(chatId: string, reporterId: string, reason: string): Promise<void> {
    await this.assertParticipant(chatId, reporterId);
    this.logger.warn(`[REPORT] chat=${chatId} reporter=${reporterId} reason="${reason}"`);
  }

  /**
   * Registra el bloqueo del otro participante del chat.
   * TODO: persistir en BD y filtrar mensajes server-side.
   * @param chatId Chat en el que se bloquea
   * @param blockerId Usuario que bloquea (debe ser participante)
   */
  async blockUser(chatId: string, blockerId: string): Promise<void> {
    await this.assertParticipant(chatId, blockerId);
    this.logger.log(`[BLOCK] chat=${chatId} blocker=${blockerId}`);
  }

  /**
   * Deshace el bloqueo del otro participante.
   * TODO: eliminar registro de BD cuando se implemente persistencia.
   */
  async unblockUser(chatId: string, unblockerId: string): Promise<void> {
    await this.assertParticipant(chatId, unblockerId);
    this.logger.log(`[UNBLOCK] chat=${chatId} unblocker=${unblockerId}`);
  }

  /** Verifica que participantId pertenece al chat. Lanza ForbiddenException si no. */
  private async assertParticipant(chatId: string, participantId: string): Promise<void> {
    const chatDoc = await this.db.collection('chats').doc(chatId).get();

    if (!chatDoc.exists) {
      throw new NotFoundException(`Chat ${chatId} no encontrado`);
    }

    const { participants } = chatDoc.data() as ChatRoom;
    if (!participants.includes(participantId)) {
      throw new ForbiddenException('No eres participante de este chat');
    }
  }
}
