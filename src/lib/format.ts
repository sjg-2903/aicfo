export const CURRENCY = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v);

export const COMPACT_CURRENCY = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(v);

// Type-safe formatter for Recharts tooltips
export const moneyTooltip = (v: unknown) =>
  typeof v === 'number' ? CURRENCY(v) : String(v ?? '');

export const formatNumber = (v: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(v);
