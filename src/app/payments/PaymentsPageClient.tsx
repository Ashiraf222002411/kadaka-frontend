'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, X, CheckCircle, BookOpen, Loader2, AlertCircle, RefreshCw, Smartphone, Banknote, Building2, Printer, Pencil, Trash2 } from 'lucide-react';
import { payments, loans } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { todayUG } from '@/lib/dateUtils';

type Payment = {
  id: string; receipt_number: string; loan_number: string; member_name: string;
  group_name: string; amount_paid: number; interest_portion: number;
  principal_portion: number; balance_total_after: number; payment_method: string; payment_date: string;
};
type ActiveLoan = {
  id: string; loan_number: string; member_name: string; group_name: string;
  balance_interest: number; balance_principal: number; balance_total: number;
};
type ReceiptData = {
  receipt_number: string; payment_date: string; created_at: string;
  amount_paid: number; interest_portion: number; principal_portion: number;
  balance_total_after: number; balance_interest_after: number; balance_principal_after: number;
  payment_method: string; transaction_reference: string | null; loan_cleared: boolean;
  member_name: string; loan_number: string; group_name: string;
};

const ugx  = (n: number | string | null) => 'UGX ' + Number(n || 0).toLocaleString();
const Sk   = () => <div className="animate-pulse bg-gray-100 rounded-xl h-10 w-full" />;
const today = () => todayUG();

const METHOD_MAP: Record<string, { label: string; color: string; Icon: React.FC<{ className?: string }> }> = {
  cash:          { label: 'Cash',         color: 'bg-green-50 text-green-700 border-green-200',  Icon: Banknote },
  mobile_money:  { label: 'Mobile Money', color: 'bg-blue-50 text-blue-700 border-blue-200',    Icon: Smartphone },
  bank_transfer: { label: 'Bank',         color: 'bg-purple-50 text-purple-700 border-purple-200', Icon: Building2 },
};

// ── POS Receipt Modal (defined outside to prevent focus loss) ─────────────────
function ReceiptModal({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  const printReceipt = () => window.print();

  const TZ = 'Africa/Kampala';
  const fmt = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ });
  };
  const fmtTime = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
  };

  const methodLabel = METHOD_MAP[receipt.payment_method]?.label ?? receipt.payment_method;

  return (
    <>
      {/* Print-only styles — use visibility (not display:none) so child can override parent */}
      <style>{`
        @media print {
          * { visibility: hidden !important; }
          .receipt-print-area,
          .receipt-print-area * { visibility: visible !important; }
          .receipt-print-area {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            padding: 12px !important;
            background: white !important;
          }
          /* Force all text to black — thermal printers don't print colour */
          .receipt-print-area * {
            color: #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Boost font size so nothing is tiny on paper */
          .receipt-print-area {
            font-size: 13px !important;
            line-height: 1.5 !important;
            font-weight: 600 !important;
          }
          .receipt-print-area .rp-label {
            font-weight: 700 !important;
          }
          .receipt-print-area .rp-value {
            font-weight: 800 !important;
          }
          .receipt-print-area .rp-large {
            font-size: 16px !important;
            font-weight: 900 !important;
          }
          .receipt-print-area .rp-section-title {
            font-size: 11px !important;
            font-weight: 700 !important;
          }
          .receipt-print-area .rp-footer {
            font-size: 11px !important;
            font-weight: 600 !important;
          }
          .receipt-print-area .rp-divider {
            border-top: 1px dashed #000 !important;
          }
        }
      `}</style>

      {/* Modal overlay — no print:hidden here! display:none prevents children from being visible.
          The * { visibility:hidden } rule already hides the backdrop; receipt-print-area overrides it. */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
          {/* Modal header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm">Payment Receipt</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Scrollable receipt area */}
          <div className="overflow-y-auto max-h-[70vh] px-5 py-4">
            {/* POS receipt styled div */}
            <div className="receipt-print-area font-mono text-xs bg-white" style={{ width: '100%' }}>
              {/* Header */}
              <div className="text-center mb-3">
                <div className="text-sm font-extrabold tracking-tight">KADAKA ESTABLISHMENT CO.</div>
                <div className="text-[11px] text-gray-700 font-semibold">Lending Management System</div>
                <div className="text-[11px] text-gray-600">www.kadaka.ug | Tel: +256-XXX-XXX</div>
              </div>

              <div className="rp-divider border-t border-dashed border-gray-700 my-2" />

              {/* Receipt meta */}
              <div className="space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="rp-label font-bold text-gray-800">Receipt #</span>
                  <span className="rp-value font-extrabold text-gray-900">{receipt.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="rp-label font-bold text-gray-800">Date</span>
                  <span className="rp-value font-extrabold text-gray-900">{fmt(receipt.payment_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="rp-label font-bold text-gray-800">Time</span>
                  <span className="rp-value font-extrabold text-gray-900">{fmtTime(receipt.created_at)}</span>
                </div>
              </div>

              <div className="rp-divider border-t border-dashed border-gray-700 my-2" />

              {/* Borrower info */}
              <div className="space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="rp-label font-bold text-gray-800">Member</span>
                  <span className="rp-value font-extrabold text-gray-900">{receipt.member_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="rp-label font-bold text-gray-800">Loan #</span>
                  <span className="rp-value font-extrabold text-gray-900">{receipt.loan_number}</span>
                </div>
                {receipt.group_name && (
                  <div className="flex justify-between">
                    <span className="rp-label font-bold text-gray-800">Group</span>
                    <span className="rp-value font-extrabold text-gray-900">{receipt.group_name}</span>
                  </div>
                )}
              </div>

              <div className="rp-divider border-t border-dashed border-gray-700 my-2" />

              {/* Payment breakdown */}
              <div className="space-y-0.5 text-[11px]">
                <div className="rp-large flex justify-between font-extrabold text-[13px] text-green-700">
                  <span>AMOUNT PAID</span>
                  <span>{ugx(receipt.amount_paid)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-800">
                  <span>Interest portion</span>
                  <span>{ugx(receipt.interest_portion)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-800">
                  <span>Principal portion</span>
                  <span>{ugx(receipt.principal_portion)}</span>
                </div>
              </div>

              <div className="rp-divider border-t border-dashed border-gray-700 my-2" />

              {/* Remaining balance */}
              <div className="space-y-0.5 text-[11px]">
                <div className="rp-section-title text-[10px] text-gray-700 font-bold uppercase tracking-wide mb-0.5">Remaining Balance</div>
                <div className="flex justify-between font-extrabold text-gray-900">
                  <span>Total</span>
                  <span>{ugx(receipt.balance_total_after)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-800">
                  <span>Interest</span>
                  <span>{ugx(receipt.balance_interest_after)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-800">
                  <span>Principal</span>
                  <span>{ugx(receipt.balance_principal_after)}</span>
                </div>
              </div>

              <div className="rp-divider border-t border-dashed border-gray-700 my-2" />

              {/* Method */}
              <div className="space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="rp-label font-bold text-gray-800">Method</span>
                  <span className="rp-value font-extrabold text-gray-900 capitalize">{methodLabel}</span>
                </div>
                {receipt.transaction_reference && (
                  <div className="flex justify-between">
                    <span className="rp-label font-bold text-gray-800">Reference</span>
                    <span className="rp-value font-extrabold text-gray-900">{receipt.transaction_reference}</span>
                  </div>
                )}
              </div>

              {/* Loan cleared banner */}
              {receipt.loan_cleared && (
                <>
                  <div className="rp-divider border-t border-dashed border-gray-700 my-2" />
                  <div className="text-center py-1 bg-green-50 rounded-lg">
                    <div className="text-sm font-extrabold text-green-700">*** LOAN FULLY CLEARED! ***</div>
                    <div className="text-[11px] font-semibold text-gray-800">Congratulations on completing your loan</div>
                  </div>
                </>
              )}

              <div className="rp-divider border-t border-dashed border-gray-700 my-2" />

              {/* Footer */}
              <div className="rp-footer text-center text-[11px] text-gray-700 space-y-0.5">
                <div className="font-bold text-gray-900">Thank you for your payment!</div>
                <div className="font-semibold">Please keep this receipt for your records.</div>
                <div className="mt-1 font-semibold">Kadaka Establishment Co. (U) LTD</div>
                <div className="font-semibold">© {new Date().getFullYear()} All rights reserved</div>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex gap-3">
            <button
              onClick={printReceipt}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl transition-colors"
            >
              <Printer className="w-4 h-4" /> Print Receipt
            </button>
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors"
            >
              <CheckCircle className="w-4 h-4" /> Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function PaymentsPageClient() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const [payList,  setPayList]  = useState<Payment[]>([]);
  const [actLoans, setActLoans] = useState<ActiveLoan[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [toast,    setToast]    = useState('');
  const [search,   setSearch]   = useState('');
  const [showModal, setShowModal] = useState(false);

  // Edit state
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [editMethod,  setEditMethod]  = useState<'cash' | 'mobile_money' | 'bank_transfer'>('cash');
  const [editRef,     setEditRef]     = useState('');
  const [editDate,    setEditDate]    = useState('');
  const [editErr,     setEditErr]     = useState('');
  const [saving,      setSaving]      = useState(false);

  // Delete state
  const [deletePayment, setDeletePayment] = useState<Payment | null>(null);
  const [deleting,      setDeleting]      = useState(false);

  // form state
  const [loanId,   setLoanId]   = useState('');
  const [amtStr,   setAmtStr]   = useState('');
  const [payDate,  setPayDate]  = useState(today());
  const [method,   setMethod]   = useState<'cash' | 'mobile_money' | 'bank_transfer'>('cash');
  const [ref,      setRef]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErr,  setFormErr]  = useState('');

  // receipt state
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [p, al] = await Promise.all([payments.getAll({ limit: 100 }), loans.getActive()]);
      setPayList((p.data ?? []) as Payment[]);
      setActLoans((Array.isArray(al) ? al : []) as ActiveLoan[]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selectedLoan = actLoans.find(l => l.id === loanId);
  const amt = Number(amtStr) || 0;

  // Live allocation preview
  const calcAlloc = () => {
    if (!selectedLoan || amt <= 0) return null;
    const bi = Number(selectedLoan.balance_interest);
    const bp = Number(selectedLoan.balance_principal);
    const ip = amt >= bi ? bi : amt;
    const pp = amt >= bi ? Math.min(amt - bi, bp) : 0;
    const newBal = Math.max(0, bi - ip) + Math.max(0, bp - pp);
    return { ip, pp, newBal };
  };
  const alloc = calcAlloc();

  const resetForm = () => { setLoanId(''); setAmtStr(''); setPayDate(today()); setMethod('cash'); setRef(''); setFormErr(''); };
  const openModal = () => { resetForm(); setShowModal(true); };

  const closeReceipt = async () => {
    setReceipt(null);
    setShowModal(false);
    resetForm();
    await fetchData();
    showToast('Payment recorded — cashbook updated automatically');
  };

  const submitPayment = async () => {
    if (!loanId) { setFormErr('Please select a loan'); return; }
    if (amt <= 0) { setFormErr('Enter a valid amount'); return; }
    if (selectedLoan && amt > Number(selectedLoan.balance_total)) { setFormErr('Amount exceeds outstanding balance'); return; }
    setFormErr(''); setSubmitting(true);
    try {
      const result = await payments.create({
        loan_id: loanId, amount_paid: amt, payment_date: payDate,
        payment_method: method, transaction_reference: ref || undefined,
      }) as any;

      // Build receipt data from API response + current form context
      const pay = result?.payment ?? result;
      const alloc = result?.allocation ?? {};
      setReceipt({
        receipt_number:        pay.receipt_number ?? '—',
        payment_date:          pay.payment_date   ?? payDate,
        created_at:            pay.created_at     ?? new Date().toISOString(),
        amount_paid:           Number(pay.amount_paid)        || amt,
        interest_portion:      Number(pay.interest_portion)   || 0,
        principal_portion:     Number(pay.principal_portion)  || 0,
        balance_total_after:   Number(pay.balance_total_after)    ?? Number(alloc.newBalanceTotal)    ?? 0,
        balance_interest_after: Number(pay.balance_interest_after) ?? Number(alloc.newBalanceInterest) ?? 0,
        balance_principal_after: Number(pay.balance_principal_after) ?? Number(alloc.newBalancePrincipal) ?? 0,
        payment_method:        pay.payment_method ?? method,
        transaction_reference: pay.transaction_reference ?? ref ?? null,
        loan_cleared:          alloc.loanCleared ?? false,
        member_name:           selectedLoan?.member_name ?? '',
        loan_number:           selectedLoan?.loan_number ?? '',
        group_name:            selectedLoan?.group_name  ?? '',
      });
      // Keep record modal open — receipt takes over
    } catch (e) { setFormErr(e instanceof Error ? e.message : 'Payment failed'); }
    finally { setSubmitting(false); }
  };

  const openEditPayment = (p: Payment) => {
    setEditPayment(p);
    setEditMethod((p.payment_method as 'cash' | 'mobile_money' | 'bank_transfer') ?? 'cash');
    setEditRef('');
    setEditDate(p.payment_date?.split('T')[0] ?? today());
    setEditErr('');
  };
  const submitEditPayment = async () => {
    if (!editPayment) return;
    setSaving(true); setEditErr('');
    try {
      await payments.update(editPayment.id, {
        payment_method: editMethod,
        transaction_reference: editRef || undefined,
        payment_date: editDate,
      });
      await fetchData(); setEditPayment(null); showToast('Payment updated');
    } catch (e) { setEditErr(e instanceof Error ? e.message : 'Failed to update'); }
    finally { setSaving(false); }
  };
  const submitDeletePayment = async () => {
    if (!deletePayment) return;
    setDeleting(true);
    try {
      await payments.remove(deletePayment.id);
      await fetchData(); setDeletePayment(null); showToast('Payment deleted & loan balance reversed');
    } catch (e) { showToast(e instanceof Error ? e.message : 'Delete failed'); setDeletePayment(null); }
    finally { setDeleting(false); }
  };

  const filtered = payList.filter(p => {
    const q = search.toLowerCase();
    return !q || p.member_name?.toLowerCase().includes(q) || p.receipt_number?.toLowerCase().includes(q) || p.loan_number?.toLowerCase().includes(q);
  });

  const todayTotal  = payList.filter(p => p.payment_date?.startsWith(today())).reduce((s, p) => s + Number(p.amount_paid), 0);
  const todayCount  = payList.filter(p => p.payment_date?.startsWith(today())).length;

  const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 focus:bg-white';
  const labelCls = 'block text-xs font-semibold text-gray-700 mb-1.5';

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[60] bg-green-600 text-white px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* POS Receipt Modal */}
      {receipt && <ReceiptModal receipt={receipt} onClose={closeReceipt} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-xl font-extrabold text-gray-900">Payments</h1><p className="text-sm text-gray-500 mt-0.5">Record and track daily loan repayments</p></div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-500"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={openModal} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Record Payment
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

      {/* Auto-cashbook banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-800">
        <BookOpen className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
        <span><span className="font-semibold">Smart Cashbook:</span> All payments are automatically recorded in the cashbook as Cash In — no manual double entry needed.</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Today's Collections", value: ugx(todayTotal), sub: `${todayCount} payment${todayCount !== 1 ? 's' : ''}`, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Active Loans', value: actLoans.length, sub: 'available for payment', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Recorded', value: payList.length, sub: 'all time', color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, sub, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={`inline-flex px-2 py-0.5 rounded-lg ${bg} ${color} text-xs font-semibold mb-2`}>{label}</div>
            <p className="text-2xl font-extrabold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by member, receipt, or loan number…" className="text-sm bg-transparent outline-none flex-1" />
          {search && <button onClick={() => setSearch('')}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>}
        </div>
      </div>

      {/* Payments table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Sk key={i} />)}</div>
          : filtered.length === 0 ? <div className="p-12 text-center text-sm text-gray-400">No payments found</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  <th className="px-5 py-3 text-left">Receipt</th>
                  <th className="px-4 py-3 text-left">Member</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right hidden md:table-cell">Interest</th>
                  <th className="px-4 py-3 text-right hidden md:table-cell">Principal</th>
                  <th className="px-4 py-3 text-right hidden lg:table-cell">Balance After</th>
                  <th className="px-4 py-3 text-center">Method</th>
                  <th className="px-4 py-3 text-center">Date</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map((p) => {
                    const m = METHOD_MAP[p.payment_method] ?? METHOD_MAP.cash;
                    const MIcon = m.Icon;
                    return (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-mono font-semibold text-xs text-gray-700">{p.receipt_number}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{p.member_name}</p>
                          <p className="text-xs text-gray-500 font-mono">{p.loan_number}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-700">{ugx(p.amount_paid)}</td>
                        <td className="px-4 py-3 text-right text-xs text-gray-600 hidden md:table-cell">{ugx(p.interest_portion)}</td>
                        <td className="px-4 py-3 text-right text-xs text-gray-600 hidden md:table-cell">{ugx(p.principal_portion)}</td>
                        <td className="px-4 py-3 text-right text-xs font-semibold text-gray-800 hidden lg:table-cell">{ugx(p.balance_total_after)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${m.color}`}>
                            <MIcon className="w-3 h-3" />{m.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-500">{new Date(p.payment_date).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Kampala' })}</td>
                        <td className="px-4 py-3 text-center">
                          {(role === 'branch_manager' || role === 'loan_officer' || role === 'accountant') && (
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => openEditPayment(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setDeletePayment(p)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* ── EDIT PAYMENT MODAL ── */}
      {editPayment && !receipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Edit Payment — {editPayment.receipt_number}</h3>
              <button onClick={() => setEditPayment(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              {editErr && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{editErr}</div>}
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
                Amount paid (<span className="font-bold text-gray-900">{ugx(editPayment.amount_paid)}</span>) cannot be changed. Edit method, date, or reference.
              </div>
              <div>
                <label className={labelCls}>Payment Date</label>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} max={today()} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'mobile_money', 'bank_transfer'] as const).map(mth => {
                    const info = METHOD_MAP[mth]; const MIcon = info.Icon;
                    return (
                      <button key={mth} type="button" onClick={() => setEditMethod(mth)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${editMethod === mth ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600'}`}>
                        <MIcon className="w-4 h-4" />{info.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {(editMethod === 'mobile_money' || editMethod === 'bank_transfer') && (
                <div>
                  <label className={labelCls}>Transaction Reference</label>
                  <input type="text" value={editRef} onChange={e => setEditRef(e.target.value)} placeholder="e.g. MTN123456" className={inputCls} />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setEditPayment(null)} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={submitEditPayment} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl flex items-center gap-2 disabled:opacity-50">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><CheckCircle className="w-4 h-4" />Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE PAYMENT CONFIRM ── */}
      {deletePayment && !receipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Payment</h3>
                <p className="text-xs text-gray-500">Loan balance will be reversed</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">Delete payment <span className="font-semibold text-gray-900">{deletePayment.receipt_number}</span> for <span className="font-semibold">{deletePayment.member_name}</span>?</p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-5">⚠ The loan balance of {ugx(deletePayment.amount_paid)} will be reversed. This can be undone from Data Management.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletePayment(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={submitDeletePayment} disabled={deleting} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {deleting ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting…</> : <><Trash2 className="w-4 h-4" />Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RECORD PAYMENT MODAL ── */}
      {showModal && !receipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-gray-900">Record Payment</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4 flex-1">
              {formErr && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{formErr}
                </div>
              )}

              {/* Auto-cashbook note */}
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>This payment will be automatically recorded in the cashbook.</span>
              </div>

              {/* Loan select */}
              <div>
                <label className={labelCls}>Select Loan <span className="text-red-500">*</span></label>
                <select value={loanId} onChange={e => setLoanId(e.target.value)} className={inputCls}>
                  <option value="">— Choose active loan —</option>
                  {actLoans.map(l => (
                    <option key={l.id} value={l.id}>{l.loan_number} — {l.member_name} | Balance: {ugx(l.balance_total)}</option>
                  ))}
                </select>
              </div>

              {/* Selected loan info */}
              {selectedLoan && (
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 grid grid-cols-2 gap-3 text-xs">
                  {[['Interest Balance', ugx(selectedLoan.balance_interest)], ['Principal Balance', ugx(selectedLoan.balance_principal)], ['Total Outstanding', ugx(selectedLoan.balance_total)]].map(([k, v]) => (
                    <div key={k}><p className="text-gray-500">{k}</p><p className="font-bold text-gray-900">{v}</p></div>
                  ))}
                </div>
              )}

              {/* Amount */}
              <div>
                <label className={labelCls}>Amount Paid (UGX) <span className="text-red-500">*</span></label>
                <input type="number" value={amtStr} onChange={e => setAmtStr(e.target.value)} min={1} step={1000} placeholder="e.g. 11000" className={inputCls} />
                {selectedLoan && amt > Number(selectedLoan.balance_total) && (
                  <p className="text-xs text-red-600 mt-1 font-medium">⚠ Amount exceeds outstanding balance of {ugx(selectedLoan.balance_total)}</p>
                )}
              </div>

              {/* Allocation preview */}
              {alloc && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-xs space-y-1.5">
                  <p className="font-semibold text-green-800 mb-2">Payment Allocation (Interest First)</p>
                  {[['Interest Portion', ugx(alloc.ip)], ['Principal Portion', ugx(alloc.pp)], ['New Balance', ugx(alloc.newBal)]].map(([k, v]) => (
                    <div key={k} className="flex justify-between"><span className="text-green-700">{k}</span><span className="font-bold text-green-900">{v}</span></div>
                  ))}
                </div>
              )}

              {/* Payment date */}
              <div>
                <label className={labelCls}>Payment Date <span className="text-red-500">*</span></label>
                <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} max={today()} className={inputCls} />
              </div>

              {/* Method */}
              <div>
                <label className={labelCls}>Payment Method <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'mobile_money', 'bank_transfer'] as const).map(m => {
                    const info = METHOD_MAP[m];
                    const MIcon = info.Icon;
                    return (
                      <button key={m} type="button" onClick={() => setMethod(m)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${method === m ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                        <MIcon className="w-4 h-4" />{info.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reference (conditional) */}
              {(method === 'mobile_money' || method === 'bank_transfer') && (
                <div>
                  <label className={labelCls}>Transaction Reference</label>
                  <input type="text" value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. MTN123456" className={inputCls} />
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex gap-3 justify-end shrink-0">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-100">Cancel</button>
              <button onClick={submitPayment} disabled={submitting || !loanId || amt <= 0}
                className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl flex items-center gap-2 disabled:opacity-50">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Recording…</> : <><CheckCircle className="w-4 h-4" />Record Payment</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
