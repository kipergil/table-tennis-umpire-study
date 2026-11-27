# Love-All: table tennis umpire trainer

A study website for table tennis umpires, built from:

- **Law**: *The Laws of Table Tennis*, ITTF 2023-24 (issue of 22 July 2024)
- **HMO**: ITTF *Handbook for Match Officials*, 17th edition (July 2023)

Every card cites its source clause, using the official ITTF numbering.

## What's in it

- **365 cards** in three levels: Basic 83, Intermediate 147, Advanced 135. That includes an optional **Para pack** of 19 cards, switched on in **More**.
- **75 exam-style cards** (true/false and "your decision") reworded from a sample umpire exam paper, plus extra cards of the same types. Each one notes which exam question it came from, and its answer was checked against the Laws and the HMO.
- **Six card formats**: multiple choice, select all that apply, number (with a − / + stepper), "Umpire's Call" scenarios, **true or false**, and **your decision** (point to A or X, A/B or X/Y, let, or no action). Scenarios show the umpire's and assistant umpire's signal and call, and 13 have a table diagram. Drill and the library can filter by question type.
- **Spaced repetition**: review due cards, learn new ones (10 a day by default), or drill any level or topic without changing the schedule.
- **Practice exam**: choose levels, 10–50 questions, a time limit and a pass mark. You get no feedback until the end, then your score by level and topic, a review of every mistake, and a button to drill what you missed.
- **Doubles serving-order trainer**: endless random situations, including later games and the receiving-order switch at 5 in the deciding game. Each answer comes with a worked rotation.
- **Stats**: answers per day, reviews coming up, progress per level, accuracy by topic, exam history and trainer score.
- **Works offline** once opened, and can be installed on a phone with "Add to Home Screen".
- Progress stays in the browser. **More → Back up your progress** exports and restores it.
- **How to use** page (the **?** in the menu) explains how studying works, every menu option, the question types and keyboard shortcuts. First-time visitors see a welcome panel on Home that links to it.

## Deployment

The site is hosted on **Vercel**: https://table-tennis-umpire-study.vercel.app

- Every push to `main` deploys to production automatically; every other branch and pull request gets a preview link.
- The GitHub Actions workflow in `.github/workflows/check.yml` validates every card and runs the tests on pushes to `main` and on pull requests. It does not deploy anything.

## Run locally

The app loads its cards with `fetch`, so it must be served over HTTP rather than opened as a file:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Project layout

```
index.html                app shell and top menu
css/styles.css            styles (light and dark themes)
js/app.js                 routing, home, study sessions, library, settings
js/exam.js                practice exam
js/trainer.js             doubles serving-order trainer (screen)
js/doubles.js             doubles serving-order logic (no DOM, unit-tested)
js/stats.js               stats page and charts
js/help.js                "How to use" page
js/grading.js             answer checking (unit-tested)
js/scheduler.js           SM-2-style spaced-repetition scheduler (unit-tested)
js/storage.js             progress in localStorage, export/import
js/diagram.js             table diagrams for scenario cards
js/figures.js             umpire signal drawings and reference figures
js/ui.js                  shared rendering helpers
data/manifest.json        decks, levels, topics, sources
data/cards/*.json         cards: basic, intermediate, advanced, exam-style, para
sw.js                     offline cache (service worker)
manifest.webmanifest      install-as-app details; icons/ holds the icons
tools/validate-cards.mjs  card checker
tests/                    unit tests
```

## Checks

```sh
node tools/validate-cards.mjs      # every card has a valid level, topic, format, answer, range and source
node --test tests/*.test.mjs       # scheduler, grading, doubles order (3,000 random cases), offline file list
```

## Adding or editing cards

```json
{
  "id": "RLY-004", "level": "basic", "topic": "rally", "format": "scenario",
  "q": "An otherwise correct service touches the net, then bounces on the receiver's court...",
  "options": ["Let", "Point to the server", "Point to the receiver", "Play on"],
  "answer": 0,
  "detail": "Explanation shown after answering. **Bold** is supported.",
  "hint": "Optional memory hook.",
  "umpire": { "signal": "...", "call": "..." },
  "au": { "signal": "...", "call": null },
  "refs": ["Law 2.9.1.1", "HMO 11.2.1"]
}
```

- `mcq` and `scenario` cards use `options` (2–4) and `answer`, the index of the correct option. Options are shuffled unless `"shuffle": false`.
- `multi` cards ("select all that apply") use `options` (3–6) and `answers`, the indices of every correct option. An answer counts only if exactly the correct options are picked.
- `number` cards use `value` and `unit`, plus `min`, `max` and `step` for the stepper. An empty box starts at `min` or `max`, so `min` must not be the answer. `tolerance` and `accept` are optional.
- `answerFigures` (optional) adds reference figures to the answer, e.g. `["edge-vs-side"]`; `figure` puts one in the question, e.g. `"signal:point"`. Names are listed in `js/figures.js`. Umpire signal pictures are added to answers automatically from the `umpire.signal` text and from decision answers.
- Any card may have a `diagram`: a top or side view of the table with the ball path, bounces and marks. The format is documented at the top of `js/diagram.js`.
- Cards in `data/cards/para.json` belong to the optional Para pack.
- `tf` cards (true or false) use `"answer": true` or `false`, with the statement as `q`.
- `call` cards (your decision) use `"match": "singles"` (players A and X) or `"doubles"` (A/B and X/Y). The `answer` is `A`, `X`, `AB`, `XY`, `let` or `none`. The four options are added automatically.
- `basedOn` (optional) records the sample exam question a card was reworded from.
- `flip` cards (free recall with `a` as the answer) still work but are no longer used.

After adding a deck file, list it in `data/manifest.json` and in `FILES` in `sw.js`; the tests check both. Then run the checks.
