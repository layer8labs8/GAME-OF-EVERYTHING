# Burrow Bonk (0019 — Whack-a-Mole)

## Rules
Nine burrows on a `3 × 3` grid (`0..8`) spawn critters over a `120`-step round with `3` lives:
- `'mole'`: worth `10 + combo * 2` points when bonked; if its timer (`ttl`) expires first, `combo` resets to `0`.
- `'gold'`: worth `25 + combo * 2` points when bonked; escaping resets `combo`.
- `'bomb'`: hazard decoy — bonking it costs `1` life, resets `combo`, and deducts `15` points (letting its timer expire is safe).
- Bonking an `'empty'` burrow resets `combo` (`-2` step reward).

## State
- `holes`: array of 9 `{ kind: 'empty' | 'mole' | 'gold' | 'bomb', ttl: integer }`
- `points`: integer `>= 0`
- `combo`: integer `>= 0`
- `lives`: integer `0..3`
- `hits`: integer critters bonked
- `stepCount`: integer `0..120`
- `rng`: integer 32-bit PRNG state

## Actions
`['wait', 0, 1, 2, 3, 4, 5, 6, 7, 8]` while `!isOver(state)`, empty `[]` when over.

## Step Rules
- Resolves action (`0..8` bonks that burrow; `'wait'` skips bonking), ages remaining burrows, spawns new critters from `state.rng`, increments `stepCount`.
- Ends when `lives <= 0` or `stepCount >= 120`.

## Score
`state.points`
