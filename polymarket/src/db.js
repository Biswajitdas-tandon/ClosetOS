// Data layer: node:sqlite schema, seeding, and query helpers.
//
// The database is the system of record (outline §5) — not the screen. Storing
// `locked_multiplier` on each bet row is the whole trick: resolution is then
// pure arithmetic and disputes are impossible.

import { DatabaseSync } from 'node:sqlite';
import { QUESTIONS } from './questions.js';
import { DEFAULT_HOUSE_SEED, equalSeeds } from './odds.js';

export const STARTING_BANKROLL = 10000;

export function openDb(path = process.env.POLYMARKET_DB || 'polymarket.db') {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  migrate(db);
  seedQuestions(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      market_open INTEGER NOT NULL DEFAULT 0
    );
    INSERT OR IGNORE INTO state (id, market_open) VALUES (1, 0);

    CREATE TABLE IF NOT EXISTS questions (
      id           TEXT PRIMARY KEY,
      sort_order   INTEGER NOT NULL,
      category     TEXT NOT NULL,
      text         TEXT NOT NULL,
      options      TEXT NOT NULL,   -- JSON array of strings
      seeds        TEXT NOT NULL,   -- JSON array of numbers
      judged_by    TEXT NOT NULL,
      resolution   TEXT             -- NULL | option index (as text) | 'void'
    );

    CREATE TABLE IF NOT EXISTS players (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name  TEXT NOT NULL,
      joined_at  TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS players_name_ci
      ON players (lower(full_name));

    CREATE TABLE IF NOT EXISTS bets (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,  -- arrival order
      player_id         INTEGER NOT NULL REFERENCES players(id),
      question_id       TEXT NOT NULL REFERENCES questions(id),
      option_index      INTEGER NOT NULL,
      amount            INTEGER NOT NULL,
      locked_multiplier REAL NOT NULL,
      created_at        TEXT NOT NULL,
      UNIQUE (player_id, question_id)
    );
  `);
}

// Idempotent: inserts any missing questions, keeps existing ones (and any
// resolutions already recorded) untouched.
function seedQuestions(db) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO questions
      (id, sort_order, category, text, options, seeds, judged_by, resolution)
    VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
  `);
  QUESTIONS.forEach((q, i) => {
    const seeds = q.seeds ?? equalSeeds(q.options.length, DEFAULT_HOUSE_SEED);
    insert.run(
      q.id, i, q.category, q.text,
      JSON.stringify(q.options), JSON.stringify(seeds), q.judgedBy,
    );
  });
}

// ---- reads -------------------------------------------------------------

export function isMarketOpen(db) {
  return db.prepare('SELECT market_open FROM state WHERE id = 1').get().market_open === 1;
}

export function setMarketOpen(db, open) {
  db.prepare('UPDATE state SET market_open = ? WHERE id = 1').run(open ? 1 : 0);
}

export function getQuestions(db) {
  return db.prepare('SELECT * FROM questions ORDER BY sort_order').all().map(rowToQuestion);
}

export function getQuestion(db, id) {
  const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  return row ? rowToQuestion(row) : null;
}

function rowToQuestion(row) {
  return {
    id: row.id,
    sortOrder: row.sort_order,
    category: row.category,
    text: row.text,
    options: JSON.parse(row.options),
    seeds: JSON.parse(row.seeds),
    judgedBy: row.judged_by,
    resolution: row.resolution, // null | "<index>" | "void"
  };
}

export function setResolution(db, questionId, resolution) {
  // resolution: integer index, 'void', or null to clear.
  const value = resolution === null || resolution === undefined ? null : String(resolution);
  db.prepare('UPDATE questions SET resolution = ? WHERE id = ?').run(value, questionId);
}

export function getPlayerByName(db, fullName) {
  return db.prepare('SELECT * FROM players WHERE lower(full_name) = lower(?)').get(fullName) || null;
}

export function getPlayerById(db, id) {
  return db.prepare('SELECT * FROM players WHERE id = ?').get(id) || null;
}

export function createPlayer(db, fullName, nowIso) {
  const info = db.prepare('INSERT INTO players (full_name, joined_at) VALUES (?, ?)').run(fullName, nowIso);
  return getPlayerById(db, Number(info.lastInsertRowid));
}

export function getAllPlayers(db) {
  return db.prepare('SELECT * FROM players ORDER BY id').all();
}

export function getBetsForPlayer(db, playerId) {
  return db.prepare('SELECT * FROM bets WHERE player_id = ? ORDER BY id').all(playerId);
}

export function getAllBets(db) {
  return db.prepare('SELECT * FROM bets ORDER BY id').all();
}

// Sum of staked amounts per option for one question → array aligned to options.
export function stakedByOption(db, questionId, optionCount) {
  const rows = db
    .prepare('SELECT option_index, SUM(amount) AS total FROM bets WHERE question_id = ? GROUP BY option_index')
    .all(questionId);
  const out = new Array(optionCount).fill(0);
  for (const r of rows) out[r.option_index] = r.total;
  return out;
}

export function insertBet(db, { playerId, questionId, optionIndex, amount, lockedMultiplier, nowIso }) {
  db.prepare(`
    INSERT INTO bets (player_id, question_id, option_index, amount, locked_multiplier, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(playerId, questionId, optionIndex, amount, lockedMultiplier, nowIso);
}
