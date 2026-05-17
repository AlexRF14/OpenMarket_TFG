import { api } from './api-client';

export interface NotificacionDto {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

/** Últimas 50 notificaciones del usuario autenticado. */
export function getNotifications(): Promise<NotificacionDto[]> {
  return api.get<NotificacionDto[]>('/notificaciones');
}

/** Marca todas las notificaciones como leídas. */
export function markAllNotificationsRead(): Promise<void> {
  return api.patch('/notificaciones/read-all', {});
}
