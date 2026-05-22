import { api, request, getAccessToken } from './api-client';
import type { UserSettings } from './api-types';

export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

export function getSettings(): Promise<UserSettings> {
  return api.get<UserSettings>('/settings');
}

export function updateSettings(patch: DeepPartial<UserSettings>): Promise<UserSettings> {
  return api.patch<UserSettings>('/settings', patch);
}

export function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/auth/change-password', { currentPassword, newPassword });
}

export function changeEmail(newEmail: string, currentPassword: string): Promise<{ message: string }> {
  return api.patch<{ message: string }>('/auth/change-email', { newEmail, currentPassword });
}

export function deleteAccount(password: string): Promise<void> {
  return request<void>('/auth/account', { method: 'DELETE', body: { password } });
}

export async function exportData(): Promise<void> {
  const token = getAccessToken();
  const res = await fetch('/api/v1/settings/export', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Error descargando datos');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mis-datos-openmarket.zip';
  a.click();
  URL.revokeObjectURL(url);
}
