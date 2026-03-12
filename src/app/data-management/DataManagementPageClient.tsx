'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database, Trash2, RotateCcw, Download, AlertTriangle,
  Users, CreditCard, Banknote, RefreshCw, Search,
  ShieldAlert, CheckCircle, FileText, ChevronLeft, ChevronRight,
  BarChart3, FileSpreadsheet,
} from 'lucide-react';
import { dataManagement } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const ugx = (n: number | string | null) => 'UGX ' + Number(n || 0).toLocaleString();

// ── Types ───────────────────────────────────────────────────────────────────
type TrashStats = { member: number; loan: number; payment: number; total: number };
type DeletedRecord = {
  id: string; record_type: string; record_id: string;
  record_data: Record<string, unknown>; deleted_by_name: string | null; deleted_at: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const TZ = 'Africa/Kampala';
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ });
}
function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('en-UG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ });
}

// ── CSV Export helper ────────────────────────────────────────────────────────
function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape  = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}

function downloadCSV(data: string, filename: string) {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Tab type ─────────────────────────────────────────────────────────────────
type Tab = 'export' | 'trash' | 'reset';

// ── Badge ────────────────────────────────────────────────────────────────────
function Badge({ n, color = 'gray' }: { n: number; color?: 'red' | 'amber' | 'gray' | 'green' }) {
  const cls = {
    red:   'bg-red-100 text-red-700 border border-red-200',
    amber: 'bg-amber-100 text-amber-700 border border-amber-200',
    green: 'bg-green-100 text-green-700 border border-green-200',
    gray:  'bg-gray-100 text-gray-600 border border-gray-200',
  }[color];
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{n}</span>;
}

// ── Icon for record type ──────────────────────────────────────────────────────
function RecordIcon({ type }: { type: string }) {
  if (type === 'member')  return <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center"><Users className="w-4 h-4 text-blue-600" /></div>;
  if (type === 'loan')    return <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center"><CreditCard className="w-4 h-4 text-purple-600" /></div>;
  if (type === 'payment') return <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center"><Banknote className="w-4 h-4 text-green-600" /></div>;
  return <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"><Database className="w-4 h-4 text-gray-500" /></div>;
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function DataManagementPageClient() {
  const { user } = useAuth();
  const [tab,        setTab]        = useState<Tab>('export');
  const [stats,      setStats]      = useState<TrashStats | null>(null);
  const [trashRows,  setTrashRows]  = useState<DeletedRecord[]>([]);
  const [trashTotal, setTrashTotal] = useState(0);
  const [trashPage,  setTrashPage]  = useState(1);
  const [trashType,  setTrashType]  = useState('');
  const [trashSearch,setTrashSearch]= useState('');
  const [loading,    setLoading]    = useState(false);
  const [exporting,  setExporting]  = useState(false);
  const [restoring,  setRestoring]  = useState<string | null>(null);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  // Reset confirmation modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmText, setConfirmText]       = useState('');
  const [resetting,   setResetting]         = useState(false);

  // Guard — branch_manager only
  if (user && user.role !== 'branch_manager') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-10 text-center max-w-sm">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-500">Only branch managers can access Data Management.</p>
        </div>
      </div>
    );
  }

  const fetchStats = useCallback(async () => {
    try { setStats(await dataManagement.getStats()); } catch { /* ignore */ }
  }, []);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(trashPage), limit: '20' };
      if (trashType) params.type = trashType;
      const res = await dataManagement.getTrash(params) as { data: DeletedRecord[]; total: number };
      setTrashRows(res.data);
      setTrashTotal(res.total);
    } catch { setError('Failed to load recycle bin.'); }
    finally { setLoading(false); }
  }, [trashPage, trashType]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (tab === 'trash') fetchTrash(); }, [tab, fetchTrash]);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async (sheet: 'members' | 'loans' | 'payments' | 'cashbook' | 'all') => {
    setExporting(true); setError(''); setSuccess('');
    try {
      const data = await dataManagement.exportData() as { members: Record<string, unknown>[]; loans: Record<string, unknown>[]; payments: Record<string, unknown>[]; cashbook: Record<string, unknown>[] };
      const today = new Date().toLocaleDateString('en-CA', { timeZone: TZ });

      if (sheet === 'all') {
        // Download all 4 sheets
        for (const key of ['members', 'loans', 'payments', 'cashbook'] as const) {
          const csv = toCSV(data[key]);
          if (csv) downloadCSV(csv, `kadaka_${key}_${today}.csv`);
        }
        setSuccess('All 4 sheets downloaded!');
      } else {
        const csv = toCSV(data[sheet]);
        if (!csv) { setError('No data found to export.'); return; }
        downloadCSV(csv, `kadaka_${sheet}_${today}.csv`);
        setSuccess(`${sheet.charAt(0).toUpperCase() + sheet.slice(1)} exported successfully!`);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Export failed.'); }
    finally { setExporting(false); }
  };

  // ── Restore ───────────────────────────────────────────────────────────────
  const handleRestore = async (id: string) => {
    setRestoring(id); setError(''); setSuccess('');
    try {
      await dataManagement.restore(id);
      setSuccess('Record restored successfully!');
      fetchStats();
      fetchTrash();
    } catch (e) { setError(e instanceof Error ? e.message : 'Restore failed.'); }
    finally { setRestoring(null); }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = async () => {
    if (confirmText !== 'DELETE') return;
    setResetting(true); setError(''); setSuccess('');
    try {
      const res = await dataManagement.resetData() as { message: string; deleted: { members: number; loans: number; payments: number } };
      setSuccess(`Reset complete — ${res.deleted.members} members, ${res.deleted.loans} loans, ${res.deleted.payments} payments moved to recycle bin.`);
      setShowResetModal(false);
      setConfirmText('');
      fetchStats();
    } catch (e) { setError(e instanceof Error ? e.message : 'Reset failed.'); }
    finally { setResetting(false); }
  };

  // ── Filtered trash ────────────────────────────────────────────────────────
  const displayedTrash = trashRows.filter(r => {
    if (!trashSearch) return true;
    const q = trashSearch.toLowerCase();
    const d = r.record_data;
    return (
      String(d.full_name ?? '').toLowerCase().includes(q) ||
      String(d.member_code ?? '').toLowerCase().includes(q) ||
      String(d.loan_number ?? '').toLowerCase().includes(q) ||
      String(d.receipt_number ?? '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(trashTotal / 20);

  return (
    <div className="space-y-6">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center shadow-sm">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Data Management</h1>
              <p className="text-sm text-gray-500">Export data, manage records, and recover deleted items</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error   && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
        {success && <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2"><CheckCircle className="w-4 h-4 shrink-0" />{success}</div>}

        {/* Stat strip */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Deleted Members',  value: stats.member,  icon: Users,      color: 'blue' },
              { label: 'Deleted Loans',    value: stats.loan,    icon: CreditCard, color: 'purple' },
              { label: 'Deleted Payments', value: stats.payment, icon: Banknote,   color: 'green' },
              { label: 'Total in Trash',   value: stats.total,   icon: Trash2,     color: 'red' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <div className={`w-8 h-8 rounded-xl bg-${color}-100 flex items-center justify-center mb-2`}>
                  <Icon className={`w-4 h-4 text-${color}-600`} />
                </div>
                <p className="text-2xl font-extrabold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-6 shadow-sm w-fit">
          {([
            { key: 'export', label: 'Export Data',    icon: Download },
            { key: 'trash',  label: 'Recycle Bin',    icon: Trash2 },
            { key: 'reset',  label: 'Reset Data',     icon: ShieldAlert },
          ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setError(''); setSuccess(''); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? key === 'reset'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-green-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {key === 'trash' && stats && stats.total > 0 && (
                <Badge n={stats.total} color="red" />
              )}
            </button>
          ))}
        </div>

        {/* ── EXPORT TAB ─────────────────────────────────────────────── */}
        {tab === 'export' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 flex items-start gap-2">
              <FileText className="w-4 h-4 shrink-0 mt-0.5" />
              <span>All exports are in CSV format — you can open them in Excel, Google Sheets, or any spreadsheet application.</span>
            </div>

            {/* Export all button */}
            <button
              onClick={() => handleExport('all')}
              disabled={exporting}
              className="w-full flex items-center gap-3 px-5 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-sm font-semibold transition-all disabled:opacity-60"
            >
              <FileSpreadsheet className="w-5 h-5 shrink-0" />
              <div className="text-left flex-1">
                <p className="font-bold">Export All Data (4 files)</p>
                <p className="text-xs text-green-100 font-normal mt-0.5">Downloads Members + Loans + Payments + Cashbook as separate CSV files</p>
              </div>
              {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>

            {/* Individual sheets */}
            <div className="grid sm:grid-cols-2 gap-3">
              {([
                { key: 'members',  label: 'Members',  desc: 'All registered members with personal details', icon: Users,         color: 'blue' },
                { key: 'loans',    label: 'Loans',    desc: 'All loans — amounts, status, repayment info',  icon: CreditCard,    color: 'purple' },
                { key: 'payments', label: 'Payments', desc: 'All recorded payments with allocations',       icon: Banknote,      color: 'green' },
                { key: 'cashbook', label: 'Cashbook', desc: 'All cashbook transactions (auto + manual)',    icon: BarChart3,     color: 'amber' },
              ] as { key: 'members' | 'loans' | 'payments' | 'cashbook'; label: string; desc: string; icon: React.ElementType; color: string }[]).map(({ key, label, desc, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => handleExport(key)}
                  disabled={exporting}
                  className="flex items-center gap-3 px-4 py-4 bg-white border border-slate-200 hover:border-green-300 hover:bg-green-50 rounded-2xl text-left shadow-sm transition-all disabled:opacity-60 group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-${color}-100 flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 text-${color}-600`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                  <Download className="w-4 h-4 text-gray-300 group-hover:text-green-600 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── TRASH TAB ──────────────────────────────────────────────── */}
        {tab === 'trash' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-48 focus-within:ring-2 focus-within:ring-green-500/20 focus-within:border-green-400">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search by name, code, loan/receipt number…"
                  value={trashSearch}
                  onChange={e => setTrashSearch(e.target.value)}
                  className="text-sm bg-transparent outline-none flex-1 text-slate-700 placeholder-slate-400"
                />
              </div>
              <select
                value={trashType}
                onChange={e => { setTrashType(e.target.value); setTrashPage(1); }}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
              >
                <option value="">All types</option>
                <option value="member">Members</option>
                <option value="loan">Loans</option>
                <option value="payment">Payments</option>
              </select>
              <button onClick={() => { fetchStats(); fetchTrash(); }} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <p className="text-sm font-semibold text-gray-700">Recycle Bin <span className="ml-1 text-gray-400 font-normal">({trashTotal} records)</span></p>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading…</div>
              ) : displayedTrash.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Trash2 className="w-10 h-10 mb-3 text-gray-300" />
                  <p className="text-sm font-medium">Recycle bin is empty</p>
                  <p className="text-xs mt-1">Deleted records will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                        <th className="px-5 py-3 text-left">Record</th>
                        <th className="px-4 py-3 text-left hidden md:table-cell">Details</th>
                        <th className="px-4 py-3 text-left hidden sm:table-cell">Deleted by</th>
                        <th className="px-4 py-3 text-left hidden lg:table-cell">Deleted at</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedTrash.map((rec) => {
                        const d = rec.record_data;
                        const title =
                          rec.record_type === 'member'  ? String(d.full_name ?? '—') :
                          rec.record_type === 'loan'    ? String(d.loan_number ?? '—') :
                          rec.record_type === 'payment' ? String(d.receipt_number ?? '—') : '—';
                        const sub =
                          rec.record_type === 'member'  ? String(d.member_code ?? '') :
                          rec.record_type === 'loan'    ? `${ugx(d.approved_amount as number)} — ${String(d.status ?? '')}` :
                          rec.record_type === 'payment' ? ugx(d.amount_paid as number) : '';
                        return (
                          <tr key={rec.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <RecordIcon type={rec.record_type} />
                                <div>
                                  <p className="font-semibold text-gray-900">{title}</p>
                                  <p className="text-xs text-gray-500 capitalize">{rec.record_type}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">{sub}</td>
                            <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{rec.deleted_by_name ?? 'System'}</td>
                            <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">{fmtDateTime(rec.deleted_at)}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleRestore(rec.id)}
                                disabled={restoring === rec.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                              >
                                {restoring === rec.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                Restore
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-sm text-gray-500">
                  <span>Page {trashPage} of {totalPages}</span>
                  <div className="flex gap-2">
                    <button disabled={trashPage <= 1} onClick={() => setTrashPage(p => p - 1)}
                      className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button disabled={trashPage >= totalPages} onClick={() => setTrashPage(p => p + 1)}
                      className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── RESET TAB ──────────────────────────────────────────────── */}
        {tab === 'reset' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Danger Zone</p>
                <p className="mt-0.5">This will soft-delete ALL members, loans, payments and cashbook entries for your branch. Records will be moved to the recycle bin and can be restored. This action is logged in the audit trail.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                Reset All Branch Data
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Use this only when you want to start completely fresh. All data will be preserved in the recycle bin for 90 days and can be restored any time.
              </p>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 text-sm">
                  <p className="font-semibold text-gray-700 mb-2">What will be deleted:</p>
                  <ul className="space-y-1.5 text-gray-600">
                    <li className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /> All registered members</li>
                    <li className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-purple-400" /> All loan applications and active loans</li>
                    <li className="flex items-center gap-2"><Banknote className="w-4 h-4 text-green-400" /> All recorded payments</li>
                    <li className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-amber-400" /> All cashbook transactions</li>
                  </ul>
                </div>

                <button
                  onClick={() => setShowResetModal(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Reset All Data
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ── Reset Confirmation Modal ───────────────────────────────────────── */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Confirm Data Reset</h3>
                  <p className="text-xs text-gray-500">This action will soft-delete all branch data</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                <strong>Warning:</strong> All members, loans, payments and cashbook entries will be moved to the recycle bin. You can restore them at any time.
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 px-6 pb-6">
              <button
                onClick={() => { setShowResetModal(false); setConfirmText(''); }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={confirmText !== 'DELETE' || resetting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all"
              >
                {resetting ? <><RefreshCw className="w-4 h-4 animate-spin" />Resetting…</> : <><Trash2 className="w-4 h-4" />Reset Now</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
