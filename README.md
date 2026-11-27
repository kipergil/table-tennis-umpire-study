# Love-All: table tennis umpire flashcards

Spaced-repetition flashcards for table tennis umpires, built from:

- **Law**: *The Laws of Table Tennis*, ITTF 2023-24 (issue of 22 July 2024)
- **HMO**: ITTF *Handbook for Match Officials*, 17th edition (July 2023)

Cards come in three levels (Basic, Intermediate, Advanced) and four formats: flip, multiple choice, number recall and "Umpire's Call" scenarios. Every card cites its source clause.

## Status

| Step | Contents | State |
|---|---|---|
| 1 | Core app, scheduler, saved progress, library, backup, **62 Basic cards** | Done |
| 2 | 116 Intermediate cards, scenario diagrams | Planned |
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
js/storage.js           progress in localStorage, export/import
data/manifest.json      decks, levels, topics, sources
data/cards/*.json       card content
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

- `flip` cards use `a` (the answer).
- `number` cards use `value`, `unit`, and optionally `tolerance` and `accept`.
- `mcq` and `scenario` cards use `options` and `answer` (the index of the correct option). Options are shuffled unless `"shuffle": false`.

Progress is stored only in the browser. Use **More → Back up your progress** to save or move it.
