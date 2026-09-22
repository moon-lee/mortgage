export function dailyInterest(
  loanBalance: number,
  offsetTotal: number,
  rateDecimal: number,
): number {
  const net = loanBalance - offsetTotal;
  if (!(net > 0) || !(rateDecimal > 0)) return 0;
  return Math.round(net * (rateDecimal / 365) * 100) / 100;
}

export function daysInMonth(entryDate: string): number {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(entryDate);
  if (!m) return 30;
  const year = Number(m[1]);
  const month = Number(m[2]);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthlyInterest(daily: number, entryDate: string): number {
  return Math.round(daily * daysInMonth(entryDate) * 100) / 100;
}

/** Sheet parity: D = F/(F+H) — actual repayment over repayment + interest charged. */
export function yearlyPrincipalRatio(
  actualRepayment: number,
  interestCharged: number,
): number {
  const total = actualRepayment + interestCharged;
  if (!(total > 0)) return 0;
  return actualRepayment / total;
}

export function avgSaving(
  firstBalance: number,
  lastBalance: number,
  count: number,
): number {
  if (!(count > 1)) return 0;
  return (lastBalance - firstBalance) / (count - 1);
}

/** Mean of month-to-month changes over the last `window` intervals (default 12). */
export function trailingMonthlyAvg(series: number[], window = 12): number {
  if (series.length < 2) return 0;
  const diffs: number[] = [];
  for (let i = 1; i < series.length; i++) diffs.push(series[i] - series[i - 1]);
  const tail = diffs.slice(-Math.max(1, window));
  return tail.reduce((s, d) => s + d, 0) / tail.length;
}

export function estimateNperMonths(
  avgSavingPerMonth: number,
  currentBalance: number,
  target: number,
): number {
  if (!(avgSavingPerMonth > 0)) return 0;
  const remaining = target - currentBalance;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / avgSavingPerMonth);
}

export function formatPeriod(totalMonths: number): string {
  const m = Math.max(0, Math.round(totalMonths));
  const y = Math.floor(m / 12);
  const rem = m % 12;
  if (y === 0) return rem + ' Month' + (rem === 1 ? '' : 's');
  if (rem === 0) return y + ' Year' + (y === 1 ? '' : 's');
  return (
    y +
    ' Year' +
    (y === 1 ? '' : 's') +
    ' and ' +
    rem +
    ' Month' +
    (rem === 1 ? '' : 's')
  );
}

export function targetDateIso(nperMonths: number, fromIso?: string): string {
  const base = fromIso || new Date().toISOString().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(base);
  if (!m) return base;
  let y = Number(m[1]);
  let mo = Number(m[2]);
  const d = Math.min(Number(m[3]), 28);
  mo += Math.max(0, Math.round(nperMonths));
  y += Math.floor((mo - 1) / 12);
  mo = ((mo - 1) % 12) + 1;
  const mm = String(mo).padStart(2, '0');
  return y + '-' + mm + '-' + String(d).padStart(2, '0');
}

/** Minimum monthly P&I repayment for principal at annualRate over monthsLeft payments. */
export function minRepayment(
  principal: number,
  annualRate: number,
  monthsLeft: number,
): number {
  if (!(principal > 0) || !(annualRate > 0) || !(monthsLeft > 0)) return 0;
  const r = annualRate / 12;
  const n = Math.floor(monthsLeft);
  const factor = Math.pow(1 + r, n);
  return Math.round(((principal * r * factor) / (factor - 1)) * 100) / 100;
}

/** Full calendar months from startIso to asOfIso (defaults today); 0 when asOf <= start. */
export function elapsedMonths(startIso: string, asOfIso?: string): number {
  const asOf = asOfIso || new Date().toISOString().slice(0, 10);
  const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startIso);
  const m2 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asOf);
  if (!m1 || !m2) return 0;
  let months =
    (Number(m2[1]) - Number(m1[1])) * 12 + (Number(m2[2]) - Number(m1[2]));
  if (Number(m2[3]) < Number(m1[3])) months -= 1;
  return Math.max(0, months);
}
