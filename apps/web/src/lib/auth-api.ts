import { api, setAccessToken } from './api-client';
import type {
  AuthResponse,
  LoginResponse,
  MfaRequiredResponse,
  ProfileResponse,
  UserRole,
} from './api-types';

export interface RegisterPayload {
  nombre: string;
  apellidos: string;
  correo: string;
  contrasena: string;
  rol: 'cliente' | 'empresa';
}

export interface LoginPayload {
  correo: string;
  contrasena: string;
}

export function isMfaRequired(r: LoginResponse): r is MfaRequiredResponse {
  return (r as MfaRequiredResponse).mfaRequired === true;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', payload, { anonymous: true });
  if (!isMfaRequired(res)) setAccessToken(res.accessToken);
  return res;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/register', payload, { anonymous: true });
  setAccessToken(res.accessToken);
  return res;
}

export async function verifyMfa(tempToken: string, code: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/mfa/verify', { tempToken, code }, { anonymous: true });
  setAccessToken(res.accessToken);
  return res;
}

export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/google', { idToken }, { anonymous: true });
  setAccessToken(res.accessToken);
  return res;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

export function fetchProfile(): Promise<ProfileResponse> {
  return api.get<ProfileResponse>('/settings/profile');
}

export type { ProfileResponse, UserRole };
