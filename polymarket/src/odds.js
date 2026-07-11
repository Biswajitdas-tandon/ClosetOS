// Locked-odds engine for YNG Polymarket.
//
// The whole game lives in this file. Every option on a question carries a
// virtual "house seed" (default ₹1,000) that is never paid out — it only sets
// the opening prices and smooths early swings.
//
//   optionPool[i]  = seed[i] + (total staked on option i)
//   totalPool      = sum(optionPool)
//   multiplier[i]  = totalPool / optionPool[i]      (rounded to 2 dp for display)
//   share[i]       = optionPool[i] / totalPool       (the "% share" shown on screen)
//
// A yes/no question (2 equal seeds) opens at 2.0× both sides; a 4-option
// question opens at 4.0× each; a 10-option question opens at 10.0× each.
//
// LOCKING: a bettor locks the multiplier shown *before* their own stake is
// added — "the number you see is the number you get". Their stake then moves
// the price for everyone who bets after them. Payout = stake × lockedMultiplier.

export const DEFAULT_HOUSE_SEED = 1000;

export function round2(x) {
  return Math.round(x * 100) / 100;
}

// seeds: number[]; stakedByOption: number[] (sum of confirmed stakes per option).
export function poolsFor(seeds, stakedByOption = []) {
  return seeds.map((s, i) => s + (stakedByOption[i] || 0));
}

export function totalPool(pools) {
  return pools.reduce((a, b) => a + b, 0);
}

// Raw (unrounded) multiplier for one option given the current pools.
export function rawMultiplier(pools, optionIndex) {
  return totalPool(pools) / pools[optionIndex];
}

// Rounded multipliers for every option — this is what is shown and locked.
export function multipliers(pools) {
  const total = totalPool(pools);
  return pools.map((p) => round2(total / p));
}

// Percentage share for every option (0–100), for the fill bars.
export function shares(pools) {
  const total = totalPool(pools);
  return pools.map((p) => round2((p / total) * 100));
}

// The price a new bettor locks on `optionIndex`: computed from the current
// pools, BEFORE their stake is added. Rounded to 2 dp (the on-screen number).
export function lockPrice(seeds, stakedByOption, optionIndex) {
  const pools = poolsFor(seeds, stakedByOption);
  return round2(rawMultiplier(pools, optionIndex));
}

// Potential payout for a bet, given the locked multiplier.
export function payout(amount, lockedMultiplier) {
  return round2(amount * lockedMultiplier);
}

// Convenience: seeds array of `count` options each equal to `seed`.
export function equalSeeds(count, seed = DEFAULT_HOUSE_SEED) {
  return Array.from({ length: count }, () => seed);
}
