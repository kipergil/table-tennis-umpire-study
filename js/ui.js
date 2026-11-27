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
