import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cycleFrom, cycleForGame, whoServes, makeQuestion, isLiveScore, partner, pairOf, changesAfter } from '../js/doubles.js';

const ab = (r) => `${r.server}→${r.receiver}`;

test('game 1 rotation A→X→B→Y (Law 2.13.3, 2.13.5)', () => {
  const c = cycleFrom('A', 'X');
  assert.equal(ab(whoServes(c, 0, 0)), 'A→X');
  assert.equal(ab(whoServes(c, 1, 0)), 'A→X');
  assert.equal(ab(whoServes(c, 1, 1)), 'X→B');
  assert.equal(ab(whoServes(c, 3, 1)), 'B→Y');
  assert.equal(ab(whoServes(c, 4, 2)), 'Y→A');   // card GAM-202
  assert.equal(ab(whoServes(c, 5, 3)), 'A→X');
  assert.equal(ab(whoServes(c, 10, 10)), 'B→Y'); // card GAM-208
  assert.equal(ab(whoServes(c, 11, 10)), 'Y→A'); // one point each from 10-10
});

test('later games: first receiver is who served to the chosen server (Law 2.13.4)', () => {
  assert.deepEqual(cycleForGame(2, { server: 'A', receiver: 'X' }, { 2: 'Y' }), ['Y', 'B', 'X', 'A']); // card GAM-203
  assert.deepEqual(cycleForGame(2, { server: 'A', receiver: 'X' }, { 2: 'X' }), ['X', 'A', 'Y', 'B']);
  assert.throws(() => cycleForGame(2, { server: 'A', receiver: 'X' }, { 2: 'B' }), /not in the pair/);
});

test('the answer only depends on the current game’s choice (the circular order is fixed)', () => {
  const first = { server: 'A', receiver: 'X' };
  const a = cycleForGame(3, first, { 2: 'X', 3: 'A' });
  const b = cycleForGame(3, first, { 2: 'Y', 3: 'A' });
  assert.deepEqual(a, b);
});

test('deciding game: receiving order switches when a pair reaches 5 (Law 2.13.6)', () => {
  const c = cycleFrom('A', 'X');
  // 5-0: B is serving the 2nd point of a block to Y; after the switch B serves to X.
  assert.equal(ab(whoServes(c, 5, 0, 5)), 'B→X');
  // next change: previous receiver X serves to the partner of the previous server (A).
  assert.equal(ab(whoServes(c, 5, 1, 5)), 'X→A');
  // switch at an even total: 5-1 → the next server is the one due anyway, receiver swapped.
  assert.equal(ab(whoServes(c, 5, 1, 6)), 'Y→B');
});

// Independent point-by-point simulation using the wording of the laws.
function simulate(cycle, total, switchAt) {
  let s = cycle[0], r = cycle[1];
  for (let t = 1; t <= total; t++) {
    const change = t < 20 ? t % 2 === 0 : true;
    if (change) { const ns = r; r = partner(s); s = ns; }
    if (switchAt !== null && t === switchAt) r = partner(r);
  }
  return `${s}→${r}`;
}

test('random questions agree with an independent simulation', () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = 0; i < 3000; i++) {
    const q = makeQuestion(rnd);
    assert.ok(isLiveScore(q.a, q.b), `score ${q.a}-${q.b} is not a live game score`);
    assert.notEqual(pairOf(q.server), pairOf(q.receiver));
    if (q.switchAt !== null) {
      assert.ok(q.deciding && q.switchAt >= 5 && q.switchAt <= 9 && q.a + q.b >= q.switchAt);
      const lead = q.leader === 0 ? q.a : q.b;
      assert.ok(lead >= 5, 'the leader must have at least 5 points');
    }
    if (q.deciding && q.switchAt === null) assert.ok(Math.max(q.a, q.b) < 5);
    assert.equal(ab(q), simulate(q.cycle, q.a + q.b, q.switchAt), JSON.stringify(q));
  }
});

test('changesAfter', () => {
  assert.equal(changesAfter(0), 0);
  assert.equal(changesAfter(19), 9);
  assert.equal(changesAfter(20), 10);
  assert.equal(changesAfter(23), 13);
});
