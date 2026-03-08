import { getToken } from './auth';

const BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://kadaka-backend-production.up.railway.app';

async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      (data as { error?: string; message?: string }).error ??
      (data as { error?: string; message?: string }).message ??
      `Request failed: ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

// ── File upload (multipart) ──────────────────────────────────────────────────
export async function uploadFile(file: File): Promise<{ url: string; filename: string; size: number }> {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api/uploads`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Upload failed');
  return data as { url: string; filename: string; size: number };
}

// ── Auth ────────────────────────────────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: { id: string; email: string; full_name: string; role: string } }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),
  getMe: () => apiFetch('/api/auth/me'),
};

// ── Dashboard ───────────────────────────────────────────────────────────────
export const dashboard = {
  getStats: () =>
    apiFetch<{
      totalMembers: number; activeLoans: number; totalPortfolio: number;
      collectionsToday: number; collectionsMTD: number; overdueLoans: number;
      portfolioAtRisk: number; disbursementsToday: number; pendingApprovals?: number;
    }>('/api/dashboard/stats'),
  getRecentLoans: () => apiFetch<{ data?: unknown[]; rows?: unknown[] }>('/api/dashboard/recent-loans'),
  getRecentPayments: () => apiFetch<{ data?: unknown[]; rows?: unknown[] }>('/api/dashboard/recent-payments'),
  getOverdueLoans: () => apiFetch<{ data?: unknown[]; rows?: unknown[] }>('/api/dashboard/overdue-loans'),
  getSummary: () => apiFetch('/api/dashboard/summary'),
};

// ── Members ─────────────────────────────────────────────────────────────────
export const members = {
  getAll: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return apiFetch<{ data: unknown[]; total: number; page: number; limit: number }>(`/api/members${qs}`);
  },
  getById: (id: string) => apiFetch(`/api/members/${id}`),
  create: (data: Record<string, unknown>) =>
    apiFetch('/api/members', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/api/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getLoans: (id: string) => apiFetch(`/api/members/${id}/loans`),
};

// ── Groups ──────────────────────────────────────────────────────────────────
export const groups = {
  getAll: () => apiFetch<unknown[]>('/api/groups'),
  getById: (id: string) => apiFetch(`/api/groups/${id}`),
  create: (data: Record<string, unknown>) =>
    apiFetch('/api/groups', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/api/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getMembers: (id: string) => apiFetch(`/api/groups/${id}/members`),
};

// ── Loans ───────────────────────────────────────────────────────────────────
export const loans = {
  getAll: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return apiFetch<{ data: unknown[]; total: number; page: number; limit: number }>(`/api/loans${qs}`);
  },
  getActive: () => apiFetch<unknown[]>('/api/loans/active'),
  getById: (id: string) => apiFetch(`/api/loans/${id}`),
  preview: (amount: number, interestRate?: number, loanPeriod?: number) => {
    const qs = new URLSearchParams({
      amount: String(amount),
      ...(interestRate ? { interest_rate: String(interestRate) } : {}),
      ...(loanPeriod ? { loan_period: String(loanPeriod) } : {}),
    });
    return apiFetch<{
      principal: number; interestRate: number; loanPeriod: number;
      totalInterest: number; totalRepayable: number; dailyPayment: number;
    }>(`/api/loans/preview?${qs}`);
  },
  create: (data: Record<string, unknown>) =>
    apiFetch('/api/loans', { method: 'POST', body: JSON.stringify(data) }),
  approve: (id: string, approvedAmount: number) =>
    apiFetch(`/api/loans/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ approved_amount: approvedAmount }) }),
  reject: (id: string, reason: string) =>
    apiFetch(`/api/loans/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ rejection_reason: reason }) }),
  disburse: (id: string, method = 'cash') =>
    apiFetch(`/api/loans/${id}/disburse`, { method: 'PATCH', body: JSON.stringify({ disbursement_method: method }) }),
  applyPenalty: (id: string) =>
    apiFetch(`/api/loans/${id}/penalty`, { method: 'PATCH' }),
};

// ── Payments ────────────────────────────────────────────────────────────────
export const payments = {
  getAll: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return apiFetch<{ data: unknown[]; total: number; page: number; limit: number }>(`/api/payments${qs}`);
  },
  getById: (id: string) => apiFetch(`/api/payments/${id}`),
  todaySummary: () => apiFetch('/api/payments/today-summary'),
  create: (data: {
    loan_id: string; amount_paid: number; payment_date?: string;
    payment_method?: string; transaction_reference?: string; notes?: string;
  }) => apiFetch('/api/payments', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Cashbook ────────────────────────────────────────────────────────────────
export const cashbook = {
  getByDate: (date: string) => apiFetch(`/api/cashbook?date=${date}`),
  getSummary: (date: string) => apiFetch(`/api/cashbook/summary?date=${date}`),
  create: (data: {
    transaction_date: string; transaction_time: string; type: 'cash_in' | 'expense';
    category: string; description: string; amount: number; reference?: string;
  }) => apiFetch('/api/cashbook', { method: 'POST', body: JSON.stringify(data) }),
  setOpeningBalance: (balance_date: string, opening_balance: number) =>
    apiFetch('/api/cashbook/opening-balance', { method: 'POST', body: JSON.stringify({ balance_date, opening_balance }) }),
  remove: (id: string) => apiFetch(`/api/cashbook/${id}`, { method: 'DELETE' }),
};

// ── Documents ────────────────────────────────────────────────────────────────
export const documents = {
  getAll: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<{ data: unknown[]; total: number }>(`/api/documents${qs}`);
  },
  create: (data: {
    name: string; category: string; related_to?: string; related_id?: string;
    file_url: string; file_size?: number; file_type?: string; expiry_date?: string;
  }) => apiFetch('/api/documents', { method: 'POST', body: JSON.stringify(data) }),
  remove: (id: string) => apiFetch(`/api/documents/${id}`, { method: 'DELETE' }),
};

// ── Users ────────────────────────────────────────────────────────────────────
export const users = {
  getAll: () => apiFetch<{ data: unknown[]; total: number }>('/api/users'),
  create: (data: { email: string; password: string; full_name: string; role: string }) =>
    apiFetch('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { full_name?: string; role?: string; is_active?: boolean }) =>
    apiFetch(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  resetPassword: (id: string, new_password: string) =>
    apiFetch(`/api/users/${id}/reset-password`, { method: 'PATCH', body: JSON.stringify({ new_password }) }),
};

// ── Audit Logs ───────────────────────────────────────────────────────────────
export const auditLogs = {
  getAll: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<{ data: unknown[]; total: number; page: number; limit: number }>(`/api/audit-logs${qs}`);
  },
  getActions: () => apiFetch<string[]>('/api/audit-logs/actions'),
};

// ── Reports ─────────────────────────────────────────────────────────────────
export const reports = {
  dailyFinancial: (date: string) => apiFetch(`/api/reports/daily-financial?date=${date}`),
  portfolioRisk: () => apiFetch('/api/reports/portfolio-risk'),
  collectionSheet: (date: string) => apiFetch(`/api/reports/collection-sheet?date=${date}`),
  loanAging: () => apiFetch('/api/reports/loan-aging'),
  disbursements: (dateFrom: string, dateTo: string) =>
    apiFetch(`/api/reports/disbursements?date_from=${dateFrom}&date_to=${dateTo}`),
  memberStatement: (memberId: string) => apiFetch(`/api/reports/member-statement/${memberId}`),
};
