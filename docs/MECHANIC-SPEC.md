# Mechanic specification

## Folder contract

```text
mechanics/0002-block-placement-puzzle/
  test.js            node:test file, runs with `npm test`
  env.js             optional bot interface (see below)
  levels.json        only when levels is "data" (see LEVELS.md)
  solver.js          only when levels is "data" (see LEVELS.md)
  www/
    logic.js         pure rules, no DOM, no clock
    index.html       canvas screen that loads logic.js
    manifest.json    optional PWA manifest
    icon.svg
```

The folder name is `<id>-<slug>` and must match an entry in `registry/mechanics.json`.

## Status ladder

| Status | Meaning | Files required |
|---|---|---|
| `idea` | Listed, nothing written | none (the folder must not exist) |
| `spec` | Rules written down | none yet |
| `logic` | Rules implemented and tested | `www/logic.js`, `test.js` |
| `playable` | A person can play it | plus `www/index.html` |
| `polished` | Art, sound and feel reviewed by a person | same files |
| `shipped` | Released on a store | same files |

`bot` is a separate flag. When it is `true`, `env.js` must exist.

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

## `env.js` (bot interface, draft)

```js
reset(seed)            // -> state
legalActions(state)    // -> array of actions (plain JSON values)
step(state, action)    // -> { state, reward, done }
observe(state)         // -> plain JSON the bot may see
score(state)           // -> number
```

This is a draft. It is meant to be small enough that a random bot, a scripted bot and a learning agent can all use it. It is finalised in Phase 1 of the [roadmap](ROADMAP.md) before more modules are written.

## Registry entry

```json
{ "id": "0002", "slug": "block-placement-puzzle", "name": "Block Placement Puzzle",
  "title": "Block Master", "family": "Puzzle", "status": "playable", "levels": "endless", "bot": false, "source": "project" }
```

`title` is the name of our own game built on that mechanic and is used as the Android app name. `source` is `steam-tag`, `classic` or `project`.
