// Configurable exam simulation: no feedback until the end, then a full review.
import { esc, fmt, shuffle, levelTag, topicName, levelName, cardTags, diagramSVG, explain, optionOrder, optsClass, questionFigure, supportHTML,
  stepperHTML, wireStepper, fmtTime, fmtDate, LEVEL_ORDER } from './ui.js';
import { isCorrect, answerText, responseText } from './grading.js';

const COUNTS = [10, 20, 30, 40, 50];
const MINUTES = [0, 10, 15, 20, 30, 45, 60];
const PASS_MARKS = [60, 70, 75, 80, 85, 90];
const DEFAULTS = { count: 30, minutes: 30, pass: 80, levels: ['basic', 'intermediate', 'advanced'] };

let ctx = null;
let exam = null;       // active exam
let result = null;     // last finished exam
let confirmFinish = false;
let showAll = false;
let confirmQuit = false;
let ticker = null;

export function initExam(c) { ctx = c; }
export function examActive() { return !!exam; }

function settings() {
  const s = { ...DEFAULTS, ...(ctx.P.settings.exam || {}) };
  if (!Array.isArray(s.levels) || !s.levels.length) s.levels = DEFAULTS.levels.slice();
  return s;
}

function pool(levels) {
  return ctx.enabledCards().filter((c) => levels.includes(c.level));
}

export function renderExam() {
  if (exam && exam.endsAt && Date.now() >= exam.endsAt) finish(true);
  if (exam) return renderQuestion();
  if (result) return renderResult();
  return renderSetup();
}

/* ---------- setup ---------- */
function renderSetup() {
  const s = settings();
  const history = ctx.P.exams || [];
  ctx.app.innerHTML = `
  <div class="topbar"><span class="brand">Exam</span></div>
  <form class="panel stack" id="exam-form">
    <h2 class="h">Practice exam</h2>
    <p class="note">Questions are drawn at random from the levels you choose. You see no feedback until you finish; then you get your score and a review of every mistake with its source. Exams don't change your study schedule.</p>
    <fieldset class="field fs"><legend>Levels</legend>
      <div class="row">${ctx.manifest.levels.map((l) => `
        <label class="chip-check"><input type="checkbox" name="lvl" value="${l.id}" ${s.levels.includes(l.id) ? 'checked' : ''}> ${esc(l.name)}</label>`).join('')}
      </div>
    </fieldset>
    <div class="grid2">
      <label class="field"><span>Questions</span>
        <select id="ex-count">${COUNTS.map((n) => `<option value="${n}" ${s.count === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="field"><span>Time limit</span>
        <select id="ex-min">${MINUTES.map((m) => `<option value="${m}" ${s.minutes === m ? 'selected' : ''}>${m ? `${m} minutes` : 'No limit'}</option>`).join('')}</select></label>
      <label class="field"><span>Pass mark</span>
        <select id="ex-pass">${PASS_MARKS.map((p) => `<option value="${p}" ${s.pass === p ? 'selected' : ''}>${p}%</option>`).join('')}</select></label>
    </div>
    <p class="small" id="ex-avail" role="status"></p>
    <button class="btn" type="submit">Start exam</button>
  </form>
  ${history.length ? `<div class="panel">
    <div class="spread"><h2 class="h">Recent exams</h2><a class="small" href="#stats">All stats</a></div>
    ${historyTable(history.slice(-5).reverse())}
  </div>` : ''}`;

  const form = ctx.app.querySelector('#exam-form');
  const read = () => ({
    levels: [...form.querySelectorAll('input[name=lvl]:checked')].map((i) => i.value),
    count: +form.querySelector('#ex-count').value,
    minutes: +form.querySelector('#ex-min').value,
    pass: +form.querySelector('#ex-pass').value
  });
  const upd = () => {
    const cfg = read();
    const n = pool(cfg.levels).length;
    const avail = form.querySelector('#ex-avail');
    avail.textContent = !cfg.levels.length ? 'Choose at least one level.' :
      n < cfg.count ? `Only ${n} questions are available for these levels, so the exam will have ${n}.` : `${n} questions available; ${cfg.count} will be drawn at random.`;
    form.querySelector('button[type=submit]').disabled = !n;
  };
  form.addEventListener('change', () => { ctx.P.settings.exam = read(); ctx.save(); upd(); });
  upd();
  form.addEventListener('submit', (e) => { e.preventDefault(); start(read()); });
}

export function historyTable(rows) {
  return `<div class="tbl"><table>
    <thead><tr><th>Date</th><th class="n">Score</th><th>Result</th><th class="n">Right</th><th class="n">Time</th></tr></thead>
    <tbody>${rows.map((h) => `<tr>
      <td class="nw">${esc(fmtDate(h.date))}</td><td class="n">${h.pct}%</td>
      <td><span class="status-pill ${h.passed ? 'ok' : 'bad'}">${h.passed ? '✓ Pass' : '✕ Not yet'}</span></td>
      <td class="n">${h.correct} / ${h.total}</td><td class="n">${fmtTime(h.secs)}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

function start(cfg) {
  const cards = shuffle(pool(cfg.levels)).slice(0, cfg.count);
  if (!cards.length) return;
  confirmQuit = false;
  exam = {
    cfg,
    ids: cards.map((c) => c.id),
    orders: cards.map((c) => optionOrder(c)),
    answers: cards.map((c) => (c.format === 'multi' ? [] : null)),
    flags: cards.map(() => false),
    pos: 0,
    startedAt: Date.now(),
    endsAt: cfg.minutes ? Date.now() + cfg.minutes * 60000 : null
  };
  result = null; confirmFinish = false; showAll = false;
  startTicker();
  ctx.go('exam');
}

function startTicker() {
  clearInterval(ticker);
  ticker = setInterval(() => {
    if (!exam) { clearInterval(ticker); return; }
    if (exam.endsAt && Date.now() >= exam.endsAt) {
      finish(true);
      if (ctx.route() === 'exam') renderExam();
      return;
    }
    const el = document.getElementById('ex-timer');
    if (el) updateTimer(el);
  }, 1000);
}

function updateTimer(el) {
  if (!exam.endsAt) { el.textContent = fmtTime((Date.now() - exam.startedAt) / 1000); return; }
  const left = (exam.endsAt - Date.now()) / 1000;
  el.textContent = fmtTime(left);
  el.classList.toggle('low', left <= 60);
}

const answered = (a) => a !== null && a !== '' && !(Array.isArray(a) && !a.length);

/* ---------- question ---------- */
function renderQuestion() {
  const i = exam.pos, n = exam.ids.length;
  const c = ctx.byId[exam.ids[i]];
  const ans = exam.answers[i];
  const unanswered = exam.answers.filter((a) => !answered(a)).length;
  ctx.app.innerHTML = `
  <div class="topbar">
    <button class="icon" data-act="quit" aria-label="Leave the exam">✕</button>
    <span class="small">Question ${i + 1} of ${n}</span>
    <span class="timer" aria-label="${exam.endsAt ? 'Time left' : 'Time taken'}"><span id="ex-timer"></span></span>
  </div>
  <nav class="qgrid" aria-label="Questions">
    ${exam.ids.map((_, k) => `<button class="qcell ${k === i ? 'cur' : ''} ${answered(exam.answers[k]) ? 'done' : ''} ${exam.flags[k] ? 'flag' : ''}" data-goto="${k}" aria-label="Question ${k + 1}${answered(exam.answers[k]) ? ', answered' : ''}${exam.flags[k] ? ', flagged' : ''}" ${k === i ? 'aria-current="true"' : ''}>${k + 1}</button>`).join('')}
  </nav>
  ${confirmQuit ? `<div class="panel stack confirm" role="alertdialog" aria-label="Leave the exam?">
    <p class="note warn">Leave this exam? Your answers will be lost and the exam won't be saved.</p>
    <div class="row"><button class="btn danger" data-act="quit-yes">Leave the exam</button><button class="btn ghost" data-act="quit-no">Keep going</button></div>
  </div>` : ''}
  <article class="card">
    ${cardTags(c)}
    <div class="q">${fmt(c.q)}</div>
    ${diagramSVG(c.diagram)}${questionFigure(c)}
    ${body(c, ans)}
  </article>
  <div class="exam-nav">
    <button class="btn ghost" data-act="prev" ${i === 0 ? 'disabled' : ''}>← Previous</button>
    <button class="btn ghost ${exam.flags[i] ? 'flagged' : ''}" data-act="flag" aria-pressed="${exam.flags[i]}">${exam.flags[i] ? '⚑ Flagged' : '⚐ Flag'}</button>
    ${i < n - 1 ? '<button class="btn" data-act="next">Next →</button>' : '<button class="btn" data-act="finish">Finish</button>'}
  </div>
  ${confirmFinish ? `<div class="panel stack confirm">
    <p class="note warn">${unanswered ? `${unanswered} question${unanswered === 1 ? ' is' : 's are'} unanswered and will count as wrong.` : 'All questions answered.'} Finish the exam now?</p>
    <div class="row"><button class="btn" data-act="finish-yes">Finish and see my score</button><button class="btn ghost" data-act="finish-no">Keep going</button></div>
  </div>` : `<button class="btn ghost small-btn" data-act="finish">Finish exam${unanswered ? ` (${unanswered} unanswered)` : ''}</button>`}`;

  updateTimer(ctx.app.querySelector('#ex-timer'));
  const root = ctx.app;
  root.querySelector('[data-act="quit"]').addEventListener('click', () => { confirmQuit = true; renderQuestion(); window.scrollTo(0, 0); root.querySelector('[data-act="quit-no"]')?.focus(); });
  root.querySelector('[data-act="quit-no"]')?.addEventListener('click', () => { confirmQuit = false; renderQuestion(); });
  root.querySelector('[data-act="quit-yes"]')?.addEventListener('click', () => { clearInterval(ticker); exam = null; confirmQuit = false; ctx.go('exam'); });
  root.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => goTo(+b.dataset.goto)));
  root.querySelector('[data-act="prev"]').addEventListener('click', () => goTo(i - 1));
  root.querySelector('[data-act="next"]')?.addEventListener('click', () => goTo(i + 1));
  root.querySelector('[data-act="flag"]').addEventListener('click', () => { exam.flags[i] = !exam.flags[i]; renderQuestion(); });
  root.querySelectorAll('[data-act="finish"]').forEach((b) => b.addEventListener('click', () => { confirmFinish = true; renderQuestion(); root.querySelector('[data-act="finish-yes"]')?.focus(); }));
  root.querySelector('[data-act="finish-yes"]')?.addEventListener('click', () => { finish(false); renderExam(); window.scrollTo(0, 0); });
  root.querySelector('[data-act="finish-no"]')?.addEventListener('click', () => { confirmFinish = false; renderQuestion(); });
  root.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => { exam.answers[i] = +b.dataset.opt; renderQuestion(); }));
  root.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => toggle(+b.dataset.toggle)));
  const card = root.querySelector('.card');
  wireStepper(card, c, (v) => { exam.answers[i] = v; refreshGrid(); });
}

function body(c, ans) {
  if (c.format === 'number') return `<div class="numin">${stepperHTML(c, ans ?? '', false, 'ex-num')}</div><p class="small">Type a number or use − and +.</p>`;
  const keys = 'ABCDEF';
  const order = exam.orders[exam.pos];
  if (c.format === 'multi') {
    return `<p class="small multi-hint">Select every correct answer.</p><div class="opts" role="group" aria-label="Options: select all that apply">
      ${order.map((oi, k) => { const on = ans.includes(oi); return `<button class="opt multi ${on ? 'picked' : ''}" data-toggle="${oi}" aria-pressed="${on}"><span class="box" aria-hidden="true">${on ? '✓' : ''}</span><span class="k">${keys[k]}</span><span>${fmt(c.options[oi])}</span></button>`; }).join('')}
    </div>`;
  }
  return `<div class="opts ${optsClass(c)}" role="radiogroup" aria-label="Options">
    ${order.map((oi, k) => `<button class="opt ${ans === oi ? 'picked sel' : ''}" role="radio" aria-checked="${ans === oi}" data-opt="${oi}"><span class="k">${keys[k]}</span><span>${fmt(c.options[oi])}</span></button>`).join('')}
  </div>`;
}

function toggle(oi) {
  const a = exam.answers[exam.pos];
  const k = a.indexOf(oi);
  if (k >= 0) a.splice(k, 1); else a.push(oi);
  renderQuestion();
  ctx.app.querySelector(`[data-toggle="${oi}"]`)?.focus();
}

function refreshGrid() {
  const cell = ctx.app.querySelector(`.qcell[data-goto="${exam.pos}"]`);
  cell?.classList.toggle('done', answered(exam.answers[exam.pos]));
}

function goTo(k) {
  if (k < 0 || k >= exam.ids.length) return;
  exam.pos = k; confirmFinish = false;
  renderQuestion();
  window.scrollTo(0, 0);
}

/* ---------- finish + results ---------- */
function finish(timedOut) {
  if (!exam) return;
  clearInterval(ticker);
  const items = exam.ids.map((id, k) => {
    const c = ctx.byId[id];
    return { id, response: exam.answers[k], correct: isCorrect(c, exam.answers[k]) };
  });
  const correct = items.filter((x) => x.correct).length;
  const total = items.length;
  const pct = Math.round(100 * correct / total);
  const secs = Math.round(((timedOut && exam.endsAt ? exam.endsAt : Date.now()) - exam.startedAt) / 1000);
  result = { cfg: exam.cfg, items, correct, total, pct, passed: pct >= exam.cfg.pass, secs, timedOut, date: Date.now() };
  const P = ctx.P;
  P.exams = [...(P.exams || []), { date: result.date, pct, correct, total, passed: result.passed, pass: exam.cfg.pass, secs, levels: exam.cfg.levels, minutes: exam.cfg.minutes }].slice(-50);
  ctx.save();
  exam = null; confirmFinish = false;
}

function breakdown(items, key) {
  const agg = {};
  items.forEach((x) => {
    const c = ctx.byId[x.id];
    const k = c[key];
    (agg[k] ||= { right: 0, n: 0 }).n++;
    if (x.correct) agg[k].right++;
  });
  return Object.entries(agg).map(([k, v]) => ({ k, ...v, pct: Math.round(100 * v.right / v.n) }));
}

function renderResult() {
  const r = result;
  const wrong = r.items.filter((x) => !x.correct);
  const shown = showAll ? r.items : wrong;
  const byLevel = breakdown(r.items, 'level').sort((a, b) => LEVEL_ORDER[a.k] - LEVEL_ORDER[b.k]);
  const byTopic = breakdown(r.items, 'topic').sort((a, b) => a.pct - b.pct);
  ctx.app.innerHTML = `
  <div class="topbar"><span class="brand">Exam results</span><button class="icon" data-act="close" aria-label="Close results and go home">✕</button></div>
  <p class="small result-date">${esc(fmtDate(r.date))}</p>
  <div class="panel result-head">
    <div class="spread">
      <div><div class="small">Your score</div><div class="big">${r.pct}%</div><div class="small">${r.correct} of ${r.total} correct · pass mark ${r.cfg.pass}%</div></div>
      <span class="status-pill big-pill ${r.passed ? 'ok' : 'bad'}">${r.passed ? '✓ Pass' : '✕ Not yet'}</span>
    </div>
    <p class="small" style="margin:10px 0 0">${r.timedOut ? `Time ran out after ${fmtTime(r.secs)}. Unanswered questions count as wrong.` : `Finished in ${fmtTime(r.secs)}${r.cfg.minutes ? ` of ${r.cfg.minutes}:00` : ''}.`}</p>
  </div>
  <div class="panel">
    <h2 class="h">By level</h2>
    <div class="stack">${byLevel.map((x) => barRow(levelTag(x.k), x)).join('')}</div>
    <h2 class="h" style="margin-top:16px">By topic, weakest first</h2>
    <div class="stack">${byTopic.map((x) => barRow(esc(topicName(x.k)), x)).join('')}</div>
  </div>
  <div class="row">
    <button class="btn" data-act="again">Retake with the same settings</button>
    <button class="btn ghost" data-act="new">Change settings</button>
    ${wrong.length ? `<button class="btn ghost" data-act="drill">Drill the ${wrong.length} I missed</button>` : ''}
  </div>
  <div class="panel">
    <div class="spread"><h2 class="h">${showAll ? 'All questions' : wrong.length ? 'Your mistakes' : 'No mistakes'}</h2>
      <button class="linkbtn" data-act="toggle-all">${showAll ? 'Show mistakes only' : 'Show all questions'}</button></div>
    ${shown.length ? shown.map((x) => {
      const c = ctx.byId[x.id];
      const k = r.items.indexOf(x) + 1;
      return `<details class="review ${x.correct ? 'ok' : 'bad'}" ${x.correct ? '' : 'open'}>
        <summary><span class="rv-n">${k}</span><span class="rv-q">${fmt(c.q)}</span><span class="rv-mark" aria-label="${x.correct ? 'correct' : 'wrong'}">${x.correct ? '✓' : '✕'}</span></summary>
        <div class="rv-body">
          ${diagramSVG(c.diagram)}${questionFigure(c)}
          <dl class="callbox">
            <dt>Your answer</dt><dd>${fmt(responseText(c, x.response))}</dd>
            <dt>Correct answer</dt><dd>${fmt(answerText(c))}</dd>
          </dl>
          ${explain(c)}
        </div>
      </details>`;
    }).join('') : '<p class="note">Every answer was right. Try a harder level or a shorter time limit.</p>'}
  </div>
  <div class="row exits"><button class="btn ghost" data-act="new2">New exam</button><button class="btn" data-act="done">Done: back to Home</button></div>
  ${supportHTML('exam')}`;
  const root = ctx.app;
  root.querySelector('[data-act="again"]').addEventListener('click', () => start(r.cfg));
  const done = () => { result = null; ctx.go('home'); };
  root.querySelector('[data-act="close"]').addEventListener('click', done);
  root.querySelector('[data-act="done"]').addEventListener('click', done);
  root.querySelector('[data-act="new"]').addEventListener('click', () => { result = null; renderExam(); });
  root.querySelector('[data-act="drill"]')?.addEventListener('click', () => ctx.startSession('drill', { ids: wrong.map((x) => x.id) }));
  root.querySelector('[data-act="new2"]').addEventListener('click', () => { result = null; renderExam(); window.scrollTo(0, 0); });
  root.querySelector('[data-act="toggle-all"]').addEventListener('click', () => { showAll = !showAll; renderResult(); });
}

function barRow(label, x) {
  return `<div class="brow"><span class="brow-l">${label}</span><span class="meter ${x.pct < 60 ? 'o' : ''}"><i style="width:${x.pct}%"></i></span><span class="small num">${x.right}/${x.n}</span></div>`;
}

/* ---------- keyboard ---------- */
export function examKey(e) {
  if (!exam || e.metaKey || e.ctrlKey || e.altKey) return;
  const typing = e.target.matches('input, textarea, select');
  const c = ctx.byId[exam.ids[exam.pos]];
  if (!typing && c.options) {
    const n = /^[1-6]$/.test(e.key) ? +e.key - 1 : 'abcdef'.indexOf(e.key.toLowerCase());
    const order = exam.orders[exam.pos];
    if (n >= 0 && n < order.length) {
      e.preventDefault();
      if (c.format === 'multi') toggle(order[n]); else { exam.answers[exam.pos] = order[n]; renderQuestion(); }
      return;
    }
  }
  if (e.key === 'ArrowRight' && !typing) { e.preventDefault(); goTo(exam.pos + 1); }
  else if (e.key === 'ArrowLeft' && !typing) { e.preventDefault(); goTo(exam.pos - 1); }
  else if (e.key === 'Enter' && !e.target.matches('button, a')) { e.preventDefault(); goTo(exam.pos + 1); }
}
