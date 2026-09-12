---
version: 0.1.0
created: 2026-09-12
status: approved-plan
source_design: docs/superpowers/specs/2026-09-11-mortgage-views-design.md
baseline: package.json 0.1.0 template (no tables, mortgage.hello only, SampleView only)
---

# Mortgage — Full Implementation Plan (all 4 views, one build)

## 0. User decisions (2026-09-12, locked)

1. **Start blank:** no Excel import. Ledger / offsets / rates start empty.
   Only `mortgage_accounts` lookup (8 rows) is seeded on `activate()`.
   `mortgage_loans` starts as one blank row (zeros, 30yr, $100k targets) edited by user in Overview.
2. **All 4 at once:** one implementation pass, one version bump, one `build` + Install.
   Order inside the pass is still manifest → backend → UI → wiring so `npm run dev` stays green.
3. **Icon:** house + dollar (this plan includes it, `assets/icon.svg` replaced).
4. **Duplicate date:** exact `entry_date` BLOCK (revised 2026-09-12 — month block removed).
   Same date twice = rejected with `ValidationFailed`, delete first then re-add.
   Different days in the same month are allowed (sheet rows 37+38 share 2025-08);
   derived reads lean on the latest date.

Non-technical meaning: you type your loan numbers once, then each month you press
one "Add month-end entry" button, fill loan numbers + 8 offset balances together,
and it saves together or not at all. Saving the same month twice is refused.

## 1. Target shape (from design, with decision overrides)

Views (4 tags): `mortgage-overview`, `mortgage-ledger`, `mortgage-offsets`, `mortgage-rate-history`
+ internal form `mortgage-month-end-form` + `mortgage-rate-form` (orchestrator-only, no sidebar).

Tables (5, `mortgage_` prefix): `mortgage_loans`, `mortgage_rate_history`,
`mortgage_repayments`, `mortgage_accounts`, `mortgage_offset_balances`.

Commands (4): `mortgage.show-overview/ledger/offsets/rates`.
UI events (17): `monthend-add-request`, `monthend-save`, `monthend-cancel`,
`offset-edit-request`, `rate-add-request`, `rate-create`, `rate-edit-request`,
`rate-edit`, `rate-form-cancel`, `target-edit`, `fy-changed`,
`reorder-cards`, `card-order-change`, `card-order-cancel`,
`account-create`, `account-edit`, `account-toggle`.

## 2. Phase A — manifest + version (runnable, no code yet)

Files: `package.json` only.

1. Bump `version` + `financeExtension.version`: `0.1.0` → `0.1.1` (keep in sync).
2. Replace `contributions` with design §7 blocks:
   - `views`: `[{ id: mortgage, name: Mortgage, icon: assets/icon.svg }]`
   - `commands`: 4 show-* (delete `mortgage.hello`)
   - `navigation`: 4 rows, group `Mortgage`
   - `allowedCommands`: 4 show-*
   - `allowedUiEvents`: 12 listed above
   - keep `configuration.mortgage.themeColor`.
3. Add `financeExtension.tables`: paste the 5 JSON blocks from design §5.1–§5.5 verbatim.
   Do NOT declare cross-table FK enforcement in code; `references` is documentary only.
4. `activationEvents`: `["onView:mortgage"]` (unchanged).

Verify: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'));console.log('json ok')"` passes.

## 3. Phase B — backend (dao + services + pure math)

New files (copy `salary-history` layout, keep thin):

- `src/utils/finance-year.ts` — `computeFinanceYear(entryDate: string, fyStartMonthDay: string): string`
  e.g. start `07-01`: `2026-06-30` → `2025-2026`, `2026-07-01` → `2026-2027`.
  Pure function, unit-testable, no `finance` import.
- `src/utils/mortgage-math.ts` — pure: `dailyInterest(loan, offset, rate)`,
  `monthlyInterest(daily, entryDate)`, `yearlyRatio(f, h)`, `avgSaving(first, last, n)`,
  `estimatePeriodNper(avg, current, target)`, `targetDate(nper)`.
  No DOM, no `finance`.
- `src/dao/loans.ts`, `src/dao/rates.ts`, `src/dao/repayments.ts`,
  `src/dao/accounts.ts`, `src/dao/offset-balances.ts` —
  typed wrappers over `finance.db.table('mortgage_*').find/findOne/insert/update/delete/count`.
  Never write `id/created_at/updated_at` (Main owns them).
- `src/services/mortgage-service.ts` — business rules:
  - `getLoan() / updateLoan(patch)` — validate `>= 0`, `term 1–50`.
  - `listRates() / createRate({effective_from, effective_to, rate}) / updateRate(id, patch)` —
    `rate 0–1`, `effective_to >= effective_from`, overlap check at service level.
  - `lookupRate(date)` — latest row where `effective_from <= date <= (effective_to ?? ∞)`.
  - `saveMonthEnd(input)` — THE atomic write:
    1. validate date `YYYY-MM-DD`, not future, `finance_year` computable
    2. validate 8 balances numeric `>= 0`, repayment amounts numeric,
       `offset_saving_fy >= 0`, `total_paid == base_amount + fee` check
    3. duplicate check: exact `entry_date` already stored →
       throw `ValidationFailed: snapshot for <date> already exists` (same month, different day is fine)
    4. `finance_year = computeFinanceYear(date, core.financialYear.start)`
    5. insert repayment → insert 8 offset rows (resolve `account_key` → `account_id`)
       If any step throws, caller deletes the repayment row (mock has no real txn;
       real SQLite path runs in one Host call so partial writes surface as error).
  - `deleteMonth(entryDate)` — delete offsets by `repayment_id`, then repayment.
  - `getLedger(financeYear?)`, `getOffsetsByDate(entryDate)`, `getYearly(lastN)`,
    `getSnapshot()` — derived: latest repayment + offset total + `lookupRate` → daily/monthly.
  - `getTargetEstimates()` — avg/period/date from M/U columns.
- `src/services/seed.ts` — on `activate()`: ensure 8 `mortgage_accounts` rows
  (0390 Offset, 3564 My Trans, 5272 Emergency, 3545 Car, 9722 Emergency 2,
  8107 Solar, 4323 Investment, 0743 My Childs, sort 1–8),
  ensure 1 blank `mortgage_loans` row if none. No ledger/rate seeding (blank start).

Testable: every service method callable from dev console with mock finance;
pure math verifiable against design §3 examples
(Jun 2026 $86.39 → $2,591.70; Jul $85.40 → $2,647.40; Aug $84.84 → $2,630.04).

## 4. Phase C — UI (4 views + orchestrator + 2 forms)

Conventions (AGENTS.md §5): `const Base = typeof HTMLElement !== 'undefined' ? LitElement : class{}` guard,
`static styles = typeof HTMLElement !== 'undefined' ? [sharedStyles] : []`,
`if (typeof customElements !== 'undefined') customElements.define(...)` only in `src/ui/index.ts`.
`import type { FinanceApi } from 'finance'` only. No hardcoded colors, use `var(--ff-*)`.
Topbar pattern: `.topbar > .crumb-current + .spacer + .filter-btn`, body `.view-container-inner`.

Files:

- `src/ui/mortgage-overview-view.ts` (`mortgage-overview`) — loan card (editable via `target-edit`
  for targets + loan form), M/U target cards (amount editable, avg/period/date derived read-only
  with formula tooltip), yearly table last N FYs (all derived, no editable fields),
  Daily Snapshot card (derived, shows rate used + date).
- `src/ui/mortgage-ledger-view.ts` (`mortgage-ledger`) — table of snapshots + FY dropdown
  (`fy-changed`), `Add month-end entry` button → `monthend-add-request`, row delete.
  Shows stored `offset_saving_fy` + derived check side by side; `total_paid` audit check.
- `src/ui/mortgage-offsets-view.ts` (`mortgage-offsets`) — per-date 8-account grid + Sub/Total derived,
  Edit button → `offset-edit-request` (routes to same month-end form, no direct writes).
- `src/ui/mortgage-rate-history-view.ts` (`mortgage-rate-history`) — rate table + add/edit form
  (`rate-add-request/rate-create/rate-edit-request/rate-edit/rate-form-cancel`).
- `src/ui/mortgage-month-end-form.ts` (`mortgage-month-end-form`) — date (default today,
  label "Snapshot date (normally month-end)") + repayment fields + 8-offset grid with live totals,
  Save → `monthend-save`, Cancel → `monthend-cancel`. Prefill balances from previous month.
- `src/ui/mortgage-orchestrator.ts` (`mortgage-orchestrator`) — owns `finance` + `mountData`
  (`financialYearStart/Current/Filter`), `navigate(tag)`, listens to all 17 events, calls service,
  surfaces errors as red `Error: ...` in view (template pattern).
- `src/ui/index.ts` — register all 6 tags, guarded.
- `src/ui/mortgage-view.ts` — keep as legacy alias re-exporting orchestrator default
  OR delete after `main.ts` stops creating `mortgage-view` (prefer delete to avoid dead tag).
- `index.html` — `VIEWS` array lists all 4 view tags for dev dropdown.

Errors: `try/catch` every `insert/update`, show message, keep form open on BLOCK-duplicate error.

## 5. Phase D — Host wiring (`src/main.ts`)

- Keep `registerUIComponents()` guard as-is.
- `activate()`: `seed()` accounts + blank loan; register 4 commands → `finance.ui.requestMount(tag,
  { financialYearStart, financialYearCurrent, financeYearFilter })` reading
  `core.financialYear.start/current`, `core.financeYear.filter` (fallback default 5);
  register `mortgage` domain service (`summary`, `ledger`, `snapshot` for future consumers);
  panel branch creates `mortgage-orchestrator` (not `mortgage-view`), sets finance via
  `queueMicrotask + setTimeout(50)` fallback (existing pattern).
- `deactivate()`: unregister service.
- Never top-level `import './ui/index.js'` in Host (would crash Node `HTMLElement is not defined`).

## 6. Test plan (must pass before build)

Dev (mock, ephemeral): `npm run dev` → http://localhost:5173

1. Overview blank: loan zeros editable, targets $100k editable, snapshot card shows "no data".
2. Rates: add 6.19% from today, list shows it; invalid rate (>1) rejected with message.
3. Month-end: add today + 8 balances → Ledger row appears, Offsets Total = sum, Overview snapshot
   daily/monthly recompute (verify formula with Jul example numbers by typing them).
4. Duplicate: re-add same exact date → red `Error: snapshot for ... already exists` and NO second row.
   Same month different day is accepted.
5. Delete month → Ledger + Offsets rows gone.
6. FY filter dropdown changes → `fy-changed` reloads.
7. Console clean: no `HTMLElement is not defined`, no `finance` bundle error.

Build + real DB: `npm run build` → `build/extension/mortgage.js` <200KB →
  app Extensions → Install Folder → restart → repeat steps 1–6 →
  DB check `SELECT * FROM mortgage_repayments; SELECT * FROM mortgage_offset_balances;` →
  Delete Data → DROP verified. Then `git commit` (version `0.1.1`).

## 7. No-error guards (checklist before build)

- [ ] `finance` only `import type`; `finance-logger` via `src/vendor/logger.ts`, no `console.log` shipped.
- [ ] No top-level `HTMLElement`/`window`/`customElements` in `main.ts`/dao/services.
- [ ] All 5 commands in `allowedCommands`, all 17 events in `allowedUiEvents`.
- [ ] `extra_paid` has no `min` (negatives allowed); all other money `min: 0`.
- [ ] `entry_date` future rejected; exact-date duplicates rejected; `finance_year` never a form field.
- [ ] `total_paid == base_amount + fee` audit check present.
- [ ] `package.json` versions in sync, `git commit` before reinstall (downgrade guard).

## 8. Out of scope

Excel import/backfill, `mortgage_yearly` table, forecast rows, persisted snapshots table,
cross-extension writes, changing `core.financialYear.start` backfill (accepted drift per design §4).
