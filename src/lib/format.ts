// Formatting helpers. All monetary/percent/date output is mono + tabular-nums
// at the component level; these just produce the strings.

export function formatCurrency(
  value: number,
  opts: { cents?: boolean; sign?: boolean } = {},
): string {
  const { cents = false, sign = false } = opts;
  const rounded = cents ? value : Math.round(value);
  const str = rounded.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
  if (sign && value > 0) return `+${str}`;
  return str;
}

// Compact currency for chart axes: $1.2k, $34k, $1.1M.
export function formatCurrencyShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return `$${Math.round(value)}`;
}

export function formatPercent(value: number, digits = 2): string {
  return `${value.toFixed(digits)}%`;
}

// "Mar 2027"
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// "March 2027"
export function formatMonthYearLong(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// "Jul 3, 2026"
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Human duration from a month count: "3 yr 2 mo", "8 mo".
export function formatDuration(totalMonths: number): string {
  if (!Number.isFinite(totalMonths)) return '—';
  const m = Math.max(0, Math.round(totalMonths));
  const years = Math.floor(m / 12);
  const months = m % 12;
  if (years === 0) return `${months} mo`;
  if (months === 0) return `${years} yr`;
  return `${years} yr ${months} mo`;
}

export function pluralMonths(n: number): string {
  return `${n} ${n === 1 ? 'month' : 'months'}`;
}

// Add whole months to a date, clamped to the current day-of-month.
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}
