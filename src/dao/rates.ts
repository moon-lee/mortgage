export interface RateRow {
  id: number;
  effective_from: string;
  effective_to: string | null;
  rate: number;
  notes?: string | null;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertRateInput(input: { effective_from: string; effective_to?: string | null; rate: number }): void {
  if (!ISO_RE.test(input.effective_from)) throw new Error('ValidationFailed: effective_from must be YYYY-MM-DD');
  if (input.effective_to != null && input.effective_to !== '' && !ISO_RE.test(input.effective_to)) {
    throw new Error('ValidationFailed: effective_to must be YYYY-MM-DD or empty');
  }
  if (input.effective_to && input.effective_to < input.effective_from) {
    throw new Error('ValidationFailed: effective_to must be >= effective_from');
  }
  if (!(input.rate >= 0 && input.rate <= 1)) throw new Error('ValidationFailed: rate must be 0-1 (6.19% = 0.0619)');
}

export async function listRates(finance: any): Promise<RateRow[]> {
  const rows = (await finance.db.table('mortgage_rate_history').find({})) as RateRow[];
  return rows.slice().sort((a, b) => (a.effective_from > b.effective_from ? -1 : 1));
}

export async function createRate(finance: any, input: { effective_from: string; effective_to?: string | null; rate: number; notes?: string | null }): Promise<number> {
  assertRateInput(input);
  const res = await finance.db.table('mortgage_rate_history').insert({
    effective_from: input.effective_from,
    effective_to: input.effective_to ?? null,
    rate: input.rate,
    notes: input.notes ?? null,
  });
  return res.id as number;
}

export async function updateRate(finance: any, id: number, patch: Partial<RateRow>): Promise<void> {
  const existing = (await finance.db.table('mortgage_rate_history').findOne({ id })) as RateRow | null;
  if (!existing) throw new Error('ValidationFailed: rate row not found');
  const next = { effective_from: existing.effective_from, effective_to: existing.effective_to, rate: existing.rate, ...patch };
  assertRateInput({ effective_from: next.effective_from as string, effective_to: next.effective_to as string | null, rate: Number(next.rate) });
  const clean: Record<string, unknown> = {};
  if (patch.effective_from !== undefined) clean.effective_from = patch.effective_from;
  if (patch.effective_to !== undefined) clean.effective_to = patch.effective_to;
  if (patch.rate !== undefined) clean.rate = patch.rate;
  if (patch.notes !== undefined) clean.notes = patch.notes;
  await finance.db.table('mortgage_rate_history').update({ id }, clean);
}

export async function deleteRate(finance: any, id: number): Promise<void> {
  await finance.db.table('mortgage_rate_history').delete({ id });
}

export function lookupRate(rows: RateRow[], dateIso: string): RateRow | null {
  const sorted = rows.slice().sort((a, b) => (a.effective_from < b.effective_from ? -1 : 1));
  let found: RateRow | null = null;
  for (const r of sorted) {
    if (r.effective_from <= dateIso && (r.effective_to == null || r.effective_to === '' || dateIso <= r.effective_to)) found = r;
  }
  return found;
}
