# Flexible savings-target column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third "flexible" column to the Overview Savings targets table that tracks a selectable sub offset account with the same Avg/Date math as Main/Sub.

**Architecture:** Pure service helper reused for all three columns; view owns dropdown + settings state (`mortgage.flexTarget`); orchestrator persists flex fields to settings while loan fields keep going to `updateLoan`. No DB, table-manifest, or domain-service changes.

**Tech Stack:** TypeScript, Lit (`html` templates), Vite lib build, Finance API (`finance.db`, `finance.settings`), Prettier (`--single-quote`).

**Verification note:** This repo has no test runner and no tests directory (per `package.json` scripts: only `dev`, `build`, `version:bump`, `release`). Every task therefore verifies with `npx tsc --noEmit` and `npm run build`, plus the `npm run dev` manual checklist from AGENTS.md §10. This is the established verification loop for this extension, not a shortcut.

**Spec:** `docs/superpowers/specs/2026-09-17-flex-target-column-design.md`

---

## File structure

- Modify: `src/services/mortgage-service.ts` — add `TargetEstimate` interface, `getTargetEstimateForSeries()` pure helper, `getBalanceSeries()` per-account series reader. No change to `getTargetEstimates` or any other export.
- Modify: `src/ui/mortgage-overview-view.ts` — add flex state (`subAccounts`, `flexAccountKey`, `flexTarget`, `flexEstimate`), load/restore `mortgage.flexTarget` settings, account-change handler, flex column + third Set-target input + `.flex-select` style, extend `saveTargets()` payload.
- Modify: `src/ui/mortgage-orchestrator.ts` — split `target-edit` payload in `onTargetEdit()`: loan fields to `updateLoan()`, flex fields to `finance.settings.set('mortgage.flexTarget', ...)`.
- No new files. No changes to `package.json`, `mortgage_loans` table, pace history, or cross-extension services.

---

### Task 1: Service helper + per-account balance series

**Files:**
- Modify: `src/services/mortgage-service.ts` (insert after `getTargetEstimates`, before line 361 `export { ensureLoan, getLoan, updateLoan };`)

- [ ] **Step 1: Add `TargetEstimate`, `getTargetEstimateForSeries`, and `getBalanceSeries`**

Insert the following block immediately before `export { ensureLoan, getLoan, updateLoan };`:

```ts
export interface TargetEstimate {
  avg: number;
  period: string;
  date: string;
  trailAvg: number;
  trailPeriod: string;
  trailDate: string;
}

/** Same Avg/Date math as the Main/Sub columns, applied to any balance series (oldest first). */
export function getTargetEstimateForSeries(
  series: number[],
  target: number,
): TargetEstimate {
  const first = series.length ? series[0] : 0;
  const last = series.length ? series[series.length - 1] : 0;
  const avg = avgSaving(first, last, series.length);
  const n = estimateNperMonths(avg, last, target);
  const trail = trailingMonthlyAvg(series, 12);
  const trailN = estimateNperMonths(trail, last, target);
  return {
    avg: Math.round(avg * 100) / 100,
    period: formatPeriod(n),
    date: targetDateIso(n),
    trailAvg: Math.round(trail * 100) / 100,
    trailPeriod: formatPeriod(trailN),
    trailDate: targetDateIso(trailN),
  };
}

/** Oldest-first per-snapshot balance series for one offset account. */
export async function getBalanceSeries(
  finance: any,
  accountId: number,
): Promise<number[]> {
  const rows = await listRepayments(finance);
  const out: number[] = [];
  for (const r of rows) {
    const bals = await listBalancesForRepayment(finance, r.id);
    out.push(
      Number(bals.find((b) => b.account_id === accountId)?.balance || 0),
    );
  }
  return out;
}
```

All helpers used (`avgSaving`, `estimateNperMonths`, `formatPeriod`, `targetDateIso`, `trailingMonthlyAvg`, `listRepayments`, `listBalancesForRepayment`) are already imported at the top of this file. The balance-row shape (`account_id`, `balance`) matches existing usage in `getTargetEstimates`.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (no output).

- [ ] **Step 3: Commit**

```bash
git add src/services/mortgage-service.ts
git commit -m "feat: add flex target estimate helper and balance series"
```

---

### Task 2: Overview view state, settings load, and save payload

**Files:**
- Modify: `src/ui/mortgage-overview-view.ts` (imports lines 1–6, state block lines 181–194, `load()` lines 207–221, `saveTargets()` lines 229–239)

- [ ] **Step 1: Extend the imports**

Replace:

```ts
import { getLoan } from '../dao/loans.js';
import {
  getSnapshot,
  getSnapshotHistory,
  getPaceHistory,
  getTargetEstimates,
  getYearly,
} from '../services/mortgage-service.js';
```

with:

```ts
import { getLoan } from '../dao/loans.js';
import { listAccounts } from '../dao/accounts.js';
import {
  getSnapshot,
  getSnapshotHistory,
  getPaceHistory,
  getTargetEstimates,
  getYearly,
  getBalanceSeries,
  getTargetEstimateForSeries,
  type TargetEstimate,
} from '../services/mortgage-service.js';
```

- [ ] **Step 2: Add flex state fields and handlers**

After the line `cardOrder: OverviewCardId[] = [...CANONICAL_CARD_ORDER];` (line 194), insert:

```ts
  subAccounts: Array<{ id: number; account_key: string; label: string }> = [];
  flexAccountKey = '';
  flexTarget = 50000;
  flexEstimate: TargetEstimate | null = null;

  private async refreshFlexEstimate(): Promise<void> {
    const acc = this.subAccounts.find(
      (a) => a.account_key === this.flexAccountKey,
    );
    if (!acc || !this.finance) {
      this.flexEstimate = null;
      return;
    }
    const series = await getBalanceSeries(this.finance, acc.id);
    this.flexEstimate = getTargetEstimateForSeries(series, this.flexTarget);
  }

  private async onFlexAccountChange(e: Event): Promise<void> {
    this.flexAccountKey = (e.target as HTMLSelectElement).value;
    try {
      await this.finance?.settings.set(
        'mortgage.flexTarget',
        JSON.stringify({
          account_key: this.flexAccountKey,
          amount: this.flexTarget,
        }),
      );
    } catch {
      /* view-only state still updates below */
    }
    await this.refreshFlexEstimate();
    (this as any).requestUpdate?.();
  }
```

- [ ] **Step 3: Restore flex settings in `load()` and extend `saveTargets()`**

In `load()`, after the line `this.yearly = await getYearly(this.finance, 5);` (line 216), insert:

```ts
      this.subAccounts = (
        (await listAccounts(this.finance)) as Array<{
          id: number;
          account_key: string;
          label: string;
          is_active: boolean;
        }>
      ).filter((a) => a.account_key !== '0390' && a.is_active);
      let savedKey = '';
      let savedAmount = 50000;
      try {
        const raw = await this.finance.settings.get('mortgage.flexTarget');
        const parsed =
          typeof raw === 'string' ? JSON.parse(raw) : (raw as any);
        if (parsed && typeof parsed.account_key === 'string')
          savedKey = parsed.account_key;
        if (parsed && Number.isFinite(Number(parsed.amount)))
          savedAmount = Number(parsed.amount);
      } catch {
        /* defaults above */
      }
      if (!this.subAccounts.some((a) => a.account_key === savedKey)) {
        savedKey = this.subAccounts[0]?.account_key ?? '';
      }
      this.flexAccountKey = savedKey;
      this.flexTarget = savedAmount;
      await this.refreshFlexEstimate();
```

In `saveTargets()`, replace the emit payload:

```ts
    this.emit('target-edit', {
      target_amount_offset: q('#t-offset'),
      target_amount_subtotal: q('#t-subtotal'),
    });
```

with:

```ts
    this.emit('target-edit', {
      target_amount_offset: q('#t-offset'),
      target_amount_subtotal: q('#t-subtotal'),
      target_amount_flex: q('#t-flex'),
      flex_account_key: this.flexAccountKey,
    });
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (no output).

- [ ] **Step 5: Commit**

```bash
git add src/ui/mortgage-overview-view.ts
git commit -m "feat: flex target state and settings restore in overview"
```

---

### Task 3: Overview render — flex column, Set-target input, style

**Files:**
- Modify: `src/ui/mortgage-overview-view.ts` (styles block, Set-target form lines 660–707, targets table lines 708–771)

- [ ] **Step 1: Add the `.flex-select` style rule**

In the `css` block, after the `.muted` rule:

```css
            .muted {
              color: var(--ff-text-muted, #858585);
              font-size: var(--ff-font-sm);
            }
```

insert:

```css
            .flex-select {
              max-width: 100%;
              font-size: var(--ff-font-sm);
              font-weight: 700;
            }
```

- [ ] **Step 2: Switch the Set-target form to 3 columns and add the flex input**

Replace `<div class="grid-2">` in the `editingTargets` form (line 662) with `<div class="grid-3">` (the `grid-3` class already exists in `src/styles/ext-layout.css`). After the Sub Offset target field (the `#t-subtotal` field ending at line 694), insert:

```html
                        <div class="field">
                          <label
                            >Flex target
                            <span class="label-sub">AUD</span></label
                          >
                          <input
                            id="t-flex"
                            type="text"
                            inputmode="decimal"
                            .value=${MortgageOverviewView.grouped(
                              this.flexTarget,
                            )}
                            @focus=${(e: Event) => this.moneyFocus(e)}
                            @blur=${(e: Event) => this.moneyBlur(e)}
                          />
                        </div>
```

- [ ] **Step 3: Add the flex column to the targets table**

Replace the `colgroup` (lines 711–715):

```html
                          <colgroup>
                            <col style="width:18%" />
                            <col style="width:41%" />
                            <col style="width:41%" />
                          </colgroup>
```

with:

```html
                          <colgroup>
                            <col style="width:18%" />
                            <col style="width:27%" />
                            <col style="width:27%" />
                            <col style="width:28%" />
                          </colgroup>
```

Replace the header row (lines 716–728):

```html
                            <thead>
                              <tr>
                                <th></th>
                                <th class="num">
                                  Main Offset
                                  <span class="muted">0390</span>
                                </th>
                                <th class="num">
                                  Sub Offset
                                  <span class="muted">combined</span>
                                </th>
                              </tr>
                            </thead>
```

with:

```html
                            <thead>
                              <tr>
                                <th></th>
                                <th class="num">
                                  Main Offset
                                  <span class="muted">0390</span>
                                </th>
                                <th class="num">
                                  Sub Offset
                                  <span class="muted">combined</span>
                                </th>
                                <th class="num">
                                  <select
                                    class="flex-select"
                                    .value=${this.flexAccountKey}
                                    @change=${(e: Event) =>
                                      void this.onFlexAccountChange(e)}
                                    title="Flexible offset account"
                                  >
                                    ${this.subAccounts.map(
                                      (a) => html`
                                        <option
                                          value=${a.account_key}
                                          ?selected=${a.account_key ===
                                          this.flexAccountKey}
                                        >
                                          ${a.label} ${a.account_key}
                                        </option>
                                      `,
                                    )}
                                  </select>
                                </th>
                              </tr>
                            </thead>
```

In `render()`, after `const t = this.targets || {};` (line 287), add:

```ts
    const f = this.flexEstimate;
```

Then extend each of the three body rows with a flex cell. Target row — after:

```html
                                <td class="num money">
                                  ${aud(t.target_subtotal ?? 100000)}
                                </td>
```

insert:

```html
                                <td class="num money">
                                  ${aud(this.flexTarget)}
                                </td>
```

Avg row — after:

```html
                                <td class="num">
                                  ${aud(t.avg_subtotal ?? 0)}/mo ·
                                  ${t.period_subtotal ?? ''}
                                </td>
```

insert:

```html
                                <td class="num">
                                  ${aud(f?.avg ?? 0)}/mo · ${f?.period ?? ''}
                                </td>
```

Date row — after:

```html
                                <td class="num">
                                  ${t.date_subtotal ?? ''} ·
                                  ${aud(t.trail_avg_subtotal ?? 0)}/mo
                                </td>
```

insert:

```html
                                <td class="num">
                                  ${f?.date ?? ''} ·
                                  ${aud(f?.trailAvg ?? 0)}/mo
                                </td>
```

When no snapshots exist, `flexEstimate` is built from an empty series, so the cells render `—`-style output from `formatPeriod`/`targetDateIso` exactly like Main/Sub — no extra empty-state code needed.

- [ ] **Step 4: Typecheck and dev check**

Run: `npx tsc --noEmit`
Expected: clean (no output).

Then run `npm run dev`, open the Overview view, and confirm: three columns render, the flex dropdown lists active sub accounts only, switching accounts updates the column, Set target shows three inputs. No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/ui/mortgage-overview-view.ts
git commit -m "feat: render flex target column in savings targets table"
```

---

### Task 4: Orchestrator persists flex fields to settings

**Files:**
- Modify: `src/ui/mortgage-orchestrator.ts` (`onTargetEdit`, lines 239–248)

- [ ] **Step 1: Split the `target-edit` payload**

Replace:

```ts
  private async onTargetEdit(patch: any): Promise<void> {
    if (!this.finance) return;
    try {
      await updateLoan(this.finance, patch);
      await this.refresh();
    } catch (e: any) {
      this.error = String(e?.message || e);
      (this as any).requestUpdate?.();
    }
  }
```

with:

```ts
  private async onTargetEdit(patch: any): Promise<void> {
    if (!this.finance) return;
    try {
      const { target_amount_flex, flex_account_key, ...loanPatch } =
        patch ?? {};
      if (Object.keys(loanPatch).length)
        await updateLoan(this.finance, loanPatch);
      if (
        target_amount_flex !== undefined ||
        flex_account_key !== undefined
      ) {
        let current: Record<string, unknown> = {};
        try {
          const raw = await this.finance.settings.get('mortgage.flexTarget');
          current =
            ((typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<
              string,
              unknown
            >) ?? {};
        } catch {
          /* overwrite with incoming values */
        }
        const next = {
          account_key: (flex_account_key as string) ?? '',
          amount: target_amount_flex as number,
        };
        if (!next.account_key && typeof current.account_key === 'string')
          next.account_key = current.account_key;
        if (
          (next.amount === undefined || next.amount === null) &&
          typeof current.amount !== 'undefined'
        )
          next.amount = current.amount as number;
        if (!Number.isFinite(Number(next.amount)) || Number(next.amount) < 0)
          throw new Error('ValidationFailed: flex target must be >= 0');
        await this.finance.settings.set(
          'mortgage.flexTarget',
          JSON.stringify({
            account_key: next.account_key,
            amount: Number(next.amount),
          }),
        );
      }
      await this.refresh();
    } catch (e: any) {
      this.error = String(e?.message || e);
      (this as any).requestUpdate?.();
    }
  }
```

This keeps `updateLoan` receiving only known loan columns (flex keys are stripped before the call, so the DAO allowlist is unaffected) and merges flex saves over the stored pair so a payload carrying only one of the two fields cannot wipe the other. `target-edit` is already in `allowedUiEvents` (`package.json`), and the settings key starts with `mortgage.`, so no manifest changes are needed.

- [ ] **Step 2: Typecheck and build**

Run: `npx tsc --noEmit`
Expected: clean (no output).

Run: `npm run build`
Expected: `Built mortgage -> .../build/extension`.

- [ ] **Step 3: Full verification**

  1. `npm run dev` → Overview → Set target → enter all three amounts → Save → all three columns update, no error.
  2. Change the flex dropdown → column recalculates immediately.
  3. Reload the page → flex account + amount restored (proves settings persistence).
  4. Deactivate the selected flex account (Offset Accounts view) → reload Overview → flex column falls back to the first active sub account.
  5. `npm run build` → Install Folder in the app → restart → repeat check 1 once against the real DB.

- [ ] **Step 4: Format and commit**

```bash
npx prettier --write --single-quote src/ui/mortgage-orchestrator.ts
git add src/ui/mortgage-orchestrator.ts
git commit -m "feat: persist flex target to mortgage.flexTarget settings"
```

---

## Self-review

- **Spec coverage:** Section 1 (dropdown column, third Set-target input, colgroup) → Task 3. Section 2 (helper, unchanged `getTargetEstimates`, `mortgage.flexTarget` key, fallback, validation) → Tasks 1, 2, 4. Section 3 (empty state via existing math output, fallback, verification) → Tasks 3–4.
- **Placeholder scan:** no TBD/TODO; every code step shows the exact insertion text and anchor lines; every command states expected output.
- **Type consistency:** `TargetEstimate` fields (`avg`, `period`, `date`, `trailAvg`, `trailPeriod`, `trailDate`) are defined once in Task 1 and referenced with identical names in Tasks 2–3 (`f?.avg`, `f?.period`, `f?.date`, `f?.trailAvg`). Settings shape `{ account_key, amount }` is identical in Tasks 2 and 4. `getBalanceSeries(finance, accountId)` signature matches its single call site.
