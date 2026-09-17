const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDate(s: string): number | null {
  if (typeof s !== 'string' || !ISO_DATE_RE.test(s)) return null;
  const t = Date.parse(s + 'T00:00:00Z');
  return Number.isNaN(t) ? null : t;
}

export function computeFinanceYear(
  entryDate: string,
  financialYearStart: string,
): string | null {
  const ts = parseIsoDate(entryDate);
  if (ts === null) return null;
  const parts = (financialYearStart || '').split('-');
  const mm = parts[0];
  const dd = parts[1];
  if (!mm || !dd || mm.length !== 2 || dd.length !== 2) return null;
  const d = new Date(ts);
  const year = d.getUTCFullYear();
  const fyStartThisYear = Date.parse(year + '-' + mm + '-' + dd + 'T00:00:00Z');
  const fyStartLastYear = Date.parse(
    year - 1 + '-' + mm + '-' + dd + 'T00:00:00Z',
  );
  if (Number.isNaN(fyStartThisYear) || Number.isNaN(fyStartLastYear))
    return null;
  let fyStartYear: number;
  if (ts >= fyStartThisYear) fyStartYear = year;
  else if (ts >= fyStartLastYear) fyStartYear = year - 1;
  else return null;
  return fyStartYear + '-' + (fyStartYear + 1);
}

export function isFutureDate(entryDate: string, todayIso?: string): boolean {
  const ts = parseIsoDate(entryDate);
  if (ts === null) return true;
  const today = todayIso || new Date().toISOString().slice(0, 10);
  const todayTs = parseIsoDate(today);
  if (todayTs === null) return false;
  return ts > todayTs;
}
