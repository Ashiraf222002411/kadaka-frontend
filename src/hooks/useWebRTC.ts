'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { Socket } from 'socket.io-client';

// ── Types ─────────────────────────────────────────────────────────────────────
export type CallState =
  | 'idle'
  | 'calling'      // we invited, waiting for them to accept
  | 'incoming'     // they invited us, showing overlay
  | 'connecting'   // SDP exchanged, ICE in progress
  | 'active'       // media flowing
  | 'ended';

export interface CallParty {
  userId:   string;
  name:     string;
  callType: 'video' | 'audio';
}

// ── Free STUN servers (Google) ────────────────────────────────────────────────
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useWebRTC(socket: Socket | null, myUserId: string) {
  const [callState,  setCallState]  = useState<CallState>('idle');
  const [callParty,  setCallParty]  = useState<CallParty | null>(null);
  const [isMuted,    setIsMuted]    = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);

  // DOM refs for video elements — set by the page component
  const localVideoRef  = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;

    if (localVideoRef.current)  localVideoRef.current.srcObject  = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setCallState('idle');
    setCallParty(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setCallDuration(0);
  }, []);

  // ── Acquire media ─────────────────────────────────────────────────────────
  const getMedia = useCallback(async (callType: 'video' | 'audio', front = true) => {
    // Use 'ideal' not 'exact' so it falls back gracefully on devices with only one camera
    const videoConstraint = callType === 'video'
      ? { facingMode: { ideal: front ? 'user' : 'environment' } }
      : false;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: videoConstraint,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }, []);

  // ── Build RTCPeerConnection ────────────────────────────────────────────────
  const createPc = useCallback((targetId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // Send ICE candidates via Socket.IO
    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit('call:ice', { to: targetId, candidate: e.candidate });
      }
    };

    // Show remote stream
    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState('active');
        // Start call duration timer
        timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
      }
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        cleanup();
      }
    };

    return pc;
  }, [socket, cleanup]);

  // ── Public API: start a call ───────────────────────────────────────────────
  const startCall = useCallback(async (party: CallParty) => {
    if (!socket || callState !== 'idle') return;
    setCallState('calling');
    setCallParty(party);
    socket.emit('call:invite', {
      to: party.userId,
      callType: party.callType,
      callerName: party.name,
    });
  }, [socket, callState]);

  // ── Public API: accept incoming call ──────────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!socket || !callParty) return;
    setCallState('connecting');
    socket.emit('call:accept', { to: callParty.userId, callType: callParty.callType });

    const stream = await getMedia(callParty.callType, isFrontCamera).catch(() => null);
    if (!stream) { cleanup(); return; }

    const pc = createPc(callParty.userId);
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    // The caller will now send us an offer (triggered by our call:accept)
  }, [socket, callParty, getMedia, createPc, cleanup, isFrontCamera]);

  // ── Public API: reject / hang up ──────────────────────────────────────────
  const rejectCall = useCallback(() => {
    if (!socket || !callParty) return;
    socket.emit('call:reject', { to: callParty.userId });
    cleanup();
  }, [socket, callParty, cleanup]);

  const hangUp = useCallback(() => {
    if (!socket || !callParty) return;
    socket.emit('call:end', { to: callParty.userId });
    cleanup();
  }, [socket, callParty, cleanup]);

  // ── Public API: mute / video / camera flip ────────────────────────────────
  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(v => !v);
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = isVideoOff; });
    setIsVideoOff(v => !v);
  }, [isVideoOff]);

  const flipCamera = useCallback(async () => {
    if (!callParty || callParty.callType !== 'video' || !pcRef.current) return;
    const newFront = !isFrontCamera;
    setIsFrontCamera(newFront);

    // Stop existing video track
    localStreamRef.current?.getVideoTracks().forEach(t => t.stop());

    // Get new stream with flipped camera
    const newStream = await getMedia('video', newFront).catch(() => null);
    if (!newStream) return;

    // Replace video track in the peer connection
    const [newVideoTrack] = newStream.getVideoTracks();
    if (newVideoTrack) {
      const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(newVideoTrack);
    }
  }, [callParty, isFrontCamera, getMedia]);

  // ── Socket event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Incoming call invite
    const onInvite = (data: { from: string; to?: string; callType: 'video' | 'audio'; callerName: string }) => {
      if (data.to && data.to !== myUserId) return; // not for us (broadcast-based filtering)
      if (callState !== 'idle') {
        // Busy — auto-reject
        socket.emit('call:reject', { to: data.from });
        return;
      }
      setCallParty({ userId: data.from, name: data.callerName, callType: data.callType });
      setCallState('incoming');
    };

    // Recipient accepted — we (caller) create and send an offer
    const onAccept = async (data: { from: string; callType: 'video' | 'audio'; to: string }) => {
      if (data.to !== myUserId) return;
      setCallState('connecting');

      const stream = await getMedia(data.callType, isFrontCamera).catch(() => null);
      if (!stream) { cleanup(); return; }

      const pc = createPc(data.from);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call:offer', { to: data.from, sdp: offer });
    };

    // We received an offer (answerer side)
    const onOffer = async (data: { from: string; sdp: RTCSessionDescriptionInit; to: string }) => {
      if (data.to !== myUserId || !pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit('call:answer', { to: data.from, sdp: answer });
    };

    // We received an answer (offerer side)
    const onAnswer = async (data: { from: string; sdp: RTCSessionDescriptionInit; to: string }) => {
      if (data.to !== myUserId || !pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
    };

    // ICE candidate from the other side
    const onIce = async (data: { from: string; candidate: RTCIceCandidateInit; to: string }) => {
      if (data.to !== myUserId || !pcRef.current) return;
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch {}
    };

    // Call rejected
    const onReject = (data: { from: string; to: string }) => {
      if (data.to !== myUserId) return;
      cleanup();
    };

    // Call ended by other party
    const onEnd = (data: { from: string; to: string }) => {
      if (data.to !== myUserId) return;
      cleanup();
    };

    socket.on('call:invite',  onInvite);
    socket.on('call:accept',  onAccept);
    socket.on('call:offer',   onOffer);
    socket.on('call:answer',  onAnswer);
    socket.on('call:ice',     onIce);
    socket.on('call:reject',  onReject);
    socket.on('call:end',     onEnd);

    return () => {
      socket.off('call:invite',  onInvite);
      socket.off('call:accept',  onAccept);
      socket.off('call:offer',   onOffer);
      socket.off('call:answer',  onAnswer);
      socket.off('call:ice',     onIce);
      socket.off('call:reject',  onReject);
      socket.off('call:end',     onEnd);
    };
  }, [socket, myUserId, callState, isFrontCamera, getMedia, createPc, cleanup]);

  // ── Duration formatter ────────────────────────────────────────────────────
  const fmtDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return {
    callState,
    callParty,
    isMuted,
    isVideoOff,
    isFrontCamera,
    callDuration: fmtDuration(callDuration),
    localVideoRef,
    remoteVideoRef,
    startCall,
    acceptCall,
    rejectCall,
    hangUp,
    toggleMute,
    toggleVideo,
    flipCamera,
  };
}
