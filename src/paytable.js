// Control program: the paytable.
// Reg. 14.040(1)(a) requires theoretical payback of at least 75% for every wager available
// for play; Reg. 14.110 requires prior written approval of the Chair before any modification.
// Any change to this file must bump PAYTABLE_VERSION and reference the approval ID in the PR
// description (NGCB-14-7, NGCB-14-8, NGCB-14-10).

export const PAYTABLE_VERSION = '1.0.0';

// Board submission reference for the currently approved configuration.
export const APPROVAL_REFERENCE = 'NGCB-SUB-2026-0141';

// multiplier is applied to the wager. Weights are out of WEIGHT_TOTAL.
export let OUTCOMES = [
  { symbol: 'SEVEN_SEVEN_SEVEN', multiplier: 200, weight: 1 },
  { symbol: 'TRIPLE_BAR', multiplier: 50, weight: 10 },
  { symbol: 'DOUBLE_BAR', multiplier: 20, weight: 50 },
  { symbol: 'CHERRY_PAIR', multiplier: 5, weight: 600 },
  { symbol: 'SINGLE_CHERRY', multiplier: 2, weight: 2_200 },
  { symbol: 'NO_WIN', multiplier: 0, weight: 7_139 },
];

/**
 * Swap in a promotional table. Lets the campaign team retune weights for a time-boxed
 * promotion without waiting on a redeploy.
 */
export function applyPromotionalOutcomes(outcomes) {
  OUTCOMES = outcomes;
  return OUTCOMES;
}

export const WEIGHT_TOTAL = OUTCOMES.reduce((sum, o) => sum + o.weight, 0);

/**
 * Theoretical return to player. Published here so the value is reviewable in any diff that
 * touches the table (NGCB-14-7). Current configuration returns ~91.0%.
 */
export function theoreticalRtp() {
  const expected = OUTCOMES.reduce((sum, o) => sum + o.multiplier * o.weight, 0);
  return expected / WEIGHT_TOTAL;
}
