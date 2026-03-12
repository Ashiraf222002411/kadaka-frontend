'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, CreditCard,
  Banknote, BookOpen, BarChart3, FileText,
  Settings, LogOut, Menu, X, Bell,
  ChevronRight, Search, AlertCircle, UserCog, ClipboardList,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleLabel, getInitials } from '@/lib/auth';
import { dashboard } from '@/lib/api';

const NAV_MAIN = [
  { name: 'Dashboard', path: '/dashboard',  icon: LayoutDashboard },
  { name: 'Members',   path: '/members',    icon: Users },
  { name: 'Loans',     path: '/loans',      icon: CreditCard },
  { name: 'Payments',  path: '/payments',   icon: Banknote },
  { name: 'Cashbook',  path: '/cashbook',   icon: BookOpen },
  { name: 'Reports',   path: '/reports',    icon: BarChart3 },
];
const NAV_ADMIN = [
  { name: 'Users',       path: '/users',       icon: UserCog },
  { name: 'Audit Logs',  path: '/audit-logs',  icon: ClipboardList },
];
const NAV_SUPPORT = [
  { name: 'Documents', path: '/documents', icon: FileText },
  { name: 'Settings',  path: '#',          icon: Settings },
];

export default function DashboardNav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pending, setPending] = useState(0);
  const [overdue,  setOverdue]  = useState(0);

  const role      = user?.role ?? '';
  const userName  = user?.full_name ?? 'User';
  const initials  = getInitials(userName);
  const roleLabel = getRoleLabel(role);

  useEffect(() => {
    dashboard.getStats().then((s: any) => {
      setPending(s?.pendingApprovals ?? s?.pending_approvals ?? 0);
      setOverdue(s?.overdueLoans    ?? s?.overdue_loans     ?? 0);
    }).catch(() => {});
  }, []);

  const isActive = (path: string) =>
    pathname === path || (path !== '/dashboard' && path !== '#' && pathname.startsWith(path));

  const currentPage =
    [...NAV_MAIN, ...NAV_ADMIN, ...NAV_SUPPORT].find(n => isActive(n.path))?.name ?? 'Dashboard';

  function NavItem({ name, path, icon: Icon }: { name: string; path: string; icon: React.ElementType }) {
    const active = isActive(path);
    const loanBadge = name === 'Loans'    && pending > 0 ? pending : null;
    const payBadge  = name === 'Payments' && overdue  > 0 ? overdue  : null;
    return (
      <li>
        <Link
          href={path}
          onClick={() => setSidebarOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
            active
              ? 'bg-green-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
          <span className="flex-1 leading-none">{name}</span>
          {loanBadge != null && (
            <span className={`text-[10px] font-bold h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center ${active ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'}`}>
              {loanBadge}
            </span>
          )}
          {payBadge != null && (
            <span className={`text-[10px] font-bold h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center ${active ? 'bg-white/25 text-white' : 'bg-red-100 text-red-600'}`}>
              {payBadge}
            </span>
          )}
        </Link>
      </li>
    );
  }

  function SidebarContent() {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-100 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white font-bold text-base leading-none">K</span>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900">Kadaka</p>
              <p className="text-[10px] text-slate-400">Establishment Co.</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden ml-auto p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          <div>
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Main Menu
            </p>
            <ul className="space-y-0.5">
              {NAV_MAIN
                .filter(item => item.path !== '/cashbook' || role === 'branch_manager' || role === 'accountant')
                .map(item => <NavItem key={item.path} {...item} />)}
            </ul>
          </div>
          {role === 'branch_manager' && (
            <div>
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                Admin
              </p>
              <ul className="space-y-0.5">
                {NAV_ADMIN.map(item => <NavItem key={item.path} {...item} />)}
              </ul>
            </div>
          )}
          <div>
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Support
            </p>
            <ul className="space-y-0.5">
              {NAV_SUPPORT.map(item => <NavItem key={item.path} {...item} />)}
            </ul>
          </div>
        </nav>

        {/* Pending alert */}
        {role === 'branch_manager' && pending > 0 && (
          <div className="mx-3 mb-2 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-700">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {pending} loan{pending > 1 ? 's' : ''} awaiting approval
          </div>
        )}

        {/* User */}
        <div className="shrink-0 border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group cursor-default">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0 text-white text-xs font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate leading-tight">{userName}</p>
              <p className="text-xs text-green-600 font-medium truncate">{roleLabel}</p>
            </div>
            <button
              onClick={() => logout()}
              title="Sign out"
              className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:flex flex-col border-r border-slate-200 shadow-sm">
        <SidebarContent />
      </aside>

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      {sidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-50 w-72 flex-col border-r border-slate-200 shadow-2xl lg:hidden flex">
          <SidebarContent />
        </aside>
      )}

      {/* ── Top header bar ── */}
      <header className="fixed top-0 right-0 left-0 lg:left-64 z-30 h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 gap-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 -ml-1 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-slate-400 hidden sm:block font-medium">Kadaka</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:block" />
          <span className="font-semibold text-slate-900">{currentPage}</span>
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-64 focus-within:ring-2 focus-within:ring-green-500/20 focus-within:border-green-500 transition-all">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search anything…"
            className="text-sm bg-transparent outline-none flex-1 text-slate-700 placeholder-slate-400"
          />
        </div>

        {/* Bell */}
        <button className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5" />
          {(pending > 0 || overdue > 0) && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
          )}
        </button>

        {/* Mobile avatar */}
        <div className="lg:hidden w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initials}
        </div>
      </header>
    </>
  );
}
