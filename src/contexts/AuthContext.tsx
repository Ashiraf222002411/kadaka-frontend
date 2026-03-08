'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, setToken, clearToken, decodeToken, AuthUser } from '@/lib/auth';
import { auth as authApi } from '@/lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // On mount, hydrate user from stored token
  useEffect(() => {
    const token = getToken();
    if (token) {
      const decoded = decodeToken(token);
      // Check if token is expired
      if (decoded && decoded.exp && decoded.exp * 1000 > Date.now()) {
        setUser(decoded);
      } else {
        clearToken();
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setToken(data.token);
    const decoded = decodeToken(data.token);
    setUser(decoded);
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
