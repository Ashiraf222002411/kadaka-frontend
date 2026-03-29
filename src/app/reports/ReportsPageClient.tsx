'use client';

import React, { useState, useCallback } from 'react';
import {
  DollarSign, AlertTriangle, FileText, Clock, TrendingUp, Users,
  X, Loader2, AlertCircle, BarChart3, Download, FileSpreadsheet, Printer,
} from 'lucide-react';
import { reports, members } from '@/lib/api';
import { todayUG } from '@/lib/dateUtils';

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
const today = () => todayUG();

// ── CSV helper ───────────────────────────────────────────────────────────────
function downloadCSV(filename: string, rows: string[][]): void {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── PDF helper (browser print) ───────────────────────────────────────────────
function getOrgName(): string {
  try {
    const keys = Object.keys(localStorage).find(k => k.startsWith('quewola_org_'));
    if (keys) { const d = JSON.parse(localStorage.getItem(keys) ?? '{}'); return d?.details?.org_name || 'My Organisation'; }
  } catch {}
  return 'My Organisation';
}

function printReport(title: string, content: string): void {
  const orgName = getOrgName();
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #1a1a1a; font-size: 12px; }
    h1 { color: #16a34a; font-size: 18px; margin-bottom: 4px; }
    .sub { color: #6b7280; font-size: 11px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #f3f4f6; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
    td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; }
    .card { display: inline-block; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 16px; margin: 6px; min-width: 160px; }
    .card-label { font-size: 10px; color: #6b7280; margin-bottom: 2px; }
    .card-value { font-size: 15px; font-weight: bold; }
    .logo { font-size: 20px; font-weight: bold; color: #16a34a; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <div class="logo">${orgName}</div>
  <h1>${title}</h1>
  <div class="sub">Generated on ${new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Africa/Kampala' })}</div>
  ${content}
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;
  const win = window.open('', '_blank');
  if (win) { win.document.write(html); win.document.close(); }
}

// ── Report → CSV rows ────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCSV(reportId: ReportType, data: any): string[][] {
  if (reportId === 'daily_financial') {
    const s = data.summary ?? data;
    const cashInTotal   = s.total_cash_in    ?? s.cashIn?.grandTotal   ?? s.cashIn?.total   ?? 0;
    const expensesTotal = s.total_expenses   ?? s.expenses?.total      ?? 0;
    const disbTotal     = s.total_disbursements ?? s.disbursements?.total ?? 0;
    const openBal       = s.opening_balance  ?? s.openingBalance       ?? 0;
    const closeBal      = s.closing_balance  ?? s.closingBalance       ?? 0;
    const rows: string[][] = [
      ['Daily Financial Report'],
      ['Date', data.date ?? ''],
      [],
      ['Item', 'Amount (UGX)'],
      ['Opening Balance',  String(openBal)],
      ['Cash In',          String(cashInTotal)],
      ['Expenses',         String(expensesTotal)],
      ['Disbursements',    String(disbTotal)],
      ['Closing Balance',  String(closeBal)],
    ];
    const cashTxns = data.cashIn?.transactions ?? [];
    if (cashTxns.length) {
      rows.push([], ['Cash In Transactions'], ['Description', 'Amount', 'Reference']);
      for (const t of cashTxns) rows.push([t.description, t.amount, t.reference ?? '']);
    }
    const expTxns = data.expenses?.transactions ?? [];
    if (expTxns.length) {
      rows.push([], ['Expense Transactions'], ['Category', 'Description', 'Amount']);
      for (const t of expTxns) rows.push([t.category, t.description, t.amount]);
    }
    const disbTxns = data.disbursements?.transactions ?? [];
    if (disbTxns.length) {
      rows.push([], ['Disbursements'], ['Description', 'Amount', 'Reference']);
      for (const t of disbTxns) rows.push([t.description, t.amount, t.reference ?? '']);
    }
    return rows;
  }
  if (reportId === 'portfolio_risk') {
    const rows: string[][] = [
      ['Portfolio at Risk Report'],
      ['Generated', new Date().toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Kampala' })],
      [],
      ['Metric', 'Value'],
      ['Total Portfolio (UGX)', data.total_portfolio ?? ''],
      ['Overdue Amount (UGX)', data.overdue_amount ?? ''],
      ['PAR %', data.par_percentage ?? ''],
      ['Overdue Loans Count', data.overdue_count ?? ''],
      [],
      ['Aging Bucket', 'Amount (UGX)', 'Count'],
    ];
    if (data.aging_buckets) {
      for (const b of data.aging_buckets) rows.push([b.bucket, b.amount, b.count]);
    }
    return rows;
  }
  if (reportId === 'collection_sheet') {
    const rows: string[][] = [
      ['Daily Collection Sheet'],
      ['Date', data.date ?? ''],
      ['Collection Rate', `${data.collection_rate ?? 0}%`],
      [],
      ['Loan #', 'Member', 'Daily Payment', 'Paid Today', 'Status'],
    ];
    if (data.loans) {
      for (const l of data.loans) rows.push([l.loan_number, l.member_name, l.daily_payment, l.paid_today ?? 0, l.status]);
    }
    return rows;
  }
  if (reportId === 'loan_aging') {
    const rows: string[][] = [
      ['Loan Aging Analysis'],
      ['Generated', new Date().toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Kampala' })],
      [],
      ['Loan #', 'Member', 'Amount', 'Balance', 'Start Date', 'End Date', 'Days Outstanding', 'Days Overdue'],
    ];
    const loans = data.loans ?? data.data ?? data;
    if (Array.isArray(loans)) {
      for (const l of loans) rows.push([l.loan_number, l.member_name, l.amount_applied ?? l.amount, l.balance_total ?? l.balance, l.start_date, l.end_date, l.days_outstanding ?? '', l.days_overdue ?? 0]);
    }
    return rows;
  }
  if (reportId === 'disbursements') {
    const rows: string[][] = [
      ['Disbursement Report'],
      ['Period', `${data.date_from ?? ''} to ${data.date_to ?? ''}`],
      ['Total Disbursed (UGX)', data.total_disbursed ?? ''],
      [],
      ['Loan #', 'Member', 'Amount (UGX)', 'Date', 'Method'],
    ];
    const loans = data.disbursements ?? data.loans ?? data.data ?? [];
    if (Array.isArray(loans)) {
      for (const l of loans) rows.push([l.loan_number, l.member_name, l.approved_amount ?? l.amount, l.disbursement_date, l.disbursement_method ?? l.method]);
    }
    return rows;
  }
  if (reportId === 'member_statement') {
    const rows: string[][] = [
      ['Member Statement'],
      ['Member', data.member?.full_name ?? ''],
      ['Member Code', data.member?.member_code ?? ''],
      [],
      ['LOANS'],
      ['Loan #', 'Type', 'Amount Applied', 'Approved', 'Total Repayable', 'Balance', 'Status', 'Date'],
    ];
    if (data.loans) {
      for (const l of data.loans) rows.push([l.loan_number, l.loan_type, l.amount_applied, l.approved_amount, l.total_repayable, l.balance_total, l.status, l.created_at?.slice(0,10)]);
    }
    rows.push([], ['PAYMENTS'], ['Date', 'Amount Paid', 'Method', 'Reference']);
    if (data.payments) {
      for (const p of data.payments) rows.push([p.payment_date, p.amount_paid, p.payment_method, p.transaction_reference ?? '']);
    }
    return rows;
  }
  return [['Report data'], [JSON.stringify(data)]];
}

// ── Report → HTML table ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toHTML(reportId: ReportType, data: any): string {
  const rows = toCSV(reportId, data);
  let html = '<div>';
  let inTable = false;
  for (const row of rows) {
    if (row.length === 0) {
      if (inTable) { html += '</table>'; inTable = false; }
      html += '<br>';
      continue;
    }
    if (row.length === 1) {
      if (inTable) { html += '</table>'; inTable = false; }
      html += `<h3 style="margin:12px 0 4px;color:#374151">${row[0]}</h3>`;
      continue;
    }
    if (!inTable) { html += '<table>'; inTable = true; }
    const isHeader = rows.indexOf(row) === rows.findIndex(r => r.length > 1);
    const tag = isHeader ? 'th' : 'td';
    html += `<tr>${row.map(c => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
  }
  if (inTable) html += '</table>';
  html += '</div>';
  return html;
}

// ─────────────────────────────────────────────────────────────────────────────

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
      if (id === 'member_statement') {
        if (!memberId) { setError('Please select a member'); setLoading(false); return; }
        result = await reports.memberStatement(memberId);
      }
      setData(result); setShowPreview(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to generate report'); }
    finally { setLoading(false); }
  };

  const handleCSV = () => {
    if (!data || !active) return;
    const rows = toCSV(active, data);
    const def = REPORT_DEFS.find(r => r.id === active);
    downloadCSV(`${def?.title?.replace(/\s+/g, '_') ?? 'report'}_${today()}.csv`, rows);
  };

  const handlePDF = () => {
    if (!data || !active) return;
    const def = REPORT_DEFS.find(r => r.id === active);
    const htmlContent = toHTML(active, data);
    printReport(def?.title ?? 'Report', htmlContent);
  };

  const def = REPORT_DEFS.find(r => r.id === active);
  const ic = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 focus:bg-white';

  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-extrabold text-gray-900">Reports</h1><p className="text-sm text-gray-500 mt-0.5">Generate and export financial & portfolio reports</p></div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

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

      {/* ── Preview & Export Modal ── */}
      {showPreview && data && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                {def && <div className={`w-8 h-8 rounded-lg ${def.bg} flex items-center justify-center`}><def.icon className={`w-4 h-4 ${def.color}`} /></div>}
                <h3 className="font-bold text-gray-900">{def?.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                {/* CSV Export */}
                <button onClick={handleCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors">
                  <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
                </button>
                {/* PDF Export */}
                <button onClick={handlePDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
                  <Printer className="w-3.5 h-3.5" /> PDF
                </button>
                <button onClick={() => { setShowPreview(false); setData(null); setActive(null); }} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
            </div>
            <div className="overflow-y-auto p-6 flex-1 space-y-4">
              {/* Summary cards for key reports */}
              {active === 'daily_financial' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {[
                    ['Opening Balance', ugx(data.summary?.opening_balance ?? data.openingBalance)],
                    ['Cash In',         ugx(data.summary?.total_cash_in    ?? data.cashIn?.grandTotal ?? data.cashIn?.total)],
                    ['Expenses',        ugx(data.summary?.total_expenses   ?? data.expenses?.total)],
                    ['Disbursements',   ugx(data.summary?.total_disbursements ?? data.disbursements?.total)],
                    ['Closing Balance', ugx(data.summary?.closing_balance  ?? data.closingBalance)],
                  ].map(([k,v]) => (
                    <div key={k} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                      <p className="text-xs text-gray-500 mb-0.5">{k}</p>
                      <p className="font-bold text-gray-900">{v}</p>
                    </div>
                  ))}
                </div>
              )}
              {active === 'portfolio_risk' && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Total Portfolio', ugx(data.total_portfolio)],
                    ['Overdue Amount', ugx(data.overdue_amount)],
                    ['PAR %', `${data.par_percentage ?? 0}%`],
                    ['Overdue Loans', data.overdue_count ?? 0],
                  ].map(([k,v]) => (
                    <div key={k} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                      <p className="text-xs text-gray-500 mb-0.5">{k}</p>
                      <p className="font-bold text-gray-900">{v}</p>
                    </div>
                  ))}
                </div>
              )}
              {/* Raw data */}
              <pre className="text-xs font-mono text-gray-700 bg-gray-50 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap border border-gray-200">{JSON.stringify(data, null, 2)}</pre>
              <p className="text-xs text-gray-400 text-center">Use the CSV button to download as spreadsheet, or PDF to print / save as PDF.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
