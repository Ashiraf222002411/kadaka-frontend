const TOKEN_KEY = 'kadaka_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  full_name: string;
  branch_id: string;
  iat?: number;
  exp?: number;
}

/** Decode JWT payload without verification (client-side display only). */
export function decodeToken(token: string): AuthUser | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded as AuthUser;
  } catch {
    return null;
  }
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    branch_manager: 'Branch Manager',
    loan_officer: 'Loan Officer',
    accountant: 'Accountant',
    director: 'Director',
  };
  return labels[role] ?? role;
}

export function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
