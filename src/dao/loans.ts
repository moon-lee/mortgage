export interface LoanRow {
  id: number;
  property_value: number;
  deposit_amount: number;
  loan_amount: number;
  term_years: number;
  set_payment: number;
  target_amount_offset: number;
  target_amount_subtotal: number;
  notes?: string | null;
}

export async function getLoan(finance: any): Promise<LoanRow | null> {
  const row = await finance.db.table('mortgage_loans').findOne({});
  return (row as LoanRow | null) ?? null;
}

export async function ensureLoan(finance: any): Promise<LoanRow> {
  const existing = await getLoan(finance);
  if (existing) return existing;
  const res = await finance.db.table('mortgage_loans').insert({
    property_value: 0,
    deposit_amount: 0,
    loan_amount: 0,
    term_years: 30,
    set_payment: 0,
    target_amount_offset: 100000,
    target_amount_subtotal: 100000,
    notes: null,
  });
  const created = await finance.db
    .table('mortgage_loans')
    .findOne({ id: res.id });
  return created as LoanRow;
}

export async function updateLoan(
  finance: any,
  patch: Partial<LoanRow>,
): Promise<void> {
  const loan = await ensureLoan(finance);
  const clean: Record<string, unknown> = {};
  for (const k of [
    'property_value',
    'deposit_amount',
    'loan_amount',
    'set_payment',
    'target_amount_offset',
    'target_amount_subtotal',
    'notes',
    'term_years',
  ] as const) {
    if (patch[k] !== undefined) clean[k] = patch[k];
  }
  if (clean.term_years !== undefined) {
    const t = Number(clean.term_years);
    if (!Number.isInteger(t) || t < 1 || t > 50)
      throw new Error('ValidationFailed: term_years must be 1-50');
  }
  for (const k of [
    'property_value',
    'deposit_amount',
    'loan_amount',
    'set_payment',
    'target_amount_offset',
    'target_amount_subtotal',
  ]) {
    if (clean[k] !== undefined && !(Number(clean[k]) >= 0))
      throw new Error('ValidationFailed: ' + k + ' must be >= 0');
  }
  await finance.db.table('mortgage_loans').update({ id: loan.id }, clean);
}
