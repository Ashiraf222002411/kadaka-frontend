'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, CreditCard, TrendingUp, AlertTriangle, CheckCircle, Clock, BarChart3 } from 'lucide-react';
import { dashboard } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type RecentLoan = {
  id: string; loan_number: string; member_name: string; group_name: string;
  amount: number; approved_amount: number | null; balance_total: number;
  status: string; date: string;
};
type OverdueLoan = {
  id: string; loan_number: string; member_name: string;
  amount: number; balance: number; days_overdue: number;
};
type PortfolioData = {
  myActiveLoans: number; myClearedLoans: number; myPendingApprovals: number;
  myPortfolio: number; totalDisbursed: number;
  myCollectionsToday: number; myCollectionsMTD: number;
  myOverdueCount: number; myOverdueAmount: number; myPAR: number;
  recentLoans: RecentLoan[]; overdueLoans: OverdueLoan[];
};

const ugx = (n: number | null | undefined) => 'UGX ' + Number(n || 0).toLocaleString();
const Sk  = ({ h = 'h-10' }: { h?: string }) => <div className={`animate-pulse bg-gray-100 rounded-xl ${h} w-full`} />;

const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-amber-50  text-amber-700  border-amber-200',
  approved:  'bg-blue-50   text-blue-700   border-blue-200',
  active:    'bg-green-50  text-green-700  border-green-200',
  cleared:   'bg-gray-50   text-gray-600   border-gray-200',
  rejected:  'bg-red-50    text-red-700    border-red-200',
  disbursed: 'bg-purple-50 text-purple-700 border-purple-200',
};

export default function OfficerPortfolioClient() {
  const { user } = useAuth();
  const [data,    setData]    = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const d = await (dashboard as any).getOfficerPortfolio();
      setData(d as PortfolioData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const parColor = !data ? '' : data.myPAR > 10 ? 'text-red-600' : data.myPAR > 5 ? 'text-amber-600' : 'text-green-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">My Portfolio</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back, <span className="font-semibold text-green-700">{user?.full_name}</span> — your personal performance overview
          </p>
        </div>
        <button
          onClick={fetchData}
          className="self-start sm:self-auto p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-500"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <Sk h="h-4" /><div className="mt-3"><Sk h="h-7" /></div>
            </div>
          ))
        ) : [
          {
            label: 'Active Loans',
            value: data?.myActiveLoans ?? 0,
            sub: `${data?.myPendingApprovals ?? 0} pending approval`,
            icon: CreditCard,
            color: 'text-blue-600', bg: 'bg-blue-50',
          },
          {
            label: 'Portfolio Value',
            value: ugx(data?.myPortfolio),
            sub: `UGX ${Number(data?.totalDisbursed || 0).toLocaleString()} total disbursed`,
            icon: TrendingUp,
            color: 'text-green-600', bg: 'bg-green-50',
          },
          {
            label: 'Collections Today',
            value: ugx(data?.myCollectionsToday),
            sub: `MTD: ${ugx(data?.myCollectionsMTD)}`,
            icon: CheckCircle,
            color: 'text-emerald-600', bg: 'bg-emerald-50',
          },
          {
            label: 'Overdue Loans',
            value: data?.myOverdueCount ?? 0,
            sub: ugx(data?.myOverdueAmount) + ' at risk',
            icon: AlertTriangle,
            color: (data?.myOverdueCount ?? 0) > 0 ? 'text-red-600' : 'text-gray-400',
            bg:    (data?.myOverdueCount ?? 0) > 0 ? 'bg-red-50'   : 'bg-gray-50',
          },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={`inline-flex p-2 rounded-xl ${bg} mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-2xl font-extrabold text-gray-900 leading-tight">{value}</p>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">{label}</p>
            <p className="text-[11px] text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {loading ? [...Array(4)].map((_, i) => <Sk key={i} h="h-16" />) : [
          { label: 'Total Disbursed',   value: ugx(data?.totalDisbursed),     icon: TrendingUp, color: 'text-green-700' },
          { label: 'Loans Cleared',     value: data?.myClearedLoans ?? 0,     icon: CheckCircle, color: 'text-blue-700' },
          { label: 'Pending Approvals', value: data?.myPendingApprovals ?? 0, icon: Clock, color: 'text-amber-700' },
          { label: 'My PAR %',          value: `${data?.myPAR ?? 0}%`,        icon: BarChart3, color: parColor || 'text-green-700' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <Icon className={`w-5 h-5 shrink-0 ${color}`} />
            <div>
              <p className={`text-lg font-extrabold ${color}`}>{value}</p>
              <p className="text-[11px] text-gray-400 font-medium leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Loans */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-sm">My Recent Loans</h2>
            <p className="text-xs text-gray-400 mt-0.5">Latest 5 loans you created</p>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Sk key={i} />)}</div>
          ) : !data?.recentLoans?.length ? (
            <div className="p-10 text-center text-sm text-gray-400">No loans yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Loan</th>
                    <th className="px-4 py-3 text-left">Member</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentLoans.map(l => (
                    <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">{l.loan_number}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-xs">{l.member_name}</p>
                        <p className="text-[11px] text-gray-400">{l.group_name ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-gray-800">{ugx(l.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${STATUS_STYLE[l.status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Overdue Loans */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-sm">My Overdue Loans</h2>
            <p className="text-xs text-gray-400 mt-0.5">Loans past due date that need follow-up</p>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Sk key={i} />)}</div>
          ) : !data?.overdueLoans?.length ? (
            <div className="p-10 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No overdue loans — great work!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Member</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3 text-center">Days Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.overdueLoans.map(l => (
                    <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-xs">{l.member_name}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{l.loan_number}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-red-700">{ugx(l.balance)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-1 bg-red-50 border border-red-200 rounded-full text-[10px] font-bold text-red-700">
                          {l.days_overdue}d
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
