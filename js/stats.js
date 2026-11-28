// Stats page: overview, activity, review forecast, levels, topics, exams, trainer.
import { esc, levelTag, topicName, fmtDate } from './ui.js';
import { isLearned, dayKey, DAY, endOfDay } from './scheduler.js';
import { historyTable } from './exam.js';

let ctx = null;
export function initStats(c) { ctx = c; }

function streaks(days) {
  const keys = Object.keys(days).filter((k) => days[k].reviews > 0).sort();
  let best = 0, run = 0, prev = null;
  for (const k of keys) {
    const t = new Date(`${k}T12:00:00`).getTime();
    run = prev !== null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1;
    best = Math.max(best, run); prev = t;
  }
  let cur = 0, t = Date.now();
  if (!(days[dayKey(t)]?.reviews > 0)) t -= DAY;
  while (days[dayKey(t)]?.reviews > 0) { cur++; t -= DAY; }
  return { cur, best };
}

/**
 * Single-series bar chart as inline SVG, with a hover/focus tooltip and a table view.
 * data: [{ label, value, tip }]. Every bar has a full-height invisible hit target.
 */
function barChart(id, data, { color = 'var(--table)', unit = '', ticksEvery = 7, caption }) {
  const W = 320, H = 150, L = 28, R = 6, T = 10, B = 22;
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = niceMax(max);
  const cw = (W - L - R) / data.length;
  const bw = Math.max(2, cw - 2);                 // 2px surface gap between bars
  const y = (v) => T + (H - T - B) * (1 - v / nice);
  const grid = [0, nice / 2, nice].map((v) => `
    <line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/>
    <text x="${L - 5}" y="${y(v) + 3}" text-anchor="end" class="ax">${Math.round(v)}</text>`).join('');
  const bars = data.map((d, i) => {
    const x = L + i * cw + (cw - bw) / 2;
    const h = (H - T - B) - (y(d.value) - T);
    const r = Math.min(4, bw / 2, h);
    const path = d.value > 0 ? `M${x} ${y(0)} V${y(d.value) + r} Q${x} ${y(d.value)} ${x + r} ${y(d.value)} H${x + bw - r} Q${x + bw} ${y(d.value)} ${x + bw} ${y(d.value) + r} V${y(0)} Z` : '';
    const last = data.length - 1;
    const isTick = i % ticksEvery === 0 ? last - i >= ticksEvery / 2 || i === last : i === last;
    const tick = isTick ? `<text x="${i === last ? x + bw : x + bw / 2}" y="${H - 6}" text-anchor="${i === last ? 'end' : 'middle'}" class="ax">${esc(d.label)}</text>` : '';
    return `${path ? `<path d="${path}" fill="${color}"/>` : ''}${tick}
      <rect class="hit" x="${L + i * cw}" y="${T}" width="${cw}" height="${H - T - B}" fill="transparent" tabindex="0" data-tip="${esc(d.tip)}" aria-label="${esc(d.tip)}"/>`;
  }).join('');
  return `
  <figure class="chart" id="${id}">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(caption)}">${grid}${bars}</svg>
    <div class="tip" role="status" hidden></div>
    <details class="tview"><summary>Show as table</summary>
      <div class="tbl"><table><thead><tr><th>Day</th><th class="n">${esc(unit)}</th></tr></thead>
      <tbody>${data.filter((d) => d.value).map((d) => `<tr><td>${esc(d.tip.split(':')[0])}</td><td class="n">${d.value}</td></tr>`).join('') || '<tr><td colspan="2">No data yet</td></tr>'}</tbody></table></div>
    </details>
  </figure>`;
}

function niceMax(v) {
  const p = Math.max(1, 10 ** Math.floor(Math.log10(v)));
  // Even maximums only, so the middle gridline is a whole number.
  for (const m of [2, 4, 6, 8, 10]) if (m * p >= v) return Math.max(2, m * p);
  return v;
}

function wireTips(root) {
  root.querySelectorAll('.chart').forEach((fig) => {
    const tip = fig.querySelector('.tip');
    const show = (el) => {
      const box = fig.getBoundingClientRect(), r = el.getBoundingClientRect();
      tip.textContent = el.dataset.tip;
      tip.hidden = false;
      const left = Math.min(Math.max(0, r.left - box.left + r.width / 2 - tip.offsetWidth / 2), box.width - tip.offsetWidth);
      tip.style.left = `${left}px`;
      fig.querySelectorAll('.hit').forEach((h) => h.classList.toggle('on', h === el));
    };
    const hide = () => { tip.hidden = true; fig.querySelectorAll('.hit.on').forEach((h) => h.classList.remove('on')); };
    fig.querySelectorAll('.hit').forEach((h) => {
      h.addEventListener('pointerenter', () => show(h));
      h.addEventListener('focus', () => show(h));
      h.addEventListener('click', () => show(h));
    });
    fig.querySelector('svg').addEventListener('pointerleave', hide);
    fig.addEventListener('focusout', (e) => { if (!fig.contains(e.relatedTarget)) hide(); });
  });
}

export function renderStats() {
  const P = ctx.P;
  const pool = ctx.enabledCards();
  const days = P.days || {};
  const tot = Object.values(days).reduce((a, d) => ({ r: a.r + (d.reviews || 0), c: a.c + (d.correct || 0) }), { r: 0, c: 0 });
  const learned = pool.filter((c) => isLearned(P.cards[c.id])).length;
  const st = streaks(days);

  // Last 30 days of activity
  const act = [];
  for (let i = 29; i >= 0; i--) {
    const t = Date.now() - i * DAY, d = days[dayKey(t)] || {};
    const label = fmtDate(t);
    act.push({ label, value: d.reviews || 0, tip: `${label}: ${d.reviews || 0} answers${d.reviews ? `, ${Math.round(100 * d.correct / d.reviews)}% correct` : ''}` });
  }
  // Next 14 days of due reviews (today includes anything overdue)
  const fc = [];
  for (let i = 0; i < 14; i++) {
    const start = i === 0 ? -Infinity : endOfDay(Date.now() + (i - 1) * DAY), end = endOfDay(Date.now() + i * DAY);
    const n = pool.filter((c) => { const s = P.cards[c.id]; return s && s.due > start && s.due <= end; }).length;
    const label = i === 0 ? 'Today' : fmtDate(Date.now() + i * DAY);
    fc.push({ label, value: n, tip: `${label}: ${n} card${n === 1 ? '' : 's'} due` });
  }
  // Levels: new / learning / learned
  const levels = ctx.manifest.levels.map((l) => {
    const cs = pool.filter((c) => c.level === l.id);
    const lr = cs.filter((c) => isLearned(P.cards[c.id])).length;
    const seen = cs.filter((c) => P.cards[c.id]).length;
    return { id: l.id, total: cs.length, learned: lr, learning: seen - lr, fresh: cs.length - seen };
  });
  // Topics
  const topics = ctx.manifest.topics.map((t) => {
    const cs = pool.filter((c) => c.topic === t.id);
    if (!cs.length) return null;
    let right = 0, wrong = 0;
    cs.forEach((c) => { right += P.cards[c.id]?.right || 0; wrong += P.cards[c.id]?.wrong || 0; });
    return { id: t.id, total: cs.length, learned: cs.filter((c) => isLearned(P.cards[c.id])).length, n: right + wrong, acc: right + wrong ? Math.round(100 * right / (right + wrong)) : null };
  }).filter(Boolean).sort((a, b) => (a.acc ?? 101) - (b.acc ?? 101));
  const exams = P.exams || [];
  const tr = P.trainer || { right: 0, wrong: 0, best: 0 };

  ctx.app.innerHTML = `
  <div class="topbar"><span class="brand">Stats</span></div>
  <div class="tiles">
    <div class="tile"><span class="small">Answers</span><b>${tot.r}</b></div>
    <div class="tile"><span class="small">Correct</span><b>${tot.r ? Math.round(100 * tot.c / tot.r) : 0}%</b></div>
    <div class="tile"><span class="small">Learned</span><b>${learned}<span class="of">/${pool.length}</span></b></div>
    <div class="tile"><span class="small">Streak</span><b>${st.cur}<span class="of"> d</span></b><span class="small">best ${st.best} d</span></div>
  </div>
  <div class="panel">
    <h2 class="h">Answers per day</h2><p class="small chart-sub">Last 30 days</p>
    ${barChart('ch-act', act, { color: 'var(--table)', unit: 'Answers', caption: 'Answers per day over the last 30 days' })}
  </div>
  <div class="panel">
    <h2 class="h">Reviews coming up</h2><p class="small chart-sub">Cards due over the next 14 days</p>
    ${barChart('ch-fc', fc, { color: 'var(--ball-bar)', unit: 'Cards due', ticksEvery: 4, caption: 'Cards due for review over the next 14 days' })}
  </div>
  <div class="panel">
    <div class="spread"><h2 class="h">Levels</h2>
      <div class="legend" aria-hidden="true"><span><i class="sw s1"></i>New</span><span><i class="sw s2"></i>Learning</span><span><i class="sw s3"></i>Learned</span></div></div>
    <div class="stack">${levels.map((l) => `
      <div>
        <div class="spread small"><span>${levelTag(l.id)}</span><span class="num">${l.learned} learned · ${l.learning} learning · ${l.fresh} new</span></div>
        <div class="stackbar" role="img" aria-label="${l.learned} learned, ${l.learning} learning, ${l.fresh} new of ${l.total}">
          ${[['s3', l.learned], ['s2', l.learning], ['s1', l.fresh]].filter(([, v]) => v).map(([k, v]) => `<i class="${k}" style="flex:${v}"></i>`).join('')}
        </div>
      </div>`).join('')}
    </div>
  </div>
  <div class="panel">
    <h2 class="h">Topics</h2><p class="small chart-sub">Accuracy across all your answers, weakest first. Tap a topic to practise it.</p>
    <div class="tbl"><table>
      <thead><tr><th>Topic</th><th>Accuracy</th><th class="n">Answers</th><th class="n">Learned</th></tr></thead>
      <tbody>${topics.map((t) => `<tr class="clickrow" data-topic="${t.id}" tabindex="0">
        <td>${esc(topicName(t.id))}</td>
        <td><span class="accbar">${t.acc === null ? '<span class="small">not started</span>' : `<span class="meter ${t.acc < 60 ? 'o' : ''}"><i style="width:${t.acc}%"></i></span><span class="num">${t.acc}%</span>`}</span></td>
        <td class="n">${t.n}</td><td class="n">${t.learned}/${t.total}</td></tr>`).join('')}</tbody>
    </table></div>
  </div>
  <div class="panel">
    <div class="spread"><h2 class="h">Tests</h2><a class="small" href="#test">Take a test</a></div>
    ${exams.length ? historyTable(exams.slice(-10).reverse()) : '<p class="note">No tests yet. Switch on Test mode on the Practice page and your results will appear here.</p>'}
  </div>
  <div class="panel">
    <div class="spread"><h2 class="h">Doubles order trainer</h2><a class="small" href="#trainer">Practise</a></div>
    <p class="note">${tr.right + tr.wrong ? `${tr.right} right, ${tr.wrong} wrong (${Math.round(100 * tr.right / (tr.right + tr.wrong))}%). Best run: ${tr.best} in a row.` : 'Not tried yet.'}</p>
  </div>`;

  wireTips(ctx.app);
  ctx.app.querySelectorAll('[data-topic]').forEach((row) => {
    const go = () => ctx.startSession('drill', { what: 'topic', topic: row.dataset.topic, count: 20 });
    row.addEventListener('click', go);
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  });
}
