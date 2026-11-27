// Renders small table diagrams for scenario cards as inline SVG.
//
// Spec (card.diagram):
//   view:    "top" (table seen from above) or "side" (seen from the side, heights in cm)
//   alt:     text description for screen readers (required)
//   path:    [[x, y], ...]  ball path. x = 0..100 along the table, from the server's end line (0)
//            to the receiver's end line (100); negative = behind the server, >100 = beyond the receiver.
//            top view: y = 0..100 across the table (0 = far side line). side view: y = height in cm.
//   bounces: [[x, y], ...]  points where the ball touches the table (drawn as dots, path corners)
//   corners: [[x, y], ...]  other sharp turns in the path, e.g. where the server strikes the toss
//   marks:   [{ at: [x, y], type: "ring" | "x" | "dot", text?: "label", pos?: "right" }]
//   zones:   [[x1, y1, x2, y2], ...]  shaded areas (top view), e.g. correct half-courts
//   doubles: true to draw the centre line (top view)
//   guide:   { h: 24, text: "16 cm" }  dashed height line (side view)
//   labels:  { left: "Server", right: "Receiver" }

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const X0 = 47;      // pixel x of the server's end line (room behind it for the toss)
const SX = 2.2;      // pixels per 1% of table length
const SURF = 118;      // side view: y pixel of the playing surface
const SH = 1.7;        // side view: pixels per cm

export function diagramSVG(d) {
  if (!d) return '';
  const top = d.view !== 'side';
  const px = (x) => X0 + x * SX;
  const py = top ? (y) => 35 + y : (h) => SURF - h * SH;
  const pt = ([x, y]) => [px(x), py(y)];
  const out = [];

  if (top) {
    for (const [x1, y1, x2, y2] of d.zones || []) {
      out.push(`<rect x="${px(Math.min(x1, x2))}" y="${py(Math.min(y1, y2))}" width="${Math.abs(x2 - x1) * SX}" height="${Math.abs(y2 - y1)}" fill="#fff" opacity=".22"/>`);
    }
    out.unshift(`<rect x="${px(0)}" y="${py(0)}" width="${100 * SX}" height="100" rx="2" fill="var(--table)"/>`);
    out.push(`<rect x="${px(0) + 1.5}" y="${py(0) + 1.5}" width="${100 * SX - 3}" height="97" fill="none" stroke="#fff" stroke-width="2"/>`);
    if (d.doubles) out.push(`<line x1="${px(0)}" y1="${py(50)}" x2="${px(100)}" y2="${py(50)}" stroke="#fff" stroke-width="1"/>`);
    out.push(`<line x1="${px(50)}" y1="${py(-10)}" x2="${px(50)}" y2="${py(110)}" stroke="#fff" stroke-width="4"/>`);
    out.push(`<line x1="${px(50)}" y1="${py(-10)}" x2="${px(50)}" y2="${py(110)}" stroke="var(--ink)" stroke-width="1" stroke-dasharray="2 3"/>`);
    out.push(`<rect x="${px(50) - 3}" y="${py(-12)}" width="6" height="4" fill="var(--muted)"/><rect x="${px(50) - 3}" y="${py(108)}" width="6" height="4" fill="var(--muted)"/>`);
  } else {
    out.push(`<rect x="${px(0)}" y="${SURF}" width="${100 * SX}" height="6" fill="var(--table)"/>`);
    out.push(`<line x1="${px(8)}" y1="${SURF + 6}" x2="${px(8)}" y2="168" stroke="var(--muted)" stroke-width="3"/><line x1="${px(92)}" y1="${SURF + 6}" x2="${px(92)}" y2="168" stroke="var(--muted)" stroke-width="3"/>`);
    out.push(`<line x1="${px(50)}" y1="${SURF}" x2="${px(50)}" y2="${py(15.25)}" stroke="var(--ink)" stroke-width="2"/>`);
    out.push(`<line x1="${px(0)}" y1="${SURF - 40}" x2="${px(0)}" y2="${SURF + 30}" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 3"/>`);
    if (d.guide) {
      out.push(`<line x1="8" y1="${py(d.guide.h)}" x2="312" y2="${py(d.guide.h)}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="4 4"/>`);
      if (d.guide.text) out.push(`<text x="312" y="${py(d.guide.h) - 4}" text-anchor="end" class="dg-t">${esc(d.guide.text)}</text>`);
    }
  }

  if (d.path && d.path.length > 1) {
    out.push(`<path d="${smoothPath(d.path.map(pt), [...(d.bounces || []), ...(d.corners || [])].map((b) => b.join(',')), d.path)}" fill="none" stroke="var(--ball-bar)" stroke-width="2.5" stroke-dasharray="5 4" stroke-linecap="round"/>`);
  }
  for (const b of d.bounces || []) {
    const [x, y] = pt(b);
    out.push(`<circle cx="${x}" cy="${y}" r="4.5" fill="var(--ball-bar)" stroke="var(--surface)" stroke-width="1.5"/>`);
  }
  for (const m of d.marks || []) {
    const [x, y] = pt(m.at);
    if (m.type === 'ring') out.push(`<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="var(--yellow)" stroke-width="2.5"/>`);
    else if (m.type === 'x') out.push(`<path d="M${x - 6} ${y - 6}L${x + 6} ${y + 6}M${x + 6} ${y - 6}L${x - 6} ${y + 6}" stroke="var(--red)" stroke-width="3" stroke-linecap="round"/>`);
    else out.push(`<circle cx="${x}" cy="${y}" r="4" fill="var(--ink)"/>`);
    if (m.text && m.pos === 'right') {
      out.push(`<text x="${x + 11}" y="${y + 4}" class="dg-t strong">${esc(m.text)}</text>`);
    } else if (m.text) {
      const anchor = x < 70 ? 'start' : x > 250 ? 'end' : 'middle';
      out.push(`<text x="${x}" y="${y - 12}" text-anchor="${anchor}" class="dg-t strong">${esc(m.text)}</text>`);
    }
  }
  const L = d.labels || { left: 'Server', right: 'Receiver' };
  const ly = top ? 160 : 14;
  if (L.left) out.push(`<text x="${px(0)}" y="${ly}" class="dg-t">${esc(L.left)}</text>`);
  if (L.right) out.push(`<text x="${px(100)}" y="${ly}" text-anchor="end" class="dg-t">${esc(L.right)}</text>`);

  return `<svg class="diagram" viewBox="0 0 320 170" role="img" aria-label="${esc(d.alt || 'Table diagram')}">${out.join('')}</svg>`;
}

// Smooth curve through points (Catmull-Rom), with sharp corners at bounce points.
function smoothPath(points, bounceKeys, raw) {
  const segs = [];
  let cur = [points[0]];
  for (let i = 1; i < points.length; i++) {
    cur.push(points[i]);
    if (bounceKeys.includes(raw[i].join(',')) && i < points.length - 1) { segs.push(cur); cur = [points[i]]; }
  }
  segs.push(cur);
  let d = `M${f(points[0][0])} ${f(points[0][1])}`;
  for (const s of segs) {
    for (let i = 0; i < s.length - 1; i++) {
      const p0 = s[i - 1] || s[i], p1 = s[i], p2 = s[i + 1], p3 = s[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
    }
  }
  return d;
}
const f = (n) => Math.round(n * 10) / 10;
