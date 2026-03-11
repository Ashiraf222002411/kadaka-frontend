'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight, Shield, BarChart3, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function SignInPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
                <a href="#" className="text-xs text-green-600 hover:text-green-700 font-medium">Forgot password?</a>
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
              { icon: BarChart3, text: 'Real-time portfolio and cashbook reports' },
              { icon: Shield, text: 'Secure JWT authentication' },
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
  );
}
