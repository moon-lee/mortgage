import { ensureAccounts } from '../dao/accounts.js';
import { ensureLoan } from '../dao/loans.js';
import { SEED_LOAN, SEED_RATES, SEED_REPAYMENTS, SEED_VERSION } from './seed-data.js';

const FLAG = 'mortgage.seedVersion';

async function count(finance: any, table: string): Promise<number> {
  try {
    return (await finance.db.table(table).count({})) as number;
  } catch {
    return -1;
  }
}

/**
 * Versioned once-only seeder (runs on every activate, seeds only what's missing).
 * - accounts: topped up to the 8 lookup rows
 * - loan: inserted when absent; blank rows (all zeros) are filled with sheet values; user data untouched
 * - rates/repayments+balances: bulk-inserted only when their tables are empty
 * - sets `mortgage.seedVersion` so future versions can migrate
 */
export async function seedMortgage(finance: any): Promise<void> {
  // Fast path: seed already applied → single settings read, zero DB probes.
  try {
    const v = await finance.settings.get(FLAG);
    if (typeof v === 'number' && v >= SEED_VERSION) return;
  } catch { /* fall through to full check */ }

  await ensureAccounts(finance);

  const loanCount = await count(finance, 'mortgage_loans');
  if (loanCount === 0) {
    await finance.db.table('mortgage_loans').insert({ ...SEED_LOAN });
  } else if (loanCount === 1) {
    const row = (await finance.db.table('mortgage_loans').findOne({})) as any;
    if (row && Number(row.property_value) === 0 && Number(row.loan_amount) === 0 && Number(row.set_payment) === 0) {
      await finance.db.table('mortgage_loans').update({ id: row.id }, { ...SEED_LOAN });
    }
  }

  if ((await count(finance, 'mortgage_rate_history')) === 0) {
    for (const r of SEED_RATES) {
      await finance.db.table('mortgage_rate_history').insert({ ...r, notes: null });
    }
  }

  if ((await count(finance, 'mortgage_repayments')) === 0) {
    for (const s of SEED_REPAYMENTS) {
      await insertSeedRepayment(finance, s);
    }
  }

  // v2 top-up (2026-09-12: Jun–Aug 2026 rows): existing installs keep user months
  // and gain only seed dates they lack. Flag was read above (< SEED_VERSION here).
  for (const s of SEED_REPAYMENTS) {
    const dupe = (await finance.db.table('mortgage_repayments').findOne({ entry_date: s.entry_date })) as any;
    if (!dupe) await insertSeedRepayment(finance, s);
  }

  try {
    await finance.settings.set(FLAG, SEED_VERSION);
  } catch {
    /* settings unavailable (older host) — emptiness gates above keep seeding safe */
  }
}

async function insertSeedRepayment(finance: any, s: {
  entry_date: string; finance_year: string; scheduled_balance: number; actual_balance: number;
  fy_interest: number; offset_saving_fy: number; actual_repayment: number; scheduled_payment: number;
  interest_charged: number; base_amount: number; fee: number; total_paid: number; extra_paid: number;
  offsets: Record<string, number>;
}): Promise<void> {
  const accounts = await ensureAccounts(finance);
  const byKey = new Map(accounts.map((a: any) => [a.account_key, a.id]));
  const res = await finance.db.table('mortgage_repayments').insert({
    entry_date: s.entry_date,
    finance_year: s.finance_year,
    scheduled_balance: s.scheduled_balance,
    actual_balance: s.actual_balance,
    fy_interest: s.fy_interest,
    offset_saving_fy: s.offset_saving_fy,
    actual_repayment: s.actual_repayment,
    scheduled_payment: s.scheduled_payment,
    interest_charged: s.interest_charged,
    base_amount: s.base_amount,
    fee: s.fee,
    total_paid: s.total_paid,
    extra_paid: s.extra_paid,
  });
  const repaymentId = res.id as number;
  for (const [key, balance] of Object.entries(s.offsets)) {
    await finance.db.table('mortgage_offset_balances').insert({
      repayment_id: repaymentId,
      account_id: byKey.get(key),
      balance,
    });
  }
}
