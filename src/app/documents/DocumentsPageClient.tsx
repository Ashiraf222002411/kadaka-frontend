'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';

type DocCategory = 'kyc' | 'loan_agreement' | 'group_registration' | 'receipt' | 'other';
type DocStatus = 'verified' | 'pending' | 'expired';

interface Document {
  id: string;
  name: string;
  category: DocCategory;
  relatedTo: string;
  relatedId: string;
  uploadedBy: string;
  uploadDate: string;
  fileSize: string;
  fileType: 'pdf' | 'image' | 'doc';
  status: DocStatus;
  expiryDate?: string;
}

export default function DocumentsPageClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DocCategory>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const documents: Document[] = [
    {
      id: 'DOC001',
      name: 'National ID - Nakafeero Agnes (Front)',
      category: 'kyc',
      relatedTo: 'Nakafeero Agnes',
      relatedId: 'M001',
      uploadedBy: 'TC',
      uploadDate: '2022-01-15',
      fileSize: '245 KB',
      fileType: 'image',
      status: 'verified',
      expiryDate: '2032-01-14',
    },
    {
      id: 'DOC002',
      name: 'National ID - Nakafeero Agnes (Back)',
      category: 'kyc',
      relatedTo: 'Nakafeero Agnes',
      relatedId: 'M001',
      uploadedBy: 'TC',
      uploadDate: '2022-01-15',
      fileSize: '218 KB',
      fileType: 'image',
      status: 'verified',
      expiryDate: '2032-01-14',
    },
    {
      id: 'DOC003',
      name: 'Loan Agreement - L001 - Nakafeero Agnes',
      category: 'loan_agreement',
      relatedTo: 'Loan L001',
      relatedId: 'L001',
      uploadedBy: 'TC',
      uploadDate: '2026-02-19',
      fileSize: '512 KB',
      fileType: 'pdf',
      status: 'verified',
    },
    {
      id: 'DOC004',
      name: 'BASUDDE Group Constitution',
      category: 'group_registration',
      relatedTo: 'BASUDDE',
      relatedId: 'G001',
      uploadedBy: 'TC',
      uploadDate: '2021-06-01',
      fileSize: '1.2 MB',
      fileType: 'pdf',
      status: 'verified',
    },
    {
      id: 'DOC005',
      name: 'Payment Receipt - RCP001 - Muany Ali',
      category: 'receipt',
      relatedTo: 'Muany Ali',
      relatedId: 'P001',
      uploadedBy: 'TC',
      uploadDate: '2026-02-19',
      fileSize: '98 KB',
      fileType: 'pdf',
      status: 'verified',
    },
    {
      id: 'DOC006',
      name: 'National ID - Gassanua James (Front)',
      category: 'kyc',
      relatedTo: 'Gassanua James',
      relatedId: 'M002',
      uploadedBy: 'TC',
      uploadDate: '2022-03-10',
      fileSize: '312 KB',
      fileType: 'image',
      status: 'verified',
      expiryDate: '2030-03-09',
    },
    {
      id: 'DOC007',
      name: 'Loan Agreement - L004 - Twine Collins',
      category: 'loan_agreement',
      relatedTo: 'Loan L004',
      relatedId: 'L004',
      uploadedBy: 'TC',
      uploadDate: '2026-01-20',
      fileSize: '480 KB',
      fileType: 'pdf',
      status: 'verified',
    },
    {
      id: 'DOC008',
      name: 'Passport Photo - Nalwanga Grace',
      category: 'kyc',
      relatedTo: 'Nalwanga Grace',
      relatedId: 'M007',
      uploadedBy: 'TC',
      uploadDate: '2023-04-18',
      fileSize: '156 KB',
      fileType: 'image',
      status: 'pending',
    },
    {
      id: 'DOC009',
      name: 'LUTANGU Group Registration Certificate',
      category: 'group_registration',
      relatedTo: 'LUTANGU',
      relatedId: 'G002',
      uploadedBy: 'TC',
      uploadDate: '2021-08-15',
      fileSize: '890 KB',
      fileType: 'pdf',
      status: 'verified',
    },
    {
      id: 'DOC010',
      name: 'National ID - Ssekitoleko Fred (Front)',
      category: 'kyc',
      relatedTo: 'Ssekitoleko Fred',
      relatedId: 'M012',
      uploadedBy: 'TC',
      uploadDate: '2021-09-12',
      fileSize: '284 KB',
      fileType: 'image',
      status: 'expired',
      expiryDate: '2024-09-11',
    },
  ];

  const stats = {
    total: documents.length,
    kyc: documents.filter(d => d.category === 'kyc').length,
    agreements: documents.filter(d => d.category === 'loan_agreement').length,
    pending: documents.filter(d => d.status === 'pending').length,
    expired: documents.filter(d => d.status === 'expired').length,
  };

  const filteredDocuments = documents.filter(d => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.relatedTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.relatedId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categoryConfig: Record<DocCategory, { label: string; className: string }> = {
    kyc:               { label: 'KYC',               className: 'bg-blue-50 text-blue-700 border border-blue-200' },
    loan_agreement:    { label: 'Loan Agreement',    className: 'bg-purple-50 text-purple-700 border border-purple-200' },
    group_registration:{ label: 'Group Registration',className: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
    receipt:           { label: 'Receipt',           className: 'bg-green-50 text-green-700 border border-green-200' },
    other:             { label: 'Other',             className: 'bg-gray-50 text-gray-600 border border-gray-200' },
  };

  const statusConfig: Record<DocStatus, { label: string; className: string }> = {
    verified: { label: 'Verified', className: 'bg-green-50 text-green-700' },
    pending:  { label: 'Pending',  className: 'bg-amber-50 text-amber-700' },
    expired:  { label: 'Expired',  className: 'bg-red-50 text-red-700' },
  };

  const FileIcon = ({ type }: { type: Document['fileType'] }) => {
    if (type === 'image') return <Image className="w-4 h-4 text-blue-500" />;
    if (type === 'pdf') return <File className="w-4 h-4 text-red-500" />;
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

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
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm hover:shadow-md transition-all"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
              <FolderOpen className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <p className="text-xs font-medium text-gray-500">Total Documents</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-400 mt-1">All files</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <p className="text-xs font-medium text-gray-500">KYC Documents</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.kyc}</p>
          <p className="text-xs text-gray-400 mt-1">Member IDs & photos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <p className="text-xs font-medium text-gray-500">Pending Verification</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
          <p className="text-xs text-gray-400 mt-1">Need review</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-red-500" />
            </div>
            <p className="text-xs font-medium text-gray-500">Expired Documents</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.expired}</p>
          <p className="text-xs text-gray-400 mt-1">Need renewal</p>
        </div>
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
            <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Document Library</h2>
            <p className="text-xs text-gray-400 mt-0.5">{filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}</p>
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
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Status</th>
                <th className="px-5 py-2.5 text-center text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDocuments.map((doc) => {
                const catCfg = categoryConfig[doc.category];
                const stsCfg = statusConfig[doc.status];
                return (
                  <tr key={doc.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <FileIcon type={doc.fileType} />
                        <div>
                          <p className="text-xs font-semibold text-gray-900 max-w-xs truncate">{doc.name}</p>
                          <p className="text-[11px] text-gray-400">{doc.fileSize} · {doc.fileType.toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${catCfg.className}`}>
                        {catCfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs text-gray-700">{doc.relatedTo}</p>
                      <p className="text-[11px] text-gray-400">{doc.relatedId}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs text-gray-600">{doc.uploadDate}</p>
                      <p className="text-[11px] text-gray-400">by {doc.uploadedBy}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {doc.expiryDate ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${stsCfg.className}`}>
                        {stsCfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors" title="Download">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredDocuments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <p className="text-sm font-medium text-gray-500">No documents found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search or upload a new document</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Upload Document</h2>
                <p className="text-xs text-gray-500 mt-0.5">Supports PDF, JPG, PNG files</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Document Category <span className="text-red-500">*</span></label>
                <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50">
                  <option value="">Select category</option>
                  <option value="kyc">KYC Document</option>
                  <option value="loan_agreement">Loan Agreement</option>
                  <option value="group_registration">Group Registration</option>
                  <option value="receipt">Receipt</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Related Member / Loan / Group</label>
                <input type="text" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 focus:bg-white"
                  placeholder="e.g. Nakafeero Agnes, L001, BASUDDE" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Expiry Date (if applicable)</label>
                <input type="date" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 focus:bg-white" />
              </div>
              {/* Upload area */}
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-green-400 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Click or drag file to upload</p>
                <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 10 MB</p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={() => { alert('File uploaded successfully!'); setShowUploadModal(false); }}
                  className="px-6 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
