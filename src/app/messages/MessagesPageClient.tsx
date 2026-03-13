'use client';

import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  MessageSquare, Video, Phone, PhoneOff, PhoneIncoming,
  Mic, MicOff, VideoOff, Send, Loader2, Users,
  Search, ArrowLeft, Minimize2, Maximize2, RotateCcw, X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useWebRTC } from '@/hooks/useWebRTC';
import { messages as messagesApi, users as usersApi, ChatMessage } from '@/lib/api';
import { getInitials } from '@/lib/auth';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Colleague {
  id: string;
  full_name: string;
  email: string;
  role: string;
  latest_msg?: string;
  latest_at?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function roleBadge(role: string) {
  const map: Record<string, string> = {
    branch_manager: 'Manager',
    loan_officer:   'Loan Officer',
    accountant:     'Accountant',
  };
  return map[role] ?? role;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-UG', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Kampala',
  });
}

function fmtDay(iso: string) {
  const d   = new Date(iso);
  const now = new Date();
  const todayStr     = now.toDateString();
  const yesterdayStr = new Date(now.getTime() - 86_400_000).toDateString();
  if (d.toDateString() === todayStr)     return 'Today';
  if (d.toDateString() === yesterdayStr) return 'Yesterday';
  return d.toLocaleDateString('en-UG', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Kampala',
  });
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)       return 'now';
  if (diff < 3_600_000)    return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000)   return `${Math.floor(diff / 3_600_000)}h`;
  return new Date(iso).toLocaleDateString('en-UG', {
    day: 'numeric', month: 'short', timeZone: 'Africa/Kampala',
  });
}

function AvatarCircle({
  name, online, size = 'md',
}: {
  name: string; online?: boolean; size?: 'sm' | 'md' | 'lg';
}) {
  const sz = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' }[size];
  return (
    <div className="relative shrink-0">
      <div className={`${sz} rounded-full bg-green-600 flex items-center justify-center text-white font-bold`}>
        {getInitials(name)}
      </div>
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
          online ? 'bg-green-500' : 'bg-slate-300'
        }`} />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MessagesPageClient() {
  const { user }   = useAuth();
  const { socket, isConnected, onlineUserIds, unreadCounts, clearUnread, onMessage } = useSocket();

  const {
    callState, callParty,
    isMuted, isVideoOff, isFrontCamera, callDuration,
    localVideoRef, remoteVideoRef,
    startCall, acceptCall, rejectCall, hangUp,
    toggleMute, toggleVideo, flipCamera,
  } = useWebRTC(socket, user?.id ?? '');

  // ── Contact / search state ─────────────────────────────────────────────────
  const [recentContacts,  setRecentContacts]  = useState<Colleague[]>([]);
  const [searchResults,   setSearchResults]   = useState<Colleague[]>([]);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [isSearching,     setIsSearching]     = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // ── Chat state ─────────────────────────────────────────────────────────────
  const [selectedUser,  setSelectedUser]  = useState<Colleague | null>(null);
  const [msgs,          setMsgs]          = useState<ChatMessage[]>([]);
  const [input,         setInput]         = useState('');
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const [sending,       setSending]       = useState(false);
  const [showMobile,    setShowMobile]    = useState(false);

  // ── Call UI state ──────────────────────────────────────────────────────────
  const [isCallMinimized, setIsCallMinimized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  // ── Ringtone via Web Audio API ─────────────────────────────────────────────
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRingtone = useCallback(() => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }, []);

  const startRingtone = useCallback(() => {
    stopRingtone();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx() as AudioContext;
      audioCtxRef.current = ctx;

      const playRing = () => {
        try {
          const now = ctx.currentTime;
          // Two-tone ring: 480 Hz then 440 Hz
          ([ { freq: 480, t: 0, dur: 0.4 }, { freq: 440, t: 0.5, dur: 0.4 } ] as const).forEach(
            ({ freq, t, dur }) => {
              const osc  = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = freq;
              gain.gain.setValueAtTime(0,    now + t);
              gain.gain.linearRampToValueAtTime(0.25, now + t + 0.02);
              gain.gain.setValueAtTime(0.25, now + t + dur - 0.02);
              gain.gain.linearRampToValueAtTime(0, now + t + dur);
              osc.start(now + t);
              osc.stop(now + t + dur);
            },
          );
        } catch { /* ignore AudioContext errors mid-call */ }
      };

      playRing();
      ringIntervalRef.current = setInterval(playRing, 2200);
    } catch { /* ignore if AudioContext unavailable */ }
  }, [stopRingtone]);

  // Start/stop ringtone based on call state
  useEffect(() => {
    if (callState === 'incoming') {
      startRingtone();
    } else {
      stopRingtone();
    }
    return stopRingtone;
  }, [callState, startRingtone, stopRingtone]);

  // ── Load recent contacts ───────────────────────────────────────────────────
  const loadRecentContacts = useCallback(() => {
    setLoadingContacts(true);
    messagesApi.getRecentContacts()
      .then(res => setRecentContacts((res.data ?? []) as Colleague[]))
      .catch(() => {})
      .finally(() => setLoadingContacts(false));
  }, []);

  useEffect(() => { loadRecentContacts(); }, [loadRecentContacts]);

  // ── Debounced user search ─────────────────────────────────────────────────
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const t = setTimeout(() => {
      usersApi.search(q)
        .then(res => setSearchResults((res.data ?? []) as Colleague[]))
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Load conversation when user selected ──────────────────────────────────
  useEffect(() => {
    if (!selectedUser) { setMsgs([]); return; }
    setLoadingMsgs(true);
    messagesApi.getConversation(selectedUser.id)
      .then(res => setMsgs(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));

    messagesApi.markRead(selectedUser.id).catch(() => {});
    clearUnread(selectedUser.id);
  }, [selectedUser, clearUnread]);

  // ── Live message subscription ─────────────────────────────────────────────
  useEffect(() => {
    return onMessage((msg) => {
      const inConversation = selectedUser && (
        (msg.from_user_id === selectedUser.id && msg.to_user_id === user?.id) ||
        (msg.from_user_id === user?.id         && msg.to_user_id === selectedUser.id)
      );
      if (inConversation) {
        setMsgs(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.from_user_id === selectedUser!.id) {
          messagesApi.markRead(selectedUser!.id).catch(() => {});
          clearUnread(selectedUser!.id);
        }
      }
      // Refresh recent contacts so the sidebar stays up-to-date
      loadRecentContacts();
    });
  }, [onMessage, selectedUser, user?.id, clearUnread, loadRecentContacts]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const body = input.trim();
    if (!body || !selectedUser || !socket) return;
    setSending(true);
    socket.emit('chat:send', {
      to_user_id: selectedUser.id,
      body,
      client_id: crypto.randomUUID(),
    });
    setInput('');
    inputRef.current?.focus();
    setSending(false);
    // Reload recent contacts after a short delay so new contact appears
    setTimeout(loadRecentContacts, 600);
  }, [input, selectedUser, socket, loadRecentContacts]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Select colleague ──────────────────────────────────────────────────────
  const handleSelectUser = (colleague: Colleague) => {
    setSelectedUser(colleague);
    setShowMobile(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  // ── Start call ────────────────────────────────────────────────────────────
  const handleStartCall = (type: 'video' | 'audio') => {
    if (!selectedUser || !user) return;
    setIsCallMinimized(false);
    startCall({ userId: selectedUser.id, name: selectedUser.full_name, callType: type });
  };

  // ── Group messages by day ─────────────────────────────────────────────────
  const groupedMsgs: { day: string; items: ChatMessage[] }[] = [];
  for (const msg of msgs) {
    const day  = fmtDay(msg.created_at);
    const last = groupedMsgs[groupedMsgs.length - 1];
    if (last?.day === day) { last.items.push(msg); }
    else { groupedMsgs.push({ day, items: [msg] }); }
  }

  // ── Decide list to show ───────────────────────────────────────────────────
  const showSearch = searchQuery.trim().length >= 2;
  const listItems  = showSearch ? searchResults : recentContacts;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

      {/* ── Left: Contacts / Search panel ───────────────────────────────── */}
      <div className={`
        w-full lg:w-72 xl:w-80 shrink-0 border-r border-slate-200 flex flex-col
        ${showMobile && selectedUser ? 'hidden lg:flex' : 'flex'}
      `}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              Messages
            </h1>
            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              isConnected ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-slate-400'}`} />
              {isConnected ? 'Online' : 'Connecting…'}
            </span>
          </div>
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-8 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Section label */}
        <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-100">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {showSearch
              ? (isSearching ? 'Searching…' : `Results for "${searchQuery}"`)
              : 'Recent Conversations'}
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {(showSearch ? isSearching : loadingContacts) ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-green-600" />
            </div>
          ) : listItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 px-4 text-center">
              <Users className="w-10 h-10 mb-2 text-slate-200" />
              {showSearch ? (
                <p className="text-sm">No users found</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-500">No conversations yet</p>
                  <p className="text-xs mt-1">Search for a colleague above to start chatting</p>
                </>
              )}
            </div>
          ) : (
            listItems.map(colleague => {
              const isOnline = onlineUserIds.has(colleague.id);
              const unread   = unreadCounts[colleague.id] ?? 0;
              const isActive = selectedUser?.id === colleague.id;
              return (
                <button
                  key={colleague.id}
                  onClick={() => handleSelectUser(colleague)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-50 last:border-b-0 ${
                    isActive
                      ? 'bg-green-600 text-white'
                      : 'hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  <AvatarCircle name={colleague.full_name} online={isOnline} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                        {colleague.full_name}
                      </p>
                      {colleague.latest_at && !showSearch && (
                        <span className={`text-[10px] shrink-0 ${isActive ? 'text-green-100' : 'text-slate-400'}`}>
                          {fmtRelative(colleague.latest_at)}
                        </span>
                      )}
                    </div>
                    {colleague.latest_msg && !showSearch ? (
                      <p className={`text-xs truncate ${isActive ? 'text-green-100' : 'text-slate-500'}`}>
                        {colleague.latest_msg}
                      </p>
                    ) : (
                      <p className={`text-xs truncate ${isActive ? 'text-green-100' : 'text-slate-400'}`}>
                        {roleBadge(colleague.role)}
                        {isOnline && !isActive ? ' · Active now' : ''}
                      </p>
                    )}
                  </div>
                  {unread > 0 && !isActive && (
                    <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Chat panel ───────────────────────────────────────────── */}
      <div className={`
        flex-1 flex flex-col min-w-0
        ${showMobile && selectedUser ? 'flex' : 'hidden lg:flex'}
      `}>
        {!selectedUser ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-semibold text-slate-500">Select a colleague to chat</p>
            <p className="text-xs text-slate-400">Search by name or email to find anyone in the organisation</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
              <button
                onClick={() => { setShowMobile(false); setSelectedUser(null); }}
                className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <AvatarCircle name={selectedUser.full_name} online={onlineUserIds.has(selectedUser.id)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">{selectedUser.full_name}</p>
                <p className="text-xs text-slate-500">
                  {roleBadge(selectedUser.role)}
                  {onlineUserIds.has(selectedUser.id) ? ' · Active now' : ' · Offline'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleStartCall('audio')}
                  disabled={callState !== 'idle'}
                  title="Audio call"
                  className="p-2 rounded-xl text-slate-500 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleStartCall('video')}
                  disabled={callState !== 'idle'}
                  title="Video call"
                  className="p-2 rounded-xl text-slate-500 hover:text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
                >
                  <Video className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                </div>
              ) : msgs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <MessageSquare className="w-8 h-8 text-slate-300" />
                  <p className="text-sm">No messages yet. Say hello! 👋</p>
                </div>
              ) : (
                groupedMsgs.map(group => (
                  <div key={group.day}>
                    <div className="flex items-center gap-2 mb-3">
                      <hr className="flex-1 border-slate-200" />
                      <span className="text-[11px] text-slate-400 font-medium px-2">{group.day}</span>
                      <hr className="flex-1 border-slate-200" />
                    </div>
                    <div className="space-y-1.5">
                      {group.items.map(msg => {
                        const isMe = msg.from_user_id === user?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className="max-w-[70%]">
                              <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                isMe
                                  ? 'bg-green-600 text-white rounded-br-sm'
                                  : 'bg-white text-slate-900 border border-slate-200 rounded-bl-sm shadow-sm'
                              }`}>
                                {msg.body}
                              </div>
                              <p className={`text-[10px] mt-0.5 text-slate-400 ${isMe ? 'text-right' : 'text-left'}`}>
                                {fmtTime(msg.created_at)}
                                {isMe && (
                                  <span className="ml-1">{msg.is_read ? '✓✓' : '✓'}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="shrink-0 bg-white border-t border-slate-200 px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${selectedUser.full_name}…`}
                  rows={1}
                  className="flex-1 resize-none px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all max-h-32 overflow-y-auto leading-relaxed"
                  style={{ minHeight: '44px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="shrink-0 w-10 h-10 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 ml-1">
                Press Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Incoming call overlay ────────────────────────────────────────── */}
      {callState === 'incoming' && callParty && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-5 max-w-xs w-full">
            {/* Pulsing avatar */}
            <div className="relative">
              <AvatarCircle name={callParty.name} size="lg" />
              <span className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-50" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">{callParty.name}</p>
              <p className="text-sm text-slate-500 mt-1 flex items-center justify-center gap-1.5">
                {callParty.callType === 'video'
                  ? <><Video className="w-4 h-4" /> Incoming video call…</>
                  : <><Phone className="w-4 h-4" /> Incoming audio call…</>}
              </p>
            </div>
            <div className="flex gap-8">
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={rejectCall}
                  className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-colors"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
                <span className="text-xs text-slate-500">Decline</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={acceptCall}
                  className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center shadow-lg transition-colors"
                >
                  <PhoneIncoming className="w-6 h-6" />
                </button>
                <span className="text-xs text-slate-500">Accept</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Outgoing call overlay ────────────────────────────────────────── */}
      {callState === 'calling' && callParty && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-5 max-w-xs w-full">
            <AvatarCircle name={callParty.name} size="lg" />
            <div className="text-center">
              <p className="text-lg font-bold text-slate-900">{callParty.name}</p>
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Calling…
              </p>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={rejectCall}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-colors"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <span className="text-xs text-slate-500">Cancel</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Active call panel (PiP) ──────────────────────────────────────── */}
      {(callState === 'connecting' || callState === 'active') && callParty && (
        isCallMinimized ? (
          /* ── Minimised pill ── */
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={() => setIsCallMinimized(false)}
              className="flex items-center gap-2.5 bg-slate-900 text-white pl-3 pr-4 py-2.5 rounded-full shadow-xl border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              <div className="relative shrink-0">
                <AvatarCircle name={callParty.name} size="sm" />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 border border-slate-900" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold leading-none">{callParty.name}</p>
                <p className="text-[10px] text-green-400 mt-0.5 leading-none">
                  {callState === 'connecting' ? 'Connecting…' : callDuration}
                </p>
              </div>
              <Maximize2 className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>
          </div>
        ) : (
          /* ── Full call panel ── */
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 rounded-2xl shadow-2xl overflow-hidden w-72 border border-slate-700">

            {/* Video / Audio area */}
            {callParty.callType === 'video' ? (
              <div className="relative h-48 bg-slate-800">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {/* Local PiP */}
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute top-2 right-2 w-20 h-16 object-cover rounded-xl border-2 border-white shadow-lg"
                />
              </div>
            ) : (
              /* Audio-only: avatar + hidden audio element */
              <div className="h-28 bg-gradient-to-br from-green-700 to-green-900 flex flex-col items-center justify-center gap-2">
                <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
                <AvatarCircle name={callParty.name} size="lg" />
              </div>
            )}

            {/* Info + controls */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0 mr-2">
                  <p className="text-white text-sm font-semibold truncate">{callParty.name}</p>
                  <p className="text-slate-400 text-xs">
                    {callState === 'connecting' ? 'Connecting…' : callDuration}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    callParty.callType === 'video'
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-green-500/20 text-green-300'
                  }`}>
                    {callParty.callType === 'video' ? 'Video' : 'Audio'}
                  </span>
                  {/* Minimize button */}
                  <button
                    onClick={() => setIsCallMinimized(true)}
                    title="Minimize"
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Controls row */}
              <div className="flex items-center justify-center gap-3">
                {/* Mute */}
                <button
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute' : 'Mute'}
                  className={`p-2.5 rounded-full transition-colors ${
                    isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {callParty.callType === 'video' && (
                  <>
                    {/* Toggle camera on/off */}
                    <button
                      onClick={toggleVideo}
                      title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                      className={`p-2.5 rounded-full transition-colors ${
                        isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    </button>

                    {/* Flip camera (front ↔ rear) */}
                    <button
                      onClick={flipCamera}
                      title={isFrontCamera ? 'Switch to rear camera' : 'Switch to front camera'}
                      className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Hang up */}
                <button
                  onClick={hangUp}
                  title="Hang up"
                  className="p-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                >
                  <PhoneOff className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
