// "How to use" page: what TT Umpire Study is, how studying works, the menu, question types, shortcuts.

import { supportHTML } from './ui.js';
import { installCardHTML, wireInstall } from './install.js';

let ctx = null;
export function initHelp(c) { ctx = c; }

const SECTIONS = [
  ['start', 'Quick start'],
  ['install', 'Install on your phone'],
  ['learning', 'How learning works'],
  ['menu', 'The menu'],
  ['types', 'Question types'],
  ['keys', 'Keyboard shortcuts'],
  ['data', 'Your progress and offline use']
];

export function renderHelp() {
  const total = ctx.enabledCards().length;
  ctx.app.innerHTML = `
  <div class="topbar"><span class="brand">How to use</span></div>

  <div class="panel help-intro">
    <p><b>TT Umpire Study</b> helps you learn the rules an umpire needs, from the basics to tricky match situations. Every question comes from the ITTF <i>Laws of Table Tennis</i> or the <i>Handbook for Match Officials</i>, and every answer tells you why and cites its clause.</p>
    <p class="small">${total} cards are switched on now, in three levels: <span class="tag b">Basic</span> <span class="tag i">Intermediate</span> <span class="tag a">Advanced</span></p>
    <nav class="help-toc" aria-label="On this page">
      ${SECTIONS.map(([id, t]) => `<button class="chip-link" data-jump="${id}">${t}</button>`).join('')}
    </nav>
  </div>

  <section class="panel help" id="h-start">
    <h2 class="h">Quick start</h2>
    <ol class="help-steps">
      <li><b>Practise a little every day.</b> On <a href="#home">Today</a>, press <b>Start today's practice</b>. You get the cards due today plus up to 10 new ones. It usually takes 5–10 minutes. When you finish, choose <b>Keep going</b> for more cards or <b>Finish for today</b>. You can always start another round from Today.</li>
      <li><b>Answer, then read why.</b> After each answer you see whether you were right, the explanation, the umpire's signal and call where relevant, and the source clause.</li>
      <li><b>Come back tomorrow.</b> The app decides when you see each card again. Cards you know come back less often; cards you miss come back soon.</li>
      <li><b>Practise anything, any time.</b> On <a href="#study">Practice</a>, choose your mistakes, a level, a topic or everything. Switch on <b>Test mode</b> for a timed test with your score at the end.</li>
    </ol>
  </section>

  <section class="panel help install-guide" id="h-install">
    <h2 class="h">Install on your phone</h2>
    ${installCardHTML('help')}
  </section>

  <section class="panel help" id="h-learning">
    <h2 class="h">How learning works</h2>
    <dl class="help-dl">
      <dt>Spaced repetition</dt>
      <dd>Each card is scheduled on its own. A right answer pushes it further into the future (3 days, then a week, then weeks); a wrong answer brings it back in about 10 minutes and resets it. You remember far more this way than by rereading the rules.</dd>
      <dt>Levels</dt>
      <dd>New cards are introduced <b>Basic first</b>, then Intermediate, then Advanced. The level to focus on is marked <span class="tag rec">Recommended next</span> on Home. Nothing is locked, so you can practise any level whenever you like.</dd>
      <dt>Learned</dt>
      <dd>A card counts as <b>learned</b> once you still remember it a week or more after studying it. The level bars on Home show learned cards out of the total.</dd>
      <dt>“I guessed”</dt>
      <dd>If you got a card right by luck, tick <b>I guessed</b> before continuing. The card comes back sooner, as if you had found it hard.</dd>
      <dt>Mixed topics</dt>
      <dd>Reviews mix all topics on purpose. At the table you never know which rule comes next, so practising that way trains you to recall the right one.</dd>
      <dt>Every answer counts</dt>
      <dd>Whether you answer in Today's practice, on the Practice page or in a test, the app uses that answer to decide when the card comes back. Cards you get wrong also collect under <b>My mistakes</b> until you get them right.</dd>
    </dl>
  </section>

  <section class="panel help" id="h-menu">
    <h2 class="h">The menu</h2>
    <p class="small">The menu sits at the top of every page. It hides while you are practising or taking a test, so you can concentrate. Press ✕ at the top left to stop. When you finish you get a results page with what to do next, including a button back to where you started.</p>
    <div class="menu-guide">
      ${menuItem('home', 'Today', 'Your daily practice in one button: the cards due today plus a few new ones. Also your streak, progress per level, shortcuts to a test and the doubles trainer, and your three weakest topics (tap one to practise it).')}
      ${menuItem('study', 'Practice', 'Practise whatever you want: <b>My mistakes</b>, <b>a level</b>, <b>a topic</b> or <b>everything</b>, and choose how many questions. Switch on <b>Test mode</b> for a timed test with no answers until the end, then your score by level and topic and every mistake explained. The <b>doubles serving-order trainer</b> is here too.')}
      ${menuItem('library', 'Library', 'Browse and search every card with its answer and explanation. Search by words (“time-out”), numbers (“16 cm”), clauses (“2.9.1”) or sample exam questions (“Q45”), and filter by level, topic, question type or status.')}
      ${menuItem('stats', 'Stats', 'Answers per day, reviews coming up, progress per level, accuracy by topic (tap a topic to practise it), test history and your trainer score.')}
      ${menuItem('more', 'More', 'Study options (new cards per day, the Para table tennis pack), backup and restore of your progress, offline use, reset, and the sources.')}
      ${menuItem('help', '?', 'This page.')}
    </div>
  </section>

  <section class="panel help" id="h-types">
    <h2 class="h">Question types</h2>
    <div class="type-guide">
      ${typeItem('Multiple choice', 'Pick the one correct answer from four.', '<span class="mini-opt">A</span><span class="mini-opt on">B</span><span class="mini-opt">C</span><span class="mini-opt">D</span>')}
      ${typeItem('Select all', 'Tick <b>every</b> correct answer, then press <b>Check answer</b>. It only counts if you pick exactly the right ones. Afterwards, any correct answer you missed is outlined with a dashed line.', '<span class="mini-opt on">✓</span><span class="mini-opt">&nbsp;</span><span class="mini-opt on">✓</span>')}
      ${typeItem('Number', 'Type the number, or use <b>−</b> and <b>+</b> (press and hold to go faster), then <b>Check answer</b>. The unit is shown next to the box.', '<span class="mini-opt">−</span><span class="mini-num">15.25</span><span class="mini-opt">+</span>')}
      ${typeItem('Umpire’s Call', 'A match situation, sometimes with a diagram of the table. Choose the right decision. The feedback includes the umpire’s and assistant umpire’s signals and calls.', '<span class="mini-tag">Scenario</span>')}
      ${typeItem('True or false', 'Decide whether the statement is correct.', '<span class="mini-opt on">True</span><span class="mini-opt">False</span>')}
      ${typeItem('Your decision', 'Decide what the umpire does: a point to one side, a let, or no action (play on). Singles players are <b>A</b> and <b>X</b>; doubles pairs are <b>A/B</b> and <b>X/Y</b>.', '<span class="mini-opt">A</span><span class="mini-opt on">X</span><span class="mini-opt">Let</span><span class="mini-opt">No action</span>')}
    </div>
    <h3 class="h3">Doubles serving-order trainer</h3>
    <p>Open it from Practice or Today. Each situation tells you who served first in game 1, which game you are in and the score. Tap the <b>server</b>, then the <b>receiver</b>, and check. If you're wrong, the trainer shows the rotation and every change of service in that game. The three rules you need are summarised under the question.</p>
  </section>

  <section class="panel help" id="h-keys">
    <h2 class="h">Keyboard shortcuts</h2>
    <p class="small">On a computer you can study without the mouse.</p>
    <div class="tbl"><table>
      <thead><tr><th>Key</th><th>What it does</th></tr></thead>
      <tbody>
        <tr><td><kbd>1</kbd>–<kbd>6</kbd> or <kbd>A</kbd>–<kbd>F</kbd></td><td>Choose an option (in “Select all”, tick or untick it)</td></tr>
        <tr><td><kbd>Enter</kbd></td><td>Check your answer, then continue to the next card</td></tr>
        <tr><td><kbd>Space</kbd></td><td>Tick or untick the highlighted option</td></tr>
        <tr><td><kbd>↑</kbd> <kbd>↓</kbd></td><td>Change a number answer</td></tr>
        <tr><td><kbd>←</kbd> <kbd>→</kbd></td><td>Previous or next question in a test</td></tr>
      </tbody>
    </table></div>
  </section>

  <section class="panel help" id="h-data">
    <h2 class="h">Your progress and offline use</h2>
    <dl class="help-dl">
      <dt>Saved in this browser</dt>
      <dd>Your progress, test results and trainer score are kept in this browser on this device. There is no account. They are not shared with anyone and don't follow you to another device automatically.</dd>
      <dt>Back up or move</dt>
      <dd>In <a href="#more">More</a>, download a backup file (or copy it as text) and restore it on another device or browser. Do this now and then, so clearing your browser data doesn't wipe your progress.</dd>
      <dt>Offline and on your phone</dt>
      <dd>After the first visit, TT Umpire Study works without a connection, which helps at venues with poor signal. To open it like an app, install it on your home screen: see <a href="#help" data-jump="install">Install on your phone</a>.</dd>
      <dt>Para table tennis</dt>
      <dd>Rules for wheelchair and standing Para players are in an optional pack. Switch it on in <a href="#more">More</a>.</dd>
    </dl>
    <p class="small">TT Umpire Study is a study aid. Before officiating, always check the current ITTF Handbook and follow your referee's briefing.</p>
  </section>

  <a class="btn" href="#home">Start studying</a>
  ${supportHTML('help')}`;

  wireInstall(ctx.app);
  if (ctx.helpJump) { const id = ctx.helpJump; ctx.helpJump = null; requestAnimationFrame(() => jumpTo(id)); }
  ctx.app.querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    const el = document.getElementById(`h-${b.dataset.jump}`);
    const navH = document.getElementById('nav')?.offsetHeight || 0;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - navH - 8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true });
  }));
}

function jumpTo(id) {
  const el = document.getElementById(`h-${id}`);
  if (!el) return;
  const navH = document.getElementById('nav')?.offsetHeight || 0;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - navH - 8 });
}

function menuItem(route, label, text) {
  return `<div class="menu-item"><a class="menu-pill" href="#${route}">${label}</a><p>${text}</p></div>`;
}

function typeItem(name, text, sample) {
  return `<div class="type-item"><div class="type-sample" aria-hidden="true">${sample}</div><div><b>${name}</b><p>${text}</p></div></div>`;
}
