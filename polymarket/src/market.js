// Market business logic: live prices, the bet-locking transaction (with the
// arrival-order + re-quote rule), and leaderboard/payout maths.
//
// Everything the server does to *mutate* bets goes through lockBets(), which
// runs fully synchronously — node:sqlite is synchronous and Node never
// interleaves synchronous code, so concurrent HTTP requests are serialised and
// each bet locks the price produced by all bets confirmed before it.

import * as db from './db.js';
import { STARTING_BANKROLL } from './db.js';
import { poolsFor, multipliers, shares, payout, round2 } from './odds.js';

export const STAKE_MIN = 500;
export const STAKE_MAX = 3000;
export const STAKE_STEP = 500;
export const MIN_QUESTIONS_FIRST_SUBMISSION = 5;

// ---- live pricing ------------------------------------------------------

// Full live view of one question: per-option multiplier, % share, pool.
export function priceQuestion(database, q) {
  const staked = db.stakedByOption(database, q.id, q.options.length);
  const pools = poolsFor(q.seeds, staked);
  const mult = multipliers(pools);
  const share = shares(pools);
  const totalStaked = staked.reduce((a, b) => a + b, 0);
  return {
    id: q.id,
    category: q.category,
    text: q.text,
    judgedBy: q.judgedBy,
    resolution: q.resolution,
    totalStaked,
    options: q.options.map((label, i) => ({
      index: i,
      label,
      multiplier: mult[i],
      sharePct: share[i],
      staked: staked[i],
    })),
  };
}

export function priceAllQuestions(database) {
  return db.getQuestions(database).map((q) => priceQuestion(database, q));
}

// ---- player view -------------------------------------------------------

export function playerSummary(database, player) {
  const bets = db.getBetsForPlayer(database, player.id);
  const staked = bets.reduce((a, b) => a + b.amount, 0);
  return {
    id: player.id,
    fullName: player.full_name,
    staked,
    remaining: STARTING_BANKROLL - staked,
    bankroll: STARTING_BANKROLL,
    betCount: bets.length,
    bets: bets.map((b) => ({
      questionId: b.question_id,
      optionIndex: b.option_index,
      amount: b.amount,
      lockedMultiplier: b.locked_multiplier,
      potentialPayout: payout(b.amount, b.locked_multiplier),
    })),
  };
}

// ---- validation --------------------------------------------------------

function validStake(amount) {
  return (
    Number.isInteger(amount) &&
    amount >= STAKE_MIN &&
    amount <= STAKE_MAX &&
    amount % STAKE_STEP === 0
  );
}

// ---- the locking transaction ------------------------------------------

// slip: [{ questionId, optionIndex, amount, displayedMultiplier }]
// Returns one of:
//   { ok: true,  locked: [{ questionId, optionIndex, amount, lockedMultiplier, potentialPayout }] }
//   { ok: false, requote: [{ questionId, optionIndex, oldMultiplier, newMultiplier, amount, potentialPayout }] }
//   { ok: false, error: 'message' }
export function lockBets(database, playerId, slip) {
  if (!db.isMarketOpen(database)) {
    return { ok: false, error: 'The market is closed — no bets accepted.' };
  }
  const player = db.getPlayerById(database, playerId);
  if (!player) return { ok: false, error: 'Unknown player.' };

  if (!Array.isArray(slip) || slip.length === 0) {
    return { ok: false, error: 'Your slip is empty.' };
  }

  const existing = db.getBetsForPlayer(database, playerId);
  const existingQids = new Set(existing.map((b) => b.question_id));
  const existingStaked = existing.reduce((a, b) => a + b.amount, 0);

  // Minimum 5 questions before the very first submission.
  if (existing.length === 0 && slip.length < MIN_QUESTIONS_FIRST_SUBMISSION) {
    return {
      ok: false,
      error: `Pick at least ${MIN_QUESTIONS_FIRST_SUBMISSION} questions before your first Lock In (you have ${slip.length}).`,
    };
  }

  // Validate every slip entry up front (all-or-nothing).
  const seen = new Set();
  const prepared = [];
  for (const entry of slip) {
    const q = db.getQuestion(database, entry.questionId);
    if (!q) return { ok: false, error: `Unknown question: ${entry.questionId}` };
    if (q.resolution !== null && q.resolution !== undefined) {
      return { ok: false, error: `“${q.text}” is already resolved.` };
    }
    if (!Number.isInteger(entry.optionIndex) || entry.optionIndex < 0 || entry.optionIndex >= q.options.length) {
      return { ok: false, error: `Invalid option for “${q.text}”.` };
    }
    if (!validStake(entry.amount)) {
      return { ok: false, error: `Stake must be ₹${STAKE_MIN}–₹${STAKE_MAX} in steps of ₹${STAKE_STEP}.` };
    }
    if (existingQids.has(entry.questionId) || seen.has(entry.questionId)) {
      return { ok: false, error: `You already have a bet on “${q.text}” — one bet per question, final once locked.` };
    }
    seen.add(entry.questionId);
    prepared.push({ q, entry });
  }

  // Bankroll check — no top-ups, cannot exceed remaining balance.
  const slipTotal = prepared.reduce((a, p) => a + p.entry.amount, 0);
  if (existingStaked + slipTotal > STARTING_BANKROLL) {
    const remaining = STARTING_BANKROLL - existingStaked;
    return { ok: false, error: `That exceeds your remaining bankroll (₹${remaining}).` };
  }

  // Re-quote pass: compute the current lock price for each entry and compare to
  // the price the player was shown. If any moved, lock NOTHING and ask them to
  // re-confirm the new prices — "nobody ever gets a price they didn't see".
  const requote = [];
  const toLock = [];
  for (const { q, entry } of prepared) {
    const staked = db.stakedByOption(database, q.id, q.options.length);
    const pools = poolsFor(q.seeds, staked);
    const current = multipliers(pools)[entry.optionIndex]; // pre-bet, rounded
    const shown = round2(Number(entry.displayedMultiplier));
    if (current !== shown) {
      requote.push({
        questionId: q.id,
        optionIndex: entry.optionIndex,
        optionLabel: q.options[entry.optionIndex],
        oldMultiplier: shown,
        newMultiplier: current,
        amount: entry.amount,
        potentialPayout: payout(entry.amount, current),
      });
    }
    toLock.push({ q, entry, lockedMultiplier: current });
  }
  if (requote.length > 0) {
    return { ok: false, requote };
  }

  // All prices held → lock them all, in slip order. Each insert moves the pool,
  // so two entries on the same question would price sequentially (though the
  // one-bet-per-question rule already forbids that).
  const nowIso = new Date().toISOString();
  const locked = [];
  for (const { q, entry, lockedMultiplier } of toLock) {
    db.insertBet(database, {
      playerId,
      questionId: q.id,
      optionIndex: entry.optionIndex,
      amount: entry.amount,
      lockedMultiplier,
      nowIso,
    });
    locked.push({
      questionId: q.id,
      optionIndex: entry.optionIndex,
      optionLabel: q.options[entry.optionIndex],
      amount: entry.amount,
      lockedMultiplier,
      potentialPayout: payout(entry.amount, lockedMultiplier),
    });
  }
  return { ok: true, locked };
}

// ---- leaderboard / resolution -----------------------------------------

// Balance = starting − total staked + payouts on resolved wins + refunds on
// voids. Unresolved bets stay deducted (money at risk). Once every question is
// resolved, this equals the true final balance.
export function leaderboard(database) {
  const questions = new Map(db.getQuestions(database).map((q) => [q.id, q]));
  const players = db.getAllPlayers(database);
  const rows = players.map((p) => {
    const bets = db.getBetsForPlayer(database, p.id);
    let staked = 0;
    let returned = 0; // payouts + refunds credited so far
    let settled = 0; // count of resolved/void bets
    for (const b of bets) {
      staked += b.amount;
      const q = questions.get(b.question_id);
      const res = q?.resolution;
      if (res === 'void') {
        returned += b.amount; // refund
        settled += 1;
      } else if (res !== null && res !== undefined) {
        settled += 1;
        if (Number(res) === b.option_index) {
          returned += payout(b.amount, b.locked_multiplier);
        }
      }
    }
    return {
      playerId: p.id,
      fullName: p.full_name,
      betCount: bets.length,
      staked,
      settledCount: settled,
      balance: round2(STARTING_BANKROLL - staked + returned),
      allResolved: bets.length > 0 && settled === bets.length,
    };
  });
  rows.sort((a, b) => b.balance - a.balance || b.betCount - a.betCount || a.fullName.localeCompare(b.fullName));
  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

// Projector board: live totals across the whole market.
export function projectorBoard(database) {
  const questions = priceAllQuestions(database);
  const allBets = db.getAllBets(database);
  const totalStaked = allBets.reduce((a, b) => a + b.amount, 0);
  const traders = new Set(allBets.map((b) => b.player_id)).size;
  return {
    open: db.isMarketOpen(database),
    totalStaked,
    traders,
    betCount: allBets.length,
    questions,
  };
}

// One row per bet, for CSV export — the durable record after the closing bell.
export function betsForExport(database) {
  const players = new Map(db.getAllPlayers(database).map((p) => [p.id, p]));
  const questions = new Map(db.getQuestions(database).map((q) => [q.id, q]));
  return db.getAllBets(database).map((b) => {
    const q = questions.get(b.question_id);
    const res = q?.resolution;
    let outcome = 'unresolved';
    if (res === 'void') outcome = 'void/refunded';
    else if (res !== null && res !== undefined) outcome = Number(res) === b.option_index ? 'won' : 'lost';
    return {
      player: players.get(b.player_id)?.full_name ?? `#${b.player_id}`,
      questionId: b.question_id,
      question: q?.text ?? b.question_id,
      option: q?.options?.[b.option_index] ?? `#${b.option_index}`,
      amount: b.amount,
      lockedMultiplier: b.locked_multiplier,
      potentialPayout: payout(b.amount, b.locked_multiplier),
      outcome,
      lockedAt: b.created_at,
    };
  });
}
