# Minimum Repayment Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `repayment` card to Mortgage Overview showing live minimum P&I repayment plus a display-only rate simulator, backed by a new `loan_start_date` column.

**Architecture:** Pure math helpers in `src/utils/mortgage-math.ts`, one service getter in `src/services/mortgage-service.ts` (also exposed as domain service `minRepayment`), one new card section in `src/ui/mortgage-overview-view.ts` ordered via `src/ui/overview-cards.ts`. Schema: one nullable `date` column on `mortgage_loans`, seeded `2023-09-15`, version bump `0.2.3 → 0.2.4`.

**Tech Stack:** TypeScript, Lit, Vite lib build (`npm run build`), Node 24 (runs `.ts` check scripts directly via type stripping), `npx tsc --noEmit`, prettier `--single-quote`.

**Spec:** `docs/superpowers/specs/2026-09-22-minimum-repayment-card-design.md` (draft, uncommitted — commit spec + plan together only after owner approves both).

---

## File map

| File | Responsibility |
|---|---|
| `src/utils/mortgage-math.ts` | NEW pure fns `minRepayment`, `elapsedMonths` — no imports, fully testable in Node |
| `scripts/check-min-repayment.mjs` | NEW runnable verification (fails before, passes after Task 1) |
| `package.json` | NEW `loan_start_date` column on `mortgage_loans`; version `0.2.3 → 0.2.4` (both fields) |
| `src/dao/loans.ts` | `LoanRow.loan_start_date`, `ensureLoan` default, `updateLoan` validation |
| `src/services/seed-data.ts` | `SEED_LOAN.loan_start_date = '2023-09-15'` |
| `src/services/mortgage-service.ts` | NEW `MinRepayment` interface + `getMinRepayment()` |
| `src/main.ts` | Register domain service `minRepayment` |
| `src/ui/overview-cards.ts` | NEW `'repayment'` card id + label (canonical order: loan, snapshot, repayment, targets, yearly) |
| `src/ui/mortgage-overview-view.ts` | NEW card section, simulator row, Set-loan date input |

No new `CustomEvent` names → no `allowedUiEvents` change. No vendored files touched (`src/finance.d.ts`, `src/vendor/**`, `src/styles/**`).

---

### Task 1: Math helpers + runnable check (TDD)

**Files:**
- Create: `scripts/check-min-repayment.mjs`
- Modify: `src/utils/mortgage-math.ts` (append)

- [ ] **Step 1: Write the failing check**

```js
// scripts/check-min-repayment.mjs — runnable contract for the card math.
import { strict as assert } from 'node:assert';
import {
  minRepayment,
  elapsedMonths,
} from '../src/utils/mortgage-math.ts';

const close = (actual, expected, tol, label) => {
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `${label}: got ${actual}, want ${expected} ±${tol}`,
  );
};

// Original contract: P=642500 @ 6.19% over 360 months ≈ $3,931/mo
close(minRepayment(642500, 0.0619, 360), 3931, 5, 'orig contract');
// Live: P=599047.14 @ 6.19%, 325 months left ≈ $3,805/mo
close(minRepayment(599047.14, 0.0619, 325), 3805, 5, 'live');
// Simulator direction: lower rate pays less
assert.ok(
  minRepayment(599047.14, 0.055, 325) <
    minRepayment(599047.14, 0.0619, 325),
  'lower rate pays less',
);
// Edge cases return 0, never NaN
assert.equal(minRepayment(100000, 0, 360), 0);
assert.equal(minRepayment(0, 0.05, 360), 0);
assert.equal(minRepayment(100000, 0.05, 0), 0);
// Full calendar months, day-adjusted, never negative
assert.equal(elapsedMonths('2023-09-15', '2026-08-31'), 35);
assert.equal(elapsedMonths('2023-09-15', '2023-09-15'), 0);
assert.equal(elapsedMonths('2026-08-31', '2023-09-15'), 0);

console.log('min-repayment checks passed');
```

- [ ] **Step 2: Run check to verify it fails**

Run: `node scripts/check-min-repayment.mjs`
Expected: FAIL with `does not provide an export named 'minRepayment'`

- [ ] **Step 3: Implement minimal helpers (append to `src/utils/mortgage-math.ts`)**

```ts
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
```

- [ ] **Step 4: Run check to verify it passes**

Run: `node scripts/check-min-repayment.mjs`
Expected: `min-repayment checks passed`

Also run: `npx tsc --noEmit` — Expected: no errors.
Also run: `npx prettier --check --single-quote src/utils/mortgage-math.ts scripts/check-min-repayment.mjs` — Expected: `All matched files use Prettier code style!` (if not, re-run with `--write` on the same files).

- [ ] **Step 5: Commit**

```bash
git add src/utils/mortgage-math.ts scripts/check-min-repayment.mjs
git commit -m "feat(mortgage): add minRepayment and elapsedMonths with runnable check"
```

---

### Task 2: Schema — column + version bump

**Files:**
- Modify: `package.json` (tables block ~line 143, both `version` fields)

- [ ] **Step 1: Add the column after `term_years` in `financeExtension.tables[0].columns`**

```json
          {
            "name": "loan_start_date",
            "type": "date",
            "nullable": true,
            "description": "Loan origination date; used to compute remaining term for minimum repayment"
          },
```

- [ ] **Step 2: Bump version `0.2.3 → 0.2.4` in BOTH places** — top-level `"version"` (line 3) and `"financeExtension"."version"` (line 9). Keep them in sync or install rejects.

- [ ] **Step 3: Verify manifest parses**

Run: `node -e "const p=require('./package.json'); console.log(p.version, p.financeExtension.version, JSON.stringify(p.financeExtension.tables[0].columns.map(c=>c.name)))"`
Expected: `0.2.4 0.2.4 ["property_value","deposit_amount","loan_amount","term_years","loan_start_date","set_payment","target_amount_offset","target_amount_subtotal","notes"]`

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "feat(mortgage): add loan_start_date column, bump 0.2.3 -> 0.2.4"
```

---

### Task 3: DAO + seed value

**Files:**
- Modify: `src/dao/loans.ts`
- Modify: `src/services/seed-data.ts` (SEED_LOAN)

- [ ] **Step 1: Extend `LoanRow` interface**

```ts
export interface LoanRow {
  id: number;
  property_value: number;
  deposit_amount: number;
  loan_amount: number;
  term_years: number;
  loan_start_date?: string | null;
  set_payment: number;
  target_amount_offset: number;
  target_amount_subtotal: number;
  notes?: string | null;
}
```

- [ ] **Step 2: Default it in `ensureLoan()` insert**

```ts
  const res = await finance.db.table('mortgage_loans').insert({
    property_value: 0,
    deposit_amount: 0,
    loan_amount: 0,
    term_years: 30,
    loan_start_date: null,
    set_payment: 0,
    target_amount_offset: 100000,
    target_amount_subtotal: 100000,
    notes: null,
  });
```

- [ ] **Step 3: Validate it in `updateLoan()` — add AFTER the `clean` allowlist loop, NOT inside it**

```ts
  if (patch.loan_start_date !== undefined) {
    const v = patch.loan_start_date as string | null;
    if (v == null || v === '') {
      clean.loan_start_date = null;
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v))
        throw new Error(
          'ValidationFailed: loan_start_date must be YYYY-MM-DD',
        );
      if (v > new Date().toISOString().slice(0, 10))
        throw new Error(
          'ValidationFailed: loan_start_date cannot be in the future',
        );
      clean.loan_start_date = v;
    }
  }
```

Note: `loan_start_date` stays OUT of the generic `for (const k of [...])` allowlist above — the block above is its only path into `clean`.

- [ ] **Step 4: Seed it in `src/services/seed-data.ts` SEED_LOAN**

```ts
export const SEED_LOAN = {
  property_value: 687500,
  deposit_amount: 45000,
  loan_amount: 642500,
  term_years: 30,
  loan_start_date: '2023-09-15',
  set_payment: 4200,
  ...
```

- [ ] **Step 5: Verify types + style**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `npx prettier --check --single-quote src/dao/loans.ts src/services/seed-data.ts` — Expected: Prettier clean (else `--write` same files).

- [ ] **Step 6: Commit**

```bash
git add src/dao/loans.ts src/services/seed-data.ts
git commit -m "feat(mortgage): dao + seed support loan_start_date"
```

---

### Task 4: Service getter + domain registration

**Files:**
- Modify: `src/services/mortgage-service.ts` (import block + append getter before `export { ensureLoan ... }`)
- Modify: `src/main.ts` (import + services.register block)

- [ ] **Step 1: Extend the math import in `mortgage-service.ts`**

```ts
import {
  dailyInterest,
  monthlyInterest,
  avgSaving,
  estimateNperMonths,
  formatPeriod,
  targetDateIso,
  trailingMonthlyAvg,
  yearlyPrincipalRatio,
  minRepayment,
  elapsedMonths,
} from '../utils/mortgage-math.js';
```

- [ ] **Step 2: Append the getter (place before `export { ensureLoan, getLoan, updateLoan };`)**

```ts
export interface MinRepayment {
  minimum: number;
  rate: number | null;
  principal: number;
  monthsLeft: number;
  asAt: string | null;
  isEstimate: boolean;
}

export async function getMinRepayment(finance: any): Promise<MinRepayment> {
  const loan = (await getLoan(finance)) ?? (await ensureLoan(finance));
  const latest = await getLatest(finance);
  const asAt = latest?.entry_date ?? null;
  const rates = await listRates(finance);
  const hit = asAt ? lookupRate(rates, asAt) : null;
  const rate = hit ? hit.rate : null;
  if (!latest || rate == null) {
    return {
      minimum: 0,
      rate,
      principal: 0,
      monthsLeft: 0,
      asAt,
      isEstimate: true,
    };
  }
  const start = (loan as any).loan_start_date as string | null;
  if (!start) {
    return {
      minimum: minRepayment(loan.loan_amount, rate, loan.term_years * 12),
      rate,
      principal: loan.loan_amount,
      monthsLeft: loan.term_years * 12,
      asAt,
      isEstimate: true,
    };
  }
  const monthsLeft = loan.term_years * 12 - elapsedMonths(start, asAt);
  return {
    minimum: minRepayment(latest.actual_balance, rate, monthsLeft),
    rate,
    principal: latest.actual_balance,
    monthsLeft,
    asAt,
    isEstimate: false,
  };
}
```

All names used (`getLoan`, `ensureLoan`, `getLatest`, `listRates`, `lookupRate`) are already imported in this file — add no other imports.

- [ ] **Step 3: Register the domain service in `src/main.ts`**

Import: `getMinRepayment` added to the existing `{ getSnapshot, getSummary, getYearly, saveMonthEnd }` import from `./services/mortgage-service.js`. Register block, after `yearly`:

```ts
    minRepayment: async () => getMinRepayment(finance as any),
```

- [ ] **Step 4: Verify types + style**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `npx prettier --check --single-quote src/services/mortgage-service.ts src/main.ts` — Expected: Prettier clean (else `--write` same files).

- [ ] **Step 5: Commit**

```bash
git add src/services/mortgage-service.ts src/main.ts
git commit -m "feat(mortgage): add getMinRepayment service + domain registration"
```

---

### Task 5: Card UI (new card, simulator, Set-loan date input)

**Files:**
- Modify: `src/ui/overview-cards.ts`
- Modify: `src/ui/mortgage-overview-view.ts`

- [ ] **Step 1: Register the card id in `src/ui/overview-cards.ts`**

```ts
export const CANONICAL_CARD_ORDER = [
  'loan',
  'snapshot',
  'repayment',
  'targets',
  'yearly',
] as const;
```

```ts
export const CARD_LABELS: Record<OverviewCardId, string> = {
  loan: 'Loan setup',
  snapshot: 'Daily interest snapshot',
  repayment: 'Minimum repayment',
  targets: 'Savings targets',
  yearly: 'Yearly Repayment Summary',
};
```

`normalizeCardOrder()` is unchanged — users with a saved order gain `repayment` last automatically; fresh installs show it third.

- [ ] **Step 2: Wire data in `mortgage-overview-view.ts`** — imports, state, load

Imports — add `getMinRepayment` to the existing service import list, and add:

```ts
import { minRepayment } from '../utils/mortgage-math.js';
```

State — add beside `yearly`:

```ts
  minRepay: any = null;
  simRate = '';
```

Load — add after the `this.yearly = ...` line in `load()`:

```ts
      this.minRepay = await getMinRepayment(this.finance);
```

`simRate` is intentionally never reset in `load()` — the simulator survives reloads.

- [ ] **Step 3: Add the Set-loan date input** — inside the `editingLoan` form grid, after the Set payment field:

```html
                           <div class="field">
                             <label
                               >Loan start
                               <span class="label-sub">YYYY-MM-DD</span></label
                             >
                             <input
                               id="l-start"
                               type="date"
                               .value=${loan.loan_start_date ?? ''}
                             />
                           </div>
```

- [ ] **Step 4: Emit it in `saveLoan()`**

```ts
  private saveLoan(): void {
    const root = (this as any).renderRoot as ShadowRoot | undefined;
    const q = (id: string): number =>
      MortgageOverviewView.rawNumber(
        (root?.querySelector(id) as HTMLInputElement)?.value,
      );
    const startRaw =
      (root?.querySelector('#l-start') as HTMLInputElement | null)?.value?.trim() ||
      null;
    this.emit('target-edit', {
      property_value: q('#l-property'),
      deposit_amount: q('#l-deposit'),
      loan_amount: q('#l-loan'),
      set_payment: q('#l-set'),
      loan_start_date: startRaw,
    });
  }
```

The form pre-fills `#l-start` from the stored value, so untouched saves round-trip the existing date. The orchestrator forwards `loan_start_date` via its existing generic `loanPatch` path — no orchestrator change.

- [ ] **Step 5: Render the card** — insert after the Daily snapshot section, before Savings targets. Add these locals near `const f = this.flexEstimate;`:

```ts
    const mr = this.minRepay || {
      minimum: 0,
      rate: null,
      principal: 0,
      monthsLeft: 0,
      asAt: null,
      isEstimate: true,
    };
    const simRaw = String(this.simRate ?? '').trim();
    const simNum = Number(simRaw.replace(/[^0-9.\-]/g, ''));
    const simValid =
      simRaw !== '' && Number.isFinite(simNum) && simNum > 0 && simNum <= 100;
    const simMin =
      simValid && mr.rate != null
        ? minRepayment(mr.principal, simNum / 100, mr.monthsLeft)
        : null;
```

Section markup:

```html
            <!-- Minimum repayment -->
            <div class="section" style="order:${this.cardIndex('repayment')}">
              <div class="section-header">
                <h3 class="section-title">Minimum repayment</h3>
                <div class="header-actions">
                  ${mr.rate != null
                    ? html`
                        <span class="rate-badge">
                          Rate @ ${(Number(mr.rate) * 100).toFixed(2)}% ·
                          ${mr.monthsLeft} mo left
                        </span>
                      `
                    : ''}
                </div>
              </div>

              <div class="section-body">
                ${mr.rate == null
                  ? html`
                      <span class="empty">
                        No rate covers ${mr.asAt ?? 'the latest month-end'} —
                        add one in Rate History.
                      </span>
                    `
                  : html`
                      <div class="stat-grid">
                        <div class="stat">
                          <div class="stat-label">Minimum / mo</div>
                          <div class="stat-value">${aud(mr.minimum)}</div>
                        </div>
                        <div class="stat">
                          <div class="stat-label">You pay</div>
                          <div class="stat-value">
                            ${aud(loan.set_payment ?? 0)}
                          </div>
                        </div>
                        <div class="stat">
                          <div class="stat-label">Extra / mo</div>
                          <div class="stat-value">
                            ${aud(
                              Number(loan.set_payment ?? 0) -
                                Number(mr.minimum),
                            )}
                          </div>
                        </div>
                      </div>
                      <p class="muted">
                        P ${aud(mr.principal)} · as at ${mr.asAt ?? '—'} · P&I
                        excl. fee${mr.isEstimate
                          ? ' · Estimate — start date not set'
                          : ''}
                      </p>
                      <div class="field">
                        <label
                          >Simulate rate
                          <span class="label-sub"
                            >% p.a. — display only</span
                          ></label
                        >
                        <input
                          id="sim-rate"
                          type="text"
                          inputmode="decimal"
                          placeholder="e.g. 5.50"
                          .value=${this.simRate}
                          @input=${(e: Event) => {
                            this.simRate = (e.target as HTMLInputElement).value;
                            (this as any).requestUpdate?.();
                          }}
                        />
                      </div>
                      ${simMin != null
                        ? html`
                            <p class="muted">
                              Simulated ${aud(simMin)} /mo (${simMin <=
                              mr.minimum
                                ? '−'
                                : '+'}${aud(
                                Math.abs(simMin - Number(mr.minimum)),
                              )})
                              <button
                                class="btn btn-secondary"
                                @click=${() => {
                                  this.simRate = '';
                                  (this as any).requestUpdate?.();
                                }}
                              >
                                Reset
                              </button>
                            </p>
                          `
                        : ''}
                    `}
              </div>
            </div>
```

No new `CustomEvent` — the simulator is local `@input` state, the date input reuses `target-edit`. `allowedUiEvents` untouched.

- [ ] **Step 6: Verify types + style + dev render**

Run: `npx tsc --noEmit` — Expected: no errors.
Run: `npx prettier --check --single-quote src/ui/overview-cards.ts src/ui/mortgage-overview-view.ts` — Expected: Prettier clean (else `--write` same files).
Run: `npm run dev` — Expected checklist: 5th card renders; Minimum within ~1% of `base_amount` (3,899); typing `5.50` in Simulate shows a lower figure + Reset clears; Set loan shows Loan start pre-filled with `2023-09-15` after reseed; no console errors.

- [ ] **Step 7: Commit**

```bash
git add src/ui/overview-cards.ts src/ui/mortgage-overview-view.ts
git commit -m "feat(mortgage): add minimum repayment card with rate simulator"
```

---

### Task 6: Build, reinstall, live verify

**Files:** none (verification only — all code committed in Tasks 1–5)

- [ ] **Step 1: Build**

Run: `npm run build` — Expected: succeeds, `build/extension/mortgage.js` (+ `package.json`) emitted, bundle <200KB.

- [ ] **Step 2: Reinstall with data reset** (host runs `CREATE TABLE IF NOT EXISTS`, so the new column requires this)

In the app: Extensions → Mortgage → Delete Data → Install Folder (pick `build/extension`) → restart.
Expected: install reports `updated 0.2.4`, restart clean. Known accepted loss: the +$10 live edit on `0743` @ 2026-08-31 is replaced by seed `1260` (verified 2026-09-22 as the only divergence).

- [ ] **Step 3: Verify live**

  - Overview shows 5 cards; ⇅ Cards modal lists Minimum repayment.
  - `SELECT loan_start_date FROM mortgage_loans;` → `2023-09-15`.
  - `SELECT COUNT(*) FROM mortgage_repayments;` → `18`.
  - Card badge shows `Rate @ 6.19% · N mo left`; Minimum ≈ $3.8k; muted line `P $599,047.14 · as at 2026-08-31 · P&I excl. fee` (no Estimate tag).
  - Clear the start date via Set loan (empty date → save) → card flips to Estimate mode with original-contract figure ≈ $3,931; re-set `2023-09-15` → live mode returns.

- [ ] **Step 4: Final log check**

Run: `git log --oneline -8` — Expected: exactly the 4 feature commits from Tasks 1, 2, 3+ (dao/seed), 4, 5 on top, plus the earlier approved spec commit if the owner already committed it.

---

## Self-review

- **Spec coverage:** §3 formula → Task 1 (same function powers actual + simulator). §4 service + `minRepayment` domain method → Task 4. §5 card, simulator, ordering → Task 5 (display-only, no new events). §6 column + DAO + seed `2023-09-15` + version bump + Delete-Data reinstall → Tasks 2, 3, 6. §7 errors (bad simulator input ignored via `simValid`; missing rate message; `updateLoan` validation) → Tasks 1/4/5. §8 testing → Tasks 1/5/6.
- **Placeholder scan:** all steps carry exact code, exact commands, exact expected output. No TBD/TODO/layer-vague language.
- **Type consistency:** `MinRepayment{minimum, rate, principal, monthsLeft, asAt, isEstimate}` matches every render use; `loan_start_date?: string | null` matches seed string, DAO, form string, service cast; card id `'repayment'` identical in `overview-cards.ts` and `cardIndex('repayment')`.
