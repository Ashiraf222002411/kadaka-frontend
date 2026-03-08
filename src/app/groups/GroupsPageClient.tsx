'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, X, CheckCircle, Loader2, AlertCircle, RefreshCw, FolderOpen, Users, Eye } from 'lucide-react';
import { groups } from '@/lib/api';

type Group = { id: string; group_code: string; name: string; registration_number?: string; leader_name?: string; leader_phone?: string; meeting_day?: string; meeting_time?: string; location?: string; district?: string; status: string; member_count?: number; active_loans?: number; total_portfolio?: number };
type F = { name: string; registration_number: string; leader_name: string; leader_phone: string; meeting_day: string; meeting_time: string; location: string; district: string; status: string };
const INIT: F = { name: '', registration_number: '', leader_name: '', leader_phone: '', meeting_day: 'Monday', meeting_time: '09:00', location: '', district: '', status: 'active' };
const ugx = (n: number | string | null) => 'UGX ' + Number(n || 0).toLocaleString();
const Sk = () => <div className="animate-pulse bg-gray-100 rounded-xl h-24 w-full" />;
const ic = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 focus:bg-white';
const lc = 'block text-xs font-semibold text-gray-700 mb-1.5';

export default function GroupsPageClient() {
  const [list, setList]         = useState<Group[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [toast, setToast]       = useState('');
  const [search, setSearch]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showView, setShowView]   = useState(false);
  const [sel, setSel]           = useState<Group | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr]   = useState('');
  const [f, setF]               = useState<F>(INIT);

  const upd = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }));
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try { const r = await groups.getAll(); setList((Array.isArray(r) ? r : (r as {data?: unknown[]}).data ?? []) as Group[]); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const submit = async () => {
    if (!f.name || !f.leader_name || !f.leader_phone || !f.location || !f.district) { setFormErr('Fill all required fields'); return; }
    setFormErr(''); setSubmitting(true);
    try {
      await groups.create({ ...f, registration_number: f.registration_number || undefined });
      await fetchAll(); setShowModal(false); setF(INIT); showToast('Group registered successfully');
    } catch (e) { setFormErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setSubmitting(false); }
  };

  const filtered = list.filter(g => !search || g.name?.toLowerCase().includes(search.toLowerCase()) || g.group_code?.toLowerCase().includes(search.toLowerCase()));
  const st = { total: list.length, active: list.filter(g => g.status === 'active').length, members: list.reduce((s, g) => s + Number(g.member_count ?? 0), 0), portfolio: list.reduce((s, g) => s + Number(g.total_portfolio ?? 0), 0) };

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-4 right-4 z-[60] bg-green-600 text-white px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold flex items-center gap-2"><CheckCircle className="w-4 h-4" />{toast}</div>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-xl font-extrabold text-gray-900">Groups</h1><p className="text-sm text-gray-500 mt-0.5">Manage lending groups</p></div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => { setF(INIT); setFormErr(''); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-sm"><Plus className="w-4 h-4" />Add Group</button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([['Total Groups', st.total, 'text-gray-900'], ['Active', st.active, 'text-green-600'], ['Total Members', st.members, 'text-blue-600'], ['Portfolio', ugx(st.portfolio), 'text-purple-600']] as [string, string|number, string][]).map(([l,v,c]) => (
          <div key={l} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center"><p className={`text-2xl font-extrabold ${c}`}>{v}</p><p className="text-xs text-gray-500 mt-0.5">{l}</p></div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search groups…" className="text-sm bg-transparent outline-none flex-1" />
          {search && <button onClick={() => setSearch('')}><X className="w-4 h-4 text-gray-400" /></button>}
        </div>
      </div>

      {loading ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(4)].map((_, i) => <Sk key={i} />)}</div>
        : filtered.length === 0 ? <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-sm text-gray-400">No groups found</div>
        : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(g => (
              <div key={g.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-sm">
                      <FolderOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 leading-none">{g.name}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{g.group_code}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${g.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>{g.status}</span>
                </div>
                <div className="space-y-2 text-xs text-gray-600 mb-4">
                  {g.leader_name && <div className="flex justify-between"><span className="text-gray-400">Leader</span><span className="font-medium text-gray-800">{g.leader_name}</span></div>}
                  {g.meeting_day && <div className="flex justify-between"><span className="text-gray-400">Meets</span><span className="font-medium">{g.meeting_day} {g.meeting_time}</span></div>}
                  {g.district && <div className="flex justify-between"><span className="text-gray-400">District</span><span className="font-medium">{g.district}</span></div>}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500"><Users className="w-3.5 h-3.5" />{g.member_count ?? 0} members</div>
                  <div className="text-xs font-bold text-green-700">{ugx(g.total_portfolio ?? 0)}</div>
                  <button onClick={() => { setSel(g); setShowView(true); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-gray-900">Register New Group</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="overflow-y-auto p-6 flex-1 space-y-4">
              {formErr && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{formErr}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className={lc}>Group Name *</label><input value={f.name} onChange={upd('name')} placeholder="e.g. BASUDDE GROUP" className={ic} /></div>
                <div className="col-span-2"><label className={lc}>Registration Number</label><input value={f.registration_number} onChange={upd('registration_number')} placeholder="Optional" className={ic} /></div>
                <div><label className={lc}>Leader Name *</label><input value={f.leader_name} onChange={upd('leader_name')} className={ic} /></div>
                <div><label className={lc}>Leader Phone *</label><input value={f.leader_phone} onChange={upd('leader_phone')} placeholder="07XXXXXXXX" className={ic} /></div>
                <div><label className={lc}>Meeting Day *</label>
                  <select value={f.meeting_day} onChange={upd('meeting_day')} className={ic}>
                    {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div><label className={lc}>Meeting Time *</label><input type="time" value={f.meeting_time} onChange={upd('meeting_time')} className={ic} /></div>
                <div><label className={lc}>Location *</label><input value={f.location} onChange={upd('location')} placeholder="e.g. Kawempe Market" className={ic} /></div>
                <div><label className={lc}>District *</label><input value={f.district} onChange={upd('district')} placeholder="e.g. Kampala" className={ic} /></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex gap-3 justify-end shrink-0">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={submit} disabled={submitting} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl flex items-center gap-2 disabled:opacity-50">{submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><CheckCircle className="w-4 h-4" />Register Group</>}</button>
            </div>
          </div>
        </div>
      )}

      {showView && sel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center"><FolderOpen className="w-5 h-5 text-white" /></div>
                <div><h3 className="font-bold text-gray-900">{sel.name}</h3><p className="text-xs text-gray-500 font-mono">{sel.group_code}</p></div>
              </div>
              <button onClick={() => setShowView(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {([['Leader', sel.leader_name ?? '—'], ['Leader Phone', sel.leader_phone ?? '—'], ['Meeting', `${sel.meeting_day ?? ''} ${sel.meeting_time ?? ''}`], ['Location', sel.location ?? '—'], ['District', sel.district ?? '—'], ['Status', sel.status], ['Members', String(sel.member_count ?? 0)], ['Portfolio', ugx(sel.total_portfolio ?? 0)]] as [string,string][]).map(([k,v]) => (
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
