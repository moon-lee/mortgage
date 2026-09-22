export const CANONICAL_CARD_ORDER = [
  'loan',
  'snapshot',
  'repayment',
  'targets',
  'yearly',
] as const;

export type OverviewCardId = (typeof CANONICAL_CARD_ORDER)[number];

export const CARD_LABELS: Record<OverviewCardId, string> = {
  loan: 'Loan setup',
  snapshot: 'Daily interest snapshot',
  repayment: 'Minimum repayment',
  targets: 'Savings targets',
  yearly: 'Yearly Repayment Summary',
};

/** Saved order (unknown ids dropped) + any missing canonical cards appended. */
export function normalizeCardOrder(saved: unknown): OverviewCardId[] {
  const ids = Array.isArray(saved)
    ? saved.filter(
        (x): x is OverviewCardId =>
          typeof x === 'string' &&
          (CANONICAL_CARD_ORDER as readonly string[]).includes(x),
      )
    : [];
  for (const id of CANONICAL_CARD_ORDER) {
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}
