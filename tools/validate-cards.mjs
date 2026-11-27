// Checks every deck listed in data/manifest.json. Run: node tools/validate-cards.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'data/manifest.json'), 'utf8'));
const levels = new Set(manifest.levels.map((l) => l.id));
const topics = new Set(manifest.topics.map((t) => t.id));
const formats = new Set(['flip', 'mcq', 'multi', 'number', 'scenario']);
const errors = [];
const seen = new Set();
const counts = {};

for (const deck of manifest.decks) {
  const cards = JSON.parse(readFileSync(join(root, deck.file), 'utf8'));
  for (const c of cards) {
    const where = `${deck.file} ${c.id || '(no id)'}`;
    const err = (m) => errors.push(`${where}: ${m}`);
    if (!c.id) err('missing id');
    if (seen.has(c.id)) err('duplicate id');
    seen.add(c.id);
    if (!levels.has(c.level)) err(`unknown level "${c.level}"`);
    if (!topics.has(c.topic)) err(`unknown topic "${c.topic}"`);
    if (!formats.has(c.format)) err(`unknown format "${c.format}"`);
    if (!c.q) err('missing question (q)');
    if (!c.detail) err('missing explanation (detail)');
    if (!Array.isArray(c.refs) || !c.refs.length) err('needs at least one source reference');
    for (const r of c.refs || []) if (!/^(Law|HMO) /.test(r)) err(`reference "${r}" must start with "Law " or "HMO "`);
    if (c.format === 'flip' && !c.a) err('flip card needs an answer (a)');
    if (c.format === 'number') {
      if (typeof c.value !== 'number') err('number card needs a numeric value');
      for (const k of ['min', 'max', 'step']) if (typeof c[k] !== 'number') err(`number card needs ${k} for the stepper`);
      if (c.value <= c.min || c.value > c.max) err('value must be inside (min, max] so the stepper does not start on the answer');
      const n = (c.value - c.min) / c.step;
      if (Math.abs(n - Math.round(n)) > 1e-9) err('value must be reachable from min in whole steps');
    }
    if (c.format === 'multi') {
      if (!Array.isArray(c.options) || c.options.length < 3 || c.options.length > 6) err('multi card needs 3–6 options');
      if (!Array.isArray(c.answers) || c.answers.length < 1) err('multi card needs an answers array');
      else if (c.answers.some((i) => !Number.isInteger(i) || i < 0 || i >= c.options.length)) err('answers index out of range');
      else if (c.answers.length === c.options.length) err('multi card needs at least one wrong option');
    }
    if (c.format === 'mcq' || c.format === 'scenario') {
      if (!Array.isArray(c.options) || c.options.length < 2 || c.options.length > 4) err('needs 2–4 options');
      else if (!Number.isInteger(c.answer) || c.answer < 0 || c.answer >= c.options.length) err('answer index out of range');
      else if (new Set(c.options).size !== c.options.length) err('duplicate options');
    }
    if (c.diagram) {
      const d = c.diagram;
      if (!['top', 'side'].includes(d.view)) err('diagram.view must be "top" or "side"');
      if (!d.alt) err('diagram needs alt text');
      const pts = [...(d.path || []), ...(d.bounces || []), ...(d.corners || []), ...(d.marks || []).map((m) => m.at)];
      for (const p of pts) if (!Array.isArray(p) || p.length !== 2 || p.some((n) => typeof n !== 'number')) err('diagram point must be [x, y]');
      const key = (p) => p.join(',');
      for (const b of [...(d.bounces || []), ...(d.corners || [])]) if (!(d.path || []).some((p) => key(p) === key(b))) err(`bounce/corner ${key(b)} is not on the path`);
    }
    const k = `${deck.pack}/${c.level}`;
    counts[k] = (counts[k] || 0) + 1;
  }
}

console.log('Cards per pack/level:', counts, `total ${seen.size}`);
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('All cards valid.');
