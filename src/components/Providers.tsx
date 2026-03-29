'use client';
import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { OrgProvider } from '@/contexts/OrgContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <OrgProvider>
        <SocketProvider>
          {children}
        </SocketProvider>
      </OrgProvider>
    </AuthProvider>
  );
}
