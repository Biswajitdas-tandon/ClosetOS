// Zero-dependency HTTP server for YNG Polymarket.
//   - serves the single-page app from /public
//   - JSON API for join / market / bet-lock / projector / admin
//
// Run: node src/server.js   (or: npm start)   →  http://localhost:3000

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';

import { openDb, isMarketOpen, setMarketOpen, setResolution, getQuestion, getPlayerByName, getPlayerById, createPlayer } from './db.js';
import { lockBets, playerSummary, priceAllQuestions, leaderboard, projectorBoard, betsForExport, STAKE_MIN, STAKE_MAX, STAKE_STEP, MIN_QUESTIONS_FIRST_SUBMISSION } from './market.js';
import { STARTING_BANKROLL } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const PORT = Number(process.env.PORT || 3000);
const ORGANISER_CODE = process.env.ORGANISER_CODE || 'YNG2026';

const db = openDb();

// ---- helpers -----------------------------------------------------------

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 1_000_000) reject(new Error('Body too large'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

async function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = normalize(join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const buf = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(buf);
  } catch {
    // SPA fallback: unknown non-API path → index.html
    try {
      const buf = await readFile(join(PUBLIC_DIR, 'index.html'));
      res.writeHead(200, { 'Content-Type': MIME['.html'] });
      res.end(buf);
    } catch {
      res.writeHead(404).end('Not found');
    }
  }
}

function requireAdmin(body, res) {
  if ((body.organiserCode || '') !== ORGANISER_CODE) {
    sendJson(res, 403, { error: 'Invalid organiser code.' });
    return false;
  }
  return true;
}

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ---- API handlers ------------------------------------------------------

const api = {
  // Join or resume by full name. Optional organiser code unlocks admin.
  'POST /api/join': async (req, res, body) => {
    const fullName = String(body.fullName || '').trim().replace(/\s+/g, ' ');
    if (fullName.length < 2) return sendJson(res, 400, { error: 'Please enter your full name.' });
    let player = getPlayerByName(db, fullName);
    if (!player) player = createPlayer(db, fullName, new Date().toISOString());
    const isAdmin = (body.organiserCode || '') === ORGANISER_CODE;
    sendJson(res, 200, { playerId: player.id, fullName: player.full_name, isAdmin });
  },

  // Live market for a player: prices + their own bets + bankroll.
  'GET /api/market': (req, res, _b, url) => {
    const playerId = Number(url.searchParams.get('playerId'));
    const player = getPlayerById(db, playerId);
    if (!player) return sendJson(res, 404, { error: 'Unknown player.' });
    sendJson(res, 200, {
      open: isMarketOpen(db),
      config: { stakeMin: STAKE_MIN, stakeMax: STAKE_MAX, stakeStep: STAKE_STEP, minQuestions: MIN_QUESTIONS_FIRST_SUBMISSION, bankroll: STARTING_BANKROLL },
      player: playerSummary(db, player),
      questions: priceAllQuestions(db),
    });
  },

  // Lock a slip of bets (min 5 on first submission). Returns locked or requote.
  'POST /api/bet/lock': async (req, res, body) => {
    const playerId = Number(body.playerId);
    const result = lockBets(db, playerId, body.slip || body.bets || []);
    if (result.ok) return sendJson(res, 200, result);
    if (result.requote) return sendJson(res, 409, result);
    return sendJson(res, 400, result);
  },

  // Big-screen board.
  'GET /api/projector': (req, res) => sendJson(res, 200, projectorBoard(db)),

  // ---- admin (organiser code) ----
  'POST /api/admin/market': async (req, res, body) => {
    if (!requireAdmin(body, res)) return;
    setMarketOpen(db, !!body.open);
    sendJson(res, 200, { open: isMarketOpen(db) });
  },

  'POST /api/admin/resolve': async (req, res, body) => {
    if (!requireAdmin(body, res)) return;
    const q = getQuestion(db, body.questionId);
    if (!q) return sendJson(res, 404, { error: 'Unknown question.' });
    let resolution = body.resolution;
    if (resolution === 'void' || resolution === null) {
      setResolution(db, q.id, resolution);
    } else if (Number.isInteger(resolution) && resolution >= 0 && resolution < q.options.length) {
      setResolution(db, q.id, resolution);
    } else {
      return sendJson(res, 400, { error: 'Invalid resolution.' });
    }
    sendJson(res, 200, { questionId: q.id, resolution: body.resolution });
  },

  'GET /api/admin/leaderboard': (req, res, _b, url) => {
    if (url.searchParams.get('organiserCode') !== ORGANISER_CODE) return sendJson(res, 403, { error: 'Invalid organiser code.' });
    sendJson(res, 200, { open: isMarketOpen(db), leaderboard: leaderboard(db) });
  },

  'GET /api/admin/export.csv': (req, res, _b, url) => {
    if (url.searchParams.get('organiserCode') !== ORGANISER_CODE) {
      res.writeHead(403).end('Invalid organiser code.');
      return;
    }
    const rows = betsForExport(db);
    const header = ['player', 'question_id', 'question', 'option', 'amount', 'locked_multiplier', 'potential_payout', 'outcome', 'locked_at'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push([r.player, r.questionId, r.question, r.option, r.amount, r.lockedMultiplier, r.potentialPayout, r.outcome, r.lockedAt].map(csvEscape).join(','));
    }
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="yng-polymarket-bets.csv"`,
    });
    res.end(lines.join('\n'));
  },
};

// ---- request routing ---------------------------------------------------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const routeKey = `${req.method} ${url.pathname}`;

  if (url.pathname.startsWith('/api/')) {
    const handler = api[routeKey];
    if (!handler) return sendJson(res, 404, { error: 'Not found.' });
    try {
      const body = req.method === 'POST' ? await readBody(req) : {};
      await handler(req, res, body, url);
    } catch (err) {
      sendJson(res, 400, { error: err.message || 'Bad request.' });
    }
    return;
  }

  await serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`YNG Polymarket running → http://localhost:${PORT}`);
  console.log(`Organiser code: ${ORGANISER_CODE}  ·  Market is ${isMarketOpen(db) ? 'OPEN' : 'CLOSED'}`);
});
