'use client';

import React, { useState, useCallback } from 'react';
import { DollarSign, AlertTriangle, FileText, Clock, TrendingUp, Users, X, Loader2, AlertCircle, RefreshCw, BarChart3, Download } from 'lucide-react';
import { reports, members } from '@/lib/api';

type ReportType = 'daily_financial' | 'portfolio_risk' | 'collection_sheet' | 'loan_aging' | 'disbursements' | 'member_statement';

const REPORT_DEFS = [
  { id: 'daily_financial' as ReportType, title: 'Daily Financial Report', desc: 'Opening balance, cash in, expenses, disbursements, and closing balance for a selected date.', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50', needsDate: true },
  { id: 'portfolio_risk' as ReportType, title: 'Portfolio at Risk (PAR)', desc: 'Aging buckets, PAR%, and breakdown of overdue loans across the full portfolio.', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'collection_sheet' as ReportType, title: 'Daily Collection Sheet', desc: 'Active loans vs payments received on a given date. Shows paid, unpaid, and collection rate.', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', needsDate: true },
  { id: 'loan_aging' as ReportType, title: 'Loan Aging Analysis', desc: 'Days outstanding and days overdue per loan across the portfolio.', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'disbursements' as ReportType, title: 'Disbursement Report', desc: 'All loans disbursed within a date range with totals and method breakdown.', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50', needsDateRange: true },
  { id: 'member_statement' as ReportType, title: 'Member Statement', desc: 'Full loan and payment history for a specific member, including balances and totals.', icon: Users, color: 'text-orange-600', bg: 'bg-orange-50', needsMember: true },
];

const ugx = (n: number | string | null) => 'UGX ' + Number(n || 0).toLocaleString();
const today = () => new Date().toISOString().split('T')[0];

export default function ReportsPageClient() {
  const [active, setActive] = useState<ReportType | null>(null);
  const [date, setDate]     = useState(today());
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo]     = useState(today());
  const [memberId, setMemberId] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<{ id: string; full_name: string; member_code: string }[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData]         = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const searchMembers = useCallback(async (q: string) => {
    if (!q) { setMemberResults([]); return; }
    try { const r = await members.getAll({ search: q, limit: 10 }); setMemberResults((r.data ?? []) as { id: string; full_name: string; member_code: string }[]); } catch {}
  }, []);

  const generate = async (id: ReportType) => {
    setActive(id); setError(''); setLoading(true); setData(null);
    try {
      let result;
      if (id === 'daily_financial')  result = await reports.dailyFinancial(date);
      if (id === 'portfolio_risk')   result = await reports.portfolioRisk();
      if (id === 'collection_sheet') result = await reports.collectionSheet(date);
      if (id === 'loan_aging')       result = await reports.loanAging();
      if (id === 'disbursements')    result = await reports.disbursements(dateFrom, dateTo);
      if (id === 'member_statement') { if (!memberId) { setError('Please select a member'); setLoading(false); return; } result = await reports.memberStatement(memberId); }
      setData(result); setShowPreview(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to generate report'); }
    finally { setLoading(false); }
  };

  const def = REPORT_DEFS.find(r => r.id === active);
  const ic = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 focus:bg-white';

  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-extrabold text-gray-900">Reports</h1><p className="text-sm text-gray-500 mt-0.5">Generate financial and portfolio reports</p></div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

      {/* Date controls */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-800 mb-4">Report Parameters</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Date (Single)</label><input type="date" value={date} onChange={e => setDate(e.target.value)} max={today()} className={ic} /></div>
          <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Date From</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} max={today()} className={ic} /></div>
          <div><label className="block text-xs font-semibold text-gray-700 mb-1.5">Date To</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} max={today()} className={ic} /></div>
        </div>
        <div className="mt-4">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Member (for Statement)</label>
          <div className="relative">
            <input value={memberSearch} onChange={e => { setMemberSearch(e.target.value); searchMembers(e.target.value); }} placeholder="Search member name…" className={ic} />
            {memberResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-40 overflow-y-auto">
                {memberResults.map(m => (
                  <button key={m.id} type="button" onClick={() => { setMemberId(m.id); setMemberSearch(`${m.full_name} (${m.member_code})`); setMemberResults([]); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 hover:text-green-700 transition-colors border-b border-gray-50 last:border-0">
                    <span className="font-semibold">{m.full_name}</span> <span className="text-gray-400 font-mono text-xs">{m.member_code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_DEFS.map(r => {
          const Icon = r.icon;
          const isActive = active === r.id && loading;
          return (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5">
              <div className={`w-11 h-11 rounded-xl ${r.bg} flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${r.color}`} />
              </div>
              <h3 className="font-bold text-gray-900 mb-1.5">{r.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">{r.desc}</p>
              <button onClick={() => generate(r.id)} disabled={isActive}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60">
                {isActive ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</> : <><BarChart3 className="w-4 h-4" />Generate</>}
              </button>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {showPreview && data && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                {def && <div className={`w-8 h-8 rounded-lg ${def.bg} flex items-center justify-center`}><def.icon className={`w-4 h-4 ${def.color}`} /></div>}
                <h3 className="font-bold text-gray-900">{def?.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
                <button onClick={() => { setShowPreview(false); setData(null); setActive(null); }} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
            </div>
            <div className="overflow-y-auto p-6 flex-1">
              <pre className="text-xs font-mono text-gray-700 bg-gray-50 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap border border-gray-200">{JSON.stringify(data, null, 2)}</pre>
              {active === 'daily_financial' && data.summary && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {[['Opening Balance', ugx(data.summary.opening_balance)], ['Cash In', ugx(data.summary.total_cash_in)], ['Expenses', ugx(data.summary.total_expenses)], ['Disbursements', ugx(data.summary.total_disbursements)], ['Closing Balance', ugx(data.summary.closing_balance)]].map(([k,v]) => (
                    <div key={k} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm"><p className="text-xs text-gray-500 mb-0.5">{k}</p><p className="font-bold text-gray-900">{v}</p></div>
                  ))}
                </div>
              )}
              {active === 'portfolio_risk' && data.par_percentage !== undefined && (
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  {[['Total Portfolio', ugx(data.total_portfolio)], ['Overdue Amount', ugx(data.overdue_amount)], ['PAR %', `${data.par_percentage}%`], ['Overdue Loans', data.overdue_count ?? 0]].map(([k,v]) => (
                    <div key={k} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm"><p className="text-xs text-gray-500 mb-0.5">{k}</p><p className="font-bold text-gray-900">{v}</p></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
