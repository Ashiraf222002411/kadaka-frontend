'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

export type OrgDetails = {
  org_name: string;
  org_tagline: string;
  org_address: string;
  org_phone: string;
  org_email: string;
  org_website: string;
  org_reg_number: string;
};

export type SubBranch = {
  id: string;
  name: string;
  address: string;
  phone: string;
  manager_name: string;
  created_at: string;
};

const DEFAULT_ORG: OrgDetails = {
  org_name: 'My Organisation',
  org_tagline: 'Lending Management System',
  org_address: '',
  org_phone: '',
  org_email: '',
  org_website: '',
  org_reg_number: '',
};

interface OrgContextValue {
  orgDetails: OrgDetails;
  branches: SubBranch[];
  saveOrgDetails: (d: Partial<OrgDetails>) => void;
  saveBranch: (b: Omit<SubBranch, 'id' | 'created_at'> & { id?: string }) => void;
  deleteBranch: (id: string) => void;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const key = user?.branch_id ? `quewola_org_${user.branch_id}` : null;

  const load = useCallback(() => {
    if (!key || typeof window === 'undefined') return { details: DEFAULT_ORG, branches: [] as SubBranch[] };
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { details: DEFAULT_ORG, branches: [] as SubBranch[] };
  }, [key]);

  const [orgDetails, setOrgDetails] = useState<OrgDetails>(DEFAULT_ORG);
  const [branches, setBranches] = useState<SubBranch[]>([]);

  useEffect(() => {
    const d = load();
    setOrgDetails({ ...DEFAULT_ORG, ...d.details });
    setBranches(d.branches ?? []);
  }, [load]);

  const persist = (details: OrgDetails, brs: SubBranch[]) => {
    if (!key) return;
    localStorage.setItem(key, JSON.stringify({ details, branches: brs }));
  };

  const saveOrgDetails = (d: Partial<OrgDetails>) => {
    const next = { ...orgDetails, ...d };
    setOrgDetails(next);
    persist(next, branches);
  };

  const saveBranch = (b: Omit<SubBranch, 'id' | 'created_at'> & { id?: string }) => {
    setBranches(prev => {
      const exists = prev.find(x => x.id === b.id);
      const next = exists
        ? prev.map(x => x.id === b.id ? { ...x, ...b } : x)
        : [...prev, { ...b, id: b.id ?? crypto.randomUUID(), created_at: new Date().toISOString() }];
      persist(orgDetails, next);
      return next;
    });
  };

  const deleteBranch = (id: string) => {
    setBranches(prev => {
      const next = prev.filter(x => x.id !== id);
      persist(orgDetails, next);
      return next;
    });
  };

  return (
    <OrgContext.Provider value={{ orgDetails, branches, saveOrgDetails, saveBranch, deleteBranch }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used inside <OrgProvider>');
  return ctx;
}
