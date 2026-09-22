# Minimum Repayment Card — Design

Date: 2026-09-22
Status: Draft — awaiting owner approval (do NOT commit until approved)
Scope: Mortgage extension overview only. No cross-extension changes.

## 1. Goal

Add a new “Minimum repayment” card to the Mortgage Overview that answers two
questions:

1. What is my minimum repayment at the current rate?
2. What would it be if the rate changed? (display-only simulation)

## 2. Decisions (locked)

- New standalone `repayment` card. Not an extension of Loan setup or Snapshot.
- P&I amortisation, monthly frequency, fees excluded and labelled as such.
- Rate simulator is display-only. It never writes to `mortgage_rate_history`.
  Changing real rates stays in the Rate History view.
- Principal source: latest `mortgage_repayments.actual_balance` (live minimum).
  Fallback when `loan_start_date` is null: original-contract mode
  (`mortgage_loans.loan_amount`, n = `term_years` × 12), tagged “Estimate”.
- New nullable column `mortgage_loans.loan_start_date` (type `date`),
  seed value `2023-09-15` (owner-confirmed origination date).

## 3. Formula

Standard monthly amortisation:

```
M = P × r(1+r)^n / ((1+r)^n − 1),  r = annualRate / 12
```

New pure helper in `src/utils/mortgage-math.ts`:

- `minRepayment(principal, annualRate, monthsLeft): number`
- Returns 0 when `monthsLeft <= 0`, `principal <= 0`, or `annualRate <= 0`.
- Rounds to cents. Both the actual line and the simulator call this function,
  so simulation accuracy equals actual-line accuracy.

Accuracy note (verified 2026-09-22): each 12-month error in remaining term
shifts the result ≈ $55 (≈ 1.5%) at P ≈ $599k, r = 6.19%.

## 4. Data flow

New service getter in `src/services/mortgage-service.ts`:

- `getMinRepayment(finance)` → `{ minimum, rate, principal, monthsLeft, asAt, isEstimate }`
- Reads: `getLoan()` (loan_amount, term_years, set_payment, loan_start_date),
  `lookupRate(listRates(), latest.entry_date)` (current rate),
  latest repayment row (actual_balance, entry_date).
- `monthsLeft = term_years × 12 − elapsedMonths(loan_start_date → today)`.
  When `loan_start_date` is null: `principal = loan_amount`,
  `monthsLeft = term_years × 12`, `isEstimate = true`.
- Exposed over the domain service as `finance.services.invoke('mortgage',
  'minRepayment')` alongside existing `snapshot`/`summary`.

## 5. UI

New `repayment` card in `src/ui/mortgage-overview-view.ts`:

- Stat tiles: `Minimum /mo`, `You pay` (set_payment), `Extra /mo`
  (`set_payment − minimum`, can go negative — displayed as-is).
- Header badge: `Rate @ x.xx% · n months left`.
- Muted line: `P $… · as at YYYY-MM-DD · P&I excl. fee`
  (or `Estimate · start date not set` in fallback mode).
- Simulator tile: fourth tile in the stat-grid (`Simulate rate %`), a number
  input with custom − / + stepper buttons stepping exactly ±0.05 from the
  displayed value (2-decimal rounding, clamped 0–100; ↑/↓ keys match).
  Pre-filled with the current rate; Reset restores it. Display-only, never
  writes to DB. At the live rate the result line reads `(= current rate)`.
- Meta row (`.repay-meta`): info line and simulated result share one flex row
  (wraps on narrow screens); simulated result in accent color, same size/weight
  as the info line.
- Header sizing: all four card header badges/buttons use 4px vertical padding
  (scoped per-card classes: `loan-actions`, `snapshot-actions`,
  `repayment-actions`, `targets-actions`).
- Errors (no loan row, no rate for latest date): inline red `Error: …`
  following the existing overview pattern.

Card ordering (`src/ui/overview-cards.ts`):

- Append `'repayment'` to `CANONICAL_CARD_ORDER` and `CARD_LABELS`
  (label: `Minimum repayment`).
- `normalizeCardOrder()` auto-appends it last for users with a saved order;
  movable via the existing ⇅ Cards modal. No order migration needed.

## 6. Schema change

`package.json` → `financeExtension.tables[mortgage_loans].columns`, after
`term_years`:

```json
{ "name": "loan_start_date", "type": "date", "nullable": true }
```

Companion edits:

- `src/dao/loans.ts`: `LoanRow.loan_start_date?: string | null`;
  `ensureLoan()` inserts `loan_start_date: null`; `updateLoan()` allowlists
  the key and validates `YYYY-MM-DD`, rejects future dates.
- `src/services/seed-data.ts`: `SEED_LOAN.loan_start_date = '2023-09-15'`.
- Overview Set-loan form: date input `l-start`, emitted via existing
  `target-edit` event; orchestrator forwards it with no change.
- Version bump `0.2.3 → 0.2.4` (top-level and `financeExtension.version`).

Install note: the host runs `CREATE TABLE IF NOT EXISTS`
(`table-ddl.ts`), so a plain reinstall will NOT add the column. After
`npm run build`: Extensions → Delete Data (drops `mortgage_*`, reseeds;
verified 2026-09-22 the only live divergence is +$10 on `0743` @ 2026-08-31)
→ Install Folder → restart → `SELECT * FROM mortgage_loans` shows the column.

## 7. Error handling

- Invalid simulator input (non-numeric, ≤ 0, > 100%): ignore keystroke / show
  inline hint, keep last valid minimum on screen.
- Missing rate for latest snapshot date: card shows `Rate —` and minimum `$0.00`
  with hint “add a rate covering the latest month-end”.
- `updateLoan` validation failures surface via the existing `target-edit` error
  path in the orchestrator.

## 8. Testing

1. `npm run dev` — card renders actual minimum within ~1% of `base_amount`;
   simulator updates instantly per keystroke; Reset restores current rate.
2. Unset start date — card shows Estimate tag and original-contract figure.
3. Set start date via Set-loan form — card flips to live mode, months-left
   badge updates.
4. `npx prettier --check --single-quote` on touched non-vendored files.
5. `npm run build` → Delete Data → Install Folder → restart → overview shows
   5 cards; reorder modal lists Minimum repayment; DB column present.

## 9. Out of scope

- Fortnightly/weekly frequency, interest-only periods, fee-inclusive figure.
- Persisting simulated rates (stays in Rate History view).
- Cross-extension consumers (no new service contract beyond `minRepayment`).
