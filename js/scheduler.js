// SM-2 "lite" spaced-repetition scheduler.
// Grades: 0 = Again, 1 = Hard, 2 = Good, 3 = Easy.
// A card state is { interval (days), ease, reps, lapses, due (ms), last (ms) }.

export const MIN = 60 * 1000;
export const DAY = 24 * 60 * MIN;
export const LEARNED_DAYS = 7;          // interval at which a card counts as "learned"
const AGAIN_DELAY = 10 * MIN;
const NEW_STEPS = [0, 1, 3, 7];         // days for Hard/Good/Easy on a new card
const RELEARN_STEPS = [0, 1, 1, 3];     // days for Hard/Good/Easy after a lapse
const MIN_EASE = 1.3;

export function freshState() {
  return { interval: 0, ease: 2.5, reps: 0, lapses: 0, due: 0, last: 0 };
}

/** Return the new state after grading. Does not mutate the input. */
export function schedule(prev, grade, now = Date.now()) {
  const s = { ...freshState(), ...(prev || {}) };
  if (s.interval === 0) {
    // New card, or a card being relearned after "Again".
    if (grade === 0) {
      s.due = now + AGAIN_DELAY;
    } else {
      s.interval = (s.lapses > 0 ? RELEARN_STEPS : NEW_STEPS)[grade];
      if (grade === 1) s.ease = Math.max(MIN_EASE, s.ease - 0.15);
      if (grade === 3) s.ease += 0.15;
    }
  } else if (grade === 0) {
    s.lapses += 1;
    s.ease = Math.max(MIN_EASE, s.ease - 0.2);
    s.interval = 0;
    s.due = now + AGAIN_DELAY;
  } else if (grade === 1) {
    s.ease = Math.max(MIN_EASE, s.ease - 0.15);
    s.interval = Math.max(s.interval + 1, Math.round(s.interval * 1.2));
  } else if (grade === 2) {
    s.interval = Math.max(s.interval + 1, Math.round(s.interval * s.ease));
  } else {
    s.ease += 0.15;
    s.interval = Math.max(s.interval + 2, Math.round(s.interval * s.ease * 1.3));
  }
  if (grade > 0) s.due = now + s.interval * DAY;
  s.ease = Math.round(s.ease * 100) / 100;
  s.reps += 1;
  s.last = now;
  return s;
}

/** Short label for the wait after a given grade, e.g. "10m", "3d", "2w", "4mo". */
export function previewLabel(prev, grade, now = Date.now()) {
  const next = schedule(prev, grade, now);
  return formatWait(next.due - now);
}

export function formatWait(ms) {
  const m = Math.round(ms / MIN);
  if (m < 60) return `${m}m`;
  const d = ms / DAY;
  if (d < 1) return `${Math.round(m / 60)}h`;
  if (d < 14) return `${Math.round(d)}d`;
  if (d < 60) return `${Math.round(d / 7)}w`;
  if (d < 365) return `${Math.round(d / 30)}mo`;
  return `${(d / 365).toFixed(1)}y`;
}

export function isLearned(s) {
  return !!s && s.interval >= LEARNED_DAYS;
}

export function endOfDay(now = Date.now()) {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function dayKey(now = Date.now()) {
  const d = new Date(now);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
