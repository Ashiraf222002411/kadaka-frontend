'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, CheckCircle, Loader2, AlertCircle, RefreshCw,
  ShieldCheck, UserCog, BookUser, Eye, EyeOff, MoreVertical, KeyRound } from 'lucide-react';
import { users } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type User = {
  id: string; email: string; full_name: string; role: string;
  is_active: boolean; last_login: string | null; created_at: string;
};

const ROLES = [
  { value: 'loan_officer',   label: 'Loan Officer',   icon: BookUser,    color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'accountant',     label: 'Accountant',     icon: ShieldCheck, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'branch_manager', label: 'Branch Manager', icon: UserCog,     color: 'bg-green-50 text-green-700 border-green-200' },
];

const getRoleInfo = (role: string) => ROLES.find(r => r.value === role) ?? ROLES[0];

const ic = 'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors';
const lc = 'block text-xs font-semibold text-slate-700 mb-1.5';

export default function UsersPageClient() {
  const { user: me } = useAuth();
  const [list, setList]           = useState<User[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [toast, setToast]         = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showReset, setShowReset]   = useState(false);
  const [selected, setSelected]     = useState<User | null>(null);
  const [menuOpen, setMenuOpen]     = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr]       = useState('');
  const [showPwd, setShowPwd]       = useState(false);

  // create form
  const [f, setF] = useState({ full_name: '', email: '', password: '', role: 'loan_officer' });
  // reset password form
  const [newPwd, setNewPwd] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await users.getAll();
      setList((r.data ?? []) as User[]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const submitCreate = async () => {
    if (!f.full_name || !f.email || !f.password) { setFormErr('All fields are required'); return; }
    setFormErr(''); setSubmitting(true);
    try {
      await users.create(f);
      await fetchAll();
      setShowCreate(false); setF({ full_name: '', email: '', password: '', role: 'loan_officer' });
      showToast('User created successfully');
    } catch (e) { setFormErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setSubmitting(false); }
  };

  const toggleActive = async (u: User) => {
    setMenuOpen(null);
    try {
      await users.update(u.id, { is_active: !u.is_active });
      await fetchAll();
      showToast(u.is_active ? 'User deactivated' : 'User activated');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
  };

  const submitReset = async () => {
    if (!selected || newPwd.length < 6) { setFormErr('Password must be at least 6 characters'); return; }
    setFormErr(''); setSubmitting(true);
    try {
      await users.resetPassword(selected.id, newPwd);
      setShowReset(false); setNewPwd(''); setSelected(null);
      showToast('Password reset successfully');
    } catch (e) { setFormErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setSubmitting(false); }
  };

  const stats = {
    total: list.length,
    active: list.filter(u => u.is_active).length,
    byRole: ROLES.map(r => ({ ...r, count: list.filter(u => u.role === r.value).length })),
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-[60] bg-green-600 text-white px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />{toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage staff accounts and role permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { setFormErr(''); setShowCreate(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total Users</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          <p className="text-xs text-slate-500 mt-0.5">Active</p>
        </div>
        {stats.byRole.slice(0, 2).map(r => (
          <div key={r.value} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-slate-900">{r.count}</p>
            <p className="text-xs text-slate-500 mt-0.5">{r.label}s</p>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading users…</div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Name', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                    <th key={h} className={`px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map(u => {
                  const roleInfo = getRoleInfo(u.role);
                  const RoleIcon = roleInfo.icon;
                  const isMe = u.id === me?.id;
                  return (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-none">{u.full_name}</p>
                            {isMe && <span className="text-[10px] text-green-600 font-medium">You</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${roleInfo.color}`}>
                          <RoleIcon className="w-3 h-3" />{roleInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${u.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {u.last_login ? new Date(u.last_login).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {!isMe && (
                          <div className="relative inline-block">
                            <button
                              onClick={() => setMenuOpen(menuOpen === u.id ? null : u.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {menuOpen === u.id && (
                              <div className="absolute right-0 top-8 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-44">
                                <button
                                  onClick={() => { setSelected(u); setFormErr(''); setShowReset(true); setMenuOpen(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  <KeyRound className="w-3.5 h-3.5 text-slate-400" /> Reset Password
                                </button>
                                <button
                                  onClick={() => toggleActive(u)}
                                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${u.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                >
                                  <span className={`w-3.5 h-3.5 rounded-full border-2 ${u.is_active ? 'border-red-500' : 'border-green-500'}`} />
                                  {u.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                              </div>
                            )}
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

      {/* ── CREATE USER MODAL ── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Create New User</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              {formErr && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />{formErr}
                </div>
              )}
              <div>
                <label className={lc}>Full Name *</label>
                <input value={f.full_name} onChange={e => setF(p => ({...p, full_name: e.target.value}))} placeholder="e.g. Nakitaga Robert" className={ic} />
              </div>
              <div>
                <label className={lc}>Email Address *</label>
                <input type="email" value={f.email} onChange={e => setF(p => ({...p, email: e.target.value}))} placeholder="name@kadaka.ug" className={ic} />
              </div>
              <div>
                <label className={lc}>Password *</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={f.password} onChange={e => setF(p => ({...p, password: e.target.value}))} placeholder="Min. 6 characters" className={ic + ' pr-10'} />
                  <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={lc}>Role *</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(r => {
                    const Icon = r.icon;
                    return (
                      <button key={r.value} type="button" onClick={() => setF(p => ({...p, role: r.value}))}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${f.role === r.value ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
                        <Icon className="w-4 h-4" />{r.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Permissions info */}
              <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800 mb-1.5">Role Permissions</p>
                {f.role === 'branch_manager' && <p>Full access: approve/reject loans, manage users, view audit logs, all reports.</p>}
                {f.role === 'loan_officer' && <p>Can register members, create loan applications, record payments. Cannot approve loans.</p>}
                {f.role === 'accountant' && <p>Can disburse loans, manage cashbook, view financial reports. Cannot approve loans.</p>}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex gap-3 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-100">Cancel</button>
              <button onClick={submitCreate} disabled={submitting}
                className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</> : <><CheckCircle className="w-4 h-4" />Create User</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET PASSWORD MODAL ── */}
      {showReset && selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Reset Password</h3>
              <button onClick={() => { setShowReset(false); setSelected(null); }} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              {formErr && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">{formErr}</div>}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                Resetting password for <span className="font-bold">{selected.full_name}</span>
              </div>
              <div>
                <label className={lc}>New Password *</label>
                <div className="relative">
                  <input type={showNewPwd ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min. 6 characters" className={ic + ' pr-10'} />
                  <button type="button" onClick={() => setShowNewPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex gap-3 justify-end">
              <button onClick={() => { setShowReset(false); setSelected(null); }} className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-100">Cancel</button>
              <button onClick={submitReset} disabled={submitting}
                className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl flex items-center gap-2 disabled:opacity-50">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><KeyRound className="w-4 h-4" />Reset Password</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close menu on outside click */}
      {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />}
    </div>
  );
}
