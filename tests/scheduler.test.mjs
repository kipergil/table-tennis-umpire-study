// Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schedule, previewLabel, isLearned, formatWait, DAY, MIN } from '../js/scheduler.js';

const T = Date.UTC(2026, 0, 1, 12);

test('new card: grade sets first interval (10m / 1d / 3d / 7d)', () => {
  assert.equal(schedule(null, 0, T).due - T, 10 * MIN);
  assert.equal(schedule(null, 0, T).interval, 0);
  assert.equal(schedule(null, 1, T).interval, 1);
  assert.equal(schedule(null, 2, T).interval, 3);
  assert.equal(schedule(null, 3, T).interval, 7);
  assert.deepEqual([0, 1, 2, 3].map((g) => previewLabel(null, g, T)), ['10m', '1d', '3d', '7d']);
});

test('review card: good multiplies by ease, again lapses', () => {
  const s1 = schedule(null, 2, T);                 // 3 days
  const s2 = schedule(s1, 2, T + 3 * DAY);         // 3 * 2.5 = 7.5 -> 8
  assert.equal(s2.interval, 8);
  assert.ok(isLearned(s2));
  const lapsed = schedule(s2, 0, T + 11 * DAY);
  assert.equal(lapsed.interval, 0);
  assert.equal(lapsed.lapses, 1);
  assert.equal(lapsed.ease, 2.3);
  assert.ok(!isLearned(lapsed));
  // relearning after a lapse uses the shorter steps
  assert.equal(schedule(lapsed, 2, T + 11 * DAY).interval, 1);
});

test('ease never drops below 1.3 and intervals always grow', () => {
  let s = schedule(null, 2, T);
  for (let i = 0; i < 20; i++) {
    const before = s.interval;
    s = schedule(s, 1, T);
    assert.ok(s.interval > before);
  }
  assert.equal(s.ease, 1.3);
});

test('does not mutate the previous state', () => {
  const s1 = schedule(null, 2, T);
  const copy = { ...s1 };
  schedule(s1, 3, T);
  assert.deepEqual(s1, copy);
});

test('formatWait labels', () => {
  assert.equal(formatWait(5 * MIN), '5m');
  assert.equal(formatWait(3 * 60 * MIN), '3h');
  assert.equal(formatWait(3 * DAY), '3d');
  assert.equal(formatWait(21 * DAY), '3w');
  assert.equal(formatWait(90 * DAY), '3mo');
});
