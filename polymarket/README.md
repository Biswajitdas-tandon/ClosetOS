# YNG Polymarket

A play-money prediction market for the YNG year. Every member gets a bankroll
of **YNG$ 10,000** and stakes it across the question bank. Correct predictions
pay out; wrong ones lose the stake. Top balances at the June closing party win.

Built from the *YNG Polymarket — Build Outline*. **Play money only.**

## Run it

Needs **Node 22.5+** (uses the built-in `node:sqlite` and `http` — no npm
install, zero dependencies).

```bash
cd polymarket
npm start          # → http://localhost:3000
```

Environment variables (all optional):

| var | default | meaning |
|-----|---------|---------|
| `PORT` | `3000` | HTTP port |
| `ORGANISER_CODE` | `YNG2026` | unlocks the admin screen |
| `POLYMARKET_DB` | `polymarket.db` | SQLite file (the system of record) |

At a venue, run it on one laptop and point phones at `http://<laptop-ip>:3000`
via the QR code, or deploy to any Node host.

## Screens

- **Join** (`/`) — full name + hidden organiser code. Rejoin by name to resume.
- **Market** (`#market`) — the main mobile screen: live prices, tap-to-bet
  stepper, plain-language preview, and a slip you Lock In.
- **Projector** (`#projector`) — auto-refreshing big-screen floor for the venue
  (`MARKET OPEN/CLOSED`, live bars, total staked, trader count). No login.
- **Admin** (`#admin`) — organiser code gates the closing bell, live
  leaderboard, per-question resolution (incl. void/refund), and CSV export.

## The mechanic — locked dynamic odds

Each option carries a virtual **house seed** (₹1,000, never paid out) that sets
opening prices and smooths early swings:

```
optionPool[i] = seed[i] + (total staked on option i)
totalPool     = sum(optionPool)
multiplier[i] = totalPool / optionPool[i]      (rounded to 2 dp)
share[i]      = optionPool[i] / totalPool        (the on-screen "%")
```

A yes/no question opens at **2.0×** both sides, a 4-option at **4.0×** each, a
10-option at **10.0×** each. When you confirm a bet you **lock the price shown
before your own stake is added** ("the number you see is the number you get").
Your stake then moves the market for everyone after you. Early, contrarian bets
get the best prices — that's the game.

**Payout = stake × locked multiplier.** The locked multiplier is stamped onto
the bet row, so resolution is pure arithmetic and disputes are impossible.

> **Note on the outline's worked example.** The doc's illustration ("after a
> ₹2,000 YES bet the next visitor sees YES 1.67× / NO 2.5×, pools 3000/2000
> total 5000") is an arithmetic slip: a single ₹2,000 bet over equal ₹1,000
> seeds gives pools 3000/1000 (total 4000), which the **stated formula** turns
> into YES **1.33×** / NO **4.0×**. This build implements the stated formula,
> which is the internally consistent one and reproduces every "opens at N×"
> figure exactly (see `test/odds.test.js`).

## Rules the app physically enforces (server-side)

1. Bankroll YNG$ 10,000, **no top-ups**; a slip can't exceed the remaining balance.
2. Per-question stake **₹500–₹3,000 in steps of ₹500** (hard-clamped).
3. **Minimum 5 questions** before the first Lock In; after that, add one at a time.
4. **One bet per question per member, final once locked** — no edits, no cancels.
5. **Market hours** — bets are rejected at submission time when the market is closed
   (the closing-bell race), not just hidden in the UI.
6. Identification by **full name**, one entry per member.

## Concurrency & re-quote

Bets on the same question are processed in **arrival order** (`node:sqlite` is
synchronous and Node never interleaves synchronous code, so each lock reads the
price produced by all bets confirmed before it). The client sends the price it
displayed; if the market moved in between, the server returns a **409 re-quote**
with the new price and locks nothing — nobody ever gets a price they didn't see.

## Data model

```
state:     { market_open }
questions: { id, category, text, options[], seeds[], judged_by, resolution }
players:   { id, full_name (unique, case-insensitive), joined_at }
bets:      { id (arrival order), player_id, question_id, option_index,
             amount, locked_multiplier, created_at, UNIQUE(player, question) }
```

The question bank lives in `src/questions.js` (hardcoded config, ~14 questions,
each with a named resolution source and date). Edit it before you freeze the
list; `(TBD)` options are placeholders to lock in nearer the party.

## Layout

```
polymarket/
  src/
    odds.js        pure locked-odds formula (unit-tested)
    questions.js   the question bank
    db.js          node:sqlite schema, seeding, queries
    market.js      pricing, the bet-locking transaction, leaderboard/CSV
    server.js      zero-dependency HTTP server + JSON API
  public/          the single-page app (index.html, styles.css, app.js)
  test/            node:test odds tests
```

## Tests

```bash
npm test           # odds engine (worked examples from the outline)
```

The API was verified end-to-end (join → 5-question slip → lock → re-quote →
close → resolve → void → CSV) — all rules enforced, all maths checked.

## Night-of / backup

The **database is the system of record, not the screen.** Hit *Export all bets
(CSV)* from the admin screen right after the closing bell so June doesn't depend
on the app still running 11 months later.
