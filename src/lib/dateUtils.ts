/**
 * Uganda timezone (Africa/Kampala, UTC+3) date helpers.
 * Use these everywhere instead of bare toLocaleDateString / toLocaleString calls.
 */

export const TIMEZONE = 'Africa/Kampala';
const LOCALE   = 'en-UG';

/** "12 Mar 2026" */
export function fmtDate(s: string | null | undefined): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric', timeZone: TIMEZONE });
}

/** "12 Mar 2026, 14:32" */
export function fmtDateTime(s: string | null | undefined): string {
  if (!s) return '—';
  return new Date(s).toLocaleString(LOCALE, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: TIMEZONE,
  });
}

/** "14:32" */
export function fmtTime(s: string | null | undefined): string {
  if (!s) return '—';
  return new Date(s).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TIMEZONE });
}

/** Returns today's date in YYYY-MM-DD for the Uganda timezone */
export function todayUG(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE }); // en-CA → YYYY-MM-DD
}

/** "UGX 50,000" */
export function ugx(n: number | string | null | undefined): string {
  return 'UGX ' + Number(n || 0).toLocaleString(LOCALE);
}
