'use client';

import React, {
  createContext, useContext, useEffect, useRef,
  useState, useCallback,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getToken } from '@/lib/auth';
import { messages as messagesApi, ChatMessage } from '@/lib/api';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://kadaka-backend-production.up.railway.app';

// ── Types ─────────────────────────────────────────────────────────────────────
interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  onlineUserIds: Set<string>;
  unreadCounts: Record<string, number>;
  totalUnread: number;
  clearUnread: (userId: string) => void;
  onMessage: (cb: (msg: ChatMessage) => void) => () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // ── Use STATE (not ref) so consumers re-render when socket connects ────────
  const [socket, setSocket]             = useState<Socket | null>(null);
  const [isConnected, setIsConnected]   = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [unreadCounts,  setUnreadCounts]  = useState<Record<string, number>>({});

  // Listener callbacks — MessagesPageClient registers here
  const msgListeners = useRef<Set<(msg: ChatMessage) => void>>(new Set());

  const onMessage = useCallback((cb: (msg: ChatMessage) => void) => {
    msgListeners.current.add(cb);
    return () => { msgListeners.current.delete(cb); };
  }, []);

  // ── Load initial unread counts from REST ────────────────────────────────
  useEffect(() => {
    if (!user) return;
    messagesApi.getUnreadCounts().then(counts => setUnreadCounts(counts)).catch(() => {});
  }, [user]);

  // ── Connect socket ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) return;

    const sock = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    // Expose via state so all consumers get the real socket instance
    setSocket(sock);
    sock.on('connect',    () => setIsConnected(true));
    sock.on('disconnect', () => setIsConnected(false));

    sock.on('users:online', (ids: string[]) => setOnlineUserIds(new Set(ids)));

    sock.on('chat:message', (msg: ChatMessage) => {
      // Notify page-level listeners
      msgListeners.current.forEach(cb => cb(msg));
      // Increment unread for incoming messages not from self
      if (msg.to_user_id === user.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [msg.from_user_id]: (prev[msg.from_user_id] ?? 0) + 1,
        }));
      }
    });

    return () => {
      sock.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [user]);

  const clearUnread = useCallback((userId: string) => {
    setUnreadCounts(prev => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      onlineUserIds,
      unreadCounts,
      totalUnread,
      clearUnread,
      onMessage,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside <SocketProvider>');
  return ctx;
}
