'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings, User, Shield, Monitor, Eye, EyeOff,
  CheckCircle, AlertTriangle, Lock, Globe, Bell,
  ChevronRight, LogOut, Info, Building2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { getRoleLabel, getInitials } from '@/lib/auth';
import { fmtDateTime, TIMEZONE } from '@/lib/dateUtils';

// ── Preference storage (localStorage) ─────────────────────────────────────────
const PREFS_KEY = 'kadaka_prefs';

interface Prefs {
  itemsPerPage: number;
  notifyOverdue: boolean;
  notifyApprovals: boolean;
  dateFormat: 'short' | 'long';
}

const DEFAULT_PREFS: Prefs = {
  itemsPerPage:    20,
  notifyOverdue:   true,
  notifyApprovals: true,
  dateFormat:      'short',
};

function loadPrefs(): Prefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(p: Prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

// ── Tab type ─────────────────────────────────────────────────────────────────
type Tab = 'profile' | 'security' | 'preferences' | 'organisation';

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        value ? 'bg-green-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ── Labelled row ─────────────────────────────────────────────────────────────
function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0 mr-4">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ── Read-only info field ──────────────────────────────────────────────────────
function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 font-medium">
        {value}
      </div>
    </div>
  );
}

// ── Section card ─────────────────────────────────────────────────────────────
function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
        <Icon className="w-4 h-4 text-green-600" />
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SettingsPageClient() {
  const { user, changePassword, logout } = useAuth();
  const { orgDetails, saveOrgDetails } = useOrg();
  const [tab, setTab] = useState<Tab>('profile');

  // ── Change password state ─────────────────────────────────────────────────
  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [showCurrent,setShowCurrent]= useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [showConfirm,setShowConfirm]= useState(false);
  const [pwLoading,  setPwLoading]  = useState(false);
  const [pwError,    setPwError]    = useState('');
  const [pwSuccess,  setPwSuccess]  = useState('');

  // ── Preferences state ─────────────────────────────────────────────────────
  const [prefs,      setPrefs]      = useState<Prefs>(DEFAULT_PREFS);
  const [prefSaved,  setPrefSaved]  = useState(false);

  useEffect(() => { setPrefs(loadPrefs()); }, []);

  // ── Organisation state ────────────────────────────────────────────────────
  const [orgForm, setOrgForm] = useState({
    org_name: '',
    org_tagline: '',
    org_reg_number: '',
    org_address: '',
    org_phone: '',
    org_email: '',
    org_website: '',
  });
  const [orgSaved, setOrgSaved] = useState(false);

  useEffect(() => {
    setOrgForm({
      org_name:       orgDetails.org_name,
      org_tagline:    orgDetails.org_tagline,
      org_reg_number: orgDetails.org_reg_number,
      org_address:    orgDetails.org_address,
      org_phone:      orgDetails.org_phone,
      org_email:      orgDetails.org_email,
      org_website:    orgDetails.org_website,
    });
  }, [orgDetails]);

  const role  = user?.role ?? '';
  const name  = user?.full_name ?? '—';
  const email = user?.email ?? '—';

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (!currentPw || !newPw || !confirmPw) { setPwError('All fields are required.'); return; }
    if (newPw !== confirmPw) { setPwError('New passwords do not match.'); return; }
    if (newPw.length < 8)    { setPwError('New password must be at least 8 characters.'); return; }
    if (newPw === currentPw) { setPwError('New password must be different from the current one.'); return; }
    setPwLoading(true);
    try {
      await changePassword(currentPw, newPw);
      setPwSuccess('Password changed successfully!');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  };

  const updatePref = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    savePrefs(updated);
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 2000);
  };

  const ic = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-gray-50 focus:bg-white transition-all';

  const handleOrgSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveOrgDetails(orgForm);
    setOrgSaved(true);
    setTimeout(() => setOrgSaved(false), 2500);
  };

  const TABS: { key: Tab; label: string; icon: React.ElementType; managerOnly?: boolean }[] = [
    { key: 'profile',      label: 'My Profile',    icon: User },
    { key: 'security',     label: 'Security',      icon: Shield },
    { key: 'preferences',  label: 'Preferences',   icon: Monitor },
    { key: 'organisation', label: 'Organisation',  icon: Building2, managerOnly: true },
  ];

  return (
    <div className="space-y-6">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center shadow-sm shrink-0">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage your profile, security, and display preferences</p>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-fit flex-wrap">
        {TABS.filter(t => !t.managerOnly || role === 'branch_manager').map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ──────────────────────────────────────────────────── */}
      {tab === 'profile' && (
        <div className="grid lg:grid-cols-3 gap-5">

          {/* Avatar card */}
          <div className="lg:col-span-1">
            <Card title="Account" icon={User}>
              <div className="flex flex-col items-center text-center py-4">
                <div className="w-20 h-20 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-md">
                  {getInitials(name)}
                </div>
                <p className="font-bold text-gray-900 text-base">{name}</p>
                <p className="text-sm text-green-600 font-medium mt-0.5">{getRoleLabel(role)}</p>
                <p className="text-xs text-gray-400 mt-1">{email}</p>
              </div>

              <div className="mt-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => logout()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </Card>
          </div>

          {/* Details */}
          <div className="lg:col-span-2 space-y-5">
            <Card title="Profile Information" icon={Info}>
              <div className="grid sm:grid-cols-2 gap-4">
                <InfoField label="Full Name"   value={name} />
                <InfoField label="Email"       value={email} />
                <InfoField label="Role"        value={getRoleLabel(role)} />
                <InfoField label="User ID"     value={user?.id ? user.id.slice(0, 8).toUpperCase() + '…' : '—'} />
              </div>
              <div className="mt-4 flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                To update your profile information, please contact your Branch Manager.
              </div>
            </Card>

            <Card title="System Information" icon={Globe}>
              <div className="space-y-0">
                <Row label="Timezone" desc="All dates and times are displayed in Uganda time">
                  <span className="px-2.5 py-1 bg-green-50 border border-green-200 rounded-lg text-xs font-semibold text-green-700">
                    {TIMEZONE} (UTC+3)
                  </span>
                </Row>
                <Row label="System Version" desc="Quewola Lending Management Platform">
                  <span className="px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600">
                    v2.0.0
                  </span>
                </Row>
                <Row label="Current Time" desc="Live Uganda time">
                  <span className="text-xs font-mono text-gray-600">
                    {fmtDateTime(new Date().toISOString())}
                  </span>
                </Row>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── SECURITY TAB ─────────────────────────────────────────────────── */}
      {tab === 'security' && (
        <div className="grid lg:grid-cols-2 gap-5">

          <Card title="Change Password" icon={Lock}>
            {pwError   && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />{pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                <CheckCircle className="w-4 h-4 shrink-0" />{pwSuccess}
              </div>
            )}
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* Current password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    placeholder="Enter current password"
                    className={ic + ' pr-10'}
                  />
                  <button type="button" onClick={() => setShowCurrent(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="At least 8 characters"
                    className={ic + ' pr-10'}
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    placeholder="Re-enter new password"
                    className={ic + ' pr-10'}
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Strength hints */}
              {newPw && (
                <ul className="space-y-1 text-xs">
                  {[
                    { ok: newPw.length >= 8,           label: 'At least 8 characters' },
                    { ok: /[A-Z]/.test(newPw),         label: 'Contains uppercase letter' },
                    { ok: /[0-9]/.test(newPw),         label: 'Contains a number' },
                    { ok: confirmPw && newPw === confirmPw, label: 'Passwords match' },
                  ].map(({ ok, label }) => (
                    <li key={label} className={`flex items-center gap-1.5 ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-gray-300'}`} />
                      {label}
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="submit"
                disabled={pwLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
              >
                {pwLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : <Lock className="w-4 h-4" />}
                {pwLoading ? 'Changing…' : 'Change Password'}
              </button>
            </form>
          </Card>

          {/* Security tips */}
          <Card title="Security Tips" icon={Shield}>
            <div className="space-y-3">
              {[
                { title: 'Use a strong password',   desc: 'Mix uppercase, lowercase, numbers and symbols for best security.' },
                { title: 'Keep it private',         desc: 'Never share your password with colleagues or write it down.' },
                { title: 'Change regularly',        desc: 'Update your password every 3 months to protect your account.' },
                { title: 'Sign out when done',      desc: 'Always log out when using shared or public computers.' },
                { title: 'Report suspicious activity', desc: 'Contact your Branch Manager if you notice unusual logins.' },
              ].map(({ title, desc }) => (
                <div key={title} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── ORGANISATION TAB ─────────────────────────────────────────────── */}
      {tab === 'organisation' && role === 'branch_manager' && (
        <div className="max-w-2xl space-y-5">
          {orgSaved && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Organisation details saved successfully.
            </div>
          )}
          <Card title="Organisation Details" icon={Building2}>
            <form onSubmit={handleOrgSave} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Organisation Name</label>
                  <input
                    type="text"
                    value={orgForm.org_name}
                    onChange={e => setOrgForm(f => ({ ...f, org_name: e.target.value }))}
                    placeholder="e.g. Kadaka Establishment Co."
                    className={ic}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tagline / Description</label>
                  <input
                    type="text"
                    value={orgForm.org_tagline}
                    onChange={e => setOrgForm(f => ({ ...f, org_tagline: e.target.value }))}
                    placeholder="e.g. Lending Management System"
                    className={ic}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Registration Number</label>
                  <input
                    type="text"
                    value={orgForm.org_reg_number}
                    onChange={e => setOrgForm(f => ({ ...f, org_reg_number: e.target.value }))}
                    placeholder="e.g. 80020001234567"
                    className={ic}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={orgForm.org_phone}
                    onChange={e => setOrgForm(f => ({ ...f, org_phone: e.target.value }))}
                    placeholder="e.g. +256 700 000 000"
                    className={ic}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Address</label>
                  <input
                    type="text"
                    value={orgForm.org_address}
                    onChange={e => setOrgForm(f => ({ ...f, org_address: e.target.value }))}
                    placeholder="e.g. Plot 12, Kampala Road, Kampala"
                    className={ic}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={orgForm.org_email}
                    onChange={e => setOrgForm(f => ({ ...f, org_email: e.target.value }))}
                    placeholder="e.g. info@myorg.ug"
                    className={ic}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Website</label>
                  <input
                    type="text"
                    value={orgForm.org_website}
                    onChange={e => setOrgForm(f => ({ ...f, org_website: e.target.value }))}
                    placeholder="e.g. www.myorg.ug"
                    className={ic}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Save Organisation Details
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── PREFERENCES TAB ──────────────────────────────────────────────── */}
      {tab === 'preferences' && (
        <div className="grid lg:grid-cols-2 gap-5">

          {prefSaved && (
            <div className="lg:col-span-2 flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Preferences saved automatically.
            </div>
          )}

          <Card title="Display" icon={Monitor}>
            <Row
              label="Items Per Page"
              desc="Default number of rows shown in tables"
            >
              <select
                value={prefs.itemsPerPage}
                onChange={e => updatePref('itemsPerPage', Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
              >
                <option value={10}>10 rows</option>
                <option value={20}>20 rows</option>
                <option value={50}>50 rows</option>
              </select>
            </Row>

            <Row
              label="Date Format"
              desc="How dates are displayed across the app"
            >
              <select
                value={prefs.dateFormat}
                onChange={e => updatePref('dateFormat', e.target.value as 'short' | 'long')}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
              >
                <option value="short">12 Mar 2026</option>
                <option value="long">12 March 2026</option>
              </select>
            </Row>

            <Row
              label="Timezone"
              desc="System timezone — cannot be changed"
            >
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-lg text-xs font-semibold text-green-700">
                <Globe className="w-3.5 h-3.5" />
                Africa/Kampala (UTC+3)
              </span>
            </Row>
          </Card>

          <Card title="Notifications" icon={Bell}>
            <Row
              label="Overdue Loan Alerts"
              desc="Show badge on nav when loans are overdue"
            >
              <Toggle
                value={prefs.notifyOverdue}
                onChange={v => updatePref('notifyOverdue', v)}
              />
            </Row>
            {(role === 'branch_manager') && (
              <Row
                label="Pending Approval Alerts"
                desc="Show badge when loans are awaiting approval"
              >
                <Toggle
                  value={prefs.notifyApprovals}
                  onChange={v => updatePref('notifyApprovals', v)}
                />
              </Row>
            )}

            <div className="mt-4 flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Notification preferences are saved locally in your browser.
            </div>
          </Card>

          {/* Quick links */}
          <div className="lg:col-span-2">
            <Card title="Quick Access" icon={ChevronRight}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'View My Dashboard',  path: '/dashboard',  color: 'green' },
                  { label: 'Record a Payment',   path: '/payments',   color: 'blue' },
                  { label: 'View Active Loans',  path: '/loans',      color: 'purple' },
                  { label: 'View Documents',     path: '/documents',  color: 'amber' },
                ].map(({ label, path, color }) => (
                  <a
                    key={path}
                    href={path}
                    className={`flex items-center justify-between px-4 py-3 bg-${color}-50 border border-${color}-200 rounded-xl text-sm font-semibold text-${color}-700 hover:bg-${color}-100 transition-all`}
                  >
                    {label}
                    <ChevronRight className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
