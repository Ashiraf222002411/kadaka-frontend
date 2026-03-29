'use client';
import React, { useState } from 'react';
import { Plus, Building2, MapPin, Phone, User, Trash2, Pencil, X } from 'lucide-react';
import { useOrg, SubBranch } from '@/contexts/OrgContext';
import { useAuth } from '@/contexts/AuthContext';

type FormState = {
  id?: string;
  name: string;
  address: string;
  phone: string;
  manager_name: string;
};

const EMPTY_FORM: FormState = { name: '', address: '', phone: '', manager_name: '' };

const ic = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-gray-50 focus:bg-white transition-all';

export default function BranchesPageClient() {
  const { user } = useAuth();
  const { orgDetails, branches, saveBranch, deleteBranch } = useOrg();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const role = user?.role ?? '';
  const isManager = role === 'branch_manager';

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (b: SubBranch) => {
    setForm({ id: b.id, name: b.name, address: b.address, phone: b.phone, manager_name: b.manager_name });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    saveBranch(form);
    setModalOpen(false);
    setForm(EMPTY_FORM);
  };

  const handleDelete = (id: string) => {
    deleteBranch(id);
    setDeleteConfirm(null);
  };

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' });

  if (!isManager) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center shadow-sm shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Branches</h1>
            <p className="text-sm text-gray-500">Sub-branch management</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Access Restricted</p>
          <p className="text-xs text-slate-400 mt-1">Only Branch Managers can manage branches.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center shadow-sm shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Branches</h1>
            <p className="text-sm text-gray-500">Manage your organisation's sub-branches</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Branch
        </button>
      </div>

      {/* Main Branch Card */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">Main Branch</p>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center shrink-0 shadow-sm">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{orgDetails.org_name}</p>
            <p className="text-xs text-green-700 font-medium mt-0.5">Headquarters</p>
            {orgDetails.org_address && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{orgDetails.org_address}</p>
            )}
          </div>
          <span className="px-2.5 py-1 bg-green-100 border border-green-300 rounded-lg text-xs font-semibold text-green-700 shrink-0">
            Main
          </span>
        </div>
      </div>

      {/* Sub-branches */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">
          Sub-Branches ({branches.length})
        </p>

        {branches.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">No sub-branches yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Add your first sub-branch to get started.</p>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Branch
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map(b => (
              <div key={b.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{b.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Added {fmt(b.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(b)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Edit branch"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(b.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete branch"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {b.address && (
                    <div className="flex items-start gap-2 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="truncate">{b.address}</span>
                    </div>
                  )}
                  {b.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{b.phone}</span>
                    </div>
                  )}
                  {b.manager_name && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{b.manager_name}</span>
                    </div>
                  )}
                </div>

                {/* Delete confirm inline */}
                {deleteConfirm === b.id && (
                  <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-xs font-semibold text-red-700 mb-2">Delete this branch?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-all"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">
                {form.id ? 'Edit Branch' : 'Add Branch'}
              </h3>
              <button
                onClick={() => { setModalOpen(false); setForm(EMPTY_FORM); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Branch Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Kampala North Branch"
                  className={ic}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="e.g. Plot 12, Bombo Road, Kampala"
                  className={ic}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="e.g. +256 700 000 000"
                  className={ic}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Manager Name</label>
                <input
                  type="text"
                  value={form.manager_name}
                  onChange={e => setForm(f => ({ ...f, manager_name: e.target.value }))}
                  placeholder="e.g. John Doe"
                  className={ic}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
                >
                  {form.id ? 'Save Changes' : 'Add Branch'}
                </button>
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setForm(EMPTY_FORM); }}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
