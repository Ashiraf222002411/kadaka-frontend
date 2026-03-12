'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, X, CheckCircle, Loader2, AlertCircle, RefreshCw, User, Eye, Upload, Camera, ScanLine, Pencil, Trash2 } from 'lucide-react';
import { members, uploadFile, resolveFileUrl } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type Member = {
  id: string; member_code: string; full_name: string; national_id: string; phone: string;
  gender: string; date_of_birth: string; district: string; village?: string;
  business_type: string; monthly_income: number; group_name?: string;
  residence_status?: string; status: string; active_loans?: number; total_borrowed?: number;
  photo_url?: string; supporting_doc_url?: string;
};
type F = {
  full_name: string; national_id: string; phone: string; alternative_phone: string;
  gender: string; date_of_birth: string; district: string; village: string;
  residence_status: string; landlord_name: string; landlord_phone: string; landlord_location: string;
  business_type: string; monthly_income: string;
  next_of_kin_name: string; next_of_kin_relationship: string; next_of_kin_phone: string;
  photo_url: string; supporting_doc_url: string;
};

const INIT: F = {
  full_name: '', national_id: '', phone: '', alternative_phone: '', gender: 'female',
  date_of_birth: '', district: '', village: '', residence_status: 'owned',
  landlord_name: '', landlord_phone: '', landlord_location: '', business_type: '',
  monthly_income: '', next_of_kin_name: '', next_of_kin_relationship: '',
  next_of_kin_phone: '', photo_url: '', supporting_doc_url: '',
};

const SC: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-200', inactive: 'bg-gray-100 text-gray-600 border-gray-200',
  defaulted: 'bg-red-50 text-red-700 border-red-200', blacklisted: 'bg-red-100 text-red-800 border-red-300',
};
const ugx = (n: number | string | null) => 'UGX ' + Number(n || 0).toLocaleString();
const Sk  = () => <div className="animate-pulse bg-gray-100 rounded-xl h-10 w-full" />;
const ic = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 focus:bg-white';
const lc = 'block text-xs font-semibold text-gray-700 mb-1.5';

// Dual-button upload: Browse + Scan (camera)
function FileUploadBtn({ label, accept, uploaded, uploading, onChange, captureMode }: {
  label: string; accept: string; uploaded: boolean; uploading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  captureMode?: 'environment' | 'user';
}) {
  const fileRef   = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className={lc}>{label}</label>
      {uploading ? (
        <div className="flex items-center gap-2 px-3 py-2.5 border-2 border-dashed border-green-300 rounded-xl bg-green-50">
          <Loader2 className="w-4 h-4 animate-spin text-green-600" />
          <span className="text-xs font-medium text-green-700">Uploading…</span>
        </div>
      ) : uploaded ? (
        <div className="flex items-center gap-2 px-3 py-2.5 border-2 border-green-400 rounded-xl bg-green-50">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-xs font-medium text-green-700 flex-1">Uploaded ✓</span>
          <button type="button" onClick={() => fileRef.current?.click()} className="text-[10px] text-green-600 underline">Replace</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 border-2 border-dashed border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all cursor-pointer group">
            <Upload className="w-4 h-4 text-gray-400 group-hover:text-green-500" />
            <span className="text-xs font-medium text-gray-500 group-hover:text-green-700">Browse</span>
          </button>
          {captureMode && (
            <button type="button" onClick={() => cameraRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 border-2 border-dashed border-gray-200 rounded-xl hover:border-teal-300 hover:bg-teal-50 transition-all cursor-pointer group">
              <ScanLine className="w-4 h-4 text-gray-400 group-hover:text-teal-500" />
              <span className="text-xs font-medium text-gray-500 group-hover:text-teal-700">Scan</span>
            </button>
          )}
        </div>
      )}
      <input ref={fileRef} type="file" accept={accept} onChange={onChange} className="sr-only" />
      {captureMode && (
        <input ref={cameraRef} type="file" accept="image/*" capture={captureMode} onChange={onChange} className="sr-only" />
      )}
    </div>
  );
}

export default function MembersPageClient() {
  const { user } = useAuth();
  const role = user?.role ?? '';
  const [list, setList] = useState<Member[]>([]);
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc,   setUploadingDoc]   = useState(false);
  const photoFileRef   = useRef<HTMLInputElement>(null);
  const photoCameraRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [editF, setEditF] = useState<Record<string, string>>({});
  const [editErr, setEditErr]   = useState('');
  const [saving, setSaving]     = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const upd = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }));
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const m = await members.getAll({ limit: 200 });
      setList((m.data ?? []) as Member[]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openModal = () => { setF(INIT); setStep(1); setFormErr(''); setShowModal(true); };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = ''; // reset so same file can be re-picked
    setUploadingPhoto(true); setFormErr('');
    try {
      const { url } = await uploadFile(file);
      setF(p => ({ ...p, photo_url: url }));
    } catch (err) {
      setFormErr(err instanceof Error ? `Photo upload failed: ${err.message}` : 'Photo upload failed');
    } finally { setUploadingPhoto(false); }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = ''; // reset so same file can be re-picked
    setUploadingDoc(true); setFormErr('');
    try {
      const { url } = await uploadFile(file);
      setF(p => ({ ...p, supporting_doc_url: url }));
    } catch (err) {
      setFormErr(err instanceof Error ? `Document upload failed: ${err.message}` : 'Document upload failed');
    } finally { setUploadingDoc(false); }
  };

  const submit = async () => {
    if (!f.full_name || !f.national_id || !f.phone || !f.date_of_birth || !f.district || !f.business_type || !f.monthly_income) {
      setFormErr('Fill all required fields'); return;
    }
    setFormErr(''); setSubmitting(true);
    try {
      await members.create({
        ...f, monthly_income: Number(f.monthly_income),
        alternative_phone: f.alternative_phone || undefined,
        village: f.village || undefined,
        next_of_kin_name: f.next_of_kin_name || undefined,
        next_of_kin_relationship: f.next_of_kin_relationship || undefined,
        next_of_kin_phone: f.next_of_kin_phone || undefined,
        photo_url: f.photo_url || undefined,
        supporting_doc_url: f.supporting_doc_url || undefined,
        ...(f.residence_status !== 'rented' ? { landlord_name: undefined, landlord_phone: undefined, landlord_location: undefined } : {}),
      });
      await fetchAll(); setShowModal(false); showToast('Member registered');
    } catch (e) { setFormErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setSubmitting(false); }
  };

  const openEdit = (m: Member) => {
    setEditTarget(m);
    setEditF({
      full_name: m.full_name, phone: m.phone, district: m.district,
      village: m.village ?? '', business_type: m.business_type,
      monthly_income: String(m.monthly_income), status: m.status,
    });
    setEditErr(''); setShowEdit(true);
  };
  const submitEdit = async () => {
    if (!editTarget) return;
    setSaving(true); setEditErr('');
    try {
      const payload: Record<string, unknown> = { ...editF };
      if (payload.monthly_income) payload.monthly_income = Number(payload.monthly_income);
      await members.update(editTarget.id, payload);
      await fetchAll(); setShowEdit(false); showToast('Member updated');
    } catch (e) { setEditErr(e instanceof Error ? e.message : 'Failed to update'); }
    finally { setSaving(false); }
  };
  const submitDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await members.remove(deleteTarget.id);
      await fetchAll(); setDeleteTarget(null); showToast('Member deleted');
    } catch (e) { showToast(e instanceof Error ? e.message : 'Delete failed'); setDeleteTarget(null); }
    finally { setDeleting(false); }
  };

  const filtered = list.filter(m => {
    const q = search.toLowerCase();
    return (!q || m.full_name?.toLowerCase().includes(q) || m.member_code?.toLowerCase().includes(q) || m.national_id?.includes(q)) &&
      (statusF === 'all' || m.status === statusF);
  });
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
                <th className="px-4 py-3 text-left hidden lg:table-cell">Business</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Borrowed</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shrink-0 overflow-hidden">
                          {m.photo_url
                            ? <img src={resolveFileUrl(m.photo_url)} alt="" className="w-full h-full object-cover" />
                            : <span className="text-[10px] font-bold text-white">{m.full_name?.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}</span>}
                        </div>
                        <div><p className="font-semibold text-gray-900">{m.full_name}</p><p className="text-xs text-gray-500 font-mono">{m.member_code}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-600 hidden sm:table-cell">{m.national_id}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 hidden lg:table-cell">{m.business_type}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold hidden md:table-cell">{ugx(m.total_borrowed ?? 0)}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${SC[m.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>{m.status}</span></td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setSel(m); setShowView(true); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="View"><Eye className="w-3.5 h-3.5" /></button>
                        {(role === 'branch_manager' || role === 'loan_officer' || role === 'accountant') && (
                          <button onClick={() => openEdit(m)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        )}
                        {(role === 'branch_manager' || role === 'loan_officer' || role === 'accountant') && m.active_loans === 0 && (
                          <button onClick={() => setDeleteTarget(m)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>}
      </div>

      {/* ── REGISTER MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h3 className="font-bold text-gray-900">Register New Member</h3>
                <div className="flex gap-1.5 mt-1.5">{[1,2,3].map(s => <div key={s} className={`h-1 w-12 rounded-full ${s <= step ? 'bg-green-600' : 'bg-gray-200'}`} />)}</div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="overflow-y-auto p-6 flex-1 space-y-4">
              {formErr && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{formErr}</div>}

              {step === 1 && <div className="space-y-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Step 1 — Personal Info & Photo</p>
                {/* Photo upload */}
                <div>
                  <label className={lc}>Member Photo (optional)</label>
                  {uploadingPhoto ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 border-2 border-dashed border-green-300 rounded-xl bg-green-50">
                      <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                      <span className="text-xs font-medium text-green-700">Uploading…</span>
                    </div>
                  ) : f.photo_url ? (
                    <div className="flex items-center gap-3 px-3 py-2.5 border-2 border-green-400 rounded-xl bg-green-50">
                      <img src={resolveFileUrl(f.photo_url)} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 border-2 border-green-300" />
                      <span className="text-xs font-medium text-green-700 flex-1">Photo uploaded ✓</span>
                      <button type="button" onClick={() => photoFileRef.current?.click()} className="text-[10px] text-green-600 underline">Replace</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => photoFileRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 border-2 border-dashed border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all group">
                        <Upload className="w-4 h-4 text-gray-400 group-hover:text-green-500" />
                        <span className="text-xs font-medium text-gray-500 group-hover:text-green-700">Browse</span>
                      </button>
                      <button type="button" onClick={() => photoCameraRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group">
                        <Camera className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                        <span className="text-xs font-medium text-gray-500 group-hover:text-blue-700">Take Photo</span>
                      </button>
                    </div>
                  )}
                  {/* Browse — no capture (file picker) */}
                  <input ref={photoFileRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="sr-only" />
                  {/* Camera — capture="user" = front camera on mobile */}
                  <input ref={photoCameraRef} type="file" accept="image/*" capture="user" onChange={handlePhotoUpload} className="sr-only" />
                </div>
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
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Step 3 — Next of Kin & Documents</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className={lc}>Next of Kin Name</label><input value={f.next_of_kin_name} onChange={upd('next_of_kin_name')} placeholder="Full name" className={ic} /></div>
                  <div><label className={lc}>Relationship</label><input value={f.next_of_kin_relationship} onChange={upd('next_of_kin_relationship')} placeholder="e.g. Spouse" className={ic} /></div>
                  <div><label className={lc}>Phone</label><input value={f.next_of_kin_phone} onChange={upd('next_of_kin_phone')} placeholder="07XXXXXXXX" className={ic} /></div>
                </div>
                {/* Supporting document — Browse + Scan (back camera) */}
                <FileUploadBtn
                  label="Supporting Document (National ID / Agreement)"
                  accept=".pdf,image/*"
                  uploaded={!!f.supporting_doc_url}
                  uploading={uploadingDoc}
                  onChange={handleDocUpload}
                  captureMode="environment"
                />
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

      {/* ── EDIT MODAL ── */}
      {showEdit && editTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h3 className="font-bold text-gray-900">Edit Member — {editTarget.member_code}</h3>
              <button onClick={() => setShowEdit(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="overflow-y-auto p-6 flex-1 space-y-4">
              {editErr && <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{editErr}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className={lc}>Full Name</label><input value={editF.full_name ?? ''} onChange={e => setEditF(p => ({ ...p, full_name: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>Phone</label><input value={editF.phone ?? ''} onChange={e => setEditF(p => ({ ...p, phone: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>District</label><input value={editF.district ?? ''} onChange={e => setEditF(p => ({ ...p, district: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>Village</label><input value={editF.village ?? ''} onChange={e => setEditF(p => ({ ...p, village: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>Business Type</label><input value={editF.business_type ?? ''} onChange={e => setEditF(p => ({ ...p, business_type: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>Monthly Income</label><input type="number" value={editF.monthly_income ?? ''} onChange={e => setEditF(p => ({ ...p, monthly_income: e.target.value }))} className={ic} /></div>
                <div><label className={lc}>Status</label>
                  <select value={editF.status ?? 'active'} onChange={e => setEditF(p => ({ ...p, status: e.target.value }))} className={ic}>
                    {['active','inactive','defaulted','blacklisted'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end shrink-0">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={submitEdit} disabled={saving} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl flex items-center gap-2 disabled:opacity-50">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><CheckCircle className="w-4 h-4" />Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Member</h3>
                <p className="text-xs text-gray-500">This will move the record to recycle bin</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteTarget.full_name}</span> ({deleteTarget.member_code})? This can be restored later from Data Management.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={submitDelete} disabled={deleting} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {deleting ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting…</> : <><Trash2 className="w-4 h-4" />Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW MODAL ── */}
      {showView && sel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center overflow-hidden">
                  {sel.photo_url ? <img src={resolveFileUrl(sel.photo_url)} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-white" />}
                </div>
                <div><h3 className="font-bold text-gray-900">{sel.full_name}</h3><p className="text-xs text-gray-500 font-mono">{sel.member_code}</p></div>
              </div>
              <button onClick={() => setShowView(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <div className="overflow-y-auto p-6 flex-1">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {([['National ID', sel.national_id], ['Phone', sel.phone], ['Gender', sel.gender], ['District', sel.district], ['Business', sel.business_type], ['Income', ugx(sel.monthly_income)], ['Status', sel.status], ['Active Loans', String(sel.active_loans ?? 0)], ['Total Borrowed', ugx(sel.total_borrowed ?? 0)]] as [string,string][]).map(([k,v]) => (
                  <div key={k} className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500 mb-0.5">{k}</p><p className="font-semibold text-gray-900 capitalize">{v}</p></div>
                ))}
              </div>
              {sel.supporting_doc_url && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Supporting Document</p>
                  <a href={resolveFileUrl(sel.supporting_doc_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors">
                    📄 View Document
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
