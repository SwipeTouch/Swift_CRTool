import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch, getStoredToken, setStoredToken, UNAUTHORIZED_EVENT } from '@/shared/api/client';
import type { AppRole } from './permissions';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  organizationId: string | null;
  organizationName: string | null;
  organizationCode: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, organizationCode?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_KEY = 'crms_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      const parsed = raw ? (JSON.parse(raw) as AuthUser) : null;
      if (parsed && !getStoredToken()) return null;
      return parsed;
    } catch {
      return null;
    }
  });

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setStoredToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [logout]);

  useEffect(() => {
    if (!user || !getStoredToken()) return;
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((res) => setUser(res.user))
      .catch(() => logout());
  }, [user?.id, logout]);

  const login = useCallback(async (email: string, password: string, organizationCode?: string) => {
    const res = await apiFetch<{
      token: string;
      user: AuthUser;
    }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          ...(organizationCode ? { organizationCode } : {}),
        }),
      },
      { auth: false },
    );

    setStoredToken(res.token);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(res.user));
    setUser(res.user);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, login, logout }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
