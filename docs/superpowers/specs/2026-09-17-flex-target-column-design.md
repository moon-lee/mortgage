# Flexible savings-target column — design

Date: 2026-09-17
Status: approved (Sections 1–3 confirmed in chat)
Scope: single flexible column in the Overview → Savings targets table.

## 1. Context

The Overview view's Savings targets table currently has two fixed columns:

- Main Offset (`0390`, from `loan.target_amount_offset`)
- Sub Offset combined (total − main, from `loan.target_amount_subtotal`)

Estimates (`getTargetEstimates` in `src/services/mortgage-service.ts`) hardcode the
`0390` account key and derive the sub series as total-minus-main. The user has 8
seed offset accounts (`src/dao/accounts.ts` `SEED_ACCOUNTS`) and wants to pick any
sub account in a third column and see the same target math for it.

## 2. Decisions (confirmed)

- Persistence: remember last pick in settings (`mortgage.flexTarget` =
  `{ account_key, amount }`). No per-account DB targets.
- Dropdown: active sub accounts only (excludes `0390`, ordered by `sort_order`).
- Target input: third field in the existing Set target form, same Save button and
  money focus/blur formatting.
- Approach: single flexible column, settings-backed (Option A). No new table,
  no `mortgage_loans` change, no version bump required for this change alone.

## 3. UI design (Section 1)

```
|            | Main Offset 0390 | Sub Offset combined | [Flex: select ▾]    |
| Target     | $100,000         | $100,000            | $50,000             |
| Avg·period | $x/mo · period   | $y/mo · period      | same math           |
| Date·trail | date · $z/mo     | date · $w/mo        | same math           |
```

- Third header cell is an account `<select>` (label + key). Changing it re-renders
  that column immediately and persists the pick.
- Set target form gains a third input ("Flex target AUD").
- `colgroup` shifts from 18/41/41 to ~18/27/27/28. Narrow screens keep working via
  the existing `.table-wrap` horizontal scroll.
- Pace history table is out of scope and stays unchanged.

## 4. Data / service / settings (Section 2)

- New pure helper in `mortgage-service.ts`:
  `getTargetEstimateForSeries(series, count, current, target)` →
  `{ avg, period, date, trailAvg, trailPeriod, trailDate }`, reusing `avgSaving`,
  `estimateNperMonths`, `formatPeriod`, `targetDateIso`, `trailingMonthlyAvg`.
- `getTargetEstimates` return shape is unchanged (Main/Sub as today) so the
  `mortgage` domain service contract does not break. The view computes the flex
  column via the helper, with an optional small export
  `getBalanceSeries(finance, accountId)` (oldest-first per-snapshot balances).
- Settings: `mortgage.flexTarget` loaded in `load()` next to loan/snapshot/targets
  and saved with the Set-target save (the `target-edit` event carries
  `target_amount_flex` + `flex_account_key`; the orchestrator writes settings, not
  the loan row). If the saved key is missing/inactive, fall back to the first
  active sub account and keep the amount.
- Validation: amount finite and ≥ 0 (same `num()` semantics); bad input surfaces
  in the existing red `Error:` slot.

## 5. Edge cases + verification (Section 3)

- No snapshots: flex column shows `—` placeholders; dropdown stays usable.
- Saved account gone: silent fallback to first active sub, amount preserved.
- Target ≤ current: same `—` output as Main/Sub today, no special-casing.
- Verification: `npx tsc --noEmit`, `npm run dev` (switch account, save target,
  reload restores), `npm run build` + Install Folder spot-check. No automated
  tests exist for this extension; this change adds none.

## 6. Non-goals

- Per-account persisted targets (would need a new table + migration).
- Multiple flexible columns side by side.
- Changes to pace history, snapshot, yearly, or cross-extension services.
