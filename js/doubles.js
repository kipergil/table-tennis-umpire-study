// Doubles serving-order logic (pure, no DOM). Laws 2.13.3–2.13.7.
//
// A game's rotation is a cycle of 4 players [s, r, partner(s), partner(r)]:
// the k-th service change has cycle[k % 4] serving to cycle[(k + 1) % 4].

export const PAIRS = [['A', 'B'], ['X', 'Y']];
export const partner = (p) => ({ A: 'B', B: 'A', X: 'Y', Y: 'X' }[p]);
export const pairOf = (p) => (p === 'A' || p === 'B' ? 0 : 1);

export function cycleFrom(server, receiver) {
  return [server, receiver, partner(server), partner(receiver)];
}

/** Number of service changes after `total` points (every 2 points, every point from 10-10). */
export function changesAfter(total) {
  return total < 20 ? Math.floor(total / 2) : 10 + (total - 20);
}

/** The player who served to `p` in a game played with `cycle`. */
export function servedTo(cycle, p) {
  const i = cycle.indexOf(p);
  return cycle[(i + 3) % 4];
}

/**
 * The cycle for game `g` (1-based), given game 1's first server/receiver and the first server
 * chosen in each later game (firstServers[g] for g >= 2). The pair serving first alternates.
 */
export function cycleForGame(g, first, firstServers) {
  let cycle = cycleFrom(first.server, first.receiver);
  for (let n = 2; n <= g; n++) {
    const s = firstServers[n];
    if (pairOf(s) !== (n % 2 === 1 ? pairOf(first.server) : 1 - pairOf(first.server))) {
      throw new Error(`Game ${n}: ${s} is not in the pair that serves first`);
    }
    cycle = cycleFrom(s, servedTo(cycle, s));
  }
  return cycle;
}

/**
 * Who serves and receives the next point.
 * @param cycle   the game's starting cycle
 * @param a       points of the pair that served first in this game
 * @param b       points of the other pair
 * @param switchAt total points at which the receiving order changes (deciding game), or null
 * @returns {server, receiver, steps}  steps lists every change of server up to now, for explanations
 */
export function whoServes(cycle, a, b, switchAt = null) {
  const total = a + b;
  let cyc = cycle.slice();
  let base = 0;                      // change index at which `cyc` starts
  const steps = [];
  const at = (t) => cyc[(changesAfter(t) - base) % 4];
  const recv = (t) => cyc[(changesAfter(t) - base + 1) % 4];
  let lastKey = null;
  for (let t = 0; t <= total; t++) {
    if (switchAt !== null && t === switchAt) {
      const s = at(t), r = recv(t);
      cyc = [s, partner(r), partner(s), r];
      base = changesAfter(t);
      steps.push({ t, server: s, receiver: partner(r), note: 'ends change; receiving order switches' });
      lastKey = `${s}${partner(r)}`;
      continue;
    }
    const key = `${at(t)}${recv(t)}`;
    if (key !== lastKey) { steps.push({ t, server: at(t), receiver: recv(t) }); lastKey = key; }
  }
  return { server: at(total), receiver: recv(total), steps };
}

const rand = (n, rnd) => Math.floor(rnd() * n);
const pick = (arr, rnd) => arr[rand(arr.length, rnd)];

/** Is a-b a score that a game can be at (not finished)? */
export function isLiveScore(a, b) {
  const hi = Math.max(a, b), lo = Math.min(a, b);
  if (hi < 11) return true;
  return lo >= 10 && hi - lo < 2;
}

/** Make a random trainer question. `rnd` defaults to Math.random (inject for tests). */
export function makeQuestion(rnd = Math.random) {
  const bestOf = pick([3, 5, 7], rnd);
  const game = 1 + rand(bestOf, rnd);
  const deciding = game === bestOf;
  const servingPair = rand(2, rnd);
  const first = { server: pick(PAIRS[servingPair], rnd), receiver: pick(PAIRS[1 - servingPair], rnd) };
  const firstServers = {};
  for (let n = 2; n <= game; n++) {
    const pair = n % 2 === 1 ? servingPair : 1 - servingPair;
    firstServers[n] = pick(PAIRS[pair], rnd);
  }
  // Score: points for the pair serving first in this game (a) and the other pair (b).
  let a, b, switchAt = null, leader = null;
  if (deciding && rnd() < 0.7) {
    // Make it past the change of ends, and say when it happened.
    leader = rand(2, rnd);
    const other = rand(5, rnd);              // the other pair's score when the leader reached 5
    const lead = 5 + rand(6, rnd);
    const oth = other + rand(Math.max(1, 10 - other), rnd);
    [a, b] = leader === 0 ? [lead, oth] : [oth, lead];
    if (!isLiveScore(a, b)) [a, b] = leader === 0 ? [Math.min(lead, 10), Math.min(oth, 9)] : [Math.min(oth, 9), Math.min(lead, 10)];
    switchAt = 5 + other;
    if (a + b < switchAt) switchAt = null;
  } else {
    do { a = rand(13, rnd); b = rand(13, rnd); } while (!isLiveScore(a, b) || (deciding && Math.max(a, b) >= 5));
  }
  const cycle = cycleForGame(game, first, firstServers);
  const ans = whoServes(cycle, a, b, switchAt);
  const gameServingPair = game % 2 === 1 ? servingPair : 1 - servingPair;
  return { bestOf, game, deciding, first, firstServers, a, b, switchAt, leader, cycle, gameServingPair, ...ans };
}
