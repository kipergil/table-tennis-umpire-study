// Doubles serving-order trainer: work out who serves and who receives next.
import { esc } from './ui.js';
import { makeQuestion, PAIRS, pairOf } from './doubles.js';

let ctx = null;
let q = null;
let pick = { server: null, receiver: null };
let checked = null;     // null | true | false
let showSteps = false;

export function initTrainer(c) { ctx = c; }

const pairName = (i) => PAIRS[i].join('/');

function newQuestion() {
  q = makeQuestion();
  pick = { server: null, receiver: null };
  checked = null;
  showSteps = false;
}

function stats() { return (ctx.P.trainer ||= { right: 0, wrong: 0, streak: 0, best: 0 }); }

export function renderTrainer() {
  if (!q) newQuestion();
  const s = stats();
  const sp = q.gameServingPair, rp = 1 - sp;
  const scoreLine = `${pairName(sp)} <b>${q.a}</b> – <b>${q.b}</b> ${pairName(rp)}`;
  let deciding = '';
  if (q.deciding) {
    deciding = q.switchAt !== null
      ? `This is the deciding game. Ends were changed when ${pairName(q.leader === 0 ? sp : rp)} reached 5 points first, at ${q.leader === 0 ? `5–${q.switchAt - 5}` : `${q.switchAt - 5}–5`}.`
      : 'This is the deciding game. Neither pair has reached 5 points yet.';
  }
  const chip = (p) => {
    const role = pick.server === p ? 'Server' : pick.receiver === p ? 'Receiver' : '';
    let cls = role ? (role === 'Server' ? 'is-s' : 'is-r') : '';
    if (checked !== null) {
      if (p === q.server) cls += ' ans-s'; if (p === q.receiver) cls += ' ans-r';
    }
    return `<button class="pchip ${cls}" data-p="${p}" ${checked !== null ? 'disabled' : ''} aria-label="Player ${p}${role ? `, chosen as ${role.toLowerCase()}` : ''}">
      <span class="pname">${p}</span><span class="prole">${role || '&nbsp;'}</span></button>`;
  };
  ctx.app.innerHTML = `
  <div class="topbar"><a class="icon" href="#study" aria-label="Back to Study">←</a><span class="brand">Doubles order</span><span class="small">${s.streak ? `${s.streak} in a row` : ''}</span></div>
  <div class="card">
    <div class="row"><span class="tag a">Advanced</span><span class="tag">Serving order</span><span class="tag fmt-scenario">Trainer</span></div>
    <div class="situation-box">
      <p>Doubles, best of ${q.bestOf} games. In game 1, <b>${q.first.server}</b> served first to <b>${q.first.receiver}</b>.</p>
      ${q.game > 1 ? `<p>We are in game ${q.game}. ${pairName(sp)} serve first in this game and chose <b>${q.firstServers[q.game]}</b> to serve first.</p>` : '<p>We are in game 1.</p>'}
      ${deciding ? `<p>${deciding}</p>` : ''}
      <p class="score-line">Score: ${scoreLine}</p>
    </div>
    <p class="q">Who serves the next point, and who receives?</p>
    <p class="small">${checked !== null ? '' : !pick.server ? 'Tap the server.' : !pick.receiver ? 'Now tap the receiver.' : 'Check your answer, or tap a player to change.'}</p>
    <div class="teams">
      <div class="team"><span class="small">${pairName(0)}</span><div class="row">${PAIRS[0].map(chip).join('')}</div></div>
      <div class="team"><span class="small">${pairName(1)}</span><div class="row">${PAIRS[1].map(chip).join('')}</div></div>
    </div>
    ${checked === null ? `<div class="row"><button class="btn" data-act="check" ${pick.server && pick.receiver ? '' : 'disabled'}>Check answer</button><button class="btn ghost" data-act="clear">Clear</button></div>` : feedback()}
  </div>
  ${checked !== null ? '<button class="btn" data-act="next">Next situation</button>' : ''}
  <div class="panel">
    <h2 class="h">How to work it out</h2>
    <ol class="howto">
      <li>Game 1 sets the rotation: server → receiver → server's partner → receiver's partner → back to the server. Service changes every 2 points, and every point from 10–10.</li>
      <li>In each later game, the pair that received first now serves first. Their first receiver is <b>the player who served to the chosen server in the previous game</b>.</li>
      <li>In the deciding game, when one pair first reaches 5, ends change and <b>the pair due to receive next swaps its receiving order</b>.</li>
    </ol>
    <p class="small">Score so far: ${s.right} right, ${s.wrong} wrong${s.best ? `, best run ${s.best}` : ''}. Sources: Law 2.13.3–2.13.7, HMO 14.1.</p>
  </div>`;

  const root = ctx.app;
  root.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.p)));
  root.querySelector('[data-act="check"]')?.addEventListener('click', check);
  root.querySelector('[data-act="clear"]')?.addEventListener('click', () => { pick = { server: null, receiver: null }; renderTrainer(); });
  root.querySelector('[data-act="next"]')?.addEventListener('click', () => { newQuestion(); renderTrainer(); window.scrollTo(0, 0); });
  root.querySelector('[data-act="steps"]')?.addEventListener('click', () => { showSteps = !showSteps; renderTrainer(); });
}

function choose(p) {
  if (checked !== null) return;
  if (pick.server === p) pick.server = null;
  else if (pick.receiver === p) pick.receiver = null;
  else if (!pick.server) pick.server = p;
  else if (!pick.receiver) pick.receiver = p;
  else { pick = { server: p, receiver: null }; }
  renderTrainer();
}

function check() {
  if (!pick.server || !pick.receiver) return;
  checked = pick.server === q.server && pick.receiver === q.receiver;
  const s = stats();
  if (checked) { s.right++; s.streak++; s.best = Math.max(s.best, s.streak); } else { s.wrong++; s.streak = 0; }
  ctx.save();
  showSteps = !checked;
  renderTrainer();
  ctx.app.querySelector('[data-act="next"]')?.focus();
}

function feedback() {
  const wrongPair = pick.server && pick.receiver && pairOf(pick.server) === pairOf(pick.receiver);
  const head = checked ? `Correct: ${q.server} serves to ${q.receiver}.` : `Not quite. ${q.server} serves to ${q.receiver}.`;
  const tip = checked ? '' : wrongPair ? '<p class="small">The server and receiver are always on opposite pairs.</p>' : '';
  const steps = q.steps.map((st) => `<li><span class="num">${st.t === 0 ? '0–0' : `after ${st.t} point${st.t === 1 ? '' : 's'}`}</span>: <b>${st.server}</b> serves to <b>${st.receiver}</b>${st.note ? ` <span class="small">(${esc(st.note)})</span>` : ''}</li>`).join('');
  return `<div class="fb ${checked ? '' : 'bad'}">
    <b>${head}</b>${tip}
    ${q.game > 1 ? `<p class="small">Game ${q.game}: ${q.firstServers[q.game]} serves first, so the first receiver is the player who served to ${q.firstServers[q.game]} in game ${q.game - 1}. The rotation this game started ${q.cycle.join(' → ')} → ${q.cycle[0]}.</p>` : `<p class="small">Rotation: ${q.cycle.join(' → ')} → ${q.cycle[0]}.</p>`}
    <button class="linkbtn" data-act="steps" aria-expanded="${showSteps}">${showSteps ? 'Hide' : 'Show'} every change of service this game</button>
    ${showSteps ? `<ol class="steps">${steps}</ol>` : ''}
  </div>`;
}

