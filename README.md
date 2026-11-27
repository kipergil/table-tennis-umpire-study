# Love-All: table tennis umpire flashcards

Spaced-repetition flashcards for table tennis umpires, built from:

- **Law**: *The Laws of Table Tennis*, ITTF 2023-24 (issue of 22 July 2024)
- **HMO**: ITTF *Handbook for Match Officials*, 17th edition (July 2023)

Cards come in three levels (Basic, Intermediate, Advanced) and four formats: multiple choice, select all that apply, number (with − / + stepper) and "Umpire's Call" scenarios. Every card cites its source clause.

## Status

| Step | Contents | State |
|---|---|---|
| 1 | Core app, scheduler, saved progress, library, backup, **62 Basic cards** | Done |
| 2 | **116 Intermediate cards** (112 core + 4 in the Para pack), table diagrams on scenario cards | Done |
| 3 | 112 Advanced cards, Para pack, doubles order trainer, configurable exam, offline mode, GitHub Pages | Planned |

## Run locally

The app loads its cards with `fetch`, so it must be served over HTTP rather than opened as a file:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Project layout

```
index.html              app shell
css/styles.css          styles (light and dark themes)
js/app.js               views, study sessions, library, settings
js/scheduler.js         SM-2-style spaced-repetition scheduler
js/diagram.js           table diagrams (top and side views) for scenario cards
js/storage.js           progress in localStorage, export/import
data/manifest.json      decks, levels, topics, sources
data/cards/*.json       card content (basic, intermediate, para pack)
tools/validate-cards.mjs  card checker
tests/                  scheduler tests
```

## Checks

```sh
node tools/validate-cards.mjs      # every card has a valid level, topic, format, answer and source
node --test tests/*.test.mjs       # scheduler tests
```

## Card format

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

- `number` cards use `value`, `unit`, and `min`, `max`, `step` for the − / + stepper (an empty box starts at `min` or `max`, so `min` must not be the answer). Optional: `tolerance`, `accept`.
- `multi` cards ("select all that apply") use `options` (3–6) and `answers` (indices of every correct option). The answer only counts if exactly the correct options are selected.
- `flip` cards (free recall, using `a` for the answer) are still supported by the app but no longer used, because self-graded recall proved less clear on a web page.
- `mcq` and `scenario` cards use `options` and `answer` (the index of the correct option). Options are shuffled unless `"shuffle": false`.
- Any card may have a `diagram`: a top or side view of the table with the ball path, bounces and marks. The format is documented at the top of `js/diagram.js`.
- Cards in `data/cards/para.json` belong to the optional Para pack, shown only when it is switched on in **More**.

Progress is stored only in the browser. Use **More → Back up your progress** to save or move it.
