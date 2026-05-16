import type { ApiError } from './api-types';

const BASE_URL = '/api/v1';
const ACCESS_TOKEN_KEY = 'om.accessToken';

let accessToken: string | null = sessionStorage.getItem(ACCESS_TOKEN_KEY);
let refreshInflight: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  else sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiException extends Error {
  constructor(
    public status: number,
    public payload: ApiError,
  ) {
    const msg = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
    super(msg ?? `HTTP ${status}`);
  }
}

interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  headers?: Record<string, string>;
  /** Si es true, no añade Authorization header. */
  anonymous?: boolean;
}

async function rawRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers ?? {}),
  };
  if (!opts.anonymous && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: 'include',
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiException(res.status, (data ?? { statusCode: res.status, message: res.statusText }) as ApiError);
  }
  return data as T;
}

async function tryRefresh(): Promise<string | null> {
  if (refreshInflight) return refreshInflight;
  refreshInflight = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { accessToken: string };
      setAccessToken(data.accessToken);
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshInflight = null;
    }
  })();
  return refreshInflight;
}

/**
 * Petición con auto-refresh: si el access token caduca (401), intenta una vez
 * renovarlo via /auth/refresh y reintentar la petición original.
 */
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, opts);
  } catch (err) {
    if (err instanceof ApiException && err.status === 401 && !opts.anonymous) {
      const fresh = await tryRefresh();
      if (fresh) return rawRequest<T>(path, opts);
      setAccessToken(null);
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};
