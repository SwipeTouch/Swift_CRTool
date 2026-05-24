export const NOTIFICATIONS_CHANGED_EVENT = 'crms:notifications-changed';
const TOKEN_KEY = 'crms_token';
export const UNAUTHORIZED_EVENT = 'crms:unauthorized';

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function clearAuthStorage() {
  setStoredToken(null);
  sessionStorage.removeItem('crms_session');
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
  }
}

export interface ApiFetchOptions {
  auth?: boolean;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  options: ApiFetchOptions = {},
): Promise<T> {
  const useAuth = options.auth !== false;
  const token = getStoredToken();
  const headers = new Headers(init.headers);

  if (useAuth) {
    if (!token) {
      clearAuthStorage();
      throw new ApiError('Not signed in. Please log in again.', 401);
    }
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`/api${path}`, { ...init, headers });
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    const msg =
      typeof body === 'object' && body && 'error' in body
        ? String((body as { error: string }).error)
        : res.statusText;

    if (res.status === 401 && useAuth) {
      clearAuthStorage();
      throw new ApiError('Session expired. Please sign in again.', 401, body);
    }

    throw new ApiError(msg, res.status, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
