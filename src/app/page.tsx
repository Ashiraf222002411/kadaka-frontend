'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Menu, X, Users, CreditCard, BookOpen,
  BarChart3, ChevronRight, Shield, CheckCircle2,
  Zap, Lock, TrendingUp,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Users,
    title: 'Member Registry',
    desc: 'Full KYC onboarding with group assignments, national ID verification, and business profiling built in.',
  },
  {
    icon: CreditCard,
    title: 'Loan Lifecycle',
    desc: 'End-to-end processing from application through approval, disbursement, and repayments with role-based access.',
  },
  {
    icon: BookOpen,
    title: 'Smart Cashbook',
    desc: 'Daily ledger that auto-records repayments and disbursements — no double entry, ever.',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    desc: 'Portfolio at risk, collection sheets, aging analysis, and member statements generated instantly.',
  },
];

const STEPS = [
  { n: '01', title: 'Register Members',   desc: 'Onboard clients with full KYC into lending groups.' },
  { n: '02', title: 'Apply for Loans',    desc: 'Loan officers capture applications with amount and purpose.' },
  { n: '03', title: 'Approve & Disburse', desc: 'Branch manager reviews, approves, and disburses. Cashbook auto-updates.' },
  { n: '04', title: 'Collect Daily',      desc: 'Record payments daily. Balances update automatically.' },
];

export default function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">

      {/* NAVBAR */}
      <header className={`fixed inset-x-0 top-0 z-50 h-16 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm' : 'bg-white/80 backdrop-blur-sm'}`}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="font-bold text-slate-900 text-sm">Quewola</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {[['Features', '#features'], ['How It Works', '#how-it-works'], ['About', '#about']].map(([label, href]) => (
              <a key={label} href={href} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors font-medium">{label}</a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors">Sign in</Link>
            <Link href="/login" className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-1 shadow-lg">
            {['Features', 'How It Works', 'About'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s/g, '-')}`} onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl">{item}</a>
            ))}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <Link href="/login" className="block text-center py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50">Sign in</Link>
              <Link href="/login" className="block text-center py-2.5 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700">Get Started</Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Built for microfinance in Uganda
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.05] mb-6">
            Lending, <span className="text-green-600">simplified</span><br />for your team.
          </h1>

          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Quewola is the complete digital lending platform — from member onboarding to daily collections and real-time financial reporting.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link href="/login" className="inline-flex items-center gap-2 px-7 py-3.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-green-200 transition-colors">
              Start managing loans <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#how-it-works" className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 hover:border-green-300 hover:bg-green-50 transition-colors">
              See how it works <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
            {([
              [CheckCircle2, 'Role-based access'],
              [Lock,         'Secure JWT auth'],
              [Zap,          'Real-time updates'],
              [Shield,       'Uganda-built'],
            ] as [React.ElementType, string][]).map(([Icon, text]) => (
              <span key={text} className="flex items-center gap-1.5">
                <Icon className="w-4 h-4 text-green-500" />
                {text}
              </span>
            ))}
          </div>
        </div>

        {/* App mockup */}
        <div className="mx-auto max-w-5xl mt-16">
          <div className="relative rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200/80 overflow-hidden bg-white ring-1 ring-slate-200/60">
            <div className="flex items-center gap-1.5 bg-slate-50 border-b border-slate-200 px-4 py-3">
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-amber-400/80" />
              <div className="w-3 h-3 rounded-full bg-green-400/80" />
              <div className="ml-4 flex-1 bg-slate-200 rounded-md h-5 max-w-xs" />
            </div>
            <div className="flex" style={{ height: 340 }}>
              <div className="w-44 border-r border-slate-100 bg-white p-3 hidden sm:flex flex-col gap-1">
                <div className="flex items-center gap-2 mb-3 px-2">
                  <div className="w-5 h-5 rounded-md bg-green-600 flex items-center justify-center shrink-0">
                    <span className="text-white text-[8px] font-bold">Q</span>
                  </div>
                  <span className="text-xs font-bold text-slate-800">Quewola</span>
                </div>
                {[['Dashboard', true], ['Members', false], ['Loans', false], ['Payments', false], ['Cashbook', false]].map(([label, active]) => (
                  <div key={label as string} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${active ? 'bg-green-600' : ''}`}>
                    <div className={`w-3 h-3 rounded ${active ? 'bg-white/30' : 'bg-slate-200'}`} />
                    <span className={`text-[10px] font-medium ${active ? 'text-white' : 'text-slate-500'}`}>{label as string}</span>
                  </div>
                ))}
              </div>
              <div className="flex-1 bg-slate-50 p-5 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="h-4 w-24 bg-slate-800 rounded-md mb-1.5" />
                    <div className="h-2.5 w-40 bg-slate-300 rounded" />
                  </div>
                  <div className="h-8 w-32 bg-green-600 rounded-xl" />
                </div>
                <div className="grid grid-cols-4 gap-2.5 mb-4">
                  {[['UGX 409K', 'Portfolio'], ['UGX 0', 'Collections'], ['1', 'Overdue'], ['6', 'Members']].map(([v, l]) => (
                    <div key={l} className="bg-white rounded-xl border border-slate-200 p-3">
                      <div className="text-[9px] text-slate-400 mb-1.5 uppercase tracking-wide">{l}</div>
                      <div className="text-[12px] font-bold text-slate-900">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50">
                    <div className="h-2.5 w-20 bg-slate-700 rounded" />
                  </div>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 border-b border-slate-50">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      </div>
                      <div className="flex-1">
                        <div className="h-2 w-28 bg-slate-200 rounded mb-1" />
                        <div className="h-1.5 w-16 bg-slate-100 rounded" />
                      </div>
                      <div className="h-5 w-16 bg-green-50 border border-green-200 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-green-600 py-14">
        <div className="mx-auto max-w-4xl px-4 grid grid-cols-2 sm:grid-cols-4 gap-10 text-center">
          {[['500+', 'Active Members'], ['UGX 50M+', 'Total Disbursed'], ['98%', 'Repayment Rate'], ['4', 'Districts Covered']].map(([value, label]) => (
            <div key={label}>
              <p className="text-3xl font-extrabold text-white">{value}</p>
              <p className="text-sm text-green-100 mt-1.5">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-4 sm:px-6 bg-slate-50">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-3">Platform</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">Everything your MFI needs</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">One platform covering the full lending lifecycle, purpose-built for Uganda's microfinance institutions.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-green-300 hover:shadow-md hover:shadow-green-50 transition-all duration-200 group">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 bg-green-50 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-green-600 transition-colors duration-200">
                    <Icon className="w-5 h-5 text-green-600 group-hover:text-white transition-colors duration-200" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 bg-white">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-3">Process</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">From registration to collection</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n}>
                <div className="w-12 h-12 rounded-2xl bg-green-600 text-white flex items-center justify-center text-sm font-bold mb-4 shadow-md shadow-green-200">{n}</div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 bg-slate-900">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm text-slate-300 mb-8">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Trusted by MFIs in Uganda
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">Ready to modernise your lending?</h2>
          <p className="text-slate-400 text-lg mb-10">Join institutions already using Quewola to manage their portfolios digitally.</p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-8 py-3.5 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-green-900/40">
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-white/5 py-8 px-4">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">K</span>
            </div>
            <span className="text-sm font-bold text-white">Quewola</span>
            <span className="text-slate-600 text-xs ml-2">© 2026 Quewola Platform</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Sign in</Link>
            <a href="mailto:info@quewola.com" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">info@quewola.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
