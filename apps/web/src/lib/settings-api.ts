import { api } from './api-client';
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
