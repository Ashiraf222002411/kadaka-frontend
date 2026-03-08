'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  FileText,
  Search,
  Upload,
  Download,
  Eye,
  Trash2,
  FolderOpen,
  File,
  Image,
  Filter,
  Calendar,
  User,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { uploadFile, documents as docsApi } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────────
type DocCategory = 'kyc' | 'loan_agreement' | 'group_registration' | 'receipt' | 'other';

interface Doc {
  id: string;
  name: string;
  category: DocCategory;
  related_to?: string;
  related_id?: string;
  file_url: string;
  file_size?: number;
  file_type?: string;
  expiry_date?: string;
  uploaded_by_name?: string;
  created_at?: string;
}

// ── Helper ──────────────────────────────────────────────────────────────────
function fmtSize(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function guessType(fileType?: string, url?: string): 'pdf' | 'image' | 'doc' {
  const t = (fileType ?? url ?? '').toLowerCase();
  if (t.includes('pdf')) return 'pdf';
  if (t.match(/jpe?g|png|gif|webp|image/)) return 'image';
  return 'doc';
}

// ── Sub-components at FILE SCOPE (prevents focus loss) ────────────────────
function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl flex flex-col max-h-[90vh]">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

const categoryConfig: Record<DocCategory, { label: string; className: string }> = {
  kyc:               { label: 'KYC',               className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  loan_agreement:    { label: 'Loan Agreement',    className: 'bg-purple-50 text-purple-700 border border-purple-200' },
  group_registration:{ label: 'Group Registration',className: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  receipt:           { label: 'Receipt',           className: 'bg-green-50 text-green-700 border border-green-200' },
  other:             { label: 'Other',             className: 'bg-gray-50 text-gray-600 border border-gray-200' },
};

function FileIcon({ type }: { type: 'pdf' | 'image' | 'doc' }) {
  if (type === 'image') return <Image className="w-4 h-4 text-blue-500" />;
  if (type === 'pdf')   return <File  className="w-4 h-4 text-red-500"  />;
  return <FileText className="w-4 h-4 text-gray-500" />;
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function DocumentsPageClient() {
  const [docs, setDocs]                 = useState<Doc[]>([]);
  const [loading, setLoading]           = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DocCategory>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deletingId, setDeletingId]     = useState<string | null>(null);

  // Upload form state
  const [upName, setUpName]             = useState('');
  const [upCategory, setUpCategory]     = useState<DocCategory | ''>('');
  const [upRelatedTo, setUpRelatedTo]   = useState('');
  const [upRelatedId, setUpRelatedId]   = useState('');
  const [upExpiry, setUpExpiry]         = useState('');
  const [upFileUrl, setUpFileUrl]       = useState('');
  const [upFileSize, setUpFileSize]     = useState(0);
  const [upFileType, setUpFileType]     = useState('');
  const [upUploading, setUpUploading]   = useState(false);
  const [upSaving, setUpSaving]         = useState(false);
  const [upError, setUpError]           = useState('');
  const [upSuccess, setUpSuccess]       = useState(false);

  // ── Fetch documents ────────────────────────────────────────────────────────
  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      const res = await docsApi.getAll(params);
      const rows = (res as { data?: unknown[]; rows?: unknown[] }).data
        ?? (res as { data?: unknown[]; rows?: unknown[] }).rows
        ?? (Array.isArray(res) ? (res as unknown[]) : []);
      setDocs(rows as Doc[]);
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // ── Handle file pick → upload ──────────────────────────────────────────────
  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpError('');
    setUpUploading(true);
    // Auto-fill name if empty
    if (!upName) setUpName(file.name.replace(/\.[^.]+$/, ''));
    try {
      const { url, size } = await uploadFile(file);
      setUpFileUrl(url);
      setUpFileSize(size);
      setUpFileType(file.type || file.name.split('.').pop() || '');
    } catch (err: unknown) {
      setUpError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUpUploading(false);
    }
  };

  // ── Submit document metadata ───────────────────────────────────────────────
  const handleUploadSubmit = async () => {
    if (!upFileUrl) { setUpError('Please select a file to upload.'); return; }
    if (!upCategory) { setUpError('Please choose a category.'); return; }
    if (!upName.trim()) { setUpError('Please enter a document name.'); return; }
    setUpError('');
    setUpSaving(true);
    try {
      await docsApi.create({
        name: upName.trim(),
        category: upCategory,
        related_to: upRelatedTo || undefined,
        related_id: upRelatedId || undefined,
        file_url: upFileUrl,
        file_size: upFileSize || undefined,
        file_type: upFileType || undefined,
        expiry_date: upExpiry || undefined,
      });
      setUpSuccess(true);
      setTimeout(() => {
        setShowUploadModal(false);
        resetUploadForm();
        fetchDocs();
      }, 1000);
    } catch (err: unknown) {
      setUpError(err instanceof Error ? err.message : 'Failed to save document');
    } finally {
      setUpSaving(false);
    }
  };

  const resetUploadForm = () => {
    setUpName(''); setUpCategory(''); setUpRelatedTo(''); setUpRelatedId('');
    setUpExpiry(''); setUpFileUrl(''); setUpFileSize(0); setUpFileType('');
    setUpUploading(false); setUpSaving(false); setUpError(''); setUpSuccess(false);
  };

  // ── Delete document ────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await docsApi.remove(id);
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────────
  const filtered = docs.filter(d => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q
      || d.name.toLowerCase().includes(q)
      || (d.related_to ?? '').toLowerCase().includes(q)
      || (d.related_id ?? '').toLowerCase().includes(q);
    const matchCat = categoryFilter === 'all' || d.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const stats = {
    total:      docs.length,
    kyc:        docs.filter(d => d.category === 'kyc').length,
    agreements: docs.filter(d => d.category === 'loan_agreement').length,
    expired:    docs.filter(d => d.expiry_date && new Date(d.expiry_date) < new Date()).length,
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Page Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-400 rotate-180" />
            </Link>
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Document Management</h1>
              <p className="text-xs text-gray-500 mt-0.5">Store and manage KYC, agreements, and receipts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { resetUploadForm(); setShowUploadModal(true); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: FolderOpen, color: 'teal', val: stats.total,      label: 'Total Documents',     sub: 'All files' },
          { icon: User,       color: 'blue', val: stats.kyc,        label: 'KYC Documents',       sub: 'Member IDs & photos' },
          { icon: FileText,   color: 'purple',val: stats.agreements,label: 'Loan Agreements',     sub: 'Signed agreements' },
          { icon: Calendar,   color: 'red',  val: stats.expired,    label: 'Expired Documents',   sub: 'Need renewal' },
        ].map(({ icon: Icon, color, val, label, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg bg-${color}-50 flex items-center justify-center`}>
                <Icon className={`w-3.5 h-3.5 text-${color}-600`} />
              </div>
              <p className="text-xs font-medium text-gray-500">{label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{val}</p>
            <p className="text-xs text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, member, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 text-gray-700"
            >
              <option value="all">All Categories</option>
              <option value="kyc">KYC</option>
              <option value="loan_agreement">Loan Agreements</option>
              <option value="group_registration">Group Registration</option>
              <option value="receipt">Receipts</option>
              <option value="other">Other</option>
            </select>
            <button
              onClick={fetchDocs}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Document Library</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {loading ? 'Loading…' : `${filtered.length} document${filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Document</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Category</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Related To</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Uploaded</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Expiry</th>
                <th className="px-5 py-2.5 text-center text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Loading documents…</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <p className="text-sm font-medium text-gray-500">No documents found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {docs.length === 0
                        ? 'Upload your first document using the button above'
                        : 'Try adjusting your search or filter'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => {
                  const catCfg  = categoryConfig[doc.category] ?? categoryConfig.other;
                  const fType   = guessType(doc.file_type, doc.file_url);
                  const expired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <FileIcon type={fType} />
                          <div>
                            <p className="text-xs font-semibold text-gray-900 max-w-xs truncate">{doc.name}</p>
                            <p className="text-[11px] text-gray-400">
                              {fmtSize(doc.file_size)} · {(doc.file_type ?? fType).toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${catCfg.className}`}>
                          {catCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {doc.related_to
                          ? <><p className="text-xs text-gray-700">{doc.related_to}</p><p className="text-[11px] text-gray-400">{doc.related_id}</p></>
                          : <span className="text-xs text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-xs text-gray-600">{doc.created_at ? doc.created_at.slice(0, 10) : '—'}</p>
                        {doc.uploaded_by_name && (
                          <p className="text-[11px] text-gray-400">by {doc.uploaded_by_name}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {doc.expiry_date ? (
                          <span className={`text-xs ${expired ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                            {doc.expiry_date}
                            {expired && ' (Expired)'}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="View"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </a>
                          <a
                            href={doc.file_url}
                            download
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                            title="Delete"
                          >
                            {deletingId === doc.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <Modal
          title="Upload Document"
          subtitle="Supports PDF, JPG, PNG files up to 10 MB"
          onClose={() => { setShowUploadModal(false); resetUploadForm(); }}
          footer={
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowUploadModal(false); resetUploadForm(); }}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadSubmit}
                disabled={upSaving || upUploading || upSuccess}
                className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {upSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> :
                 upSuccess ? <><CheckCircle className="w-4 h-4" /> Saved!</> :
                 <><Upload className="w-4 h-4" /> Upload</>}
              </button>
            </div>
          }
        >
          {/* Error */}
          {upError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {upError}
            </div>
          )}

          {/* Document Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Document Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={upName}
              onChange={e => setUpName(e.target.value)}
              placeholder="e.g. National ID – Nakafeero Agnes"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 focus:bg-white"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={upCategory}
              onChange={e => setUpCategory(e.target.value as DocCategory | '')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
            >
              <option value="">Select category…</option>
              <option value="kyc">KYC Document</option>
              <option value="loan_agreement">Loan Agreement</option>
              <option value="group_registration">Group Registration</option>
              <option value="receipt">Receipt</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Related To */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Related To (Name)</label>
              <input
                type="text"
                value={upRelatedTo}
                onChange={e => setUpRelatedTo(e.target.value)}
                placeholder="e.g. Nakafeero Agnes"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Related ID</label>
              <input
                type="text"
                value={upRelatedId}
                onChange={e => setUpRelatedId(e.target.value)}
                placeholder="e.g. M001 / L003"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Expiry Date (if applicable)</label>
            <input
              type="date"
              value={upExpiry}
              onChange={e => setUpExpiry(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 focus:bg-white"
            />
          </div>

          {/* File Upload Area */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              File <span className="text-red-500">*</span>
            </label>
            <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors
              ${upFileUrl ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-green-400 bg-gray-50'}`}>
              {upUploading ? (
                <>
                  <Loader2 className="w-7 h-7 animate-spin text-green-600 mb-2" />
                  <p className="text-sm font-medium text-green-700">Uploading…</p>
                </>
              ) : upFileUrl ? (
                <>
                  <CheckCircle className="w-7 h-7 text-green-600 mb-2" />
                  <p className="text-sm font-semibold text-green-700">File uploaded!</p>
                  <p className="text-xs text-green-600 mt-0.5">{fmtSize(upFileSize)}</p>
                  <p className="text-[11px] text-gray-400 mt-1">Click to replace</p>
                </>
              ) : (
                <>
                  <Upload className="w-7 h-7 text-gray-300 mb-2" />
                  <p className="text-sm font-medium text-gray-600">Click or drag file to upload</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 10 MB</p>
                </>
              )}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFilePick}
                className="hidden"
                disabled={upUploading}
              />
            </label>
          </div>
        </Modal>
      )}
    </>
  );
}
