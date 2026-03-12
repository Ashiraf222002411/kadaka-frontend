'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Camera,
  ScanLine,
  Plus,
} from 'lucide-react';
import { uploadFile, documents as docsApi, resolveFileUrl } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
type DocCategory = 'kyc' | 'loan_agreement' | 'receipt' | 'other';

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

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtSize(bytes?: number): string {
  if (!bytes) return '';
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

function getFileExtension(fileType?: string, url?: string): string {
  if (fileType) {
    const parts = fileType.split('/');
    const ext = parts[parts.length - 1].replace('jpeg', 'jpg');
    if (ext && ext.length <= 5) return ext.toUpperCase();
  }
  if (url) {
    const match = url.split('?')[0].match(/\.([a-z0-9]+)$/i);
    if (match) return match[1].toUpperCase();
  }
  return 'FILE';
}

// ── Download helper (works cross-origin) ─────────────────────────────────────
async function triggerDownload(doc: Doc) {
  const url = resolveFileUrl(doc.file_url);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const ext = doc.file_type ? '.' + doc.file_type.split('/').pop()?.replace('jpeg', 'jpg') : '';
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = doc.name + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objUrl);
  } catch {
    // Fallback: open in new tab
    window.open(url, '_blank');
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({
  title, subtitle, onClose, children, footer,
}: {
  title: string; subtitle?: string; onClose: () => void;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl flex flex-col max-h-[90vh]">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
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

// ── Category config ───────────────────────────────────────────────────────────
const categoryConfig: Record<DocCategory, { label: string; className: string }> = {
  kyc:            { label: 'KYC',           className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  loan_agreement: { label: 'Loan Agreement', className: 'bg-purple-50 text-purple-700 border border-purple-200' },
  receipt:        { label: 'Receipt',        className: 'bg-green-50 text-green-700 border border-green-200' },
  other:          { label: 'Other',          className: 'bg-gray-50 text-gray-600 border border-gray-200' },
};

// ── Document Card ─────────────────────────────────────────────────────────────
function DocCard({
  doc, onView, onDownload, onDelete, deleting,
}: {
  doc: Doc;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const fType   = guessType(doc.file_type, doc.file_url);
  const catCfg  = categoryConfig[doc.category] ?? categoryConfig.other;
  const ext     = getFileExtension(doc.file_type, doc.file_url);
  const expired = doc.expiry_date && new Date(doc.expiry_date) < new Date();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
      {/* Thumbnail / icon area */}
      <div className="relative h-36 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
        {fType === 'image' ? (
          <img
            src={resolveFileUrl(doc.file_url)}
            alt={doc.name}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : fType === 'pdf' ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-16 bg-red-500 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white text-xs font-black tracking-wide">PDF</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-16 bg-blue-500 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white text-[10px] font-black tracking-wide">{ext}</span>
            </div>
          </div>
        )}
        {/* Expired badge */}
        {expired && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Expired
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">{doc.name}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${catCfg.className}`}>
            {catCfg.label}
          </span>
          {doc.file_size && (
            <span className="text-[10px] text-gray-400">{fmtSize(doc.file_size)}</span>
          )}
        </div>
        {doc.related_to && (
          <p className="text-[11px] text-gray-500 truncate">
            <span className="text-gray-400">For: </span>{doc.related_to}
          </p>
        )}
        <p className="text-[11px] text-gray-400 mt-auto">
          {doc.created_at ? doc.created_at.slice(0, 10) : '—'}
          {doc.uploaded_by_name && ` · ${doc.uploaded_by_name}`}
        </p>
        {doc.expiry_date && (
          <p className={`text-[10px] font-medium ${expired ? 'text-red-600' : 'text-amber-600'}`}>
            Expires: {doc.expiry_date}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-gray-100 flex divide-x divide-gray-100">
        <button
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title="View"
        >
          <Eye className="w-3.5 h-3.5" />
          View
        </button>
        <button
          onClick={onDownload}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors"
          title="Download"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
          title="Delete"
        >
          {deleting
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Trash2 className="w-3.5 h-3.5" />}
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DocumentsPageClient() {
  const [docs, setDocs]                     = useState<Doc[]>([]);
  const [loading, setLoading]               = useState(true);
  const [searchQuery, setSearchQuery]       = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DocCategory>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deletingId, setDeletingId]         = useState<string | null>(null);

  // Upload form state
  const [upName, setUpName]         = useState('');
  const [upCategory, setUpCategory] = useState<DocCategory | ''>('');
  const [upRelatedTo, setUpRelatedTo] = useState('');
  const [upRelatedId, setUpRelatedId] = useState('');
  const [upExpiry, setUpExpiry]     = useState('');
  const [upFileUrl, setUpFileUrl]   = useState('');
  const [upFileSize, setUpFileSize] = useState(0);
  const [upFileType, setUpFileType] = useState('');
  const [upUploading, setUpUploading] = useState(false);
  const [upSaving, setUpSaving]     = useState(false);
  const [upError, setUpError]       = useState('');
  const [upSuccess, setUpSuccess]   = useState(false);

  // Camera/scan refs (two separate inputs)
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      const res = await docsApi.getAll(params);
      const rows = (res as { data?: unknown[] }).data
        ?? (Array.isArray(res) ? (res as unknown[]) : []);
      setDocs(rows as Doc[]);
    } catch { /* keep empty */ }
    finally { setLoading(false); }
  }, [searchQuery, categoryFilter]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // ── File/Camera upload handler ──────────────────────────────────────────
  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = '';
    setUpError('');
    setUpUploading(true);
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

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleUploadSubmit = async () => {
    if (!upFileUrl)     { setUpError('Please select or capture a file first.'); return; }
    if (!upCategory)    { setUpError('Please choose a category.'); return; }
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
      }, 900);
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

  // ── Delete ────────────────────────────────────────────────────────────────
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

  // ── Derived data ──────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
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
              <p className="text-xs text-gray-500 mt-0.5">Store, view and manage KYC, agreements and receipts</p>
            </div>
          </div>
          <button
            onClick={() => { resetUploadForm(); setShowUploadModal(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: FolderOpen, color: 'teal',   val: stats.total,      label: 'Total Documents',  sub: 'All files' },
          { icon: User,       color: 'blue',   val: stats.kyc,        label: 'KYC Documents',    sub: 'IDs & photos' },
          { icon: FileText,   color: 'purple', val: stats.agreements, label: 'Loan Agreements',  sub: 'Signed agreements' },
          { icon: Calendar,   color: 'red',    val: stats.expired,    label: 'Expired',           sub: 'Need renewal' },
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
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as typeof categoryFilter)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 text-gray-700"
            >
              <option value="all">All Categories</option>
              <option value="kyc">KYC</option>
              <option value="loan_agreement">Loan Agreements</option>
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

      {/* Document Grid */}
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-sm font-bold text-gray-700">
          Document Library
          <span className="ml-2 text-xs font-normal text-gray-400">
            {loading ? 'Loading…' : `${filtered.length} document${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-3" />
          <p className="text-sm text-gray-500">Loading documents…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-base font-bold text-gray-500">No documents found</p>
          <p className="text-xs text-gray-400 mt-1">
            {docs.length === 0 ? 'Upload your first document using the button above' : 'Try adjusting your search or filter'}
          </p>
          {docs.length === 0 && (
            <button
              onClick={() => { resetUploadForm(); setShowUploadModal(true); }}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" /> Upload First Document
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(doc => (
            <DocCard
              key={doc.id}
              doc={doc}
              onView={() => window.open(resolveFileUrl(doc.file_url), '_blank')}
              onDownload={() => triggerDownload(doc)}
              onDelete={() => handleDelete(doc.id)}
              deleting={deletingId === doc.id}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <Modal
          title="Upload Document"
          subtitle="Choose a file, or use your camera to scan"
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
                {upSaving   ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> :
                 upSuccess  ? <><CheckCircle className="w-4 h-4" /> Saved!</> :
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

          {/* File / Camera selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              File <span className="text-red-500">*</span>
            </label>

            {/* Preview if already uploaded */}
            {upFileUrl ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border-2 border-green-400 rounded-xl mb-3">
                {guessType(upFileType, upFileUrl) === 'image' ? (
                  <img src={resolveFileUrl(upFileUrl)} alt="preview" className="w-12 h-12 rounded-lg object-cover shrink-0 border border-green-200" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-green-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-green-700">File uploaded ✓</p>
                  {upFileSize > 0 && <p className="text-[11px] text-green-600">{fmtSize(upFileSize)}</p>}
                </div>
                <button
                  onClick={() => { setUpFileUrl(''); setUpFileSize(0); setUpFileType(''); }}
                  className="p-1 text-green-400 hover:text-green-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : upUploading ? (
              <div className="flex items-center justify-center gap-2 p-6 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl mb-3">
                <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                <p className="text-sm font-medium text-green-700">Uploading…</p>
              </div>
            ) : null}

            {/* Two-button picker: Browse + Scan */}
            {!upUploading && !upFileUrl && (
              <div className="flex gap-2">
                {/* Browse files */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed border-gray-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all cursor-pointer group"
                >
                  <Upload className="w-6 h-6 text-gray-300 group-hover:text-green-500 transition-colors" />
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-600 group-hover:text-green-700">Browse Files</p>
                    <p className="text-[10px] text-gray-400">PDF, JPG, PNG</p>
                  </div>
                </button>

                {/* Camera / Scan */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed border-gray-200 rounded-xl hover:border-teal-400 hover:bg-teal-50 transition-all cursor-pointer group"
                >
                  <ScanLine className="w-6 h-6 text-gray-300 group-hover:text-teal-500 transition-colors" />
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-600 group-hover:text-teal-700">Scan / Camera</p>
                    <p className="text-[10px] text-gray-400">Use device camera</p>
                  </div>
                </button>
              </div>
            )}

            {/* Replace button after upload */}
            {upFileUrl && !upUploading && (
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 text-center py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Replace with file
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 text-center py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Re-scan
                </button>
              </div>
            )}

            {/* Visually hidden but accessible — sr-only allows .click() on mobile */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={handleFilePick}
              className="sr-only"
            />
            {/* Camera input: capture="environment" = back camera (ideal for scanning docs) */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFilePick}
              className="sr-only"
            />
          </div>

          {/* Document Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Document Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={upName}
              onChange={e => setUpName(e.target.value)}
              placeholder="e.g. National ID – Agnes Nakafeero"
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
                placeholder="e.g. Agnes Nakafeero"
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
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Expiry Date (optional)</label>
            <input
              type="date"
              value={upExpiry}
              onChange={e => setUpExpiry(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 focus:bg-white"
            />
          </div>
        </Modal>
      )}
    </>
  );
}
