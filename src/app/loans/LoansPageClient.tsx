'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, X, CheckCircle, XCircle, Send, Eye,
  Loader2, AlertCircle, BookOpen, RefreshCw, Upload, Camera,
} from 'lucide-react';
import { loans, members, uploadFile } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type Loan = {
  id: string; loan_number: string; member_name: string; group_name: string;
  loan_type: string; amount_applied: number; approved_amount: number;
  total_interest: number; total_repayable: number; daily_payment: number;
  status: string; balance_total: number; days_overdue: number; created_at: string;
};
type Member = { id: string; member_code: string; full_name: string; group_name: string };
type Preview = { totalInterest: number; totalRepayable: number; dailyPayment: number };

const ugx = (n: number | string | null) => 'UGX ' + Number(n || 0).toLocaleString();

const LOAN_TYPES = [
  { value: 'business',         label: 'Business' },
  { value: 'school_fees',      label: 'School Fees' },
  { value: 'home_improvement', label: 'Home Improvement' },
  { value: 'emergency',        label: 'Emergency' },
  { value: 'agriculture',      label: 'Agriculture' },
  { value: 'salary',           label: 'Salary' },
];

const TYPE_COLORS: Record<string, string> = {
  business: 'bg-green-50 text-green-700', school_fees: 'bg-blue-50 text-blue-700',
  home_improvement: 'bg-teal-50 text-teal-700', emergency: 'bg-red-50 text-red-700',
  agriculture: 'bg-emerald-50 text-emerald-700', salary: 'bg-purple-50 text-purple-700',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200', approved: 'bg-blue-50 text-blue-700 border-blue-200',
  disbursed: 'bg-purple-50 text-purple-700 border-purple-200', active: 'bg-green-50 text-green-700 border-green-200',
  cleared: 'bg-gray-100 text-gray-600 border-gray-200', rejected: 'bg-red-50 text-red-700 border-red-200',
};

const Sk = () => <div className="animate-pulse bg-gray-100 rounded-xl h-10 w-full" />;

// ── Modal defined OUTSIDE component to prevent focus loss on re-render ────────
const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 focus:bg-white';
const labelCls = 'block text-xs font-semibold text-gray-700 mb-1.5';

function Modal({
  title, onClose, children, footer,
}: {
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto p-6 flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex gap-3 justify-end shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── FileUploadField component (also outside) ──────────────────────────────────
function FileUploadField({
  label, accept, onUploaded, uploading, setUploading, uploaded,
}: {
  label: string; accept: string;
  onUploaded: (url: string) => void;
  uploading: boolean; setUploading: (v: boolean) => void;
  uploaded: boolean;
}) {
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadFile(file);
      onUploaded(url);
    } catch { /* ignore */ }
    finally { setUploading(false); }
  };
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <label className={`flex items-center gap-3 px-3 py-2.5 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploaded ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-green-300 bg-gray-50'}`}>
        {uploading ? <Loader2 className="w-4 h-4 animate-spin text-green-600" /> : uploaded ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Upload className="w-4 h-4 text-gray-400" />}
        <span className={`text-xs font-medium ${uploaded ? 'text-green-700' : 'text-gray-500'}`}>
          {uploading ? 'Uploading…' : uploaded ? 'Uploaded ✓' : 'Click to choose file'}
        </span>
        <input type="file" accept={accept} onChange={handleChange} className="hidden" />
      </label>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function LoansPageClient() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const canApprove  = role === 'branch_manager';
  const canDisburse = role === 'branch_manager' || role === 'accountant';
  const canCreate   = role === 'branch_manager' || role === 'loan_officer';

  const [loanList,   setLoanList]   = useState<Loan[]>([]);
  const [memberList, setMemberList] = useState<Member[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [toast,      setToast]      = useState('');
  const [search,     setSearch]     = useState('');
  const [statusF,    setStatusF]    = useState('all');

  // modals
  const [showNew,      setShowNew]      = useState(false);
  const [showApprove,  setShowApprove]  = useState(false);
  const [showReject,   setShowReject]   = useState(false);
  const [showDisburse, setShowDisburse] = useState(false);
  const [showView,     setShowView]     = useState(false);
  const [selected,     setSelected]     = useState<Loan | null>(null);

  // new loan form — 4 steps
  const [step,      setStep]      = useState(1);
  const [memberId,  setMemberId]  = useState('');
  const [loanType,  setLoanType]  = useState('business');
  const [amount,    setAmount]    = useState('');
  const [purpose,   setPurpose]   = useState('');
  const [preview,   setPreview]   = useState<Preview | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // step 3 — assets & docs
  const [assetDesc,  setAssetDesc]  = useState('');
  const [assetValue, setAssetValue] = useState('');
  const [nokPhotoUrl, setNokPhotoUrl] = useState('');
  const [supportingDocUrl, setSupportingDocUrl] = useState('');
  const [uploadingNok, setUploadingNok] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // approve
  const [approveAmt, setApproveAmt] = useState('');
  const [appPreview, setAppPreview] = useState<Preview | null>(null);

  // reject
  const [rejectReason, setRejectReason] = useState('');

  // disburse
  const [disbMethod, setDisbMethod] = useState('cash');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchLoans = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await loans.getAll();
      setLoanList((r.data ?? []) as Loan[]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load loans'); }
    finally { setLoading(false); }
  }, []);

  const fetchMembers = useCallback(async () => {
    try { const r = await members.getAll({ limit: 200 }); setMemberList((r.data ?? []) as Member[]); } catch {}
  }, []);

  useEffect(() => { fetchLoans(); fetchMembers(); }, [fetchLoans, fetchMembers]);

  // Debounce preview fetches to avoid race conditions from rapid typing
  useEffect(() => {
    if (!amount || Number(amount) < 1000) { setPreview(null); return; }
    const id = setTimeout(() => {
      loans.preview(Number(amount)).then(setPreview).catch(() => {});
    }, 400);
    return () => clearTimeout(id);
  }, [amount]);

  useEffect(() => {
    if (!approveAmt || Number(approveAmt) < 1000) { setAppPreview(null); return; }
    const id = setTimeout(() => {
      loans.preview(Number(approveAmt)).then(setAppPreview).catch(() => {});
    }, 400);
    return () => clearTimeout(id);
  }, [approveAmt]);

  const filtered = loanList.filter(l => {
    const q = search.toLowerCase();
    const matchQ = !q || l.member_name?.toLowerCase().includes(q) || l.loan_number?.toLowerCase().includes(q);
    const matchS = statusF === 'all' || l.status === statusF;
    return matchQ && matchS;
  });

  const stats = {
    total: loanList.length,
    active: loanList.filter(l => l.status === 'active').length,
    pending: loanList.filter(l => l.status === 'pending').length,
    overdue: loanList.filter(l => Number(l.days_overdue) > 0).length,
  };

  const resetNewForm = () => {
    setStep(1); setMemberId(''); setLoanType('business'); setAmount('');
    setPurpose(''); setPreview(null); setAssetDesc(''); setAssetValue('');
    setNokPhotoUrl(''); setSupportingDocUrl('');
  };

  const submitLoan = async () => {
    if (!memberId || !amount) return;
    setSubmitting(true);
    try {
      const assets = assetDesc ? [{ description: assetDesc, approximate_value: Number(assetValue) || 0 }] : [];
      await loans.create({
        member_id: memberId, loan_type: loanType, amount_applied: Number(amount),
        purpose, assets,
        nok_photo_url: nokPhotoUrl || undefined,
        supporting_doc_url: supportingDocUrl || undefined,
      });
      await fetchLoans();
      setShowNew(false); resetNewForm();
      showToast('Loan application submitted successfully');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to submit'); }
    finally { setSubmitting(false); }
  };

  const submitApprove = async () => {
    if (!selected || !approveAmt) return;
    setSubmitting(true);
    try {
      await loans.approve(selected.id, Number(approveAmt));
      await fetchLoans(); setShowApprove(false); setApproveAmt(''); setSelected(null);
      showToast('Loan approved successfully');
    } catch (e) { setError(e instanceof Error ? e.message : 'Approval failed'); }
    finally { setSubmitting(false); }
  };

  const submitReject = async () => {
    if (!selected || !rejectReason) return;
    setSubmitting(true);
    try {
      await loans.reject(selected.id, rejectReason);
      await fetchLoans(); setShowReject(false); setRejectReason(''); setSelected(null);
      showToast('Loan rejected');
    } catch (e) { setError(e instanceof Error ? e.message : 'Rejection failed'); }
    finally { setSubmitting(false); }
  };

  const submitDisburse = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await loans.disburse(selected.id, disbMethod);
      await fetchLoans(); setShowDisburse(false); setSelected(null);
      showToast('Loan disbursed — cashbook entry created automatically');
    } catch (e) { setError(e instanceof Error ? e.message : 'Disbursement failed'); }
    finally { setSubmitting(false); }
  };

  const openApprove  = (l: Loan) => { setSelected(l); setApproveAmt(String(l.amount_applied)); setShowApprove(true); };
  const openReject   = (l: Loan) => { setSelected(l); setShowReject(true); };
  const openDisburse = (l: Loan) => { setSelected(l); setShowDisburse(true); };
  const openView     = (l: Loan) => { setSelected(l); setShowView(true); };

  const step1Valid = memberId && amount && Number(amount) >= 1000;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-[60] bg-green-600 text-white px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Loans</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage the full loan lifecycle</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchLoans} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-500"><RefreshCw className="w-4 h-4" /></button>
          {canCreate && (
            <button onClick={() => { resetNewForm(); setShowNew(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> New Loan Application
            </button>
          )}
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['Total Loans', stats.total, 'text-gray-900'], ['Active', stats.active, 'text-green-600'], ['Pending', stats.pending, 'text-amber-600'], ['Overdue', stats.overdue, 'text-red-600']].map(([l, v, c]) => (
          <div key={String(l)} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className={`text-2xl font-extrabold ${c}`}>{v}</p>
            <p className="text-xs text-gray-500 mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by member name or loan number…" className="text-sm bg-transparent outline-none flex-1" />
        </div>
        <select value={statusF} onChange={e => setStatusF(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50">
          <option value="all">All Statuses</option>
          {['pending','approved','disbursed','active','cleared','rejected'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Sk key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">No loans found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Loan #</th>
                <th className="px-4 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Type</th>
                <th className="px-4 py-3 text-right">Applied</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Balance</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center hidden md:table-cell">Overdue</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono font-semibold text-xs text-gray-700">{l.loan_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{l.member_name}</p>
                      <p className="text-xs text-gray-500">{l.group_name}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${TYPE_COLORS[l.loan_type] ?? 'bg-gray-100 text-gray-600'}`}>{l.loan_type?.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 text-xs">{ugx(l.amount_applied)}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-gray-700 hidden md:table-cell">{ugx(l.balance_total)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${STATUS_COLORS[l.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>{l.status}</span>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      {Number(l.days_overdue) > 0 ? <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-[10px] font-bold border border-red-100">{l.days_overdue}d</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openView(l)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                        {canApprove && l.status === 'pending' && (
                          <>
                            <button onClick={() => openApprove(l)} className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"><CheckCircle className="w-3 h-3" />Approve</button>
                            <button onClick={() => openReject(l)} className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-[10px] font-bold border border-red-200 transition-colors flex items-center gap-1"><XCircle className="w-3 h-3" />Reject</button>
                          </>
                        )}
                        {canDisburse && l.status === 'approved' && (
                          <button onClick={() => openDisburse(l)} className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[10px] font-bold border border-purple-200 transition-colors flex items-center gap-1"><Send className="w-3 h-3" />Disburse</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── NEW LOAN MODAL (4 steps) ── */}
      {showNew && (
        <Modal
          title={`New Loan Application — Step ${step} of 4`}
          onClose={() => { setShowNew(false); resetNewForm(); }}
          footer={
            <>
              {step > 1 && <button onClick={() => setStep(s => s - 1)} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Back</button>}
              {step < 4 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={step === 1 && !step1Valid}
                  className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl disabled:opacity-50"
                >Next</button>
              ) : (
                <button
                  onClick={submitLoan}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Submit Application
                </button>
              )}
            </>
          }
        >
          {/* Step 1 — Loan Details */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Step 1 — Loan Details</p>
              <div>
                <label className={labelCls}>Member <span className="text-red-500">*</span></label>
                <select value={memberId} onChange={e => setMemberId(e.target.value)} className={inputCls}>
                  <option value="">— Select member —</option>
                  {memberList.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.member_code}) — {m.group_name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Loan Type <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {LOAN_TYPES.map(t => (
                    <button key={t.value} type="button" onClick={() => setLoanType(t.value)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold border-2 transition-all text-left ${loanType === t.value ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Amount Applied (UGX) <span className="text-red-500">*</span></label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min={1000} step={1000} placeholder="e.g. 300000" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Purpose (Optional)</label>
                <textarea value={purpose} onChange={e => setPurpose(e.target.value)} rows={2} placeholder="Brief description of loan purpose…" className={inputCls} />
              </div>
            </div>
          )}

          {/* Step 2 — Calculation Preview */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Step 2 — Loan Preview</p>
              {preview ? (
                <div className="bg-green-50 border border-green-100 rounded-xl p-5 space-y-3">
                  {[
                    ['Principal', ugx(amount)],
                    ['Interest (20%)', ugx(preview.totalInterest)],
                    ['Total Repayable', ugx(preview.totalRepayable)],
                    ['Daily Payment (30 days)', ugx(preview.dailyPayment)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-gray-600">{k}</span>
                      <span className="font-bold text-gray-900">{v}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400">Loading preview…</p>}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 font-medium">
                ℹ️ Interest is 20% flat on principal over 30 days. Repayment is on a daily basis; interest is allocated first, then principal.
              </div>
            </div>
          )}

          {/* Step 3 — Assets & Documents */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Step 3 — Assets & Documents</p>
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-700">Assets Attached (Optional)</p>
                <div>
                  <label className={labelCls}>Asset Description</label>
                  <input type="text" value={assetDesc} onChange={e => setAssetDesc(e.target.value)} placeholder="e.g. Motorcycle, TV, Land title…" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Approximate Value (UGX)</label>
                  <input type="number" value={assetValue} onChange={e => setAssetValue(e.target.value)} min={0} step={10000} placeholder="e.g. 500000" className={inputCls} />
                </div>
              </div>
              <FileUploadField
                label="Next of Kin / Guarantor Photo"
                accept="image/*"
                onUploaded={setNokPhotoUrl}
                uploading={uploadingNok}
                setUploading={setUploadingNok}
                uploaded={!!nokPhotoUrl}
              />
              <FileUploadField
                label="Supporting Document (PDF/Image)"
                accept=".pdf,image/*"
                onUploaded={setSupportingDocUrl}
                uploading={uploadingDoc}
                setUploading={setUploadingDoc}
                uploaded={!!supportingDocUrl}
              />
              <p className="text-xs text-gray-400">Documents are optional but recommended for the loan file.</p>
            </div>
          )}

          {/* Step 4 — Confirm */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Step 4 — Confirm Application</p>
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2 text-sm">
                {[
                  ['Member', memberList.find(m => m.id === memberId)?.full_name ?? '—'],
                  ['Loan Type', loanType.replace(/_/g, ' ')],
                  ['Amount Applied', ugx(amount)],
                  ['Total Repayable', preview ? ugx(preview.totalRepayable) : '—'],
                  ['Daily Payment', preview ? ugx(preview.dailyPayment) : '—'],
                  ['Purpose', purpose || '—'],
                  ['Assets', assetDesc || '—'],
                  ['NOK Photo', nokPhotoUrl ? '✓ Uploaded' : 'None'],
                  ['Supporting Doc', supportingDocUrl ? '✓ Uploaded' : 'None'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-semibold text-gray-900 capitalize">{v}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">This will create a loan application awaiting Branch Manager approval.</p>
            </div>
          )}
        </Modal>
      )}

      {/* ── APPROVE MODAL ── */}
      {showApprove && selected && (
        <Modal title="Approve Loan" onClose={() => { setShowApprove(false); setSelected(null); }}
          footer={<>
            <button onClick={() => setShowApprove(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
            <button onClick={submitApprove} disabled={submitting || !approveAmt} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl flex items-center gap-2 disabled:opacity-50">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}<CheckCircle className="w-4 h-4" /> Approve Loan
            </button>
          </>}>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm">
              <p className="font-semibold text-green-800">{selected.member_name} — {selected.loan_number}</p>
              <p className="text-green-700">Applied: {ugx(selected.amount_applied)}</p>
            </div>
            <div>
              <label className={labelCls}>Approved Amount (UGX) <span className="text-red-500">*</span></label>
              <input type="number" value={approveAmt} onChange={e => setApproveAmt(e.target.value)} min={1000} className={inputCls} />
            </div>
            {appPreview && (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2 text-sm">
                {[['Total Interest', ugx(appPreview.totalInterest)], ['Total Repayable', ugx(appPreview.totalRepayable)], ['Daily Payment', ugx(appPreview.dailyPayment)]].map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span className="text-gray-500">{k}</span><span className="font-bold">{v}</span></div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── REJECT MODAL ── */}
      {showReject && selected && (
        <Modal title="Reject Loan" onClose={() => { setShowReject(false); setSelected(null); }}
          footer={<>
            <button onClick={() => setShowReject(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
            <button onClick={submitReject} disabled={submitting || !rejectReason} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center gap-2 disabled:opacity-50">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}<XCircle className="w-4 h-4" /> Reject Loan
            </button>
          </>}>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm">
              <p className="font-semibold text-red-800">{selected.member_name} — {selected.loan_number}</p>
              <p className="text-red-600">Applied: {ugx(selected.amount_applied)}</p>
            </div>
            <div>
              <label className={labelCls}>Rejection Reason <span className="text-red-500">*</span></label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4} placeholder="Explain why this loan is being rejected…" className={inputCls} />
            </div>
          </div>
        </Modal>
      )}

      {/* ── DISBURSE MODAL ── */}
      {showDisburse && selected && (
        <Modal title="Disburse Loan" onClose={() => { setShowDisburse(false); setSelected(null); }}
          footer={<>
            <button onClick={() => setShowDisburse(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
            <button onClick={submitDisburse} disabled={submitting} className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl flex items-center gap-2 disabled:opacity-50">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}<Send className="w-4 h-4" /> Confirm Disbursement
            </button>
          </>}>
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-sm">
              <p className="font-semibold text-purple-800">{selected.member_name} — {selected.loan_number}</p>
              <p className="text-purple-700">Approved: {ugx(selected.approved_amount)}</p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
              <BookOpen className="w-4 h-4 shrink-0 mt-0.5" />
              <span>A cashbook disbursement entry will be created automatically — no need to record it manually.</span>
            </div>
            <div>
              <label className={labelCls}>Disbursement Method</label>
              <select value={disbMethod} onChange={e => setDisbMethod(e.target.value)} className={inputCls}>
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* ── VIEW MODAL ── */}
      {showView && selected && (
        <Modal title={`Loan Details — ${selected.loan_number}`} onClose={() => { setShowView(false); setSelected(null); }}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Member', selected.member_name], ['Group', selected.group_name],
                ['Type', selected.loan_type?.replace(/_/g, ' ')], ['Status', selected.status],
                ['Amount Applied', ugx(selected.amount_applied)], ['Approved', ugx(selected.approved_amount)],
                ['Total Interest', ugx(selected.total_interest)], ['Total Repayable', ugx(selected.total_repayable)],
                ['Daily Payment', ugx(selected.daily_payment)], ['Balance', ugx(selected.balance_total)],
                ['Days Overdue', selected.days_overdue > 0 ? `${selected.days_overdue} days` : 'None'],
              ].map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-0.5">{k}</p>
                  <p className="font-semibold text-gray-900 capitalize">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
