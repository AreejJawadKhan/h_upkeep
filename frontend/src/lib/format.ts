import type { CurrencyCode } from '../context/PreferencesContext';

function parseDateValue(value: string | null | undefined) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined) {
  const date = parseDateValue(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function formatCurrency(value: number, currencyCode: CurrencyCode = 'PKR') {
  const locale = currencyCode === 'PKR' ? 'en-PK' : 'en';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}
