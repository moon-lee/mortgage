// scripts/check-min-repayment.mjs — runnable contract for the card math.
import { strict as assert } from 'node:assert';
import { minRepayment, elapsedMonths } from '../src/utils/mortgage-math.ts';

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
  minRepayment(599047.14, 0.055, 325) < minRepayment(599047.14, 0.0619, 325),
  'lower rate pays less',
);
// Edge cases return 0, never NaN
assert.equal(minRepayment(100000, 0, 360), 0);
assert.equal(minRepayment(0, 0.05, 360), 0);
assert.equal(minRepayment(100000, 0.05, 0), 0);
assert.equal(minRepayment(120000, 0.06, 0.5), 0);
assert.ok(
  Number.isFinite(minRepayment(120000, 1e-12, 360)),
  'tiny rate stays finite',
);
// Full calendar months, day-adjusted, never negative
assert.equal(elapsedMonths('2023-09-15', '2026-08-31'), 35);
assert.equal(elapsedMonths('2023-09-15', '2023-09-15'), 0);
assert.equal(elapsedMonths('2026-08-31', '2023-09-15'), 0);

console.log('min-repayment checks passed');
