import { api } from './api-client';

/**
 * Solicita un Firebase Custom Token al backend.
 * El backend emite el token usando el user.id de PostgreSQL como uid,
 * que coincide con los `participants` almacenados en Firestore.
 * @returns Firebase custom token — usar con `signInWithCustomToken(auth, token)`
 */
export async function fetchFirebaseToken(): Promise<string> {
  const res = await api.post<{ token: string }>('/chats/firebase-token', {});
  return res.token;
}

export interface UserLookup {
  id: string;
  nombre: string;
  apellidos: string;
  rol: string;
}

/**
 * Busca un usuario por correo para iniciar un chat.
 * @returns Datos públicos del usuario o null si no existe
 */
export async function lookupUserByEmail(correo: string): Promise<UserLookup | null> {
  try {
    return await api.get<UserLookup>(`/usuarios/buscar?correo=${encodeURIComponent(correo)}`);
  } catch {
    return null;
  }
}

interface CreateChatPayload {
  participants: string[];
  participantDetails: Record<string, { name: string; type: 'user' | 'company' }>;
  orderId?: string;
}

/**
 * Crea una sala de chat entre dos participantes.
 * Si ya existe para el mismo par, devuelve el existente.
 */
export async function createChat(payload: CreateChatPayload): Promise<{ id: string }> {
  return api.post<{ id: string }>('/chats', payload);
}

/** Envía una denuncia sobre el chat al equipo de moderación. */
export async function reportChat(chatId: string, reason: string): Promise<void> {
  await api.post(`/chats/${chatId}/report`, { reason });
}

/** Bloquea al otro participante (client-side + registra en backend). */
export async function blockUser(chatId: string): Promise<void> {
  await api.post(`/chats/${chatId}/block`, {});
}

/** Desbloquea al otro participante. */
export async function unblockUser(chatId: string): Promise<void> {
  await api.delete(`/chats/${chatId}/block`);
}
