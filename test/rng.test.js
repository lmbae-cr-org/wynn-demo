import assert from 'node:assert/strict';
import { test } from 'node:test';

import { OUTCOMES } from '../src/paytable.js';
import { secureRandomInt, selectWeighted } from '../src/rng.js';

test('secureRandomInt stays in range', () => {
  for (let i = 0; i < 1000; i += 1) {
    const value = secureRandomInt(10);
    assert.ok(value >= 0 && value < 10);
  }
});

test('selectWeighted only ever returns a declared outcome', () => {
  const symbols = new Set(OUTCOMES.map((o) => o.symbol));
  for (let i = 0; i < 2000; i += 1) {
    assert.ok(symbols.has(selectWeighted(OUTCOMES).symbol));
  }
});
