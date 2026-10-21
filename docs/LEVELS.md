# Levels contract

Not every mechanic needs levels. A level system belongs to mechanics where a goal can be reached and a level is a fixed puzzle (Sokoban, match-3, tower defense, platformers). Endless mechanics (runners, arcade dodgers, idle games) use a difficulty curve instead.

Each registry entry therefore has a `levels` value:

| Value | Meaning | Required files |
|---|---|---|
| `none` | A single mode, no levels | none |
| `endless` | No discrete levels; difficulty ramps with time or score | none |
| `data` | Levels are data in `levels.json`, verified by a solver | `levels.json`, `solver.js` |

`levels` is required once a mechanic reaches status `logic`. `npm run registry:check` enforces this.

## `levels.json`

```json
{
  "schema": 1,
  "mechanic": "sokoban",
  "levels": [
    {
      "id": "001",
      "name": "First push",
      "difficulty": 1,
      "data": { "grid": ["#######", "#@ $ .#", "#######"] },
      "par": 3,
      "solution": "RRR"
    }
  ]
}
```

| Field | Rule |
|---|---|
| `schema` | Always `1` |
| `mechanic` | The mechanic's slug |
| `id` | Three or more digits, unique, strictly increasing |
| `name` | Short, original, non-empty |
| `difficulty` | Integer from 1 (easiest) to 5 |
| `data` | Anything the mechanic needs to build the level; its shape is the mechanic's own |
| `par` | Length of the shortest solution. Must equal what the solver finds |
| `solution` | A solution of exactly `par` moves, replayable through the game rules |

`par` and `solution` are written by the tool, not by hand: `npm run levels:check -- --update` fills them in from the solver and then verifies the file.

## `solver.js`

Every mechanic with `levels: "data"` has a `solver.js` next to `test.js`, exporting three functions:

```js
validateLevel(data)            // -> string[]  problems; empty when the level is well formed
solve(data, { maxStates })     // -> { solvable: true | false | null, moves, states }
replay(data, moves)            // -> boolean   true when the moves solve the level
```

- `solvable: true` comes with a shortest `moves` string. `false` means the search ended with no solution. `null` means the search hit `maxStates`, so the level is not verified.
- The solver must run the real game rules from `www/logic.js`, not a copy, so a rule change cannot silently break the levels.

## What the checker enforces

`tools/check_levels.js` (run by `npm run verify` and by CI) rejects a level when:

- the file shape is wrong, an id repeats or goes backwards, or the difficulty is out of range
- `validateLevel` reports a problem
- the level is unsolvable, or too large for the solver to settle
- `par` differs from the shortest solution, or `solution` is missing, has the wrong length or does not solve the level

## Authoring rules

- Levels are original. Published level sets are usually copyrighted, so do not copy or lightly rearrange them (see [LEGAL.md](LEGAL.md)).
- Keep levels small enough for the solver to settle. A level the solver cannot settle cannot ship.
- Mark difficulty by what a player has to figure out, not only by the length of the solution.

## Adding levels

1. Add the level to `levels.json` without `par` or `solution`.
2. Run `npm run levels:check -- --update`.
3. Read the diff: the new `par` and `solution` should look plausible for the puzzle.
4. Run `npm run verify`.

## Reference implementation

`mechanics/0043-sokoban` is the first mechanic with data levels: rules in `www/logic.js`, a breadth-first solver in `solver.js`, eight levels in `levels.json`, and tests in `test.js`.

## Later

- A generator that builds solvable levels by playing the rules backwards, so levels can be produced in bulk and still verified.
- Difficulty measured by bots instead of by hand once the bot interface exists.
