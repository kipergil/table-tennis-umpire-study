// "Become an umpire" page: which umpiring levels TT Umpire Study covers, the level pathway,
// a step-by-step guide, and official links (Table Tennis England, ITTF).
// Facts from: ITTF "Umpire Career Development" (January 2025) and Table Tennis England's
// "Become an umpire" page, both checked November 2026. Requirements change, so the page says so.
import { esc } from './ui.js';

let ctx = null;
export function initUmpire(c) { ctx = c; }

const CHECKED = 'November 2026';

const LEVELS = [
  { n: 1, name: 'Basic Umpire', badge: 'l1', where: 'Local leagues and competitions',
    exam: 'Course of 16+ hours on the Laws of Table Tennis, finished with a written exam. In England: an online module and exam, then a practical session.',
    cover: 'strong', coverText: 'Strong: all the Laws, the Basic and Intermediate levels, and the 75 exam-style cards based on a Level 1 test paper.' },
  { n: 2, name: 'National Umpire', badge: 'l2', where: 'National competitions and some lower-level international events',
    exam: 'Laws and Regulations (ITTF Handbook chapters 2 and 3), the Handbook for Match Officials and the list of authorised racket coverings (LARC). Written exam, oral interview and a practical exam at the table.',
    cover: 'good', coverText: 'Good for the written exam: Intermediate and Advanced cover the Handbook for Match Officials in depth. Regulations appear where the handbook explains them. The interview and practical aren’t covered.' },
  { n: 3, name: 'International Umpire', badge: 'white', badgeName: 'White Badge', where: 'International competitions',
    exam: 'Same documents as Level 2, plus the ITTF FAQ and workflow procedures. Online preparatory course, then an online exam in English.',
    cover: 'partial', coverText: 'A solid base: the Advanced level and Test mode. Study the full Regulations, FAQ and workflow procedures as well.' },
  { n: 4, name: 'International Umpire', badge: 'blue', badgeName: 'Blue Badge', where: 'The world’s top events, including the Olympic and Paralympic Games',
    exam: 'Advanced Umpires Training, the ITTF Advanced Rules Exam in English, an interview in English and four “Meets Expectation” evaluations at international events.',
    cover: 'partial', coverText: 'Useful revision for the Advanced Rules Exam. Evaluations happen at real events.' },
  { n: 5, name: 'International Umpire', badge: 'gold', badgeName: 'Gold Badge', where: 'Major ITTF and WTT events, and mentoring other umpires',
    exam: 'Two years as Blue Badge, passing the Advanced Rules Exam again, and performance assessments averaging at least 85%.',
    cover: 'none', coverText: 'Beyond this app: based on assessed performance at events.' }
];

const COVER_LABEL = { strong: '✓ Strong', good: '✓ Good', partial: '◐ Partly', none: '— Not covered' };

const STEPS = [
  { t: 'Learn the rules', d: 'Start with the <b>Basic</b> level here, then Intermediate. Use <b>Test mode</b> on the Practice page to check you’re ready.', cta: ['#study', 'Start practising'] },
  { t: 'Take a Level 1 umpire course', d: 'No experience is needed. In England the course is an online learning module and online exam, followed by a practical session. Under 16? Clubs and schools can run the <b>Junior Umpire Award</b>.', link: ['https://ttehub.com/events/courses', 'Book a course with Table Tennis England'] },
  { t: 'Umpire as often as you can', d: 'Volunteer at local leagues, county and regional tournaments. Join your nearest <b>Technical Officials Academy</b> for support and a mentor.', link: ['https://www.tabletennisengland.co.uk/officials/technical-officials-academy/', 'Find a Technical Officials Academy'] },
  { t: 'Become a National Umpire (Level 2)', d: 'After at least a year as a Level 1 umpire, with proven experience at provincial or national level. Expect a written exam, an oral interview and a practical exam at the table. Revise with the <b>Advanced</b> level.' },
  { t: 'Go international (Level 3, White Badge)', d: 'After at least two years as a Level 2 umpire, having umpired at 3 national championships or 2 international events in the past 4 years, and with good English. Your national association can nominate you for the ITTF’s online course and exam.' },
  { t: 'Aim for Blue Badge (Level 4)', d: 'After two active years as a White Badge umpire: Advanced Umpires Training, the Advanced Rules Exam, an interview in English and four successful evaluations at international events, all within five years.' },
  { t: 'Gold Badge (Level 5)', d: 'After two years as a Blue Badge umpire: pass the Advanced Rules Exam again and average at least 85% in performance assessments.' }
];

const LINKS = [
  { group: 'Table Tennis England', items: [
    ['Become an umpire', 'The umpire pathway and how to start', 'https://www.tabletennisengland.co.uk/officials/umpire/'],
    ['Book an umpiring course', 'Upcoming courses on TTE Hub', 'https://ttehub.com/events/courses'],
    ['Officiating courses', 'Course information and future dates', 'https://www.tabletennisengland.co.uk/officials/officiating-courses/'],
    ['Technical Officials Academy', 'Local support for new officials', 'https://www.tabletennisengland.co.uk/officials/technical-officials-academy/'],
    ['Junior Umpire Award', 'For under 16s, run by clubs and schools', 'https://www.tabletennisengland.co.uk/officials/junior-umpire-award/'],
    ['Become a referee', 'The next step after umpiring', 'https://www.tabletennisengland.co.uk/officials/referee/'],
    ['Officials Pathway (PDF)', 'Pathway overview, 2021', 'https://www.tabletennisengland.co.uk/content/uploads/2021/10/Officials-Pathway-updated-1.pdf']
  ] },
  { group: 'ITTF (international)', items: [
    ['Umpire Career Development (PDF)', 'Official requirements for Levels 1–5, January 2025', 'https://assets.contentstack.io/v3/assets/blteb7d012fc7ebef7f/bltd791c35062db6b78/6778378d3e03b235e733acb2/Umpire_Career_Development_01_2025.pdf'],
    ['Umpires & Referees documents', 'Handbook for Match Officials, FAQ, procedures', 'https://www.ittf.com/committees/umpires-referees/documents'],
    ['Umpire training videos', 'Call area, hand signals, time-outs and more', 'https://www.ittf.com/committees/umpires-referees/videos/'],
    ['Authorised racket coverings (LARC)', 'The current approved list', 'https://www.ittf.com/equipment/']
  ] },
  { group: 'Outside England', items: [
    ['Your national association', 'Levels 1 and 2 are run by each country’s association. Example: USA Table Tennis umpire certification', 'https://www.usatt.org/officials/umpire-certification']
  ] }
];

const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };

export function renderUmpire() {
  ctx.app.innerHTML = `
  <div class="topbar"><button class="icon" data-act="back" aria-label="Back">←</button><span class="brand">Become an umpire</span><span class="icon-spacer"></span></div>

  <div class="panel ump-intro">
    <p>Table Tennis England and the ITTF use the same <b>five umpire levels</b>. Each country runs Levels 1 and 2, and the ITTF runs the three international badges.</p>
    <p><b>TT Umpire Study</b> is built on the ITTF <i>Laws of Table Tennis</i> (2023-24) and the <i>Handbook for Match Officials</i> (17th edition). It's strongest for <b>Levels 1 and 2</b>, and a good base for the International Umpire exam.</p>
  </div>

  <section class="panel">
    <h2 class="h">Which level does this app cover?</h2>
    <div class="ladder">
      ${LEVELS.map((l) => `
      <article class="rung">
        <div class="rung-badge ${l.badge}" aria-hidden="true">${l.n}</div>
        <div class="rung-body">
          <h3 class="rung-title">Level ${l.n}: ${esc(l.name)}${l.badgeName ? ` <span class="badge-chip ${l.badge}">${esc(l.badgeName)}</span>` : ''}</h3>
          <p class="small"><b>Where:</b> ${esc(l.where)}</p>
          <p class="small"><b>Qualifying:</b> ${esc(l.exam)}</p>
          <p class="cover cover-${l.cover}"><b>${COVER_LABEL[l.cover]}</b> ${esc(l.coverText)}</p>
        </div>
      </article>`).join('')}
    </div>
  </section>

  <section class="panel">
    <h2 class="h">How to become an umpire, step by step</h2>
    <ol class="ump-steps">
      ${STEPS.map((s) => `<li>
        <b>${esc(s.t)}</b>
        <p>${s.d}</p>
        ${s.cta ? `<a class="btn ghost slim-btn" href="${s.cta[0]}">${esc(s.cta[1])}</a>` : ''}
        ${s.link ? `<a class="ext" href="${esc(s.link[0])}" target="_blank" rel="noopener noreferrer">${esc(s.link[1])} ↗</a>` : ''}
      </li>`).join('')}
    </ol>
    <p class="small">Want to run competitions? Refereeing is a separate pathway that starts from the Level 1 umpire qualification.</p>
  </section>

  <section class="panel">
    <h2 class="h">Useful links</h2>
    ${LINKS.map((g) => `
      <h3 class="h3">${esc(g.group)}</h3>
      <div class="link-grid">
        ${g.items.map(([title, desc, url]) => `
        <a class="link-card" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
          <b>${esc(title)} <span aria-hidden="true">↗</span></b>
          <span class="small">${esc(desc)}</span>
          <span class="link-host">${esc(host(url))}</span>
        </a>`).join('')}
      </div>`).join('')}
  </section>

  <p class="small ump-note">Requirements, prices and course formats change. Details on this page were checked in ${CHECKED} against Table Tennis England and the ITTF's <i>Umpire Career Development</i> document (January 2025). Always confirm with Table Tennis England or your national association before booking.</p>`;

  ctx.app.querySelector('[data-act="back"]').addEventListener('click', () => {
    const to = ctx.prevRoute && ctx.prevRoute !== 'umpire' ? ctx.prevRoute : 'home';
    ctx.go(to);
  });
}
