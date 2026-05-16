import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import { getAccessToken, setAccessToken } from '../lib/api-client';
import { auth } from '../lib/firebase';
import { fetchFirebaseToken } from '../lib/chat-api';
import * as authApi from '../lib/auth-api';
import type { AuthResponse, LoginResponse, ProfileResponse, UserRole } from '../lib/api-types';

export type AccountKind = 'cliente' | 'empresa';

interface AuthState {
  token: string | null;
  profile: ProfileResponse | null;
  loading: boolean;
  /** Conveniencia derivada — sólo presente cuando hay sesión activa. */
  account: AccountKind | null;
  name: string;
}

interface AuthCtx extends AuthState {
  loginWithCredentials: (correo: string, contrasena: string) => Promise<LoginResponse>;
  registerAndLogin: (payload: authApi.RegisterPayload) => Promise<AuthResponse>;
  finishMfa: (tempToken: string, code: string) => Promise<AuthResponse>;
  loginGoogle: (idToken: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

function rolToAccount(rol: UserRole | undefined): AccountKind | null {
  if (rol === 'empresa') return 'empresa';
  if (rol === 'cliente') return 'cliente';
  return null;
}

function buildName(p: ProfileResponse | null): string {
  if (!p) return '';
  return `${p.nombre} ${p.apellidos}`.trim();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(!!getAccessToken());

  /** Best-effort: si falla, el chat no funciona pero la app continúa. */
  const signFirebaseIn = useCallback(() => {
    fetchFirebaseToken()
      .then((fbToken) => signInWithCustomToken(auth, fbToken))
      .then(() => { /* Firebase auth OK */ })
      .catch((err: unknown) => {
        console.warn('[Firebase Auth] signInWithCustomToken failed — chat will not work:', err);
      });
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const p = await authApi.fetchProfile();
      setProfile(p);
    } catch {
      setProfile(null);
      setAccessToken(null);
      setToken(null);
    }
  }, []);

  // Carga inicial: si había token en sessionStorage, cargar perfil y autenticar Firebase.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (token) {
        await refreshProfile();
        if (!cancelled) signFirebaseIn();
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adoptAuth = useCallback(async (res: AuthResponse) => {
    setToken(res.accessToken);
    await refreshProfile();
    signFirebaseIn();
  }, [refreshProfile, signFirebaseIn]);

  const loginWithCredentials = useCallback(async (correo: string, contrasena: string): Promise<LoginResponse> => {
    const res = await authApi.login({ correo, contrasena });
    if (!authApi.isMfaRequired(res)) await adoptAuth(res);
    return res;
  }, [adoptAuth]);

  const registerAndLogin = useCallback(async (payload: authApi.RegisterPayload) => {
    const res = await authApi.register(payload);
    await adoptAuth(res);
    return res;
  }, [adoptAuth]);

  const finishMfa = useCallback(async (tempToken: string, code: string) => {
    const res = await authApi.verifyMfa(tempToken, code);
    await adoptAuth(res);
    return res;
  }, [adoptAuth]);

  const loginGoogle = useCallback(async (idToken: string) => {
    const res = await authApi.loginWithGoogle(idToken);
    await adoptAuth(res);
    return res;
  }, [adoptAuth]);

  const logout = useCallback(async () => {
    await authApi.logout();
    setToken(null);
    setProfile(null);
    firebaseSignOut(auth).catch(() => {});
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    token,
    profile,
    loading,
    account: rolToAccount(profile?.rol),
    name: buildName(profile),
    loginWithCredentials,
    registerAndLogin,
    finishMfa,
    loginGoogle,
    logout,
    refreshProfile,
  }), [token, profile, loading, loginWithCredentials, registerAndLogin, finishMfa, loginGoogle, logout, refreshProfile]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth fuera de AuthProvider');
  return c;
}

/**
 * Adaptador para componentes existentes que esperaban el viejo `useAccount`.
 * Devuelve el rol y nombre derivados del perfil real autenticado.
 */
export function useAccount(): { account: AccountKind; name: string } {
  const { account, name } = useAuth();
  return { account: account ?? 'cliente', name: name || '—' };
}
