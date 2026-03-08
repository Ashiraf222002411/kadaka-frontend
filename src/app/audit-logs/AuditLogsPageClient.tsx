'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, RefreshCw, AlertCircle, ChevronLeft, ChevronRight,
  LogIn, UserPlus, UserCog, CreditCard, Banknote, Send, KeyRound, Shield } from 'lucide-react';
import { auditLogs } from '@/lib/api';

type AuditLog = {
  id: string; user_name: string; user_role: string; action: string;
  entity_type: string | null; entity_id: string | null;
  description: string; ip_address: string | null; created_at: string;
};

const ACTION_META: Record<string, { label: string; icon: React.FC<{ className?: string }>; color: string; bg: string }> = {
  LOGIN:            { label: 'Login',            icon: LogIn,      color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
  USER_CREATED:     { label: 'User Created',     icon: UserPlus,   color: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
  USER_UPDATED:     { label: 'User Updated',     icon: UserCog,    color: 'text-slate-600',  bg: 'bg-slate-50 border-slate-200' },
  USER_ACTIVATED:   { label: 'User Activated',   icon: UserCog,    color: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
  USER_DEACTIVATED: { label: 'User Deactivated', icon: UserCog,    color: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
  PASSWORD_RESET:   { label: 'Password Reset',   icon: KeyRound,   color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
  LOAN_CREATED:     { label: 'Loan Applied',     icon: CreditCard, color: 'text-slate-600',  bg: 'bg-slate-50 border-slate-200' },
  LOAN_APPROVED:    { label: 'Loan Approved',    icon: Shield,     color: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
  LOAN_REJECTED:    { label: 'Loan Rejected',    icon: Shield,     color: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
  LOAN_DISBURSED:   { label: 'Loan Disbursed',   icon: Send,       color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  PAYMENT_RECORDED: { label: 'Payment',          icon: Banknote,   color: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
};

const getActionMeta = (action: string) =>
  ACTION_META[action] ?? { label: action, icon: Shield, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' };

const ROLE_LABEL: Record<string, string> = {
  branch_manager: 'Branch Manager',
  loan_officer:   'Loan Officer',
  accountant:     'Accountant',
};

const today = () => new Date().toISOString().split('T')[0];

export default function AuditLogsPageClient() {
  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [actions, setActions]   = useState<string[]>([]);
  const limit = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(limit),
      };
      if (actionFilter) params.action = actionFilter;
      if (dateFrom)     params.date_from = dateFrom;
      if (dateTo)       params.date_to = dateTo;

      const r = await auditLogs.getAll(params);
      const data = (r.data ?? []) as AuditLog[];
      // Client-side search filter on description/user_name
      const filtered = search
        ? data.filter(l =>
            l.description.toLowerCase().includes(search.toLowerCase()) ||
            l.user_name.toLowerCase().includes(search.toLowerCase()))
        : data;
      setLogs(filtered);
      setTotal(r.total);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoading(false); }
  }, [page, actionFilter, dateFrom, dateTo, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    auditLogs.getActions().then(setActions).catch(() => {});
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track all system activity and user actions</p>
        </div>
        <button onClick={fetchLogs} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 self-start sm:self-auto">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex-1 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by user or description…"
            className="text-sm bg-transparent outline-none flex-1" />
          {search && <button onClick={() => setSearch('')}><X className="w-4 h-4 text-slate-400" /></button>}
        </div>
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-50 min-w-36">
          <option value="">All Actions</option>
          {actions.map(a => (
            <option key={a} value={a}>{getActionMeta(a).label}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} max={today()} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-50" />
        <input type="date" value={dateTo} max={today()} onChange={e => { setDateTo(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-slate-50" />
        {(dateFrom || dateTo || actionFilter) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); setActionFilter(''); setPage(1); }}
            className="px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 whitespace-nowrap">
            Clear filters
          </button>
        )}
      </div>

      {/* Logs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading audit logs…</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">No audit logs found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Time', 'User', 'Action', 'Description', 'IP'].map(h => (
                      <th key={h} className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const meta = getActionMeta(log.action);
                    const Icon = meta.icon;
                    return (
                      <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                          <p className="font-medium text-slate-700">{new Date(log.created_at).toLocaleDateString('en-UG', { day: '2-digit', month: 'short' })}</p>
                          <p>{new Date(log.created_at).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-900 text-xs">{log.user_name}</p>
                          <p className="text-[10px] text-slate-500">{ROLE_LABEL[log.user_role] ?? log.user_role}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${meta.bg}`}>
                            <Icon className={`w-3 h-3 ${meta.color}`} />
                            <span className={meta.color}>{meta.label}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600 max-w-xs">
                          <p className="truncate">{log.description}</p>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">{log.ip_address ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500">{total} total entries</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-600 font-medium">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
