'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { TrendingUp, DollarSign, AlertTriangle, Users, ArrowUpRight, Clock, CheckCircle, BarChart3, RefreshCw } from 'lucide-react';
import { dashboard } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import OfficerPortfolioClient from './OfficerPortfolioClient';

type Stats = { totalMembers: number; activeLoans: number; totalPortfolio: number; collectionsToday: number; collectionsMTD: number; overdueLoans: number; portfolioAtRisk: number; disbursementsToday: number; pendingApprovals?: number };
type LoanRow = { loan_number: string; member_name: string; group_name: string; approved_amount: number; amount_applied: number; status: string; created_at: string };
type PayRow  = { receipt_number: string; loan_number: string; member_name: string; amount_paid: number; payment_date: string };
type OvRow   = { loan_number: string; member_name: string; balance_total: number; days_overdue: number };

const ugx = (n: number | string) => 'UGX ' + Number(n || 0).toLocaleString();
const arr  = (d: { data?: unknown[]; rows?: unknown[] }) => (d?.data ?? d?.rows ?? []) as never[];

const Sk = ({ className = '' }: { className?: string }) => <div className={`animate-pulse bg-gray-100 rounded-xl ${className}`} />;

const StatusBadge = ({ s }: { s: string }) => {
  const m: Record<string, string> = { pending: 'bg-amber-50 text-amber-700 border-amber-200', approved: 'bg-blue-50 text-blue-700 border-blue-200', disbursed: 'bg-purple-50 text-purple-700 border-purple-200', active: 'bg-green-50 text-green-700 border-green-200', cleared: 'bg-gray-100 text-gray-600 border-gray-200', rejected: 'bg-red-50 text-red-700 border-red-200' };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${m[s] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>{s}</span>;
};

// ── Org-wide branch manager dashboard ───────────────────────────────────────
function BranchManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loans, setLoans]  = useState<LoanRow[]>([]);
  const [pays,  setPays]   = useState<PayRow[]>([]);
  const [ovdue, setOvdue]  = useState<OvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [s, rl, rp, ol] = await Promise.all([dashboard.getStats(), dashboard.getRecentLoans(), dashboard.getRecentPayments(), dashboard.getOverdueLoans()]);
      setStats(s);
      setLoans(arr(rl)); setPays(arr(rp)); setOvdue(arr(ol));
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const parColor = (p: number) => p > 5 ? 'text-red-600' : p > 2 ? 'text-amber-600' : 'text-green-600';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back, {user?.full_name ?? 'User'} 👋</p>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 font-medium">{error}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? [...Array(4)].map((_, i) => <Sk key={i} className="h-32" />) : stats ? (
          <>
            {[
              { label: 'Total Portfolio', val: ugx(stats.totalPortfolio), sub: `${stats.activeLoans} active loans`, icon: TrendingUp, bg: 'bg-green-50', ic: 'text-green-600' },
              { label: "Today's Collections", val: ugx(stats.collectionsToday), sub: `MTD: ${ugx(stats.collectionsMTD)}`, icon: DollarSign, bg: 'bg-blue-50', ic: 'text-blue-600' },
              { label: 'Overdue Loans', val: `${stats.overdueLoans} loans`, sub: `PAR: ${stats.portfolioAtRisk}%`, icon: AlertTriangle, bg: 'bg-red-50', ic: 'text-red-500', parPct: stats.portfolioAtRisk },
              { label: 'Total Members', val: stats.totalMembers, sub: `${stats.pendingApprovals ?? 0} pending approvals`, icon: Users, bg: 'bg-purple-50', ic: 'text-purple-600' },
            ].map(({ label, val, sub, icon: Icon, bg, ic, parPct }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                  <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}><Icon className={`w-4 h-4 ${ic}`} /></div>
                </div>
                <p className="text-xl font-extrabold text-gray-900 mb-1">{val}</p>
                <p className={`text-xs ${parPct !== undefined ? parColor(parPct) + ' font-semibold' : 'text-gray-500'}`}>{sub}</p>
              </div>
            ))}
          </>
        ) : null}
      </div>

      {/* Summary strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Disbursed Today', value: ugx(stats.disbursementsToday), icon: ArrowUpRight, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Pending Approvals', value: stats.pendingApprovals ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', href: '/loans' },
            { label: 'MTD Collections',  value: ugx(stats.collectionsMTD),   icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Active Loans',     value: stats.activeLoans,            icon: BarChart3,   color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(({ label, value, icon: Icon, color, bg, href }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}><Icon className={`w-4 h-4 ${color}`} /></div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">{label}</p>
                {href ? <Link href={href} className={`text-sm font-bold ${color} hover:underline`}>{value}</Link> : <p className="text-sm font-bold text-gray-900">{value}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Loans */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-sm">Recent Loans</h2>
            <Link href="/loans" className="text-xs text-green-600 font-semibold hover:underline">View all</Link>
          </div>
          {loading ? <div className="p-5 space-y-3">{[...Array(4)].map((_, i) => <Sk key={i} className="h-10" />)}</div>
            : loans.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No recent loans</div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                    <th className="px-5 py-3 text-left">Loan #</th><th className="px-4 py-3 text-left">Member</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Group</th>
                    <th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-center">Status</th>
                  </tr></thead>
                  <tbody>
                    {loans.slice(0, 5).map((l, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-mono font-semibold text-xs text-gray-700">{l.loan_number}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{l.member_name}</td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{l.group_name}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{ugx(l.approved_amount || l.amount_applied)}</td>
                        <td className="px-4 py-3 text-center"><StatusBadge s={l.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>

        {/* Overdue */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-sm">Overdue Loans</h2>
            <span className="text-xs text-red-600 font-bold">{ovdue.length} loan{ovdue.length !== 1 ? 's' : ''}</span>
          </div>
          {loading ? <div className="p-5 space-y-3">{[...Array(3)].map((_, i) => <Sk key={i} className="h-14" />)}</div>
            : ovdue.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No overdue loans 🎉</div>
            : <div className="divide-y divide-gray-50">
                {ovdue.slice(0, 5).map((l, i) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{l.member_name}</p>
                      <p className="text-xs text-gray-500 font-mono">{l.loan_number}</p>
                      <p className="text-xs font-bold text-red-600">{ugx(l.balance_total)}</p>
                    </div>
                    <span className="px-2 py-1 bg-red-50 text-red-700 rounded-xl text-[10px] font-bold border border-red-100 shrink-0">{l.days_overdue}d</span>
                  </div>
                ))}
              </div>}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-sm">Recent Payments</h2>
          <Link href="/payments" className="text-xs text-green-600 font-semibold hover:underline">View all</Link>
        </div>
        {loading ? <div className="p-5 space-y-3">{[...Array(4)].map((_, i) => <Sk key={i} className="h-10" />)}</div>
          : pays.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No payments recorded today</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Receipt</th><th className="px-4 py-3 text-left">Loan #</th>
                  <th className="px-4 py-3 text-left">Member</th><th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Date</th>
                </tr></thead>
                <tbody>
                  {pays.slice(0, 5).map((p, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs font-semibold text-gray-700">{p.receipt_number}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.loan_number}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{p.member_name}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">{ugx(p.amount_paid)}</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">{new Date(p.payment_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}

// ── Role-based wrapper — exports the right dashboard per role ─────────────────
export default function DashboardPageClient() {
  const { user } = useAuth();
  if (user?.role === 'loan_officer') return <OfficerPortfolioClient />;
  return <BranchManagerDashboard />;
}
