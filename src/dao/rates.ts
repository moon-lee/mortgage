export interface RateRow {
  id: number;
  effective_from: string;
  effective_to: string | null;
  rate: number;
  notes?: string | null;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertRateInput(input: {
  effective_from: string;
  effective_to?: string | null;
  rate: number;
}): void {
  if (!ISO_RE.test(input.effective_from))
    throw new Error('ValidationFailed: effective_from must be YYYY-MM-DD');
  if (
    input.effective_to != null &&
    input.effective_to !== '' &&
    !ISO_RE.test(input.effective_to)
  ) {
    throw new Error(
      'ValidationFailed: effective_to must be YYYY-MM-DD or empty',
    );
  }
  if (input.effective_to && input.effective_to < input.effective_from) {
    throw new Error('ValidationFailed: effective_to must be >= effective_from');
  }
  if (!(input.rate >= 0 && input.rate <= 1))
    throw new Error('ValidationFailed: rate must be 0-1 (6.19% = 0.0619)');
}

export async function listRates(finance: any): Promise<RateRow[]> {
  const rows = (await finance.db
    .table('mortgage_rate_history')
    .find({})) as RateRow[];
  return rows
    .slice()
    .sort((a, b) => (a.effective_from > b.effective_from ? -1 : 1));
}

/**
 * The day before an ISO date, in UTC.
 *
 * A rate period ends the day before the next one starts, so consecutive rates
 * tile without a gap and without overlapping on the shared boundary. UTC
 * arithmetic throughout: `new Date(iso)` parses as UTC midnight, but a local
 * `getDate()` would shift the result by a day either side of a DST boundary.
 */
export function dayBefore(iso: string): string | null {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function createRate(
  finance: any,
  input: {
    effective_from: string;
    effective_to?: string | null;
    rate: number;
    notes?: string | null;
  },
): Promise<number> {
  assertRateInput(input);

  // A new rate supersedes the period before it, so that earlier period has to
  // be closed the day this one starts. Nothing did this before: every rate was
  // inserted open-ended, leaving two rows that both match a date, and
  // `lookupRate` silently resolved to whichever it met last.
  //
  // The whole chain is checked before anything is written, so a refusal cannot
  // leave the earlier periods already closed.
  const existing = await listRates(finance);
  const later = existing.filter((r) => r.effective_from >= input.effective_from);
  if (later.length > 0) {
    throw new Error(
      `ValidationFailed: a rate already starts on ${later[0].effective_from}, which is on or after this one`,
    );
  }
  const prior = existing.filter((r) => r.effective_from < input.effective_from);
  const clashing = prior.find(
    (r) => r.effective_to != null && r.effective_to !== '' && r.effective_to >= input.effective_from,
  );
  if (clashing) {
    throw new Error(
      `ValidationFailed: this rate overlaps the one from ${clashing.effective_from}, which runs to ${clashing.effective_to}`,
    );
  }

  const closes = dayBefore(input.effective_from);
  if (closes === null) {
    throw new Error('ValidationFailed: could not work out the day before effective_from');
  }
  for (const row of prior) {
    // Only an open-ended row needs closing; one that already ends does not.
    if (row.effective_to == null || row.effective_to === '') {
      await updateRate(finance, row.id, { effective_to: closes });
    }
  }

  const res = await finance.db.table('mortgage_rate_history').insert({
    effective_from: input.effective_from,
    effective_to: input.effective_to ?? null,
    rate: input.rate,
    notes: input.notes ?? null,
  });
  return res.id as number;
}

export async function updateRate(
  finance: any,
  id: number,
  patch: Partial<RateRow>,
): Promise<void> {
  const existing = (await finance.db
    .table('mortgage_rate_history')
    .findOne({ id })) as RateRow | null;
  if (!existing) throw new Error('ValidationFailed: rate row not found');
  const next = {
    effective_from: existing.effective_from,
    effective_to: existing.effective_to,
    rate: existing.rate,
    ...patch,
  };
  // Moving the start date re-tiles the chain, so the neighbours have to agree.
  // Checked before the write, for the same reason as in createRate.
  const from = String(next.effective_from);
  const others = (await listRates(finance)).filter((r) => r.id !== id);
  if (others.some((r) => r.effective_from >= from)) {
    throw new Error('ValidationFailed: another rate already starts on or after this date');
  }
  const clash = others.find(
    (r) => r.effective_from < from && r.effective_to != null && r.effective_to !== '' && r.effective_to >= from,
  );
  if (clash) {
    throw new Error(
      `ValidationFailed: this rate would overlap the one from ${clash.effective_from}, which runs to ${clash.effective_to}`,
    );
  }
  assertRateInput({
    effective_from: next.effective_from as string,
    effective_to: next.effective_to as string | null,
    rate: Number(next.rate),
  });
  const clean: Record<string, unknown> = {};
  if (patch.effective_from !== undefined)
    clean.effective_from = patch.effective_from;
  if (patch.effective_to !== undefined) clean.effective_to = patch.effective_to;
  if (patch.rate !== undefined) clean.rate = patch.rate;
  if (patch.notes !== undefined) clean.notes = patch.notes;
  await finance.db.table('mortgage_rate_history').update({ id }, clean);
}

export async function deleteRate(finance: any, id: number): Promise<void> {
  await finance.db.table('mortgage_rate_history').delete({ id });
}

export function lookupRate(rows: RateRow[], dateIso: string): RateRow | null {
  const sorted = rows
    .slice()
    .sort((a, b) => (a.effective_from < b.effective_from ? -1 : 1));
  let found: RateRow | null = null;
  for (const r of sorted) {
    if (
      r.effective_from <= dateIso &&
      (r.effective_to == null ||
        r.effective_to === '' ||
        dateIso <= r.effective_to)
    )
      found = r;
  }
  return found;
}
