// Illustrations: umpire hand signals and reference figures (original drawings, inline SVG).
// Signals follow the descriptions in HMO 18.2.2 and Appendix C. Figures are referenced from
// cards by name: "answerFigures": ["edge-vs-side"] (shown with the answer) or
// "figure": "signal:point" (shown with the question).
import { diagramSVG } from './diagram.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- umpire signals ---------- */
const SKIN = '#D9A47C', JACKET = '#24375A', SHIRT = '#9EC3E6', HAIR = '#3B2F2A';
const CARD = { white: '#FFFFFF', yellow: '#F2C318', red: '#D2312A' };

// Raised-arm poses for the figure's left arm (viewer's right). [elbow, hand]
const POSES = {
  point: { elbow: [106, 58], hand: [106, 30], fist: true },
  let: { elbow: [90, 32], hand: [94, 6] },
  next: { elbow: [100, 68], hand: [118, 74], open: 'side' },
  card: { elbow: [92, 34], hand: [96, 10] }
};

export const SIGNALS = {
  point: { title: 'Point', pose: 'point', text: 'Arm nearer the winner raised: upper arm horizontal, forearm vertical, closed hand.' },
  let: { title: 'Let / stop', pose: 'let', text: 'One arm raised straight above the head. The AU uses the same signal to get the umpire’s attention.' },
  next: { title: 'Next server', pose: 'next', text: 'Open hand pointing to the player who serves next.' },
  timeout: { title: 'Time-out', pose: 'card', cards: ['white'], text: 'White card raised on the side of the player or pair taking the time-out.' },
  yellow: { title: 'Formal warning', pose: 'card', cards: ['yellow'], text: 'Yellow card held up towards the offender, without leaving the chair.' },
  'yellow-red': { title: 'Penalty point(s)', pose: 'card', cards: ['yellow', 'red'], text: 'Yellow and red cards held up together.' },
  red: { title: 'Adviser sent away', pose: 'card', cards: ['red'], text: 'Red card held up towards the adviser.' }
};

function signalSVG(name) {
  const s = SIGNALS[name];
  const p = POSES[s.pose];
  const sh = [80, 58];
  const armPath = `M${sh[0]} ${sh[1]} L${p.elbow[0]} ${p.elbow[1]} L${p.hand[0]} ${p.hand[1]}`;
  let hand;
  if (p.fist) hand = `<circle cx="${p.hand[0]}" cy="${p.hand[1] - 3}" r="6.5" fill="${SKIN}"/>`;
  else if (p.open === 'side') hand = `<ellipse cx="${p.hand[0] + 3}" cy="${p.hand[1] + 1}" rx="8" ry="4" fill="${SKIN}" transform="rotate(18 ${p.hand[0]} ${p.hand[1]})"/>`;
  else hand = `<ellipse cx="${p.hand[0]}" cy="${p.hand[1] - 4}" rx="4.5" ry="8" fill="${SKIN}"/>`;
  let cards = '';
  if (s.cards) {
    cards = s.cards.map((col, i) => {
      const x = p.hand[0] - 9 + i * 9, y = p.hand[1] - 30 + i * 3;
      return `<rect x="${x}" y="${y}" width="17" height="24" rx="2" fill="${CARD[col]}" stroke="#555" stroke-width="1" transform="rotate(${8 + i * 6} ${x + 8} ${y + 12})"/>`;
    }).join('');
  }
  return `<svg class="sig-svg" viewBox="0 -28 130 162" role="img" aria-label="Umpire signal: ${esc(s.title)}. ${esc(s.text)}">
    <circle cx="60" cy="62" r="58" fill="var(--chip)"/>
    <path d="M36 56 Q60 46 84 56 L90 112 L30 112 Z" fill="${JACKET}"/>
    <path d="M52 52 L60 70 L68 52 Z" fill="${SHIRT}"/>
    <path d="M40 60 L32 88 L46 104" fill="none" stroke="${JACKET}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="49" cy="105" r="5.5" fill="${SKIN}"/>
    <path d="${armPath}" fill="none" stroke="${JACKET}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    ${cards}${hand}
    <circle cx="60" cy="32" r="14" fill="${SKIN}"/>
    <path d="M46 30 Q47 15 60 16 Q73 15 74 30 Q68 22 60 23 Q52 22 46 30 Z" fill="${HAIR}"/>
    <rect x="6" y="104" width="118" height="30" rx="4" fill="#8C6B4F"/><rect x="6" y="104" width="118" height="5" rx="2" fill="#A7845F"/>
  </svg>`;
}

/* ---------- reference figures ---------- */
const T = (x, y, text, cls = 'dg-t', anchor = 'middle') => `<text x="${x}" y="${y}" text-anchor="${anchor}" class="${cls}">${esc(text)}</text>`;
const arrowDefs = '<defs><marker id="ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="var(--muted)"/></marker></defs>';
const dim = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--muted)" stroke-width="1.2" marker-start="url(#ah)" marker-end="url(#ah)"/>`;
const ok = (x, y) => `<circle cx="${x}" cy="${y}" r="9" fill="var(--good)"/><path d="M${x - 4} ${y} l3 3 l5 -6" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
const bad = (x, y) => `<circle cx="${x}" cy="${y}" r="9" fill="var(--red)"/><path d="M${x - 3.5} ${y - 3.5} l7 7 m0 -7 l-7 7" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`;
const svg = (vb, label, body) => `<svg class="fig-svg" viewBox="${vb}" role="img" aria-label="${esc(label)}">${arrowDefs}${body}</svg>`;

const FIGURES = {
  'table-dims': {
    caption: 'Playing surface 2.74 m × 1.525 m, 76 cm above the floor; 2 cm white side and end lines; the net is 15.25 cm high.',
    draw: () => svg('0 -12 320 212', 'Table dimensions', `
      <rect x="40" y="20" width="240" height="92" rx="2" fill="var(--table)"/>
      <rect x="42" y="22" width="236" height="88" fill="none" stroke="#fff" stroke-width="3"/>
      <line x1="160" y1="14" x2="160" y2="118" stroke="#fff" stroke-width="4"/>
      ${dim(40, 8, 280, 8)}${T(160, 5, '2.74 m')}
      ${dim(292, 20, 292, 112)}${T(300, 70, '1.525 m', 'dg-t', 'start').replace('<text', '<text transform="rotate(90 300 70)"')}
      ${T(52, 128, '2 cm white lines', 'dg-t', 'start')}
      <rect x="40" y="152" width="240" height="6" fill="var(--table)"/>
      <line x1="58" y1="158" x2="58" y2="194" stroke="var(--muted)" stroke-width="4"/><line x1="262" y1="158" x2="262" y2="194" stroke="var(--muted)" stroke-width="4"/>
      <line x1="160" y1="152" x2="160" y2="140" stroke="var(--ink)" stroke-width="2"/>
      ${T(170, 142, 'net 15.25 cm', 'dg-t', 'start')}
      <line x1="10" y1="194" x2="310" y2="194" stroke="var(--line)" stroke-width="2"/>
      ${dim(24, 152, 24, 194)}${T(30, 178, '76 cm', 'dg-t', 'start')}`)
  },
  'net-assembly': {
    caption: 'The net assembly is the net, its suspension (cord), the posts and the clamps. Top of net 15.25 cm; posts 15.25 cm high and 15.25 cm outside the side lines.',
    draw: () => svg('0 0 320 170', 'Net assembly seen from the end of the table', `
      <rect x="20" y="118" width="280" height="10" fill="var(--table)"/>
      <rect x="44" y="60" width="232" height="58" fill="url(#mesh)" stroke="var(--ink)" stroke-width="1"/>
      <defs><pattern id="mesh" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 0 L8 8 M8 0 L0 8" stroke="var(--muted)" stroke-width=".6" opacity=".6"/></pattern></defs>
      <line x1="44" y1="60" x2="276" y2="60" stroke="var(--ink)" stroke-width="3"/>
      <rect x="10" y="60" width="8" height="70" fill="var(--muted)"/><rect x="302" y="60" width="8" height="70" fill="var(--muted)"/>
      <line x1="18" y1="62" x2="44" y2="62" stroke="var(--ink)" stroke-width="1.5"/><line x1="276" y1="62" x2="302" y2="62" stroke="var(--ink)" stroke-width="1.5"/>
      <rect x="4" y="128" width="22" height="10" rx="2" fill="var(--ball-bar)"/><rect x="294" y="128" width="22" height="10" rx="2" fill="var(--ball-bar)"/>
      <line x1="20" y1="118" x2="20" y2="150" stroke="var(--line)" stroke-dasharray="3 3"/>
      ${dim(14, 156, 20, 156)}${T(30, 160, '15.25 cm outside the side line', 'dg-t', 'start')}
      ${dim(160, 60, 160, 118)}${T(166, 92, '15.25 cm', 'dg-t', 'start')}
      ${T(14, 52, 'post')}${T(306, 52, 'post')}${T(160, 50, 'net + cord')}${T(305, 150, 'clamp')}`)
  },
  'edge-vs-side': {
    caption: 'Edge: the ball touches the top edge of the playing surface (good) and usually rises. Side: it hits the vertical side (not good) and usually keeps going down.',
    draw: () => svg('0 0 320 170', 'Edge ball compared with side ball', `
      <rect x="40" y="70" width="150" height="22" fill="var(--table)"/>
      <rect x="40" y="70" width="150" height="3" fill="#fff"/>
      ${T(100, 112, 'table, seen from the side')}
      <path d="M260 20 Q215 40 190 70" fill="none" stroke="var(--good)" stroke-width="2.5" stroke-dasharray="5 4"/>
      <path d="M190 70 Q215 45 250 50" fill="none" stroke="var(--good)" stroke-width="2.5"/>
      <circle cx="190" cy="70" r="5" fill="var(--ball-bar)"/>
      ${ok(268, 50)}${T(268, 74, 'EDGE: good', 'dg-t strong')}
      <path d="M280 120 Q235 108 190 84" fill="none" stroke="var(--red)" stroke-width="2.5" stroke-dasharray="5 4"/>
      <path d="M190 84 Q200 110 214 150" fill="none" stroke="var(--red)" stroke-width="2.5"/>
      <circle cx="190" cy="84" r="5" fill="var(--ball-bar)"/>
      ${bad(226, 150)}${T(262, 140, 'SIDE: not good', 'dg-t strong')}`)
  },
  'doubles-halves': {
    caption: 'Doubles service: from the server’s right half-court to the receiver’s right half-court (shaded). The centre line counts as part of each right half-court.',
    draw: () => diagramSVG({ view: 'top', doubles: true, alt: 'Doubles half-courts: the service goes from the server’s right half-court diagonally to the receiver’s right half-court',
      zones: [[0, 50, 50, 100], [50, 0, 100, 50]], path: [[-6, 78], [24, 72], [76, 30]], bounces: [[24, 72], [76, 30]],
      marks: [{ at: [2, 93], type: 'ring', text: 'server’s right half', pos: 'right' }, { at: [54, 8], type: 'ring', text: 'receiver’s right half', pos: 'right' }] })
  },
  'service-zone': {
    caption: 'From the start of service until it is struck, the ball must be above the level of the playing surface and behind the server’s end line (shaded).',
    draw: () => svg('0 0 320 170', 'Service zone: above the playing surface and behind the end line', `
      <rect x="8" y="16" width="86" height="102" fill="var(--good)" opacity=".18"/>
      <line x1="94" y1="10" x2="94" y2="150" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="4 3"/>
      <line x1="8" y1="118" x2="94" y2="118" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="4 3"/>
      <rect x="94" y="118" width="210" height="8" fill="var(--table)"/>
      <line x1="200" y1="118" x2="200" y2="92" stroke="var(--ink)" stroke-width="2"/>
      <circle cx="60" cy="56" r="6" fill="var(--ball-bar)"/>${ok(60, 32)}
      <circle cx="130" cy="96" r="6" fill="var(--ball-bar)"/>${bad(130, 72)}${T(130, 58, 'over the table')}
      <circle cx="60" cy="140" r="6" fill="var(--ball-bar)"/>${bad(84, 140)}${T(10, 162, 'below the surface', 'dg-t', 'start')}
      ${T(51, 12, 'ball here ✓')}${T(98, 162, 'end line (extends indefinitely)', 'dg-t', 'start')}`)
  },
  'palm': {
    caption: 'The ball must rest freely on the open palm of the stationary free hand: not on the fingertips, and not gripped.',
    draw: () => {
      const hand = (x, fingersUp) => `<rect x="${x - 26}" y="70" width="52" height="40" rx="12" fill="${SKIN}"/>
        ${[-18, -6, 6, 18].map((dx) => `<rect x="${x + dx - 5}" y="${fingersUp ? 40 : 52}" width="10" height="${fingersUp ? 36 : 24}" rx="5" fill="${SKIN}"/>`).join('')}
        <rect x="${x + 22}" y="78" width="20" height="10" rx="5" fill="${SKIN}" transform="rotate(-20 ${x + 22} 78)"/>`;
      return svg('0 0 320 160', 'Correct and incorrect ways to hold the ball for service', `
        ${hand(56, false)}<circle cx="56" cy="80" r="9" fill="#fff" stroke="var(--muted)"/>${ok(56, 132)}${T(56, 154, 'open palm')}
        ${hand(160, true)}<circle cx="154" cy="36" r="9" fill="#fff" stroke="var(--muted)"/>${bad(160, 132)}${T(160, 154, 'on the fingers')}
        <circle cx="264" cy="66" r="9" fill="#fff" stroke="var(--muted)"/>
        <rect x="238" y="70" width="52" height="40" rx="12" fill="${SKIN}"/>
        ${[0, 1, 2, 3].map((i) => `<rect x="240" y="${66 + i * 10}" width="48" height="11" rx="5.5" fill="${SKIN}" stroke="#B9835E" stroke-width="1"/>`).join('')}
        <rect x="226" y="80" width="18" height="10" rx="5" fill="${SKIN}" stroke="#B9835E" stroke-width="1"/>${bad(264, 132)}${T(264, 154, 'gripped in the fingers')}`);
    }
  },
  'toss': {
    caption: 'Toss near vertically (within a few degrees), without spin, rising at least 16 cm after leaving the palm.',
    draw: () => svg('0 0 320 170', 'Legal and illegal service tosses', `
      <line x1="10" y1="140" x2="310" y2="140" stroke="var(--line)" stroke-width="2"/>
      <line x1="10" y1="60" x2="310" y2="60" stroke="var(--muted)" stroke-dasharray="4 4"/>${T(310, 54, '16 cm above the palm', 'dg-t', 'end')}
      <circle cx="60" cy="134" r="6" fill="var(--ball-bar)"/><line x1="60" y1="128" x2="62" y2="40" stroke="var(--good)" stroke-width="2.5" stroke-dasharray="5 4"/>${ok(60, 22)}${T(60, 160, 'near vertical')}
      <circle cx="160" cy="134" r="6" fill="var(--ball-bar)"/><line x1="160" y1="128" x2="164" y2="96" stroke="var(--red)" stroke-width="2.5" stroke-dasharray="5 4"/>${bad(160, 80)}${T(160, 160, 'too low')}
      <circle cx="250" cy="134" r="6" fill="var(--ball-bar)"/><line x1="250" y1="128" x2="292" y2="44" stroke="var(--red)" stroke-width="2.5" stroke-dasharray="5 4"/>${bad(296, 26)}${T(262, 160, 'diagonal')}`)
  },
  'obstruction-zone': {
    caption: 'Obstruction: touching the ball while it is above or travelling towards your court, before it has bounced there. Once it has passed your end line, or gone out over a side line, there is no obstruction.',
    draw: () => svg('0 0 320 170', 'Where touching the ball is obstruction', `
      <rect x="20" y="118" width="230" height="8" fill="var(--table)"/>
      <line x1="135" y1="118" x2="135" y2="92" stroke="var(--ink)" stroke-width="2"/>
      <rect x="136" y="20" width="114" height="98" fill="var(--red)" opacity=".16"/>
      ${T(193, 40, 'obstruction', 'dg-t strong')}${T(193, 54, '(before the bounce)')}
      <rect x="252" y="20" width="62" height="130" fill="var(--good)" opacity=".16"/>
      ${T(283, 40, 'no', 'dg-t strong')}${T(283, 54, 'obstruction')}
      <line x1="251" y1="14" x2="251" y2="150" stroke="var(--ink)" stroke-dasharray="4 3"/>${T(251, 164, 'B’s end line')}
      <path d="M30 70 Q130 20 210 80" fill="none" stroke="var(--ball-bar)" stroke-width="2.5" stroke-dasharray="5 4"/>
      ${T(70, 164, 'A')}${T(193, 164, 'B’s court')}`)
  },
  'score-indicator': {
    caption: 'Score indicator: small numbers for games, large numbers for points. Change the games score only when the points are reset just before the next game, never showing a game’s result on both at once.',
    draw: () => svg('0 0 320 150', 'Score indicator with games and points', `
      <rect x="40" y="16" width="240" height="110" rx="8" fill="var(--surface)" stroke="var(--line)" stroke-width="2"/>
      <rect x="62" y="30" width="36" height="30" rx="4" fill="var(--chip)"/><rect x="222" y="30" width="36" height="30" rx="4" fill="var(--chip)"/>
      ${T(80, 52, '1', 'fig-num-s')}${T(240, 52, '1', 'fig-num-s')}
      <rect x="104" y="40" width="50" height="70" rx="6" fill="var(--table)"/><rect x="166" y="40" width="50" height="70" rx="6" fill="var(--table)"/>
      ${T(129, 90, '11', 'fig-num')}${T(191, 90, '7', 'fig-num')}
      ${T(80, 76, 'games')}${T(240, 76, 'games')}${T(160, 140, 'end of game 3, before the reset')}`)
  }
};

export const FIGURE_NAMES = [...Object.keys(FIGURES), ...Object.keys(SIGNALS).map((s) => `signal:${s}`)];

/** One figure (reference figure or signal) with its caption. */
export function figureHTML(name, { compact = false } = {}) {
  if (name.startsWith('signal:')) {
    const k = name.slice(7), s = SIGNALS[k];
    if (!s) return '';
    return `<figure class="sig ${compact ? 'compact' : ''}">${signalSVG(k)}<figcaption><b>${esc(s.title)}</b>${compact ? '' : `<span>${esc(s.text)}</span>`}</figcaption></figure>`;
  }
  const f = FIGURES[name];
  if (!f) return '';
  return `<figure class="fig">${f.draw()}<figcaption>${esc(f.caption)}</figcaption></figure>`;
}

/** The umpire signals a card's answer involves, derived from its text (so every card benefits). */
export function signalsFor(c) {
  const out = new Set();
  const txt = `${c.umpire?.signal || ''}`.toLowerCase();
  if (txt) {
    if (/yellow and red|yellow\/red/.test(txt)) out.add('yellow-red');
    else if (/yellow card/.test(txt)) out.add('yellow');
    else if (/red card/.test(txt)) out.add('red');
    if (/white card/.test(txt)) out.add('timeout');
    else if (/raise (one |an )?arm above|raise arm above|arm raised above/.test(txt)) out.add('let');
    if (/point signal|arm nearer|indicate point/.test(txt)) out.add('point');
    if (/open hand to (the )?(next )?server|point with (an )?open hand/.test(txt)) out.add('next');
  }
  if (c.format === 'call') {
    if (['A', 'X', 'AB', 'XY'].includes(c.key)) out.add('point');
    if (c.key === 'let') out.add('let');
  }
  return [...out];
}
