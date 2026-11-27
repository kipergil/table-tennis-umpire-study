// Progress is stored only in this browser (localStorage), with export/import for backup.
const KEY = 'loveall.progress.v1';

export function defaultProgress() {
  return {
    version: 1,
    cards: {},                       // id -> scheduler state + { right, wrong }
    days: {},                        // "YYYY-MM-DD" -> { reviews, correct, fresh }
    exams: [],                       // finished exams (last 50)
    trainer: { right: 0, wrong: 0, streak: 0, best: 0 },
    settings: { newPerDay: 10, para: false }
  };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalise(JSON.parse(raw));
  } catch (e) { /* storage blocked or corrupt: start fresh */ }
  return defaultProgress();
}

export function saveProgress(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); return true; }
  catch (e) { return false; }
}

export function normalise(obj) {
  const base = defaultProgress();
  if (!obj || typeof obj !== 'object' || typeof obj.cards !== 'object') {
    throw new Error('This file is not a Love-All progress backup.');
  }
  return {
    version: 1,
    cards: obj.cards || {},
    days: obj.days || {},
    exams: Array.isArray(obj.exams) ? obj.exams : [],
    trainer: { ...base.trainer, ...(obj.trainer || {}) },
    settings: { ...base.settings, ...(obj.settings || {}) }
  };
}

export function exportJSON(p) {
  return JSON.stringify({ app: 'love-all', exported: new Date().toISOString(), ...p }, null, 1);
}
