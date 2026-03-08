'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, X, CheckCircle, Loader2, AlertCircle, RefreshCw, User, Eye } from 'lucide-react';
import { members, groups } from '@/lib/api';

type Member = { id: string; member_code: string; full_name: string; national_id: string; phone: string; gender: string; date_of_birth: string; district: string; village?: string; business_type: string; monthly_income: number; group_name?: string; group_id?: string; residence_status?: string; status: string; active_loans?: number; total_borrowed?: number };
type Group  = { id: string; name: string; group_code: string };
type F = { full_name: string; national_id: string; phone: string; alternative_phone: string; gender: string; date_of_birth: string; district: string; village: string; residence_status: string; landlord_name: string; landlord_phone: string; landlord_location: string; business_type: string; monthly_income: string; group_id: string; next_of_kin_name: string; next_of_kin_relationship: string; next_of_kin_phone: string };

const INIT: F = { full_name: '', national_id: '', phone: '', alternative_phone: '', gender: 'female', date_of_birth: '', district: '', village: '', residence_status: 'owned', landlord_name: '', landlord_phone: '', landlord_location: '', business_type: '', monthly_income: '', group_id: '', next_of_kin_name: '', next_of_kin_relationship: '', next_of_kin_phone: '' };
const SC: Record<string, string> = { active: 'bg-green-50 text-green-700 border-green-200', inactive: 'bg-gray-100 text-gray-600 border-gray-200', defaulted: 'bg-red-50 text-red-700 border-red-200', blacklisted: 'bg-red-100 text-red-800 border-red-300' };
const ugx = (n: number | string | null) => 'UGX ' + Number(n || 0).toLocaleString();
const Sk  = () => <div className="animate-pulse bg-gray-100 rounded-xl h-10 w-full" />;
const ic = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 focus:bg-white';
const lc = 'block text-xs font-semibold text-gray-700 mb-1.5';

export default function MembersPageClient() {
  const [list, setList] = useState<Member[]>([]);
  const [grps, setGrps] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [toast, setToast]     = useState('');
  const [search, setSearch]   = useState('');
  const [statusF, setStatusF] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView]   = useState(false);
  const [sel, setSel] = useState<Member | null>(null);
  const [step, setStep]           = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr]     = useState('');
  const [f, setF] = useState<F>(INIT);

  const upd = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }));
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [m, g] = await Promise.all([members.getAll({ limit: 200 }), groups.getAll()]);
      setList((m.data ?? []) as Member[]);
      setGrps((Array.isArray(g) ? g : (g as {data?: unknown[]}).data ?? []) as Group[]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openModal = () => { setF(INIT); setStep(1); setFormErr(''); setShowModal(true); };

  const submit = async () => {
    if (!f.full_name || !f.national_id || !f.phone || !f.date_of_birth || !f.district || !f.business_type || !f.monthly_income) { setFormErr('Fill all required fields'); return; }
    setFormErr(''); setSubmitting(true);
    try {
      await members.create({ ...f, monthly_income: Number(f.monthly_income), group_id: f.group_id || undefined, alternative_phone: f.alternative_phone || undefined, village: f.village || undefined, next_of_kin_name: f.next_of_kin_name || undefined, next_of_kin_relationship: f.next_of_kin_relationship || undefined, next_of_kin_phone: f.next_of_kin_phone || undefined, ...(f.residence_status !== 'rented' ? { landlord_name: undefined, landlord_phone: undefined, landlord_location: undefined } : {}) });
      await fetchAll(); setShowModal(false); showToast('Member registered');
    } catch (e) { setFormErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setSubmitting(false); }
  };

  const filtered = list.filter(m => { const q = search.toLowerCase(); return (!q || m.full_name?.toLowerCase().includes(q) || m.member_code?.toLowerCase().includes(q) || m.national_id?.includes(q)) && (statusF === 'all' || m.status === statusF); });
  const st = { total: list.length, active: list.filter(m => m.status === 'active').length, inactive: list.filter(m => m.status === 'inactive').length, defaulted: list.filter(m => m.status === 'defaulted').length };

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-4 right-4 z-[60] bg-green-600 text-white px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold flex items-center gap-2"><CheckCircle className="w-4 h-4" />{toast}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-xl font-extrabold text-gray-900">Members</h1><p className="text-sm text-gray-500 mt-0.5">Manage borrower registrations</p></div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={openModal} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-sm"><Plus className="w-4 h-4" />Register Member</button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([['Total', st.total, 'text-gray-900', 'bg-white'], ['Active', st.active, 'text-green-600', 'bg-green-50'], ['Inactive', st.inactive, 'text-gray-500', 'bg-white'], ['Defaulted', st.defaulted, 'text-red-600', 'bg-red-50']] as [string, number, string, string][]).map(([l, v, c, bg]) => (
          <div key={l} className={`${bg} rounded-2xl border border-gray-100 p-4 text-center shadow-sm`}><p className={`text-2xl font-extrabold ${c}`}>{v}</p><p className="text-xs text-gray-500 mt-0.5">{l}</p></div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, code, or national ID…" className="text-sm bg-transparent outline-none flex-1" />
          {search && <button onClick={() => setSearch('')}><X className="w-4 h-4 text-gray-400" /></button>}
        </div>
        <select value={statusF} onChange={e => setStatusF(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50">
          <option value="all">All Statuses</option>
          {['active','inactive','defaulted','blacklisted'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Sk key={i} />)}</div>
          : filtered.length === 0 ? <div className="p-12 text-center text-sm text-gray-400">No members found</div>
          : <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <th className="px-5 py-3 text-left">Member</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">National ID</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Group</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Business</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Borrowed</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">View</th>
              </tr></thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-white">{m.full_name?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}</span>
                        </div>
                        <div><p className="font-semibold text-gray-900">{m.full_name}</p><p className="text-xs text-gray-500 font-mono">{m.member_code}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600 hidden sm:table-cell">{m.national_id}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 hidden md:table-cell">{m.group_name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 hidden lg:table-cell">{m.business_type}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold hidden md:table-cell">{ugx(m.total_borrowed ?? 0)}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${SC[m.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>{m.status}</span></td>
                    <td className="px-5 py-3 text-center"><button onClick={() => { setSel(m); setShowView(true); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"><Eye className="w-3.5 h-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table></div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div><h3 className="font-bold text-gray-900">Register New Member</h3>
                <div className="flex gap-1.5 mt-1.5">{[1,2,3].map(s => <div key={s} className={`h-1 w-12 rounded-full ${s <= step ? 'bg-green-600' : 'bg-gray-200'}`} />)}</div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="overflow-y-auto p-6 flex-1 space-y-4">
              {formErr && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{formErr}</div>}
              {step === 1 && <div className="space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Step 1 — Personal</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className={lc}>Full Name *</label><input value={f.full_name} onChange={upd('full_name')} placeholder="First Last" className={ic} /></div>
                  <div><label className={lc}>National ID *</label><input value={f.national_id} onChange={upd('national_id')} placeholder="CM..." className={ic} /></div>
                  <div><label className={lc}>Phone *</label><input value={f.phone} onChange={upd('phone')} placeholder="07XXXXXXXX" className={ic} /></div>
                  <div><label className={lc}>Alt. Phone</label><input value={f.alternative_phone} onChange={upd('alternative_phone')} placeholder="07XXXXXXXX" className={ic} /></div>
                  <div><label className={lc}>Date of Birth *</label><input type="date" value={f.date_of_birth} onChange={upd('date_of_birth')} className={ic} /></div>
                  <div className="col-span-2"><label className={lc}>Gender *</label>
                    <div className="flex gap-3">{['female','male'].map(g => <button key={g} type="button" onClick={() => setF(p => ({ ...p, gender: g }))} className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${f.gender === g ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}`}>{g}</button>)}</div>
                  </div>
                </div>
              </div>}
              {step === 2 && <div className="space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Step 2 — Location & Business</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lc}>District *</label><input value={f.district} onChange={upd('district')} placeholder="e.g. Kampala" className={ic} /></div>
                  <div><label className={lc}>Village</label><input value={f.village} onChange={upd('village')} placeholder="e.g. Kawempe" className={ic} /></div>
                  <div className="col-span-2"><label className={lc}>Residence Status</label>
                    <div className="flex gap-3">{['owned','rented'].map(r => <button key={r} type="button" onClick={() => setF(p => ({ ...p, residence_status: r }))} className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${f.residence_status === r ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'}`}>{r}</button>)}</div>
                  </div>
                  {f.residence_status === 'rented' && <>
                    <div><label className={lc}>Landlord Name</label><input value={f.landlord_name} onChange={upd('landlord_name')} className={ic} /></div>
                    <div><label className={lc}>Landlord Phone</label><input value={f.landlord_phone} onChange={upd('landlord_phone')} className={ic} /></div>
                    <div className="col-span-2"><label className={lc}>Landlord Location</label><input value={f.landlord_location} onChange={upd('landlord_location')} className={ic} /></div>
                  </>}
                  <div><label className={lc}>Business Type *</label><input value={f.business_type} onChange={upd('business_type')} placeholder="e.g. Retail Trade" className={ic} /></div>
                  <div><label className={lc}>Monthly Income (UGX) *</label><input type="number" value={f.monthly_income} onChange={upd('monthly_income')} min={0} step={10000} className={ic} /></div>
                </div>
              </div>}
              {step === 3 && <div className="space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Step 3 — Group & Next of Kin</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className={lc}>Lending Group</label>
                    <select value={f.group_id} onChange={upd('group_id')} className={ic}>
                      <option value="">— No group —</option>
                      {grps.map(g => <option key={g.id} value={g.id}>{g.name} ({g.group_code})</option>)}
                    </select>
                  </div>
                  <div className="col-span-2"><label className={lc}>Next of Kin Name</label><input value={f.next_of_kin_name} onChange={upd('next_of_kin_name')} placeholder="Full name" className={ic} /></div>
                  <div><label className={lc}>Relationship</label><input value={f.next_of_kin_relationship} onChange={upd('next_of_kin_relationship')} placeholder="e.g. Spouse" className={ic} /></div>
                  <div><label className={lc}>Phone</label><input value={f.next_of_kin_phone} onChange={upd('next_of_kin_phone')} placeholder="07XXXXXXXX" className={ic} /></div>
                </div>
              </div>}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex gap-3 justify-end shrink-0">
              {step > 1 && <button onClick={() => setStep(s => s - 1)} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Back</button>}
              {step < 3 ? <button onClick={() => setStep(s => s + 1)} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl">Next</button>
                : <button onClick={submit} disabled={submitting} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl flex items-center gap-2 disabled:opacity-50">{submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><CheckCircle className="w-4 h-4" />Register</>}</button>}
            </div>
          </div>
        </div>
      )}

      {showView && sel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center"><User className="w-5 h-5 text-white" /></div>
                <div><h3 className="font-bold text-gray-900">{sel.full_name}</h3><p className="text-xs text-gray-500 font-mono">{sel.member_code}</p></div>
              </div>
              <button onClick={() => setShowView(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="overflow-y-auto p-6 flex-1">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {([['National ID', sel.national_id], ['Phone', sel.phone], ['Gender', sel.gender], ['District', sel.district], ['Business', sel.business_type], ['Income', ugx(sel.monthly_income)], ['Group', sel.group_name ?? '—'], ['Status', sel.status], ['Active Loans', String(sel.active_loans ?? 0)], ['Total Borrowed', ugx(sel.total_borrowed ?? 0)]] as [string,string][]).map(([k,v]) => (
                  <div key={k} className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500 mb-0.5">{k}</p><p className="font-semibold text-gray-900 capitalize">{v}</p></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
