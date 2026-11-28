// Shared rendering helpers used by every view.
import { diagramSVG } from './diagram.js';
import { figureHTML, signalsFor } from './figures.js';

let manifest = { levels: [], topics: [] };
export function setManifest(m) { manifest = m; }

export const FORMAT_NAMES = { flip: 'Flip', mcq: 'Multiple choice', multi: 'Select all', number: 'Number', scenario: 'Umpire’s Call', tf: 'True or false', call: 'Your decision' };
export const LEVEL_CLASS = { basic: 'b', intermediate: 'i', advanced: 'a' };
export const LEVEL_ORDER = { basic: 0, intermediate: 1, advanced: 2 };

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
export const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const levelName = (id) => manifest.levels.find((l) => l.id === id)?.name || id;
export const topicName = (id) => manifest.topics.find((t) => t.id === id)?.name || id;
export const levelTag = (lvl) => `<span class="tag ${LEVEL_CLASS[lvl] || ''}">${esc(levelName(lvl))}</span>`;
export const refsHTML = (c) => `<div class="row refs">${(c.refs || []).map((r) => `<span class="ref">${esc(r)}</span>`).join('')}</div>`;
export const cardTags = (c) => `<div class="row">${levelTag(c.level)}<span class="tag">${esc(topicName(c.topic))}</span><span class="tag fmt-${c.format}">${esc(FORMAT_NAMES[c.format])}</span></div>${c.matchLabel ? `<div class="match-label">${esc(c.matchLabel)}</div>` : ''}`;

/** Extra class for option lists: true/false side by side, decisions in a 2×2 grid. */
export const optsClass = (c) => (c.format === 'tf' ? 'opts-tf' : c.format === 'call' ? 'opts-call' : '');
export { diagramSVG };

export function optionOrder(c) {
  if (!c.options) return null;
  const idx = c.options.map((_, i) => i);
  return c.shuffle === false ? idx : shuffle(idx);
}

/** Explanation block: detail, memory hook, umpire/AU calls and sources. */
export function explain(c) {
  const calls = (c.umpire || c.au) ? `
    <dl class="callbox">
      ${c.umpire?.signal ? `<dt>Umpire signal</dt><dd>${fmt(c.umpire.signal)}</dd>` : ''}
      ${c.umpire?.call ? `<dt>Umpire call</dt><dd>${fmt(c.umpire.call)}</dd>` : ''}
      ${c.au ? `<dt>Assistant umpire</dt><dd>${fmt([c.au.signal, c.au.call].filter(Boolean).join('. ') || 'No signal or call')}</dd>` : ''}
    </dl>` : '';
  return `
    <div class="detail">${fmt(c.detail)}</div>
    ${c.hint ? `<div class="hint">Memory hook: ${fmt(c.hint)}</div>` : ''}
    ${calls}
    ${answerVisuals(c)}
    ${refsHTML(c)}
    ${c.basedOn ? `<p class="small based-on">Reworded from the sample exam paper (${esc(c.basedOn.replace('Sample exam ', ''))}).</p>` : ''}`;
}

/** − [input] + stepper for number cards. */
export function stepperHTML(c, value, disabled, id = 'num-in') {
  return `
    <label class="sr" for="${id}">Your answer${c.unit ? ` in ${esc(c.unit)}` : ''}</label>
    <div class="stepper">
      <button type="button" class="step" data-step="-1" aria-label="Decrease" ${disabled ? 'disabled' : ''}>−</button>
      <input id="${id}" type="number" inputmode="decimal" autocomplete="off" value="${esc(value ?? '')}"
        min="${c.min ?? ''}" max="${c.max ?? ''}" step="${c.step ?? 'any'}" ${disabled ? 'disabled' : ''} placeholder="?">
      <button type="button" class="step" data-step="1" aria-label="Increase" ${disabled ? 'disabled' : ''}>+</button>
    </div>
    <span class="unit">${esc(c.unit || '')}</span>`;
}

/** Wire the stepper buttons inside `root`; `onChange(value)` is called after each step. */
export function wireStepper(root, c, onChange) {
  const inp = root.querySelector('input[type=number]');
  if (!inp) return null;
  root.querySelectorAll('[data-step]').forEach((b) => holdToRepeat(b, () => { stepNumber(c, inp, +b.dataset.step); onChange?.(inp.value); }));
  inp.addEventListener('input', () => onChange?.(inp.value));
  return inp;
}

// One step up or down, clamped to the card's range. An empty box starts at the low or high end.
export function stepNumber(c, inp, dir) {
  const step = c.step || 1;
  const lo = c.min ?? -Infinity, hi = c.max ?? Infinity;
  const dec = (String(step).split('.')[1] || '').length;
  const cur = parseFloat(String(inp.value).replace(',', '.'));
  let v = Number.isNaN(cur) ? (dir > 0 ? lo : hi) : cur + dir * step;
  if (!Number.isFinite(v)) v = 0;
  v = Math.min(hi, Math.max(lo, v));
  inp.value = v.toFixed(dec);
}

// Click steps once; pressing and holding repeats, speeding up.
export function holdToRepeat(btn, fn) {
  let timer = null;
  const stop = () => { clearTimeout(timer); timer = null; };
  const run = (delay) => { fn(); timer = setTimeout(() => run(Math.max(40, delay * 0.8)), delay); };
  btn.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; e.preventDefault(); btn.setPointerCapture?.(e.pointerId); run(400); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => btn.addEventListener(t, stop));
  btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
}

/**
 * "Support TT Umpire Study" donation box (Ko-fi etc.), configured in data/manifest.json → support.url.
 * Returns '' while no link is set, so nothing shows until the owner adds one.
 * `context` picks a short message that fits the page: home, session, exam, help or more.
 */
const SUPPORT_TEXT = {
  home: ['Keep TT Umpire Study free for every umpire', 'No ads, no paywall: just the rules, made easy to learn. If it’s helping you prepare, a coffee keeps new cards and updates coming.'],
  session: ['Nice work, that’s another session done!', 'Everything you just studied is free for every umpire. If TT Umpire Study is helping you, buy me a coffee and help keep it that way.'],
  exam: ['Getting ready for the real exam?', 'If these practice exams are helping you, a small coffee helps keep TT Umpire Study free and growing.'],
  help: ['Enjoying TT Umpire Study?', 'It’s free for everyone, with no ads. A coffee helps keep it that way and pays for new cards.'],
  more: ['Support TT Umpire Study', 'TT Umpire Study is free and has no ads. If it helps you prepare for umpiring, a small donation keeps it running and pays for new cards and updates.']
};

const CUP_SVG = `<svg class="support-art" viewBox="0 0 72 72" aria-hidden="true">
  <circle cx="36" cy="36" r="34" fill="#FFFFFF" opacity=".75"/>
  <path d="M27 14c-3 4 3 6 0 10M36 12c-3 4 3 6 0 10M45 14c-3 4 3 6 0 10" fill="none" stroke="#C9B7B2" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M18 30h34v14a14 14 0 0 1-14 14h-6a14 14 0 0 1-14-14z" fill="#D8403C"/>
  <path d="M52 34h4a7 7 0 0 1 0 14h-4" fill="none" stroke="#D8403C" stroke-width="4"/>
  <rect x="14" y="58" width="44" height="5" rx="2.5" fill="#B8322F"/>
  <circle cx="35" cy="42" r="7" fill="#FFFFFF"/><path d="M30 40a6 6 0 0 1 9-3" fill="none" stroke="#F39A44" stroke-width="2" stroke-linecap="round"/>
</svg>`;

export function supportHTML(context = 'home') {
  const s = manifest.support;
  if (!s || !/^https:\/\//.test(s.url || '')) return '';
  const [title, text] = SUPPORT_TEXT[context] || SUPPORT_TEXT.home;
  return `<aside class="support-box" aria-label="Support TT Umpire Study">
    ${CUP_SVG}
    <div class="support-body">
      <h2 class="support-title">${esc(title)}</h2>
      <p>${esc(text)}</p>
      <a class="support-btn" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">☕</span> Buy me a coffee on ${esc(s.platform)}</a>
      ${context === 'more' ? `<p class="support-fine">Opens ${esc(s.platform)} in a new tab. Donating is optional and unlocks nothing: every card stays free for everyone.</p>` : ''}
    </div>
  </aside>`;
}

export const fmtTime = (secs) => {
  const s = Math.max(0, Math.round(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const fmtDate = (ms) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** Pictures shown with the answer: the umpire's signals, then any reference figures. */
export function answerVisuals(c) {
  const sigs = signalsFor(c).map((k) => figureHTML(`signal:${k}`, { compact: true })).join('');
  const figs = (c.answerFigures || []).map((n) => figureHTML(n)).join('');
  return `${sigs ? `<div class="sig-row" aria-label="Umpire signals">${sigs}</div>` : ''}${figs}`;
}

/** A picture that is part of the question itself (e.g. "What does this signal mean?"). */
export const questionFigure = (c) => (c.figure ? `<div class="q-fig">${figureHTML(c.figure)}</div>` : '');
