import { computeFinanceYear, isFutureDate } from '../utils/finance-year.js';
import { dailyInterest, monthlyInterest, avgSaving, estimateNperMonths, formatPeriod, targetDateIso, trailingMonthlyAvg, yearlyPrincipalRatio } from '../utils/mortgage-math.js';
import { listAccounts, listActiveAccounts } from '../dao/accounts.js';
import { lookupRate, listRates } from '../dao/rates.js';
import { getLatest, listRepayments } from '../dao/repayments.js';
import { sumBalancesForRepayment, listBalancesForRepayment } from '../dao/offset-balances.js';
import { ensureLoan, getLoan, updateLoan } from '../dao/loans.js';

export interface MonthEndInput {
  entry_date: string;
  scheduled_balance: number;
  actual_balance: number;
  fy_interest: number;
  offset_saving_fy: number;
  actual_repayment: number;
  scheduled_payment: number;
  interest_charged: number;
  base_amount?: number;
  fee?: number;
  total_paid: number;
  extra_paid: number;
  offsets: Record<string, number>;
}

async function readFyStart(finance: any): Promise<string> {
  try {
    const v = await finance.settings.get('core.financialYear.start');
    if (typeof v === 'string' && /^\d{2}-\d{2}$/.test(v)) return v;
  } catch { /* use default */ }
  return '07-01';
}

function num(name: string, v: unknown, opts: { min?: number } = {}): number {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error('ValidationFailed: ' + name + ' must be a number');
  if (opts.min !== undefined && n < opts.min) throw new Error('ValidationFailed: ' + name + ' must be >= ' + opts.min);
  return n;
}

export async function saveMonthEnd(finance: any, input: MonthEndInput): Promise<{ repayment_id: number }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.entry_date)) throw new Error('ValidationFailed: entry_date must be YYYY-MM-DD');
  if (isFutureDate(input.entry_date)) throw new Error('ValidationFailed: entry_date cannot be in the future');
  const sameDate = await finance.db.table('mortgage_repayments').findOne({ entry_date: input.entry_date });
  if (sameDate) throw new Error('ValidationFailed: snapshot for ' + input.entry_date + ' already exists — delete it first');
  const fyStart = await readFyStart(finance);
  const fy = computeFinanceYear(input.entry_date, fyStart);
  if (!fy) throw new Error('ValidationFailed: cannot compute finance year');

  const base = input.base_amount ?? 3899.36;
  const fee = input.fee ?? 8;
  if (Math.abs(Number(input.total_paid) - (Number(base) + Number(fee))) > 0.01) {
    throw new Error('ValidationFailed: total_paid must equal base_amount + fee');
  }

  const repayment = {
    entry_date: input.entry_date,
    finance_year: fy,
    scheduled_balance: num('scheduled_balance', input.scheduled_balance, { min: 0 }),
    actual_balance: num('actual_balance', input.actual_balance, { min: 0 }),
    fy_interest: num('fy_interest', input.fy_interest, { min: 0 }),
    offset_saving_fy: num('offset_saving_fy', input.offset_saving_fy, { min: 0 }),
    actual_repayment: num('actual_repayment', input.actual_repayment, { min: 0 }),
    scheduled_payment: num('scheduled_payment', input.scheduled_payment, { min: 0 }),
    interest_charged: num('interest_charged', input.interest_charged, { min: 0 }),
    base_amount: num('base_amount', base, { min: 0 }),
    fee: num('fee', fee, { min: 0 }),
    total_paid: num('total_paid', input.total_paid, { min: 0 }),
    extra_paid: Number(input.extra_paid),
  };
  if (!Number.isFinite(repayment.extra_paid)) throw new Error('ValidationFailed: extra_paid must be a number');

  const accounts = await listActiveAccounts(finance);
  if (accounts.length < 1) throw new Error('ValidationFailed: at least one active offset account is required');
  const balances: Array<{ account_id: number; balance: number }> = [];
  for (const a of accounts) {
    const raw = input.offsets[a.account_key];
    if (raw === undefined) throw new Error('ValidationFailed: missing balance for ' + a.account_key);
    balances.push({ account_id: a.id, balance: num('offset ' + a.account_key, raw, { min: 0 }) });
  }

  const res = await finance.db.table('mortgage_repayments').insert(repayment);
  const repaymentId = res.id as number;
  try {
    for (const b of balances) {
      await finance.db.table('mortgage_offset_balances').insert({ repayment_id: repaymentId, account_id: b.account_id, balance: b.balance });
    }
  } catch (e) {
    await finance.db.table('mortgage_offset_balances').delete({ repayment_id: repaymentId });
    await finance.db.table('mortgage_repayments').delete({ id: repaymentId });
    throw e;
  }
  return { repayment_id: repaymentId };
}

export async function getSnapshot(finance: any): Promise<{ entry_date: string | null; loan: number; offset_total: number; rate: number | null; daily: number; monthly: number }> {
  const latest = await getLatest(finance);
  if (!latest) return { entry_date: null, loan: 0, offset_total: 0, rate: null, daily: 0, monthly: 0 };
  const offsetTotal = await sumBalancesForRepayment(finance, latest.id);
  const rates = await listRates(finance);
  const hit = lookupRate(rates, latest.entry_date);
  const rate = hit ? hit.rate : null;
  const daily = rate == null ? 0 : dailyInterest(latest.actual_balance, offsetTotal, rate);
  return { entry_date: latest.entry_date, loan: latest.actual_balance, offset_total: offsetTotal, rate, daily, monthly: monthlyInterest(daily, latest.entry_date) };
}

/**
 * Cross-extension summary (domain service `summary`): current loan balance,
 * offset balance and net loan in one call. Pure read, latest snapshot wins.
 */
export async function getSummary(finance: any): Promise<{ entry_date: string | null; loan_balance: number; offset_balance: number; net_loan: number }> {
  const snap = await getSnapshot(finance);
  return {
    entry_date: snap.entry_date,
    loan_balance: snap.loan,
    offset_balance: snap.offset_total,
    net_loan: Math.round((snap.loan - snap.offset_total) * 100) / 100,
  };
}

export async function getSnapshotHistory(finance: any): Promise<Array<{ entry_date: string; loan: number; offset_total: number; rate: number | null; daily: number; monthly: number }>> {
  const rows = await listRepayments(finance);
  const rates = await listRates(finance);
  const out: Array<{ entry_date: string; loan: number; offset_total: number; rate: number | null; daily: number; monthly: number }> = [];
  for (const r of rows) {
    const offsetTotal = await sumBalancesForRepayment(finance, r.id);
    const hit = lookupRate(rates, r.entry_date);
    const rate = hit ? hit.rate : null;
    const daily = rate == null ? 0 : dailyInterest(r.actual_balance, offsetTotal, rate);
    out.push({ entry_date: r.entry_date, loan: r.actual_balance, offset_total: offsetTotal, rate, daily, monthly: monthlyInterest(daily, r.entry_date) });
  }
  return out;
}

export async function getYearly(finance: any, lastN = 5): Promise<Array<{ finance_year: string; paid: number; interest: number; principal_ratio: number }>> {
  const rows = await listRepayments(finance);
  const byFy = new Map<string, { paid: number; interest: number }>();
  for (const r of rows) {
    const cur = byFy.get(r.finance_year) ?? { paid: 0, interest: 0 };
    cur.paid += Number(r.actual_repayment || 0);
    cur.interest += Number(r.interest_charged || 0);
    byFy.set(r.finance_year, cur);
  }
  const fys = [...byFy.keys()].sort().slice(-lastN);
  const out: Array<{ finance_year: string; paid: number; interest: number; principal_ratio: number }> = [];
  for (const fy of fys) {
    const agg = byFy.get(fy)!;
    out.push({ finance_year: fy, paid: agg.paid, interest: agg.interest, principal_ratio: yearlyPrincipalRatio(agg.paid, agg.interest) });
  }
  return out;
}

export async function getTargetEstimates(finance: any): Promise<{ target_offset: number; target_subtotal: number; avg_offset: number; avg_subtotal: number; period_offset: string; period_subtotal: string; date_offset: string; date_subtotal: string; trail_avg_offset: number; trail_period_offset: string; trail_date_offset: string; trail_avg_subtotal: number; trail_period_subtotal: string; trail_date_subtotal: string }> {
  const loan = (await getLoan(finance)) ?? (await ensureLoan(finance));
  const rows = await listRepayments(finance);
  const accounts = await listAccounts(finance);
  const key0390 = accounts.find((a) => a.account_key === '0390');
  const series0390: number[] = [];
  const seriesTotal: number[] = [];
  for (const r of rows) {
    const bals = await listBalancesForRepayment(finance, r.id);
    series0390.push(Number(bals.find((b) => key0390 && b.account_id === key0390.id)?.balance || 0));
    seriesTotal.push(bals.reduce((s, b) => s + Number(b.balance || 0), 0));
  }
  const first0390 = series0390.length ? series0390[0] : 0;
  const last0390 = series0390.length ? series0390[series0390.length - 1] : 0;
  const firstTotal = seriesTotal.length ? seriesTotal[0] : 0;
  const lastTotal = seriesTotal.length ? seriesTotal[seriesTotal.length - 1] : 0;
  const avgO = avgSaving(first0390, last0390, rows.length);
  const avgS = avgSaving(firstTotal, lastTotal, rows.length);
  const nO = estimateNperMonths(avgO, last0390, loan.target_amount_offset);
  const nS = estimateNperMonths(avgS, lastTotal, loan.target_amount_subtotal);
  const trailO = trailingMonthlyAvg(series0390, 12);
  const trailS = trailingMonthlyAvg(seriesTotal, 12);
  const trailNO = estimateNperMonths(trailO, last0390, loan.target_amount_offset);
  const trailNS = estimateNperMonths(trailS, lastTotal, loan.target_amount_subtotal);
  return {
    target_offset: loan.target_amount_offset,
    target_subtotal: loan.target_amount_subtotal,
    avg_offset: Math.round(avgO * 100) / 100,
    avg_subtotal: Math.round(avgS * 100) / 100,
    period_offset: formatPeriod(nO),
    period_subtotal: formatPeriod(nS),
    date_offset: targetDateIso(nO),
    date_subtotal: targetDateIso(nS),
    trail_avg_offset: Math.round(trailO * 100) / 100,
    trail_period_offset: formatPeriod(trailNO),
    trail_date_offset: targetDateIso(trailNO),
    trail_avg_subtotal: Math.round(trailS * 100) / 100,
    trail_period_subtotal: formatPeriod(trailNS),
    trail_date_subtotal: targetDateIso(trailNS),
  };
}

export { ensureLoan, getLoan, updateLoan };

export interface PacePoint {
  entry_date: string;
  main_balance: number;
  main_change: number;
  main_pace: number;
  sub_balance: number;
  sub_change: number;
  sub_pace: number;
}

/** Per-snapshot pace history, oldest first: balance, month change, trailing-12m pace at that date. */
export async function getPaceHistory(finance: any): Promise<PacePoint[]> {
  const rows = await listRepayments(finance);
  const accounts = await listAccounts(finance);
  const key0390 = accounts.find((a) => a.account_key === '0390');
  const out: PacePoint[] = [];
  const sMain: number[] = [];
  const sSub: number[] = [];
  for (const r of rows) {
    const bals = await listBalancesForRepayment(finance, r.id);
    const main = Number(bals.find((b) => key0390 && b.account_id === key0390.id)?.balance || 0);
    const sub = bals.reduce((s, b) => s + Number(b.balance || 0), 0);
    sMain.push(main);
    sSub.push(sub);
    const i = sMain.length - 1;
    out.push({
      entry_date: r.entry_date,
      main_balance: main,
      main_change: i > 0 ? main - sMain[i - 1] : 0,
      main_pace: trailingMonthlyAvg(sMain.slice(0, i + 1), 12),
      sub_balance: sub,
      sub_change: i > 0 ? sub - sSub[i - 1] : 0,
      sub_pace: trailingMonthlyAvg(sSub.slice(0, i + 1), 12),
    });
  }
  return out;
}
