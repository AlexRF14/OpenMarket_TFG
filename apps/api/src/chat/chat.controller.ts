import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ReportChatDto } from './dto/report-chat.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Emite un Firebase Custom Token para el usuario autenticado.
   * El frontend llama este endpoint tras login y usa el token con
   * `signInWithCustomToken` para autenticar Firestore sin Google OAuth.
   * @returns `{ token: string }` — Firebase custom token (expira en 1h, la sesión Firebase persiste)
   */
  @Post('firebase-token')
  @ApiOperation({ summary: 'Emitir Firebase Custom Token para acceso a Firestore' })
  @ApiResponse({ status: 201, description: '{ token: string }' })
  async getFirebaseToken(@CurrentUser() user: CurrentUserPayload): Promise<{ token: string }> {
    const token = await this.chatService.issueFirebaseToken(user.id, user.rol);
    return { token };
  }

  /**
   * Crea sala de chat entre dos participantes.
   * Si ya existe para el mismo par + orderId, devuelve el existente.
   * El solicitante debe estar incluido en `participants`.
   */
  @Post()
  @ApiOperation({ summary: 'Crear sala de chat (B2C, B2B o C2C)' })
  @ApiResponse({ status: 201, description: 'Chat creado o existente devuelto' })
  @ApiResponse({ status: 403, description: 'El solicitante no está en la lista de participantes' })
  createChat(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateChatDto,
  ) {
    return this.chatService.createChat(dto, user.id);
  }

  /**
   * Lista todos los chats del usuario autenticado, ordenados por actividad reciente.
   */
  @Get()
  @ApiOperation({ summary: 'Listar chats del usuario autenticado' })
  getChats(@CurrentUser() user: CurrentUserPayload) {
    return this.chatService.getChatsForParticipant(user.id);
  }

  /**
   * Mensajes paginados de un chat (para carga inicial o paginación histórica).
   * El tiempo real lo gestiona el frontend directamente con onSnapshot().
   */
  @Get(':chatId/messages')
  @ApiOperation({ summary: 'Obtener mensajes históricos (paginados)' })
  @ApiParam({ name: 'chatId', description: 'ID del chat en Firestore' })
  @ApiQuery({ name: 'limit', required: false, description: 'Mensajes por página (default 50)' })
  getMessages(
    @Param('chatId') chatId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getMessages(chatId, user.id, limit);
  }

  /**
   * Envía mensaje desde el backend (mensajes de sistema, confirmaciones de pedido, etc.).
   * Los mensajes normales los escribe el frontend directamente en Firestore.
   * El senderId se extrae del JWT — el body solo necesita `text`.
   */
  @Post(':chatId/messages')
  @ApiOperation({ summary: 'Enviar mensaje (uso backend/sistema)' })
  @ApiParam({ name: 'chatId', description: 'ID del chat en Firestore' })
  sendMessage(
    @Param('chatId') chatId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(chatId, { text: dto.text, senderId: user.id });
  }

  /**
   * Marca mensajes no leídos (de otros) como leídos para el usuario autenticado.
   */
  @Post(':chatId/read')
  @ApiOperation({ summary: 'Marcar mensajes como leídos' })
  @ApiParam({ name: 'chatId', description: 'ID del chat en Firestore' })
  markAsRead(
    @Param('chatId') chatId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.chatService.markAsRead(chatId, user.id);
  }

  /**
   * Denuncia una sala de chat.
   * TODO: persistir en BD y notificar al equipo de moderación.
   */
  @Post(':chatId/report')
  @HttpCode(201)
  @ApiOperation({ summary: 'Denunciar chat a moderación' })
  @ApiParam({ name: 'chatId' })
  @ApiResponse({ status: 201, description: 'Denuncia recibida' })
  @ApiResponse({ status: 403, description: 'No eres participante' })
  async reportChat(
    @Param('chatId') chatId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ReportChatDto,
  ): Promise<void> {
    await this.chatService.reportChat(chatId, user.id, dto.reason);
  }

  /**
   * Bloquea al otro participante del chat (sin recibir sus mensajes).
   * TODO: persistir en BD y hacer cumplir server-side.
   */
  @Post(':chatId/block')
  @HttpCode(200)
  @ApiOperation({ summary: 'Bloquear al otro participante' })
  @ApiParam({ name: 'chatId' })
  @ApiResponse({ status: 200 })
  async blockUser(
    @Param('chatId') chatId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<void> {
    await this.chatService.blockUser(chatId, user.id);
  }

  /**
   * Desbloquea al otro participante.
   */
  @Delete(':chatId/block')
  @HttpCode(200)
  @ApiOperation({ summary: 'Desbloquear al otro participante' })
  @ApiParam({ name: 'chatId' })
  @ApiResponse({ status: 200 })
  async unblockUser(
    @Param('chatId') chatId: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<void> {
    await this.chatService.unblockUser(chatId, user.id);
  }
}
