// NGCB-5A-5 (Reg. 5A.070(8)): integrity testing of the control program.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { OUTCOMES, WEIGHT_TOTAL, theoreticalRtp } from '../src/paytable.js';

test('theoretical payback meets the Reg. 14.040(1)(a) minimum of 75%', () => {
  assert.ok(theoreticalRtp() >= 0.75, `RTP ${theoreticalRtp()} is below the regulatory minimum`);
});

test('every outcome is available on every play (Reg. 14.040(4))', () => {
  assert.ok(OUTCOMES.length > 0);
  for (const outcome of OUTCOMES) {
    assert.ok(Number.isInteger(outcome.weight) && outcome.weight > 0, `${outcome.symbol} is unreachable`);
  }
  assert.equal(
    WEIGHT_TOTAL,
    OUTCOMES.reduce((sum, o) => sum + o.weight, 0),
  );
});
