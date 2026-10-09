// Random number generation for game outcomes.
// NGCB-14-3 (Reg. 14.040(1)(b)): outcome is determined solely by chance, drawn from a
// cryptographically secure source. Nothing here is seeded, reproducible, or influenced by
// player identity, balance, session history or realised hold (NGCB-14-1, NGCB-14-2).

import { randomInt } from 'node:crypto';

/** Uniform integer in [0, maxExclusive). */
export function secureRandomInt(maxExclusive) {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1) {
    throw new RangeError('maxExclusive must be a positive integer');
  }
  return randomInt(maxExclusive);
}

/**
 * Select one entry from a weighted outcome table.
 * The full outcome space is passed in on every call — nothing is filtered out
 * (NGCB-14-4, Reg. 14.040(4)).
 */
export function selectWeighted(outcomes) {
  const total = outcomes.reduce((sum, o) => sum + o.weight, 0);
  let roll = secureRandomInt(total);
  for (const outcome of outcomes) {
    roll -= outcome.weight;
    if (roll < 0) return outcome;
  }
  // Unreachable while weights are positive integers; fail closed rather than guess.
  throw new Error('Outcome selection failed');
}
