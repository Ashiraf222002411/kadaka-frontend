'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, setToken, clearToken, decodeToken, AuthUser } from '@/lib/auth';
import { auth as authApi } from '@/lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  requirePasswordChange: boolean;
  login: (email: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]                         = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading]               = useState(true);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const router = useRouter();

  // On mount, hydrate user from stored token
  useEffect(() => {
    const token = getToken();
    if (token) {
      const decoded = decodeToken(token);
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

    if (data.requirePasswordChange) {
      // Stay on the login page — the page component will show the change-password modal
      setRequirePasswordChange(true);
    } else {
      setRequirePasswordChange(false);
      router.push('/dashboard');
    }
  }, [router]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const data = await authApi.changePassword(currentPassword, newPassword);
    // Replace token with the fresh one (no longer has temporary flag in DB)
    setToken(data.token);
    const decoded = decodeToken(data.token);
    setUser(decoded);
    setRequirePasswordChange(false);
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setRequirePasswordChange(false);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, requirePasswordChange, login, changePassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
