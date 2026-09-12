const audFmt = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a value as Australian dollars with cents (e.g. $1,234.56). */
export function aud(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0.00';
  return audFmt.format(n);
}
