'use client';

import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  MessageSquare, Video, Phone, PhoneOff, PhoneIncoming,
  Mic, MicOff, VideoOff, Send, Loader2, Users,
  Search, MoreVertical, ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useWebRTC } from '@/hooks/useWebRTC';
import { messages as messagesApi, users as usersApi, ChatMessage } from '@/lib/api';
import { getInitials } from '@/lib/auth';

// ── Types ─────────────────────────────────────────────────────────────────────
interface BranchUser {
  id: string;
  full_name: string;
  role: string;
  email: string;
  is_active: boolean;
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
  const d = new Date(iso);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.setDate(now.getDate() - 1)).toDateString();
  if (d.toDateString() === today)     return 'Today';
  if (d.toDateString() === yesterday) return 'Yesterday';
  return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Kampala' });
}

function AvatarCircle({ name, online, size = 'md' }: { name: string; online?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const sz = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' }[size];
  return (
    <div className="relative shrink-0">
      <div className={`${sz} rounded-full bg-green-600 flex items-center justify-center text-white font-bold`}>
        {getInitials(name)}
      </div>
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-slate-300'}`} />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MessagesPageClient() {
  const { user } = useAuth();
  const { socket, isConnected, onlineUserIds, unreadCounts, clearUnread } = useSocket();

  const {
    callState, callParty, isMuted, isVideoOff, callDuration,
    localVideoRef, remoteVideoRef,
    startCall, acceptCall, rejectCall, hangUp, toggleMute, toggleVideo,
  } = useWebRTC(socket, user?.id ?? '');

  // ── State ─────────────────────────────────────────────────────────────────
  const [branchUsers, setBranchUsers] = useState<BranchUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<BranchUser | null>(null);
  const [msgs, setMsgs]         = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending]   = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [showMobile, setShowMobile] = useState(false); // mobile: show chat panel

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const { onMessage }  = useSocket();

  // ── Load branch users ─────────────────────────────────────────────────────
  useEffect(() => {
    usersApi.getAll().then(res => {
      const all = ((res as { data?: unknown[] }).data ?? []) as BranchUser[];
      // Exclude self
      setBranchUsers(all.filter(u => u.id !== user?.id && u.is_active !== false));
    }).catch(() => {});
  }, [user?.id]);

  // ── Load conversation when user selected ─────────────────────────────────
  useEffect(() => {
    if (!selectedUser) { setMsgs([]); return; }
    setLoadingMsgs(true);
    messagesApi.getConversation(selectedUser.id)
      .then(res => setMsgs(res.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));

    // Mark as read and clear unread badge
    messagesApi.markRead(selectedUser.id).catch(() => {});
    clearUnread(selectedUser.id);
  }, [selectedUser, clearUnread]);

  // ── Live message subscription ─────────────────────────────────────────────
  useEffect(() => {
    return onMessage((msg) => {
      // Only append if it belongs to the active conversation
      const inConversation = selectedUser && (
        (msg.from_user_id === selectedUser.id && msg.to_user_id === user?.id) ||
        (msg.from_user_id === user?.id         && msg.to_user_id === selectedUser.id)
      );
      if (inConversation) {
        setMsgs(prev => {
          // Dedup by id
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // If it's from them and we're viewing the convo, mark read immediately
        if (msg.from_user_id === selectedUser!.id) {
          messagesApi.markRead(selectedUser!.id).catch(() => {});
          clearUnread(selectedUser!.id);
        }
      }
    });
  }, [onMessage, selectedUser, user?.id, clearUnread]);

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const body = input.trim();
    if (!body || !selectedUser || !socket) return;
    setSending(true);
    const clientId = crypto.randomUUID();
    socket.emit('chat:send', {
      to_user_id: selectedUser.id,
      body,
      client_id: clientId,
    });
    setInput('');
    inputRef.current?.focus();
    setSending(false);
  }, [input, selectedUser, socket]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Group messages by day ─────────────────────────────────────────────────
  const groupedMsgs: { day: string; items: ChatMessage[] }[] = [];
  for (const msg of msgs) {
    const day = fmtDay(msg.created_at);
    const last = groupedMsgs[groupedMsgs.length - 1];
    if (last?.day === day) { last.items.push(msg); }
    else { groupedMsgs.push({ day, items: [msg] }); }
  }

  const filteredUsers = branchUsers.filter(u =>
    u.full_name.toLowerCase().includes(userSearch.toLowerCase()),
  );

  // ── Call overlay helpers ──────────────────────────────────────────────────
  const handleStartCall = (type: 'video' | 'audio') => {
    if (!selectedUser || !user) return;
    startCall({ userId: selectedUser.id, name: selectedUser.full_name, callType: type });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

      {/* ── Left: User list ─────────────────────────────────────────────── */}
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
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search colleagues…"
              className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Users className="w-10 h-10 mb-2 text-slate-200" />
              <p className="text-sm">No colleagues found</p>
            </div>
          ) : (
            filteredUsers.map(u => {
              const isOnline  = onlineUserIds.has(u.id);
              const unread    = unreadCounts[u.id] ?? 0;
              const isActive  = selectedUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => { setSelectedUser(u); setShowMobile(true); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-50 last:border-b-0 ${
                    isActive
                      ? 'bg-green-600 text-white'
                      : 'hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  <AvatarCircle name={u.full_name} online={isOnline} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                      {u.full_name}
                    </p>
                    <p className={`text-xs truncate ${isActive ? 'text-green-100' : 'text-slate-500'}`}>
                      {roleBadge(u.role)} {isOnline ? '· Active now' : ''}
                    </p>
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
            <p className="text-xs text-slate-400">Messages are private within your branch</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
              {/* Mobile back */}
              <button
                onClick={() => { setShowMobile(false); setSelectedUser(null); }}
                className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <AvatarCircle
                name={selectedUser.full_name}
                online={onlineUserIds.has(selectedUser.id)}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">{selectedUser.full_name}</p>
                <p className="text-xs text-slate-500">
                  {roleBadge(selectedUser.role)}
                  {onlineUserIds.has(selectedUser.id)
                    ? ' · Active now'
                    : ' · Offline'}
                </p>
              </div>

              {/* Call buttons */}
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
                    {/* Day separator */}
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
                            <div className={`max-w-[70%] group relative`}>
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
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-5 max-w-xs w-full animate-pulse-once">
            <AvatarCircle name={callParty.name} size="lg" />
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
              <p className="text-sm text-slate-500 mt-1">Calling…</p>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={rejectCall}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-colors"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <span className="text-xs text-slate-500">End</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Active call panel (PiP bottom-right) ────────────────────────── */}
      {(callState === 'connecting' || callState === 'active') && callParty && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 rounded-2xl shadow-2xl overflow-hidden w-72 border border-slate-700">
          {/* Remote video */}
          {callParty.callType === 'video' ? (
            <div className="relative h-48 bg-slate-800">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {/* Local video PiP */}
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute top-2 right-2 w-20 h-16 object-cover rounded-xl border-2 border-white shadow-lg"
              />
            </div>
          ) : (
            /* Audio-only UI */
            <div className="h-32 bg-gradient-to-br from-green-700 to-green-900 flex flex-col items-center justify-center gap-2">
              {/* Hidden audio element for remote stream */}
              <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
              <AvatarCircle name={callParty.name} size="lg" />
            </div>
          )}

          {/* Call info + controls */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white text-sm font-semibold truncate">{callParty.name}</p>
                <p className="text-slate-400 text-xs">
                  {callState === 'connecting' ? 'Connecting…' : callDuration}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                callParty.callType === 'video'
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'bg-green-500/20 text-green-300'
              }`}>
                {callParty.callType === 'video' ? 'Video' : 'Audio'}
              </span>
            </div>
            <div className="flex items-center justify-center gap-3">
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
                <button
                  onClick={toggleVideo}
                  title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                  className={`p-2.5 rounded-full transition-colors ${
                    isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                </button>
              )}
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
      )}
    </div>
  );
}
