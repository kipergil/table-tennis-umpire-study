import { schedule, previewLabel, isLearned, endOfDay, dayKey, formatWait, DAY } from './scheduler.js';
import { loadProgress, saveProgress, normalise, exportJSON, defaultProgress } from './storage.js';
import { setManifest, esc, fmt, shuffle, levelTag, topicName, cardTags, refsHTML, explain, diagramSVG,
  optionOrder, stepperHTML, wireStepper, optsClass, questionFigure, supportHTML, FORMAT_NAMES, LEVEL_ORDER } from './ui.js';
import { answerText, checkNumber, isCorrect, expandCard } from './grading.js';
import { initExam, renderExam, examKey, examActive } from './exam.js';
import { initTrainer, renderTrainer } from './trainer.js';
import { initStats, renderStats } from './stats.js';
import { initHelp, renderHelp } from './help.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');

let manifest = null;
let allCards = [];
let byId = {};
let P = loadProgress();
let session = null;               // active study session
let lastSummary = null;           // summary of the session just finished
const lib = { q: '', level: '', topic: '', status: '', format: '' };
let resetArmed = false;

const GRADES = ['Again', 'Hard', 'Good', 'Easy'];
const today = () => (P.days[dayKey()] ||= { reviews: 0, correct: 0, fresh: 0 });
const save = () => saveProgress(P);

// Shared context for the view modules. P is read through a getter because restore/reset replace it.
const ctx = {
  app,
  get P() { return P; },
  get manifest() { return manifest; },
  get byId() { return byId; },
  get prevRoute() { return prevRoute; },
  save, enabledCards, go, route, startSession
};

function enabledCards() {
  return allCards.filter((c) => c.pack !== 'para' || P.settings.para);
}

function newLeftToday() {
  return Math.max(0, (P.settings.newPerDay ?? 10) - (P.days[dayKey()]?.fresh || 0));
}

function dueCards(pool = enabledCards()) {
  const eod = endOfDay();
  return pool.filter((c) => P.cards[c.id] && P.cards[c.id].due <= eod);
}

function newCards(pool = enabledCards()) {
  // New cards in level order, topics mixed within a level.
  const fresh = pool.filter((c) => !P.cards[c.id]);
  const groups = {};
  fresh.forEach((c) => (groups[c.level] ||= []).push(c));
  return Object.keys(groups)
    .sort((a, b) => (LEVEL_ORDER[a] ?? 9) - (LEVEL_ORDER[b] ?? 9))
    .flatMap((lvl) => shuffle(groups[lvl]));
}

function streak() {
  let n = 0;
  let t = Date.now();
  if (!(P.days[dayKey(t)]?.reviews > 0)) t -= DAY;   // today not studied yet: count from yesterday
  while (P.days[dayKey(t)]?.reviews > 0) { n++; t -= DAY; }
  return n;
}

function levelStats() {
  const pool = enabledCards();
  return manifest.levels.map((l) => {
    const cs = pool.filter((c) => c.level === l.id);
    const learned = cs.filter((c) => isLearned(P.cards[c.id])).length;
    return { ...l, total: cs.length, learned };
  });
}

function weakestTopics() {
  const agg = {};
  enabledCards().forEach((c) => {
    const s = P.cards[c.id];
    if (!s) return;
    const t = (agg[c.topic] ||= { right: 0, wrong: 0 });
    t.right += s.right || 0;
    t.wrong += s.wrong || 0;
  });
  return Object.entries(agg)
    .map(([id, v]) => ({ id, n: v.right + v.wrong, acc: v.right / Math.max(1, v.right + v.wrong) }))
    .filter((t) => t.n >= 3)
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 3);
}

/* ---------- routing ---------- */
const VIEWS = { home: renderHome, study: renderStudy, exam: renderExam, trainer: renderTrainer, library: renderLibrary, stats: renderStats, more: renderMore, help: renderHelp };
const NAV_FOR = { trainer: 'study' };

function route() {
  const name = location.hash.slice(1);
  return VIEWS[name] ? name : 'home';
}

// Where the user was before the current page (for "Back" buttons).
let lastRoute = 'home', prevRoute = 'home';
const PLACE = { home: 'Home', study: 'Study', exam: 'Exam', library: 'Library', stats: 'Stats', more: 'More', trainer: 'Trainer', help: 'How to use' };

function render() {
  const r = route();
  if (r !== lastRoute) { prevRoute = lastRoute; lastRoute = r; }
  // A finished session's summary belongs to the Study page; leaving Study clears it.
  if (r !== 'study') lastSummary = null;
  const tab = NAV_FOR[r] || r;
  nav.querySelectorAll('a').forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === `#${tab}` ? 'page' : 'false'));
  // Focus mode: hide the menu during a study session or an exam.
  document.body.classList.toggle('in-session', (r === 'study' && !!session) || (r === 'exam' && examActive()));
  VIEWS[r]();
}

// Navigate and redraw immediately (no stale frame); the hashchange this causes is skipped.
let skipHashChange = false;
function go(name) {
  if (location.hash !== `#${name}`) { skipHashChange = true; location.hash = name; }
  render();
  window.scrollTo(0, 0);
}
function onHashChange() {
  if (skipHashChange) { skipHashChange = false; return; }
  render();
}

/* ---------- home ---------- */
function renderHome() {
  const pool = enabledCards();
  const due = dueCards(pool).length;
  const fresh = Math.min(newLeftToday(), newCards(pool).length);
  const levels = levelStats();
  const rec = levels.find((l) => l.total > 0 && l.learned / l.total < 0.8);
  const weak = weakestTopics();
  const st = streak();
  const work = due + fresh;
  const mins = Math.max(1, Math.round(work * 20 / 60));
  const lastExam = (P.exams || []).at(-1);

  app.innerHTML = `
  <div class="topbar"><span class="brand">Love<em>-</em>All</span><span class="small">${st ? `${st}-day streak` : 'Start a streak today'}</span></div>
  ${P.settings.welcomed ? '' : `<div class="panel welcome">
    <h2 class="h">Welcome to Love-All</h2>
    <p class="note">Learn the table tennis rules an umpire needs with short daily reviews, practice exams and a doubles serving-order trainer. Take two minutes to see how it works.</p>
    <div class="row"><a class="btn" href="#help" data-act="welcome-help">How to use</a><button class="btn ghost" data-act="welcome-close">Got it, start studying</button></div>
  </div>`}
  <div class="panel">
    <div class="spread">
      <div><div class="small">Due today</div><div class="big">${due}</div></div>
      <div class="right"><div class="small">New available</div><div class="big accent">${fresh}</div></div>
    </div>
    <div class="stack" style="margin-top:14px">
      ${work ? `<button class="btn" data-act="review">Start review · about ${mins} min</button>` :
      `<p class="note">You're all caught up for today. Come back tomorrow, or drill any topic without affecting your schedule.</p>`}
      ${fresh && due ? `<button class="btn ghost" data-act="learn">Learn ${fresh} new cards only</button>` : ''}
      <a class="btn ghost" href="#study">Drill a level or topic</a>
    </div>
  </div>
  <div class="panel">
    <div class="spread"><h2 class="h">Levels</h2><span class="small">learned / total</span></div>
    <div class="stack">
    ${levels.map((l) => `
      <div>
        <div class="spread small">
          <span class="row">${levelTag(l.id)}${rec && rec.id === l.id ? '<span class="tag rec">Recommended next</span>' : ''}</span>
          <span class="num">${l.learned} / ${l.total}</span>
        </div>
        <div class="meter ${l.id === 'intermediate' ? 'o' : ''}"><i style="width:${l.total ? Math.round(100 * l.learned / l.total) : 0}%"></i></div>
      </div>`).join('')}
    </div>
    <p class="small" style="margin:10px 0 0">A card counts as learned once you remember it a week or more after studying it.</p>
  </div>
  <div class="tools">
    <a class="panel tool" href="#exam"><b>Practice exam</b><span class="small">${lastExam ? `Last: ${lastExam.pct}% ${lastExam.passed ? '· pass' : '· below pass mark'}` : 'Timed, with a full review'}</span></a>
    <a class="panel tool" href="#trainer"><b>Doubles order trainer</b><span class="small">Who serves, who receives?</span></a>
  </div>
  <div class="panel">
    <h2 class="h">Weakest topics</h2>
    ${weak.length ? `<div class="stack">${weak.map((t) => `
      <button class="topic" data-drill-topic="${esc(t.id)}" title="Drill this topic">
        <span>${esc(topicName(t.id))}</span>
        <span class="meter o"><i style="width:${Math.round(t.acc * 100)}%"></i></span>
        <span class="small num">${Math.round(t.acc * 100)}%</span>
      </button>`).join('')}</div>` :
      `<p class="note">Answer a few cards and your three weakest topics will appear here, ready to drill.</p>`}
  </div>
  ${supportHTML('home')}`;

  app.querySelector('[data-act="review"]')?.addEventListener('click', () => startSession('review'));
  app.querySelector('[data-act="learn"]')?.addEventListener('click', () => startSession('learn'));
  app.querySelectorAll('[data-drill-topic]').forEach((b) => b.addEventListener('click', () => startSession('drill', { topic: b.dataset.drillTopic })));
  const welcomed = () => { P.settings.welcomed = true; save(); };
  app.querySelector('[data-act="welcome-help"]')?.addEventListener('click', welcomed);
  app.querySelector('[data-act="welcome-close"]')?.addEventListener('click', () => { welcomed(); renderHome(); });
}

/* ---------- study: chooser + session ---------- */
function startSession(mode, filter = {}, from = null) {
  const origin = from || (route() === 'study' && lastSummary ? lastSummary.from : route());
  let ids;
  if (mode === 'drill') {
    if (filter.ids) ids = shuffle(filter.ids.filter((id) => byId[id]));
    else {
      const pool = enabledCards().filter((c) => (!filter.level || c.level === filter.level) && (!filter.topic || c.topic === filter.topic) && (!filter.format || c.format === filter.format));
      ids = shuffle(pool).slice(0, filter.count || 20).map((c) => c.id);
    }
  } else {
    const fresh = newCards().slice(0, newLeftToday()).map((c) => c.id);
    if (mode === 'learn') ids = fresh;
    else {
      // Interleave new cards evenly into the shuffled due cards.
      const due = shuffle(dueCards()).map((c) => c.id);
      ids = due.slice();
      fresh.forEach((id, i) => ids.splice(Math.round(((i + 1) * (ids.length + 1)) / (fresh.length + 1)), 0, id));
    }
  }
  if (!ids.length) { go('study'); return; }
  session = { mode, filter, queue: ids, pos: 0, results: [], startedAt: Date.now(), from: origin === 'study' ? 'study' : origin };
  prepCard();
  lastSummary = null;
  go('study');
}

function prepCard() {
  const c = byId[session.queue[session.pos]];
  session.revealed = false;
  session.chosen = null;
  session.typed = '';
  session.guessed = false;
  session.selected = new Set();
  session.order = optionOrder(c);
}

function renderStudy() {
  if (session) return renderSession();
  if (lastSummary) return renderFinished();
  const pool = enabledCards();
  const due = dueCards(pool).length;
  const fresh = Math.min(newLeftToday(), newCards(pool).length);
  const levels = manifest.levels.filter((l) => pool.some((c) => c.level === l.id));
  const topics = manifest.topics.filter((t) => pool.some((c) => c.topic === t.id));
  const formats = Object.keys(FORMAT_NAMES).filter((f) => pool.some((c) => c.format === f));
  app.innerHTML = `
  <div class="topbar"><span class="brand">Study</span></div>
  <div class="panel stack">
    <h2 class="h">Scheduled study</h2>
    <p class="note">${due} due today, ${fresh} new available. Topics are mixed, which trains you to recall the right rule the way you would at the table.</p>
    <button class="btn" data-act="review" ${due + fresh ? '' : 'disabled'}>Start review</button>
    <button class="btn ghost" data-act="learn" ${fresh ? '' : 'disabled'}>Learn new cards only</button>
  </div>
  <form class="panel stack" id="drill-form">
    <h2 class="h">Drill</h2>
    <p class="note">Practise one level or topic as often as you like. Drills don't change your review schedule.</p>
    <label class="field"><span>Level</span>
      <select id="drill-level"><option value="">All levels</option>${levels.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join('')}</select></label>
    <label class="field"><span>Topic</span>
      <select id="drill-topic"><option value="">All topics</option>${topics.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label>
    <label class="field"><span>Question type</span>
      <select id="drill-format"><option value="">All types</option>${formats.map((f) => `<option value="${f}">${esc(FORMAT_NAMES[f])}</option>`).join('')}</select></label>
    <label class="field"><span>Cards</span>
      <select id="drill-count"><option value="10">10</option><option value="20" selected>20</option><option value="9999">All matching</option></select></label>
    <p class="small" id="drill-match"></p>
    <button class="btn" type="submit">Start drill</button>
  </form>
  <a class="panel tool" href="#trainer"><b>Doubles serving-order trainer</b><span class="small">Endless practice: work out who serves and receives in any game, including the deciding-game switch at 5.</span></a>`;
  app.querySelector('[data-act="review"]').addEventListener('click', () => startSession('review'));
  app.querySelector('[data-act="learn"]').addEventListener('click', () => startSession('learn'));
  const form = app.querySelector('#drill-form');
  const upd = () => {
    const l = form.querySelector('#drill-level').value, t = form.querySelector('#drill-topic').value, f = form.querySelector('#drill-format').value;
    const n = pool.filter((c) => (!l || c.level === l) && (!t || c.topic === t) && (!f || c.format === f)).length;
    form.querySelector('#drill-match').textContent = `${n} card${n === 1 ? '' : 's'} match.`;
    form.querySelector('button[type=submit]').disabled = !n;
  };
  form.addEventListener('change', upd); upd();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    startSession('drill', { level: form.querySelector('#drill-level').value, topic: form.querySelector('#drill-topic').value, format: form.querySelector('#drill-format').value, count: +form.querySelector('#drill-count').value });
  });
}

function renderSession() {
  const s = session;
  const c = byId[s.queue[s.pos]];
  const title = s.mode === 'drill' ? 'Drill' : s.mode === 'learn' ? 'Learn' : 'Review';
  const pct = Math.round(100 * s.pos / s.queue.length);
  app.innerHTML = `
  <div class="topbar">
    <button class="icon" data-act="end" aria-label="End session">✕</button>
    <span class="small">${title} · ${s.pos + 1} / ${s.queue.length}</span>
    <span class="icon-spacer"></span>
  </div>
  <div class="meter thin" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
  <article class="card" aria-live="polite">
    ${cardTags(c)}
    <div class="q">${fmt(c.q)}</div>
    ${diagramSVG(c.diagram)}${questionFigure(c)}
    ${c.format === 'flip' ? flipBody(c) : c.format === 'number' ? numberBody(c) : choiceBody(c)}
  </article>
  ${footerHTML(c)}`;
  wireSession(c);
}

function flipBody(c) {
  if (!session.revealed) return `<button class="reveal" data-act="reveal">Show answer <span class="small">Space</span></button>`;
  return `<div class="answer">${fmt(c.a)}</div>${explain(c)}`;
}

function numberBody(c) {
  const done = session.chosen !== null;
  return `
  <form class="numin" id="num-form" novalidate>${stepperHTML(c, session.typed, done)}</form>
  ${done ? '' : `<p class="small">Type a number or use − and +${c.step ? ` (steps of ${c.step})` : ''}.</p><button class="btn" type="submit" form="num-form">Check answer <span class="small inv">Enter</span></button>`}
  ${done ? feedback(c, session.chosen) : ''}`;
}

function choiceBody(c) {
  if (c.format === 'multi') return multiBody(c);
  const done = session.chosen !== null;
  const keys = 'ABCD';
  return `
  ${c.situation ? `<p class="situation">${fmt(c.situation)}</p>` : ''}
  <div class="opts ${optsClass(c)}" role="group" aria-label="Options">
    ${session.order.map((oi, k) => {
      let cls = '';
      if (done && oi === c.answer) cls = 'right';
      else if (done && oi === session.chosenIndex) cls = 'wrong';
      return `<button class="opt ${cls}" data-opt="${oi}" ${done ? 'disabled' : ''}><span class="k">${keys[k]}</span><span>${fmt(c.options[oi])}</span></button>`;
    }).join('')}
  </div>
  ${done ? feedback(c, session.chosen) : ''}`;
}

function multiBody(c) {
  const done = session.chosen !== null;
  const keys = 'ABCDEF';
  const sel = session.selected;
  return `
  <p class="small multi-hint">Select every correct answer, then check.</p>
  <div class="opts" role="group" aria-label="Options: select all that apply">
    ${session.order.map((oi, k) => {
      const isAns = c.answers.includes(oi), picked = sel.has(oi);
      let cls = picked ? 'picked' : '';
      if (done) cls = isAns && picked ? 'right' : isAns ? 'missed' : picked ? 'wrong' : '';
      const note = done && isAns && !picked ? '<span class="opt-note">you missed this one</span>' : '';
      return `<button class="opt multi ${cls}" data-toggle="${oi}" aria-pressed="${picked}" ${done ? 'disabled' : ''}><span class="box" aria-hidden="true">${picked ? '✓' : ''}</span><span class="k">${keys[k]}</span><span>${fmt(c.options[oi])}${note}</span></button>`;
    }).join('')}
  </div>
  ${done ? feedback(c, session.chosen) : `<button class="btn" data-act="check" ${sel.size ? '' : 'disabled'}>Check answer <span class="small inv">Enter</span></button>`}`;
}

function toggleOption(oi) {
  if (session.chosen !== null) return;
  if (session.selected.has(oi)) session.selected.delete(oi); else session.selected.add(oi);
  renderSession();
  app.querySelector(`[data-toggle="${oi}"]`)?.focus();
}

function checkMulti(c) {
  if (session.chosen !== null || !session.selected.size) return;
  session.chosen = isCorrect(c, session.selected);
  renderSession();
  app.querySelector('[data-act="next"]')?.focus();
}

function feedback(c, correct) {
  const head = correct ? `Correct: ${answerText(c)}` : `The answer is: ${answerText(c)}`;
  return `<div class="fb ${correct ? '' : 'bad'}"><b>${fmt(head)}</b>${explain(c)}</div>`;
}

function footerHTML(c) {
  const s = session;
  if (c.format === 'flip') {
    if (!s.revealed) return '';
    const prev = P.cards[c.id];
    return `<div class="grade" role="group" aria-label="How well did you remember it?">
      ${GRADES.map((g, i) => `<button data-grade="${i}" class="${i === 0 ? 'again' : ''}">${g}<span>${s.mode === 'drill' ? `key ${i + 1}` : previewLabel(prev, i)}</span></button>`).join('')}
    </div>`;
  }
  if (s.chosen === null) return '';
  return `<div class="stack">
    ${s.chosen && s.mode !== 'drill' ? `<label class="check"><input type="checkbox" id="guessed" ${s.guessed ? 'checked' : ''}> I guessed. Show it to me again sooner</label>` : ''}
    <button class="btn" data-act="next">Continue <span class="small inv">Enter</span></button>
  </div>`;
}

function wireSession(c) {
  app.querySelector('[data-act="end"]').addEventListener('click', endSession);
  app.querySelector('[data-act="reveal"]')?.addEventListener('click', reveal);
  app.querySelectorAll('[data-grade]').forEach((b) => b.addEventListener('click', () => commit(c, +b.dataset.grade, +b.dataset.grade > 0)));
  app.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => choose(c, +b.dataset.opt)));
  app.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => toggleOption(+b.dataset.toggle)));
  app.querySelector('[data-act="check"]')?.addEventListener('click', () => checkMulti(c));
  app.querySelector('[data-act="next"]')?.addEventListener('click', () => next(c));
  app.querySelector('#guessed')?.addEventListener('change', (e) => { session.guessed = e.target.checked; });
  const nf = app.querySelector('#num-form');
  if (nf) {
    const inp = wireStepper(nf, c, (v) => { session.typed = v; });
    if (!inp.disabled && !matchMedia('(pointer: coarse)').matches) inp.focus();
    nf.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!inp.value.trim()) return;
      session.typed = inp.value;
      session.chosen = checkNumber(c, inp.value);
      renderSession();
      app.querySelector('[data-act="next"]')?.focus();
    });
  }
}

function reveal() { session.revealed = true; renderSession(); }

function choose(c, oi) {
  if (session.chosen !== null) return;
  session.chosenIndex = oi;
  session.chosen = isCorrect(c, oi);
  renderSession();
  app.querySelector('[data-act="next"]')?.focus();
}

function next(c) {
  const correct = session.chosen;
  commit(c, correct ? (session.guessed ? 1 : 2) : 0, correct);
}

function commit(c, grade, correct) {
  const s = session;
  if (s.mode !== 'drill') {
    const prev = P.cards[c.id];
    const ns = schedule(prev, grade);
    ns.right = (prev?.right || 0) + (correct ? 1 : 0);
    ns.wrong = (prev?.wrong || 0) + (correct ? 0 : 1);
    P.cards[c.id] = ns;
    const d = today();
    d.reviews++;
    if (correct) d.correct++;
    if (!prev) d.fresh++;
    save();
    // "Again" brings the card back later in this session.
    if (grade === 0) s.queue.splice(Math.min(s.pos + 5, s.queue.length), 0, c.id);
  }
  s.results.push({ id: c.id, correct, grade });
  s.pos++;
  if (s.pos >= s.queue.length) return endSession();
  prepCard();
  renderSession();
  window.scrollTo(0, 0);
}

function endSession() {
  const s = session;
  session = null;
  if (s && s.results.length) {
    const first = {};
    s.results.forEach((r) => { if (!(r.id in first)) first[r.id] = r.correct; });
    const ids = Object.keys(first);
    lastSummary = {
      mode: s.mode,
      filter: s.filter,
      from: s.from,
      reviewed: ids.length,
      correct: ids.filter((id) => first[id]).length,
      missed: ids.filter((id) => !first[id]),
      secs: Math.round((Date.now() - s.startedAt) / 1000)
    };
    go('study');
    return;
  }
  go(s?.from && VIEWS[s.from] ? s.from : 'home');
}

/* ---------- session finished ---------- */
function renderFinished() {
  const sm = lastSummary;
  const pool = enabledCards();
  const moreDue = dueCards(pool).length + Math.min(newLeftToday(), newCards(pool).length);
  const from = sm.from && sm.from !== 'study' && VIEWS[sm.from] ? sm.from : null;
  const backLabel = from === 'exam' ? 'Back to exam results' : from ? `Back to ${PLACE[from]}` : null;
  app.innerHTML = `
  <div class="topbar"><span class="brand">${sm.mode === 'drill' ? 'Drill' : 'Session'} complete</span>
    <button class="icon" data-act="close" aria-label="Close and go ${from ? `back to ${esc(PLACE[from])}` : 'home'}">✕</button></div>
  ${summaryHTML(sm)}
  <div class="panel stack next-steps">
    <h2 class="h">What next?</h2>
    ${sm.missed.length ? `<button class="btn" data-act="missed">Practise the ${sm.missed.length} I missed</button>` : ''}
    ${sm.mode !== 'drill' && moreDue ? `<button class="btn ${sm.missed.length ? 'ghost' : ''}" data-act="more">Keep going: ${moreDue} more card${moreDue === 1 ? '' : 's'}</button>` : ''}
    ${sm.mode === 'drill' && !sm.filter?.ids ? `<button class="btn ${sm.missed.length ? 'ghost' : ''}" data-act="again">Drill this again</button>` : ''}
    <div class="row exits">
      ${backLabel ? `<button class="btn ghost" data-act="back">← ${esc(backLabel)}</button>` : ''}
      ${from !== null || sm.from === 'study' ? '<button class="btn ghost" data-act="study">Study page</button>' : ''}
      ${from !== 'home' ? '<button class="btn ghost" data-act="home">Home</button>' : ''}
    </div>
  </div>
  ${supportHTML('session')}`;
  const leave = (to) => { lastSummary = null; go(to); };
  app.querySelector('[data-act="close"]').addEventListener('click', () => leave(from || 'home'));
  app.querySelector('[data-act="missed"]')?.addEventListener('click', () => startSession('drill', { ids: sm.missed }, sm.from));
  app.querySelector('[data-act="more"]')?.addEventListener('click', () => startSession('review', {}, sm.from));
  app.querySelector('[data-act="again"]')?.addEventListener('click', () => startSession('drill', sm.filter, sm.from));
  app.querySelector('[data-act="back"]')?.addEventListener('click', () => leave(from));
  app.querySelector('[data-act="study"]')?.addEventListener('click', () => { lastSummary = null; renderStudy(); window.scrollTo(0, 0); });
  app.querySelector('[data-act="home"]')?.addEventListener('click', () => leave('home'));
}

function summaryHTML(sm) {
  const pct = sm.reviewed ? Math.round(100 * sm.correct / sm.reviewed) : 0;
  const C = 2 * Math.PI * 50;
  const m = Math.floor(sm.secs / 60), sec = sm.secs % 60;
  return `
  <div class="panel summary">
    <div class="spread"><h2 class="h">Your results</h2><span class="small">${m} min ${sec} s</span></div>
    <div class="sum-row">
      <svg class="ring" viewBox="0 0 120 120" role="img" aria-label="${pct}% correct first time">
        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--chip)" stroke-width="12"/>
        ${pct ? `<circle cx="60" cy="60" r="50" fill="none" stroke="var(--good)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(C * pct / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 60 60)"/>` : ''}
        <text x="60" y="69" text-anchor="middle" font-size="28" font-weight="700" fill="var(--ink)" font-family="Barlow Condensed, sans-serif">${pct}%</text>
      </svg>
      <div class="stats">
        <div><b>${sm.reviewed}</b><span class="small">cards</span></div>
        <div><b>${sm.correct}</b><span class="small">right first time</span></div>
        <div><b>${sm.missed.length}</b><span class="small">missed</span></div>
      </div>
    </div>
    ${sm.missed.length ? `<h3 class="h3">Review these rules</h3>${sm.missed.map((id) => {
      const c = byId[id];
      return `<div class="miss"><div>${fmt(c.q)}</div><div class="miss-a">${fmt(answerText(c))}</div>${refsHTML(c)}</div>`;
    }).join('')}` : '<p class="note">Clean sheet. Every card right first time.</p>'}
  </div>`;
}

/* ---------- library ---------- */
function cardStatus(c) {
  const s = P.cards[c.id];
  if (!s) return { key: 'new', label: 'New' };
  if (s.due <= endOfDay()) return { key: 'due', label: 'Due today' };
  if (isLearned(s)) return { key: 'learned', label: `Learned · next in ${formatWait(s.due - Date.now())}` };
  return { key: 'learning', label: `Learning · next in ${formatWait(s.due - Date.now())}` };
}

function renderLibrary() {
  const pool = enabledCards();
  app.innerHTML = `
  <div class="topbar"><span class="brand">Library</span><span class="small">${pool.length} cards</span></div>
  <div class="panel stack">
    <label class="sr" for="lib-q">Search cards</label>
    <input id="lib-q" class="search" type="search" placeholder="Search, e.g. time-out, 16 cm, 2.9.1" value="${esc(lib.q)}">
    <div class="filters">
      <select id="lib-level" aria-label="Level"><option value="">All levels</option>${manifest.levels.map((l) => `<option value="${l.id}" ${lib.level === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select>
      <select id="lib-topic" aria-label="Topic"><option value="">All topics</option>${manifest.topics.filter((t) => pool.some((c) => c.topic === t.id)).map((t) => `<option value="${t.id}" ${lib.topic === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
      <select id="lib-format" aria-label="Question type"><option value="">All types</option>${Object.keys(FORMAT_NAMES).filter((f) => pool.some((c) => c.format === f)).map((f) => `<option value="${f}" ${lib.format === f ? 'selected' : ''}>${esc(FORMAT_NAMES[f])}</option>`).join('')}</select>
      <select id="lib-status" aria-label="Status">${[['', 'Any status'], ['new', 'New'], ['due', 'Due today'], ['learning', 'Learning'], ['learned', 'Learned']].map(([v, n]) => `<option value="${v}" ${lib.status === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
    </div>
    <p class="small" id="lib-count" role="status"></p>
  </div>
  <div class="panel" id="lib-list"></div>`;
  const list = app.querySelector('#lib-list');
  const draw = () => {
    const q = lib.q.trim().toLowerCase();
    const rows = pool.filter((c) => (!lib.level || c.level === lib.level) && (!lib.topic || c.topic === lib.topic) && (!lib.format || c.format === lib.format) &&
      (!lib.status || cardStatus(c).key === lib.status) &&
      (!q || [c.q, c.detail, answerText(c), (c.options || []).join(' '), (c.refs || []).join(' '), c.id, c.basedOn || ''].join(' ').replace(/‑/g, '-').toLowerCase().includes(q)));
    app.querySelector('#lib-count').textContent = `${rows.length} of ${pool.length} cards`;
    list.innerHTML = rows.length ? rows.map((c) => {
      const st = cardStatus(c);
      return `<details class="libitem">
        <summary><span class="lib-q">${fmt(c.q)}</span>
          <span class="row">${levelTag(c.level)}<span class="tag">${esc(topicName(c.topic))}</span><span class="status s-${st.key}">${esc(st.label)}</span></span></summary>
        <div class="lib-a">${diagramSVG(c.diagram)}${questionFigure(c)}<div class="answer sm">${fmt(answerText(c))}</div>${explain(c)}</div>
      </details>`;
    }).join('') : '<p class="note">No cards match. Try a different search or clear a filter.</p>';
  };
  app.querySelector('#lib-q').addEventListener('input', (e) => { lib.q = e.target.value; draw(); });
  ['level', 'topic', 'format', 'status'].forEach((k) => app.querySelector(`#lib-${k}`).addEventListener('change', (e) => { lib[k] = e.target.value; draw(); }));
  draw();
}

/* ---------- more: settings + backup ---------- */
function renderMore() {
  const paraCount = allCards.filter((c) => c.pack === 'para').length;
  app.innerHTML = `
  <div class="topbar"><span class="brand">More</span></div>
  <form class="panel stack" id="prefs">
    <h2 class="h">Study options</h2>
    <label class="field"><span>New cards per day</span><input id="pref-new" type="number" min="0" max="100" value="${P.settings.newPerDay}"></label>
    <label class="check"><input type="checkbox" id="pref-para" ${P.settings.para ? 'checked' : ''}> Include the Para table tennis pack (${paraCount} cards)</label>
    <p class="small" id="prefs-msg" role="status"></p>
  </form>
  <div class="panel stack">
    <h2 class="h">Back up your progress</h2>
    <p class="note">Progress, exam results and trainer scores are saved only in this browser. Export a backup to keep them safe or move them to another device.</p>
    <button class="btn ghost" data-act="export">Download backup file</button>
    <button class="btn ghost" data-act="copy">Copy backup as text</button>
    <label class="field"><span>Restore from a backup file</span><input type="file" id="imp-file" accept=".json,application/json"></label>
    <label class="field"><span>…or paste backup text</span><textarea id="imp-text" rows="3" placeholder='{"app":"love-all", …}'></textarea></label>
    <button class="btn ghost" data-act="import">Restore pasted backup</button>
    <p class="small" id="backup-msg" role="status"></p>
  </div>
  <div class="panel stack">
    <h2 class="h">Use it offline</h2>
    <p class="note">Once the site has loaded on a phone or computer, it keeps working without a connection, which helps at venues with poor signal. On a phone, use your browser's “Add to Home Screen” to install it like an app.</p>
    <p class="small" id="offline-status"></p>
  </div>
  <div class="panel stack">
    <h2 class="h">Reset</h2>
    ${resetArmed ? `<p class="note warn">This deletes all your progress, exam results and trainer scores in this browser. It can't be undone unless you have a backup.</p>
      <div class="row"><button class="btn danger" data-act="reset-yes">Yes, delete my progress</button><button class="btn ghost" data-act="reset-no">Cancel</button></div>` :
      '<button class="btn ghost" data-act="reset">Reset all progress…</button>'}
  </div>
  ${supportHTML('more')}
  <a class="panel tool" href="#help"><b>How to use Love-All</b><span class="small">How studying works, the menu, question types and keyboard shortcuts.</span></a>
  <div class="panel">
    <h2 class="h">Sources</h2>
    <p class="note">Every card cites its source: <b>Law</b> = ${esc(manifest.sources.Law)}; <b>HMO</b> = ${esc(manifest.sources.HMO)}. Clause numbers follow the official ITTF numbering. Always check the current ITTF Handbook and your referee's briefing before officiating.</p>
  </div>`;

  const msg = (id, t) => { app.querySelector(id).textContent = t; };
  const off = app.querySelector('#offline-status');
  off.textContent = navigator.serviceWorker?.controller ? 'Offline mode is active on this device.' : 'Offline mode turns on after the site has been opened once from its web address.';
  app.querySelector('#pref-new').addEventListener('change', (e) => {
    const v = Math.max(0, Math.min(100, Math.round(+e.target.value || 0)));
    e.target.value = v; P.settings.newPerDay = v; save(); msg('#prefs-msg', `Saved: ${v} new cards per day.`);
  });
  app.querySelector('#pref-para').addEventListener('change', (e) => {
    P.settings.para = e.target.checked; save(); msg('#prefs-msg', e.target.checked ? 'Para pack switched on.' : 'Para pack switched off.');
  });
  app.querySelector('[data-act="export"]').addEventListener('click', () => {
    const blob = new Blob([exportJSON(P)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `love-all-backup-${dayKey()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    msg('#backup-msg', 'Backup file created. If no download started, use “Copy backup as text” instead.');
  });
  app.querySelector('[data-act="copy"]').addEventListener('click', async () => {
    const text = exportJSON(P);
    try { await navigator.clipboard.writeText(text); msg('#backup-msg', 'Backup copied. Paste it somewhere safe, such as a note or email to yourself.'); }
    catch (e) { const ta = app.querySelector('#imp-text'); ta.value = text; ta.select(); msg('#backup-msg', 'Copying was blocked, so the backup is in the box above, selected. Copy it with Ctrl+C or ⌘C.'); }
  });
  const restore = (text) => {
    try {
      const data = normalise(JSON.parse(text));
      P = data; save(); msg('#backup-msg', `Restored ${Object.keys(P.cards).length} cards of progress.`);
    } catch (e) { msg('#backup-msg', `Couldn't restore: ${e.message.includes('Love-All') ? e.message : 'the text is not a valid backup.'}`); }
  };
  app.querySelector('#imp-file').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => restore(r.result); r.readAsText(f);
  });
  app.querySelector('[data-act="import"]').addEventListener('click', () => {
    const t = app.querySelector('#imp-text').value.trim();
    if (!t) return msg('#backup-msg', 'Paste your backup text into the box first.');
    restore(t);
  });
  app.querySelector('[data-act="reset"]')?.addEventListener('click', () => { resetArmed = true; renderMore(); });
  app.querySelector('[data-act="reset-no"]')?.addEventListener('click', () => { resetArmed = false; renderMore(); });
  app.querySelector('[data-act="reset-yes"]')?.addEventListener('click', () => {
    const keep = P.settings; P = defaultProgress(); P.settings = keep; save(); resetArmed = false; lastSummary = null; renderMore();
    msg('#prefs-msg', 'All progress deleted. Your study options were kept.');
  });
}

/* ---------- keyboard ---------- */
document.addEventListener('keydown', (e) => {
  if (route() === 'exam') return examKey(e);
  if (!session || route() !== 'study' || e.metaKey || e.ctrlKey || e.altKey) return;
  const c = byId[session.queue[session.pos]];
  const typing = e.target.matches('input, textarea, select');
  if (c.format === 'flip') {
    if (!session.revealed && (e.key === ' ' || e.key === 'Enter') && !typing) { e.preventDefault(); reveal(); }
    else if (session.revealed && /^[1-4]$/.test(e.key)) { e.preventDefault(); commit(c, +e.key - 1, +e.key > 1); }
    return;
  }
  if (c.format === 'multi' && session.chosen === null && !typing) {
    const n = /^[1-6]$/.test(e.key) ? +e.key - 1 : 'abcdef'.indexOf(e.key.toLowerCase());
    if (n >= 0 && n < session.order.length) { e.preventDefault(); toggleOption(session.order[n]); }
    // Enter checks the answer (also when focus is on an option); Space toggles the focused option.
    else if (e.key === 'Enter' && !e.target.matches('[data-act]')) { e.preventDefault(); checkMulti(c); }
    return;
  }
  if (session.chosen === null && c.options && !typing) {
    const k = 'abcd'.indexOf(e.key.toLowerCase());
    const n = /^[1-4]$/.test(e.key) ? +e.key - 1 : k;
    if (n >= 0 && n < session.order.length) { e.preventDefault(); choose(c, session.order[n]); }
  } else if (session.chosen !== null && e.key === 'Enter' && !e.target.matches('button')) {
    e.preventDefault(); next(c);
  }
});

/* ---------- boot ---------- */
async function boot() {
  try {
    manifest = await (await fetch('data/manifest.json')).json();
    const decks = await Promise.all(manifest.decks.map(async (d) => {
      const cards = await (await fetch(d.file)).json();
      return cards.map((c) => expandCard({ ...c, pack: d.pack }));
    }));
    allCards = decks.flat();
    byId = Object.fromEntries(allCards.map((c) => [c.id, c]));
  } catch (e) {
    app.innerHTML = `<div class="panel"><h2 class="h">The cards didn't load</h2><p class="note">Love-All needs to be opened from a web address (for example its website or a local server), not straight from a file on disk. Details: ${esc(e.message)}</p></div>`;
    return;
  }
  setManifest(manifest);
  initExam(ctx); initTrainer(ctx); initStats(ctx); initHelp(ctx);
  window.addEventListener('hashchange', onHashChange);
  render();
  registerOffline();
}

// Offline support: only on a real web address (not file:// and not inside a sandboxed preview).
function registerOffline() {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  try {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  } catch (e) { /* not available here */ }
}

boot();
