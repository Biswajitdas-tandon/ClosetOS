// YNG Polymarket — single-page front end. Mobile-first; everyone uses a phone.
// Views: join · market · projector · admin. No build step, no framework.

const $ = (sel, el = document) => el.querySelector(sel);
const app = $('#app');
const rupee = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const money2 = (n) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

const store = {
  get session() { try { return JSON.parse(localStorage.getItem('yng.session') || 'null'); } catch { return null; } },
  set session(v) { v ? localStorage.setItem('yng.session', JSON.stringify(v)) : localStorage.removeItem('yng.session'); },
  get adminCode() { return localStorage.getItem('yng.adminCode') || ''; },
  set adminCode(v) { v ? localStorage.setItem('yng.adminCode', v) : localStorage.removeItem('yng.adminCode'); },
};

// slip: pending bets not yet locked. Map<questionId, {optionIndex, amount, displayedMultiplier}>
let slip = new Map();
let marketData = null;
let projectorTimer = null;

async function api(path, opts = {}) {
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* csv/etc */ }
  return { status: res.status, ok: res.ok, data };
}

function toast(msg, kind = '') {
  $('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ---- router ------------------------------------------------------------

function route() {
  if (projectorTimer) { clearInterval(projectorTimer); projectorTimer = null; }
  const hash = location.hash.replace('#', '') || '';
  if (hash === 'projector') return renderProjector();
  if (hash === 'admin') return renderAdmin();
  if (!store.session) return renderJoin();
  return renderMarket();
}
window.addEventListener('hashchange', route);

// ---- join --------------------------------------------------------------

function renderJoin() {
  slip = new Map();
  app.innerHTML = `
    <div class="join">
      <div>
        <h1>YNG Polymarket</h1>
        <div class="tag">Opening Night · 17 July 2026 · Luna Et Sol</div>
      </div>
      <div class="lead">
        Back your calls with <strong>YNG$ 10,000</strong>. All bets are public —
        that's what makes it a market. <em>Play money only.</em>
      </div>
      <div>
        <label class="field-label" for="name">Your full name</label>
        <input id="name" type="text" autocomplete="name" placeholder="e.g. Rahul Mehta" />
      </div>
      <details>
        <summary class="field-label" style="cursor:pointer">Organiser? Enter code</summary>
        <input id="code" type="password" placeholder="Organiser code" style="margin-top:8px" />
      </details>
      <div class="error" id="joinErr"></div>
      <button class="btn" id="joinBtn">Enter the market →</button>
      <div style="text-align:center"><a href="#projector">Open projector view →</a></div>
    </div>`;
  const submit = async () => {
    const fullName = $('#name').value.trim();
    const organiserCode = $('#code')?.value || '';
    if (fullName.length < 2) { $('#joinErr').textContent = 'Please enter your full name.'; return; }
    const { ok, data } = await api('/api/join', { method: 'POST', body: { fullName, organiserCode } });
    if (!ok) { $('#joinErr').textContent = data?.error || 'Could not join.'; return; }
    store.session = data;
    if (organiserCode) store.adminCode = organiserCode;
    location.hash = 'market';
    route();
  };
  $('#joinBtn').onclick = submit;
  $('#name').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}

// ---- market ------------------------------------------------------------

async function loadMarket() {
  const s = store.session;
  const { ok, data } = await api(`/api/market?playerId=${s.playerId}`);
  if (!ok) { store.session = null; return route(); }
  marketData = data;
  return data;
}

function myBetFor(qid) {
  return marketData.player.bets.find((b) => b.questionId === qid) || null;
}

function pendingRemaining() {
  const slipTotal = [...slip.values()].reduce((a, b) => a + b.amount, 0);
  return marketData.player.remaining - slipTotal;
}

async function renderMarket() {
  const data = marketData || (await loadMarket());
  if (!data) return;
  const { player, config, open } = data;
  const staked = player.staked + [...slip.values()].reduce((a, b) => a + b.amount, 0);
  const pct = Math.min(100, (staked / config.bankroll) * 100);

  app.innerHTML = `
    <div class="topbar"><div class="wrap">
      <div class="tabs">
        <button class="active">Market</button>
        <button data-nav="projector">Projector</button>
        <button data-nav="admin">Admin</button>
      </div>
      <div class="row">
        <div>
          <div class="name">${esc(player.fullName)}</div>
          <div class="market-state ${open ? 'open' : 'closed'}">● Market ${open ? 'open' : 'closed'}</div>
        </div>
        <div class="balance">
          <div class="muted" style="font-size:12px">bankroll left</div>
          <b>${rupee(player.remaining - [...slip.values()].reduce((a, b) => a + b.amount, 0))}</b>
        </div>
      </div>
      <div class="progress"><span style="width:${pct}%"></span></div>
    </div></div>
    <div class="wrap"><div class="cards" id="cards"></div></div>
    <div class="slipbar"><div class="wrap"><div class="inner" id="slipbar"></div></div></div>`;

  app.querySelectorAll('[data-nav]').forEach((b) => b.onclick = () => { location.hash = b.dataset.nav; });
  renderCards();
  renderSlipbar();
}

function renderCards() {
  const cards = $('#cards');
  const open = marketData.open;
  cards.innerHTML = marketData.questions.map((q) => {
    const mine = myBetFor(q.id);
    const pending = slip.get(q.id);
    const resolved = q.resolution !== null && q.resolution !== undefined;
    const options = q.options.map((o) => {
      let cls = 'opt';
      let badge = '';
      if (mine && mine.optionIndex === o.index) cls += ' mine';
      if (pending && pending.optionIndex === o.index) cls += ' pending';
      if (resolved) {
        if (q.resolution === 'void') { badge = `<span class="badge void">void</span>`; }
        else if (Number(q.resolution) === o.index) { cls += ' win'; badge = `<span class="badge locked">winner</span>`; }
        else { cls += ' lose'; }
      }
      const lockedMult = (mine && mine.optionIndex === o.index) ? mine.lockedMultiplier
        : (pending && pending.optionIndex === o.index) ? pending.displayedMultiplier
        : o.multiplier;
      const tapAttr = (!open || mine || resolved) ? '' : `data-q="${q.id}" data-o="${o.index}" data-m="${o.multiplier}"`;
      return `
        <div class="${cls}" ${tapAttr}>
          <span class="fill" style="width:${o.sharePct}%"></span>
          <span class="lab">${esc(o.label)}</span>
          ${badge || `<span class="stat"><span class="mult">${lockedMult.toFixed(2)}×</span> <span class="pct">${o.sharePct.toFixed(0)}%</span></span>`}
        </div>`;
    }).join('');

    const myLine = mine
      ? `<div class="myline">✓ Locked: ${esc(q.options[mine.optionIndex])} at ${mine.lockedMultiplier.toFixed(2)}× → pays ${rupee(mine.potentialPayout)}</div>`
      : '';

    return `
      <div class="card" data-card="${q.id}">
        <div class="qhead">
          <span class="chip ${q.category === 'YNG' ? 'yng' : 'world'}">${q.category}</span>
        </div>
        <div class="qtext">${esc(q.text)}</div>
        <div class="judged">Judged by: ${esc(q.judgedBy)}</div>
        ${options}
        ${myLine}
        <div class="betbox hidden" id="bet-${q.id}"></div>
      </div>`;
  }).join('');

  cards.querySelectorAll('.opt[data-q]').forEach((el) => {
    el.onclick = () => openBetBox(el.dataset.q, Number(el.dataset.o), Number(el.dataset.m));
  });
}

function openBetBox(qid, optionIndex, multiplier) {
  const q = marketData.questions.find((x) => x.id === qid);
  const cfg = marketData.config;
  const existing = slip.get(qid);
  let amount = existing ? existing.amount : cfg.stakeMin;
  const box = $(`#bet-${qid}`);

  const draw = () => {
    const payoutV = amount * multiplier;
    box.innerHTML = `
      <div class="muted" style="font-size:13px">Staking on <b style="color:var(--text)">${esc(q.options[optionIndex].label)}</b> @ ${multiplier.toFixed(2)}×</div>
      <div class="stepper" style="margin-top:8px">
        <button data-step="-1">−</button>
        <div class="amt">${rupee(amount)}</div>
        <button data-step="1">+</button>
      </div>
      <div class="preview">
        If <b>${esc(q.options[optionIndex].label)}</b> happens → you get back
        <b>${rupee(payoutV)}</b> (${multiplier.toFixed(2)}× your money, locked now).
        If not, you lose the ${rupee(amount)}.
      </div>
      <div class="actions">
        ${existing ? `<button class="btn ghost" data-act="remove">Remove</button>` : ''}
        <button class="btn" data-act="add">${existing ? 'Update slip' : 'Add to slip'}</button>
      </div>`;
    box.querySelectorAll('[data-step]').forEach((b) => b.onclick = () => {
      const next = amount + Number(b.dataset.step) * cfg.stakeStep;
      const cap = Math.min(cfg.stakeMax, amount + pendingRemainingForEdit(qid, amount));
      amount = Math.max(cfg.stakeMin, Math.min(cap, next));
      draw();
    });
    box.querySelector('[data-act="add"]').onclick = () => {
      if (amount > marketData.player.remaining - slipTotalExcluding(qid)) { toast('That exceeds your bankroll.', 'err'); return; }
      slip.set(qid, { optionIndex, amount, displayedMultiplier: multiplier });
      box.classList.add('hidden');
      renderMarket();
    };
    box.querySelector('[data-act="remove"]')?.addEventListener('click', () => {
      slip.delete(qid); box.classList.add('hidden'); renderMarket();
    });
  };
  // collapse any other open boxes
  document.querySelectorAll('.betbox').forEach((b) => b.id !== `bet-${qid}` && b.classList.add('hidden'));
  box.classList.toggle('hidden');
  if (!box.classList.contains('hidden')) draw();
}

function slipTotalExcluding(qid) {
  return [...slip.entries()].filter(([k]) => k !== qid).reduce((a, [, v]) => a + v.amount, 0);
}
function pendingRemainingForEdit(qid, current) {
  return marketData.player.remaining - slipTotalExcluding(qid) - current;
}

function renderSlipbar() {
  const bar = $('#slipbar');
  const cfg = marketData.config;
  const n = slip.size;
  const total = [...slip.values()].reduce((a, b) => a + b.amount, 0);
  const firstSubmission = marketData.player.betCount === 0;
  const need = firstSubmission ? Math.max(0, cfg.minQuestions - n) : 0;
  const canLock = marketData.open && n > 0 && need === 0;

  let meta;
  if (n === 0) {
    meta = firstSubmission
      ? `<span class="count-warn">Pick ${cfg.minQuestions} questions to start</span>`
      : `Tap an option to add a bet`;
  } else if (need > 0) {
    meta = `<b>${n}</b> on slip · <span class="count-warn">pick ${need} more to unlock</span>`;
  } else {
    meta = `<b>${n}</b> bet${n > 1 ? 's' : ''} on slip · ${rupee(total)} staked`;
  }
  bar.innerHTML = `
    <div class="meta">${meta}</div>
    <button class="btn" id="lockBtn" ${canLock ? '' : 'disabled'}>Lock In${n ? ` (${n})` : ''}</button>`;
  $('#lockBtn').onclick = lockSlip;
}

async function lockSlip() {
  const btn = $('#lockBtn');
  btn.disabled = true;
  const bets = [...slip.entries()].map(([questionId, v]) => ({
    questionId, optionIndex: v.optionIndex, amount: v.amount, displayedMultiplier: v.displayedMultiplier,
  }));
  const { status, data } = await api('/api/bet/lock', { method: 'POST', body: { playerId: store.session.playerId, slip: bets } });

  if (status === 200) {
    slip = new Map();
    await loadMarket();
    renderMarket();
    toast(`Locked ${data.locked.length} bet${data.locked.length > 1 ? 's' : ''}. Good luck!`, 'ok');
    return;
  }
  if (status === 409 && data.requote) {
    // Prices moved between tap and submit — update displayed prices, ask to re-confirm.
    for (const r of data.requote) {
      const s = slip.get(r.questionId);
      if (s) s.displayedMultiplier = r.newMultiplier;
    }
    await loadMarket();
    renderMarket();
    const first = data.requote[0];
    toast(`Price moved: ${first.optionLabel} now pays ${first.newMultiplier.toFixed(2)}×. Tap Lock In to confirm.`, 'err');
    return;
  }
  await loadMarket();
  renderMarket();
  toast(data?.error || 'Could not lock bets.', 'err');
}

// ---- projector ---------------------------------------------------------

async function renderProjector() {
  const paint = async () => {
    const { ok, data } = await api('/api/projector');
    if (!ok) return;
    app.innerHTML = `
      <div class="proj">
        <div class="proj-head">
          <h1>YNG Polymarket <span class="muted" style="font-size:18px">· live floor</span></h1>
          <span class="proj-banner ${data.open ? 'open' : 'closed'}">${data.open ? 'MARKET OPEN' : 'MARKET CLOSED'}</span>
        </div>
        <div class="proj-stats">
          <div><b>${rupee(data.totalStaked)}</b> staked</div>
          <div><b>${data.traders}</b> traders</div>
          <div><b>${data.betCount}</b> bets</div>
        </div>
        <div class="proj-grid">
          ${data.questions.map(projCard).join('')}
        </div>
        <div style="margin-top:22px"><a href="#market">← back to market</a></div>
      </div>`;
  };
  await paint();
  projectorTimer = setInterval(paint, 12000);
}

function projCard(q) {
  const resolved = q.resolution !== null && q.resolution !== undefined;
  return `
    <div class="proj-card">
      <span class="chip ${q.category === 'YNG' ? 'yng' : 'world'}">${q.category}</span>
      <div class="qt">${esc(q.text)}</div>
      ${q.options.map((o) => {
        const win = resolved && q.resolution !== 'void' && Number(q.resolution) === o.index;
        return `
        <div class="proj-opt">
          <div class="row"><span>${esc(o.label)}${win ? ' 🏆' : ''}</span><span class="m">${o.multiplier.toFixed(2)}× · ${o.sharePct.toFixed(0)}%</span></div>
          <div class="bar"><span style="width:${o.sharePct}%"></span></div>
        </div>`;
      }).join('')}
    </div>`;
}

// ---- admin -------------------------------------------------------------

async function renderAdmin() {
  let code = store.adminCode;
  if (!code) {
    app.innerHTML = `
      <div class="join">
        <h1>Admin</h1>
        <input id="ac" type="password" placeholder="Organiser code" />
        <div class="error" id="acErr"></div>
        <button class="btn" id="acBtn">Unlock</button>
        <div style="text-align:center"><a href="#market">← back</a></div>
      </div>`;
    $('#acBtn').onclick = async () => {
      const v = $('#ac').value.trim();
      const { ok } = await api(`/api/admin/leaderboard?organiserCode=${encodeURIComponent(v)}`);
      if (!ok) { $('#acErr').textContent = 'Invalid organiser code.'; return; }
      store.adminCode = v; renderAdmin();
    };
    return;
  }

  const lb = await api(`/api/admin/leaderboard?organiserCode=${encodeURIComponent(code)}`);
  if (!lb.ok) { store.adminCode = ''; return renderAdmin(); }
  const proj = await api('/api/projector');
  const open = lb.data.open;

  app.innerHTML = `
    <div class="wrap admin">
      <div class="tabs">
        <button data-nav="market">Market</button>
        <button data-nav="projector">Projector</button>
        <button class="active">Admin</button>
      </div>

      <h2>The closing bell</h2>
      <div class="panel bell">
        <div>Market is <b class="${open ? 'market-state open' : 'market-state closed'}">${open ? 'OPEN' : 'CLOSED'}</b></div>
        <button class="btn ${open ? 'danger' : ''}" id="bellBtn" style="width:auto">${open ? '🔔 Close market' : 'Open market'}</button>
      </div>

      <h2>Leaderboard</h2>
      <div class="panel">
        <table class="lb">
          <thead><tr><th>#</th><th>Trader</th><th class="num">Bets</th><th class="num">Staked</th><th class="num">Balance</th></tr></thead>
          <tbody>
            ${lb.data.leaderboard.map((r) => `
              <tr>
                <td class="${r.rank === 1 ? 'rank1' : ''}">${r.rank}</td>
                <td>${esc(r.fullName)}</td>
                <td class="num">${r.betCount}</td>
                <td class="num">${rupee(r.staked)}</td>
                <td class="num ${r.rank === 1 ? 'rank1' : ''}">${rupee(r.balance)}${r.allResolved ? '' : '*'}</td>
              </tr>`).join('') || `<tr><td colspan="5" class="muted">No traders yet.</td></tr>`}
          </tbody>
        </table>
        <div class="muted" style="font-size:12px;margin-top:8px">* provisional — includes unresolved bets as money at risk.</div>
      </div>

      <h2>Resolution</h2>
      <div class="panel" id="resolvePanel">
        ${proj.data.questions.map(resolveRow).join('')}
      </div>

      <h2>Backup</h2>
      <div class="panel">
        <a class="btn" href="/api/admin/export.csv?organiserCode=${encodeURIComponent(code)}" style="display:block;text-align:center;text-decoration:none">⬇ Export all bets (CSV)</a>
        <div class="muted" style="font-size:12px;margin-top:8px">The database is the system of record — export right after the closing bell.</div>
      </div>
      <div style="margin-top:16px"><a href="#" id="logoutAdmin">Forget organiser code on this device</a></div>
    </div>`;

  app.querySelectorAll('[data-nav]').forEach((b) => b.onclick = () => { location.hash = b.dataset.nav; });
  $('#bellBtn').onclick = async () => {
    await api('/api/admin/market', { method: 'POST', body: { organiserCode: code, open: !open } });
    renderAdmin();
  };
  $('#logoutAdmin').onclick = (e) => { e.preventDefault(); store.adminCode = ''; renderAdmin(); };
  app.querySelectorAll('[data-resolve]').forEach((b) => b.onclick = async () => {
    const qid = b.dataset.resolve;
    let resolution = b.dataset.val === 'void' ? 'void' : b.dataset.val === 'clear' ? null : Number(b.dataset.val);
    await api('/api/admin/resolve', { method: 'POST', body: { organiserCode: code, questionId: qid, resolution } });
    renderAdmin();
  });
}

function resolveRow(q) {
  const res = q.resolution;
  const isSet = res !== null && res !== undefined;
  return `
    <div class="resolve-q">
      <div style="font-weight:600">${esc(q.text)}</div>
      <div class="muted" style="font-size:12px">${esc(q.judgedBy)}</div>
      <div class="opts">
        ${q.options.map((o, i) => `
          <button data-resolve="${q.id}" data-val="${i}" class="${isSet && res !== 'void' && Number(res) === i ? 'chosen' : ''}">${esc(o.label)}</button>`).join('')}
        <button data-resolve="${q.id}" data-val="void" class="void ${res === 'void' ? 'chosen' : ''}">Void / refund</button>
        ${isSet ? `<button data-resolve="${q.id}" data-val="clear" class="void">Clear</button>` : ''}
      </div>
    </div>`;
}

route();
