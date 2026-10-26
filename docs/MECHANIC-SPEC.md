# Mechanic specification

## Folder contract

```text
mechanics/0002-block-placement-puzzle/
  SPEC.md            optional rules and state specification
  test.js            node:test file, runs with `npm test`
  levels.json        only when levels is "data" (see LEVELS.md)
  solver.js          only when levels is "data" (see LEVELS.md)
  www/
    logic.js         pure rules (and bot interface when bot is true), no DOM, no clock
    index.html       canvas screen that loads logic.js
    manifest.json    PWA manifest (required for playable status)
    sw.js            offline service worker (required for playable status)
    icon.svg         vector app icon (required for playable status)
```

The folder name is `<id>-<slug>` and must match an entry in `registry/mechanics.json`.

## Status ladder

| Status | Meaning | Files required |
|---|---|---|
| `idea` | Listed, nothing written | none (the folder must not exist) |
| `spec` | Rules written down | none yet |
| `logic` | Rules implemented and tested | `www/logic.js`, `test.js` |
| `playable` | A person can play it | plus `www/index.html`, `www/manifest.json`, `www/sw.js`, `www/icon.svg` |
| `polished` | Art, sound and feel reviewed by a person | same files |
| `shipped` | Released on a store | same files |

`bot` is a separate flag. When it is `true`, `www/logic.js` must export the standard bot interface and pass `npm run bots:check`.

`levels` is `none`, `endless` or `data` and is required from `logic` upward. The contract for `data` levels is in [LEVELS.md](LEVELS.md).

`npm run registry:check` enforces this table.

## `logic.js` rules

- Works in the browser and in Node: attach to `module.exports` when it exists, otherwise to a global.
- No DOM, no `Date.now`, no `Math.random`. Randomness comes from a seeded generator so a seed reproduces a game.
- Mutations happen through a small number of functions, each returning a result object that says what changed.
- No network, no storage. The screen handles persistence.

## `test.js` rules

- `node:test` and `node:assert/strict`, no dependencies, no network.
- Cover the rules, the edge cases (borders, empty input, game over) and determinism (same seed, same game).
- **Independence:** the tests should come from examples a person states ("this move must give this board"), not only from whoever wrote `logic.js`. Tests written by the same model that wrote the logic copy the same misunderstanding.

## Bot interface (in `www/logic.js`)

When `bot` is `true`, `www/logic.js` exports these five functions:

```js
createState(seed)      // -> plain JSON state (integer rng state stored inside)
legalActions(state)    // -> array of distinct legal actions (empty when isOver(state) is true)
step(state, action)    // -> mutates state in place, returns { reward: number, done: boolean }; throws Error on illegal action
isOver(state)          // -> boolean
score(state)           // -> finite number
```

`tools/writer/contract_check.js` and `npm run bots:check` verify purity, JSON serialisability, seed determinism, illegal-action rejection without state mutation, consistency between `done`, `isOver` and `legalActions`, and bounded termination across 20 random seeds.

## Registry entry

```json
{ "id": "0002", "slug": "block-placement-puzzle", "name": "Block Placement Puzzle",
  "title": "Block Master", "family": "Puzzle", "status": "playable", "levels": "endless", "bot": false, "source": "project" }
```

`title` is the name of our own game built on that mechanic and is used as the Android app name. `source` is `steam-tag`, `classic` or `project`.
