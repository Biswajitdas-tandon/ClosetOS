import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  equalSeeds,
  poolsFor,
  multipliers,
  shares,
  lockPrice,
  payout,
} from '../src/odds.js';

test('yes/no opens at 2.0x / 2.0x', () => {
  const seeds = equalSeeds(2); // [1000, 1000]
  assert.deepEqual(multipliers(poolsFor(seeds, [0, 0])), [2, 2]);
});

test('4-option question opens at 4.0x each', () => {
  const seeds = equalSeeds(4);
  assert.deepEqual(multipliers(poolsFor(seeds, [0, 0, 0, 0])), [4, 4, 4, 4]);
});

test('10-option month question opens at 10.0x each', () => {
  const seeds = equalSeeds(10);
  const m = multipliers(poolsFor(seeds, new Array(10).fill(0)));
  assert.deepEqual(m, new Array(10).fill(10));
});

test('worked example: Rahul bets 2000 on YES, locks 2.0x', () => {
  const seeds = equalSeeds(2); // YES/NO
  // Before Rahul bets, the price he locks on YES is 2.0.
  assert.equal(lockPrice(seeds, [0, 0], 0), 2);
  // Owed 4000 if YES resolves.
  assert.equal(payout(2000, 2), 4000);
});

test('after Rahul, the pools and next-visitor prices follow the stated formula', () => {
  // NOTE: the outline's worked example prints "YES 1.67x / NO 2.5x, pools
  // 3000/2000 total 5000", but that is an arithmetic slip in the doc: a single
  // 2000 bet on YES over equal 1000/1000 seeds gives pools 3000/1000 (total
  // 4000), and the stated formula multiplier = totalPool / optionPool yields
  // YES 1.33x / NO 4.0x. We implement the (consistent) formula.
  const seeds = equalSeeds(2);
  const pools = poolsFor(seeds, [2000, 0]);
  assert.deepEqual(pools, [3000, 1000]);
  assert.deepEqual(multipliers(pools), [1.33, 4]);
});

test('share matches multiplier: YES 62% pays ~1.6x', () => {
  // Construct pools where YES is ~62% of the total.
  const pools = [6200, 3800];
  assert.deepEqual(shares(pools), [62, 38]);
  assert.deepEqual(multipliers(pools), [1.61, 2.63]);
});

test('locked price is pre-bet; second bettor on same side gets a worse price', () => {
  const seeds = equalSeeds(2);
  const first = lockPrice(seeds, [0, 0], 0); // 2.0
  const second = lockPrice(seeds, [2000, 0], 0); // after 2000 already on YES
  assert.equal(first, 2);
  assert.ok(second < first, 'second YES bettor gets a worse (lower) price');
  assert.equal(second, 1.33);
});

test('seeds are never zero, so no division by zero even with heavy one-sided flow', () => {
  const seeds = equalSeeds(2);
  const pools = poolsFor(seeds, [50000, 0]);
  const m = multipliers(pools);
  assert.ok(Number.isFinite(m[0]) && Number.isFinite(m[1]));
  assert.ok(m[0] > 1 && m[1] > 1);
});
