'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  X,
  Upload,
  Calendar,
  ArrowLeft,
} from 'lucide-react';

// Types
interface Loan {
  id: string;
  memberName: string;
  groupName: string;
  amount: number;
  approvedAmount: number;
  type: 'school_fees' | 'business' | 'home_improvement';
  status: 'pending' | 'approved' | 'rejected' | 'disbursed' | 'active' | 'cleared';
  applicationDate: string;
  approvalDate?: string;
  disbursementDate?: string;
  maturityDate?: string;
  balance: number;
  daysOverdue?: number;
}

interface LoanFormData {
  loanType: 'school_fees' | 'business' | 'home_improvement';
  fullNames: string;
  photo: File | null;
  businessType: string;
  amountApplied: number;
  residenceStatus: 'owned' | 'rented';
  landlordName?: string;
  landlordPhone?: string;
  location?: string;
  lcZone?: string;
  loanPeriod: number;
  startDate: string;
  assets: Array<{ item: string; value: number }>;
  acceptDeclaration: boolean;
  applicantName: string;
  signatureData?: string;
}

export default function LoansClient() {
  const [showNewLoanModal, setShowNewLoanModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState<LoanFormData>({
    loanType: 'business',
    fullNames: '',
    photo: null,
    businessType: '',
    amountApplied: 0,
    residenceStatus: 'owned',
    loanPeriod: 30,
    startDate: new Date().toISOString().split('T')[0],
    assets: [{ item: '', value: 0 }],
    acceptDeclaration: false,
    applicantName: '',
  });

  // Mock data
  const loans: Loan[] = [
    {
      id: 'L001',
      memberName: 'Nakafeero Agnes',
      groupName: 'BASUDDE',
      amount: 300000,
      approvedAmount: 300000,
      type: 'business',
      status: 'pending',
      applicationDate: '2026-02-19',
      balance: 300000,
    },
    {
      id: 'L002',
      memberName: 'Gassanua James',
      groupName: 'LUTANGU',
      amount: 150000,
      approvedAmount: 150000,
      type: 'school_fees',
      status: 'approved',
      applicationDate: '2026-02-18',
      approvalDate: '2026-02-19',
      balance: 150000,
    },
    {
      id: 'L003',
      memberName: 'Narafeero Agnes',
      groupName: 'BASUDDE',
      amount: 200000,
      approvedAmount: 200000,
      type: 'home_improvement',
      status: 'active',
      applicationDate: '2026-01-19',
      disbursementDate: '2026-02-01',
      maturityDate: '2026-08-01',
      balance: 120000,
    },
    {
      id: 'L004',
      memberName: 'Twine Collins',
      groupName: 'LUTANGU',
      amount: 500000,
      approvedAmount: 500000,
      type: 'business',
      status: 'active',
      applicationDate: '2026-01-10',
      disbursementDate: '2026-01-20',
      maturityDate: '2026-07-20',
      balance: 350000,
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'cleared':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'cleared':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const filteredLoans = loans.filter((loan) => {
    const matchesSearch =
      loan.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loan.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleFormChange = (field: keyof LoanFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddAsset = () => {
    setFormData((prev) => ({
      ...prev,
      assets: [...prev.assets, { item: '', value: 0 }],
    }));
  };

  const handleRemoveAsset = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      assets: prev.assets.filter((_, i) => i !== index),
    }));
  };

  const handleSubmitLoan = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting loan:', formData);
    setShowNewLoanModal(false);
    setFormData({
      loanType: 'business',
      fullNames: '',
      photo: null,
      businessType: '',
      amountApplied: 0,
      residenceStatus: 'owned',
      loanPeriod: 30,
      startDate: new Date().toISOString().split('T')[0],
      assets: [{ item: '', value: 0 }],
      acceptDeclaration: false,
      applicantName: '',
    });
    setCurrentStep(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 lg:px-6">
          <div className="flex items-center space-x-4 mb-4">
            <Link href="/dashboard" className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Loan Management</h1>
              <p className="text-sm text-gray-500">Manage and track all loans</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full sm:max-w-xs relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search loans or members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="active">Active</option>
                <option value="cleared">Cleared</option>
              </select>

              <button className="flex items-center space-x-1 px-3 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>

              <button
                onClick={() => setShowNewLoanModal(true)}
                className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Loan</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 lg:px-6">
        {/* Loans Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Loan ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Member</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Group</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Balance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLoans.length > 0 ? (
                  filteredLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-medium text-gray-900">{loan.id}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{loan.memberName}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{loan.groupName}</td>
                      <td className="px-4 py-3 text-xs capitalize text-gray-600">
                        {loan.type.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-900">
                        {formatCurrency(loan.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border ${getStatusColor(
                            loan.status
                          )}`}
                        >
                          {getStatusIcon(loan.status)}
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-900">
                        {formatCurrency(loan.balance)}
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-xs font-medium text-green-600 hover:text-green-700 flex items-center space-x-1">
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                      No loans found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Loan Modal */}
      {showNewLoanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900">New Loan Application</h2>
              <button
                onClick={() => setShowNewLoanModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLoan} className="p-6 space-y-6">
              {/* Step Indicators */}
              <div className="flex items-center justify-between mb-8">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                        step <= currentStep
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {step}
                    </div>
                    {step < 3 && (
                      <div
                        className={`w-12 h-1 mx-2 ${
                          step < currentStep ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Step 1: Loan Details */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Loan Details</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type</label>
                    <select
                      value={formData.loanType}
                      onChange={(e) => handleFormChange('loanType', e.target.value as any)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="business">Business Loan</option>
                      <option value="school_fees">School Fees Loan</option>
                      <option value="home_improvement">Home Improvement Loan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount Applied
                    </label>
                    <input
                      type="number"
                      value={formData.amountApplied}
                      onChange={(e) => handleFormChange('amountApplied', Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter amount"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Applicant Info */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Applicant Information</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Names</label>
                    <input
                      type="text"
                      value={formData.fullNames}
                      onChange={(e) => handleFormChange('fullNames', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter full names"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
                    <input
                      type="text"
                      value={formData.businessType}
                      onChange={(e) => handleFormChange('businessType', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter business type"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Declaration */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">Declaration</h3>
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.acceptDeclaration}
                      onChange={(e) => handleFormChange('acceptDeclaration', e.target.checked)}
                      className="w-4 h-4 mt-1 text-green-600 rounded focus:ring-green-500"
                    />
                    <label className="text-sm text-gray-700">
                      I confirm that the information provided is true and accurate
                    </label>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                  disabled={currentStep === 1}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Back
                </button>

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    Submit
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
