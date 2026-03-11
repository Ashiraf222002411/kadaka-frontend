'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight, Shield, BarChart3, CheckCircle, Loader2, AlertCircle, Lock, KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ── Forced password-change overlay ──────────────────────────────────────────
function ChangePasswordOverlay() {
  const { changePassword, user } = useAuth();
  const [currentPwd, setCurrentPwd]   = useState('');
  const [newPwd, setNewPwd]           = useState('');
  const [confirmPwd, setConfirmPwd]   = useState('');
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState('');

  const inputCls = 'w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 focus:bg-white';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) { setError('New passwords do not match.'); return; }
    if (newPwd.length < 6)    { setError('Password must be at least 6 characters.'); return; }
    if (newPwd === currentPwd){ setError('New password must be different from the current one.'); return; }
    setError('');
    setIsLoading(true);
    try {
      await changePassword(currentPwd, newPwd);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Icon + heading */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-4">
            <KeyRound className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">Set Your New Password</h2>
          <p className="text-sm text-gray-500 mt-1.5 max-w-xs">
            Welcome, <strong>{user?.full_name}</strong>! Your account uses a temporary password.
            Please create a private password to continue.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl mb-5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current (temporary) password */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Temporary Password (given by your manager)
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="Enter temporary password" required
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 focus:bg-white" />
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">New Password</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                placeholder="At least 6 characters" required className={inputCls} />
              <button type="button" onClick={() => setShowNew(!showNew)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm new password */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Repeat new password" required className={inputCls} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPwd && confirmPwd && newPwd !== confirmPwd && (
              <p className="text-xs text-red-500 mt-1 font-medium">Passwords do not match</p>
            )}
          </div>

          <button type="submit" disabled={isLoading || !currentPwd || !newPwd || !confirmPwd}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-green-600/25 mt-2">
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><CheckCircle className="w-4 h-4" /> Save Password &amp; Continue</>}
          </button>
        </form>

        <p className="text-[11px] text-gray-400 text-center mt-4">
          Your new password is private. Your manager will not be able to see it.
        </p>
      </div>
    </div>
  );
}

// ── Login page ───────────────────────────────────────────────────────────────
export default function SignInPage() {
  const { login, requirePasswordChange } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Email and password are required.'); return; }
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Forced password-change overlay — shown immediately after first login */}
      {requirePasswordChange && <ChangePasswordOverlay />}

      <div className="min-h-screen grid lg:grid-cols-2">
        {/* ── Left — Form ── */}
        <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14 xl:px-20 bg-white">
          <Link href="/" className="flex items-center gap-2.5 mb-10 w-fit">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg leading-none">K</span>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-gray-900">Kadaka</p>
              <p className="text-[10px] text-green-600 font-medium">Establishment Co.</p>
            </div>
          </Link>

          <div className="max-w-sm w-full">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-sm text-gray-500 mb-8">Sign in to your Kadaka account</p>

            {error && (
              <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl mb-6">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@kadaka.ug" required autoComplete="email"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700">Password</label>
                </div>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password" required autoComplete="current-password"
                    className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-green-600/25 mt-2">
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>
        </div>

        {/* ── Right — Branding ── */}
        <div className="hidden lg:flex flex-col justify-center p-12 bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 text-white relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="relative max-w-sm">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-8">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold mb-4 leading-tight">Managing loans has never been this simple</h2>
            <p className="text-green-100 leading-relaxed mb-10">
              Track members, process loans, record payments, and generate reports — all in real time on one secure platform.
            </p>
            <div className="space-y-4 mb-10">
              {[
                { icon: CheckCircle, text: 'Role-based access for your entire team' },
                { icon: BarChart3,   text: 'Real-time portfolio and cashbook reports' },
                { icon: Shield,      text: 'Secure JWT authentication' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm text-green-50">{text}</p>
                </div>
              ))}
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5">
              <p className="text-sm text-green-50 italic mb-3">
                &ldquo;The cashbook and loan tracking alone saved us 3 hours of daily reconciliation work.&rdquo;
              </p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center">
                  <span className="text-xs font-bold">NR</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Nakitaga Robert</p>
                  <p className="text-xs text-green-200">Loan Officer, Kadaka</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
