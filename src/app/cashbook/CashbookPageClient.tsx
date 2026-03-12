'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, X, CheckCircle, BookOpen, Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Info, Lock } from 'lucide-react';
import { cashbook } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { todayUG } from '@/lib/dateUtils';

type Tx = {
  id: string; transaction_date: string; transaction_time: string;
  type: 'cash_in' | 'expense' | 'disbursement';
  category: string; description: string; amount: number; reference?: string;
};
type Summary = { openingBalance: number; cashIn: number; expenses: number; disbursements: number; closingBalance: number };

const ugx = (n: number | string | null) => 'UGX ' + Number(n || 0).toLocaleString();
const TYPE_STYLE: Record<string, string> = {
  cash_in: 'bg-green-50 text-green-700 border-green-200',
  expense: 'bg-orange-50 text-orange-700 border-orange-200',
  disbursement: 'bg-red-50 text-red-700 border-red-200',
};
const TYPE_LABEL: Record<string, string> = { cash_in: 'Cash In', expense: 'Expense', disbursement: 'Disbursement' };
const Sk = () => <div className="animate-pulse bg-gray-100 rounded-xl h-10 w-full" />;
const today = () => todayUG();

const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 focus:bg-white';
const labelCls = 'block text-xs font-semibold text-gray-700 mb-1.5';

// ── Modal defined OUTSIDE component to prevent focus loss on re-render ────────
function Modal({
  title, onClose, children, footer,
}: {
  title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div className="overflow-y-auto p-6 flex-1 space-y-4">{children}</div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex gap-3 justify-end shrink-0">{footer}</div>
      </div>
    </div>
  );
}

// ── Access denied screen for loan officers ────────────────────────────────────
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
        <Lock className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-extrabold text-gray-900 mb-2">Access Restricted</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-sm">
        The Cashbook is only accessible to Branch Managers. Please contact your manager for cashbook-related queries.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}

// ── Main cashbook content (all hooks here — no conditional calls) ─────────────
function CashbookContent() {
  const [date,    setDate]    = useState(today());
  const [txList,  setTxList]  = useState<Tx[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [toast,   setToast]   = useState('');

  const [showEntry,   setShowEntry]   = useState(false);
  const [showBal,     setShowBal]     = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [formErr,     setFormErr]     = useState('');

  const [txType,    setTxType]    = useState<'cash_in' | 'expense'>('cash_in');
  const [category,  setCategory]  = useState('');
  const [desc,      setDesc]      = useState('');
  const [amtStr,    setAmtStr]    = useState('');
  const [txTime,    setTxTime]    = useState(() => new Date().toTimeString().slice(0, 5));
  const [txRef,     setTxRef]     = useState('');

  const [balDate, setBalDate] = useState(today());
  const [balAmt,  setBalAmt]  = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const fetchDay = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [d, s] = await Promise.all([cashbook.getByDate(date), cashbook.getSummary(date)]);
      const raw = d as { transactions?: Tx[]; data?: Tx[]; rows?: Tx[] };
      setTxList(raw.transactions ?? raw.data ?? raw.rows ?? []);
      setSummary(s as Summary);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load cashbook'); }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { fetchDay(); }, [fetchDay]);

  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' }));
  };

  const submitEntry = async () => {
    if (!category || !desc || !amtStr) { setFormErr('All fields are required'); return; }
    setFormErr(''); setSubmitting(true);
    try {
      await cashbook.create({ transaction_date: date, transaction_time: txTime, type: txType, category, description: desc, amount: Number(amtStr), reference: txRef || undefined });
      await fetchDay();
      setShowEntry(false); setCategory(''); setDesc(''); setAmtStr(''); setTxRef(''); setTxType('cash_in');
      showToast('Transaction recorded successfully');
    } catch (e) { setFormErr(e instanceof Error ? e.message : 'Failed to save'); }
    finally { setSubmitting(false); }
  };

  const submitBalance = async () => {
    if (!balAmt) { setFormErr('Enter opening balance'); return; }
    setFormErr(''); setSubmitting(true);
    try {
      await cashbook.setOpeningBalance(balDate, Number(balAmt));
      await fetchDay();
      setShowBal(false); setBalAmt('');
      showToast('Opening balance set');
    } catch (e) { setFormErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setSubmitting(false); }
  };

  const withBalance = txList.reduce<(Tx & { runningBal: number })[]>((acc, tx) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].runningBal : Number(summary?.openingBalance ?? 0);
    const delta = tx.type === 'cash_in' ? Number(tx.amount) : -Number(tx.amount);
    acc.push({ ...tx, runningBal: prev + delta });
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-[60] bg-green-600 text-white px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-xl font-extrabold text-gray-900">Cashbook</h1><p className="text-sm text-gray-500 mt-0.5">Daily transaction ledger</p></div>
        <div className="flex items-center gap-2">
          <button onClick={fetchDay} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => { setFormErr(''); setShowBal(true); }} className="px-3 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Set Opening Balance</button>
          <button onClick={() => { setFormErr(''); setShowEntry(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-sm">
            <Plus className="w-4 h-4" /> Add Entry
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-800">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
        <span><span className="font-semibold">Automatic entries:</span> Loan repayments appear here as Cash In, and loan disbursements appear as Disbursements — no manual recording needed for these.</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-4">
        <button onClick={() => shiftDate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600"><ChevronLeft className="w-5 h-5" /></button>
        <div className="flex items-center gap-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} max={today()} className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 font-semibold text-gray-800" />
          <button onClick={() => setDate(today())} className="px-3 py-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors">Today</button>
        </div>
        <button onClick={() => shiftDate(1)} disabled={date >= today()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Opening Balance', value: ugx(summary.openingBalance), color: 'text-gray-900', bg: 'bg-gray-50', border: 'border-gray-200' },
            { label: 'Cash In', value: ugx(summary.cashIn), color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
            { label: 'Expenses', value: ugx(summary.expenses), color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
            { label: 'Disbursements', value: ugx(summary.disbursements), color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
            { label: 'Closing Balance', value: ugx(summary.closingBalance), color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} className={`rounded-2xl border ${border} ${bg} p-4 text-center`}>
              <p className="text-xs text-gray-500 mb-1 font-medium">{label}</p>
              <p className={`text-sm font-extrabold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {summary && (
        <div className="bg-white rounded-xl border border-gray-100 p-3 text-xs text-gray-500 text-center font-mono">
          Closing = Opening ({ugx(summary.openingBalance)}) + Cash In ({ugx(summary.cashIn)}) − Expenses ({ugx(summary.expenses)}) − Disbursements ({ugx(summary.disbursements)}) = <span className="font-bold text-blue-700">{ugx(summary.closingBalance)}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-green-600" />
          <h2 className="font-bold text-gray-900 text-sm">Transactions for {new Date(date + 'T12:00:00').toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Africa/Kampala' })}</h2>
        </div>
        {loading ? <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Sk key={i} />)}</div>
          : withBalance.length === 0 ? <div className="p-12 text-center text-sm text-gray-400">No transactions recorded for this date</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 text-center">Type</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right hidden lg:table-cell">Running Balance</th>
                </tr></thead>
                <tbody>
                  {withBalance.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-xs text-gray-500 font-mono">{tx.transaction_time}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{tx.description}</p>
                        {tx.reference && <p className="text-xs text-gray-400 font-mono">{tx.reference}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">{tx.category}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${TYPE_STYLE[tx.type] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>{TYPE_LABEL[tx.type]}</span>
                      </td>
                      <td className={`px-4 py-3 text-right font-bold text-sm ${tx.type === 'cash_in' ? 'text-green-700' : 'text-red-600'}`}>
                        {tx.type === 'cash_in' ? '+' : '−'}{ugx(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-gray-800 hidden lg:table-cell">{ugx(tx.runningBal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* ── ADD ENTRY MODAL ── */}
      {showEntry && (
        <Modal title="Add Manual Entry" onClose={() => setShowEntry(false)}
          footer={<>
            <button onClick={() => setShowEntry(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
            <button onClick={submitEntry} disabled={submitting || !category || !desc || !amtStr}
              className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl flex items-center gap-2 disabled:opacity-50">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><CheckCircle className="w-4 h-4" />Save Entry</>}
            </button>
          </>}>
          {formErr && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{formErr}</div>}
          <div>
            <label className={labelCls}>Type <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {([['cash_in', 'Cash In', 'text-green-700 border-green-500 bg-green-50'], ['expense', 'Expense', 'text-orange-700 border-orange-500 bg-orange-50']] as const).map(([v, l, ac]) => (
                <button key={v} type="button" onClick={() => setTxType(v)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${txType === v ? ac : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Time <span className="text-red-500">*</span></label>
            <input type="time" value={txTime} onChange={e => setTxTime(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Category <span className="text-red-500">*</span></label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)} list="cat-list" placeholder="e.g. Fuel, Allowance, Rent…" className={inputCls} />
            <datalist id="cat-list">{['Fuel', 'Allowance', 'Rent', 'Salary', 'Office Supplies', 'Internet', 'Banking', 'Other'].map(c => <option key={c} value={c} />)}</datalist>
          </div>
          <div>
            <label className={labelCls}>Description <span className="text-red-500">*</span></label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Brief description…" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Amount (UGX) <span className="text-red-500">*</span></label>
            <input type="number" value={amtStr} onChange={e => setAmtStr(e.target.value)} min={1} step={500} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Reference (Optional)</label>
            <input type="text" value={txRef} onChange={e => setTxRef(e.target.value)} placeholder="Receipt or voucher number" className={inputCls} />
          </div>
        </Modal>
      )}

      {/* ── OPENING BALANCE MODAL ── */}
      {showBal && (
        <Modal title="Set Opening Balance" onClose={() => setShowBal(false)}
          footer={<>
            <button onClick={() => setShowBal(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
            <button onClick={submitBalance} disabled={submitting || !balAmt}
              className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl flex items-center gap-2 disabled:opacity-50">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><CheckCircle className="w-4 h-4" />Set Balance</>}
            </button>
          </>}>
          {formErr && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">{formErr}</div>}
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" value={balDate} onChange={e => setBalDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Opening Balance (UGX) <span className="text-red-500">*</span></label>
            <input type="number" value={balAmt} onChange={e => setBalAmt(e.target.value)} min={0} step={1000} placeholder="e.g. 1245000" className={inputCls} />
          </div>
          <p className="text-xs text-gray-400">This sets the starting cash balance for the selected date.</p>
        </Modal>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Exported wrapper — role check BEFORE rendering CashbookContent ────────────
export default function CashbookPageClient() {
  const { user } = useAuth();
  if (user && user.role === 'loan_officer') return <AccessDenied />; // accountant & branch_manager allowed
  return <CashbookContent />;
}
