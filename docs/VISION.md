# Vision

## Goal

A library of 2D game mechanics where each entry is a small module with tests, a playable screen and a build path to Android.

## How big is "everything"?

There is no single true number; it depends on the taxonomy.

| Source | Count |
|---|---|
| Steam popular tags | 429 (counted from Valve's public list) |
| Of those, gameplay genre or mechanic tags | about 150 (hand classification, plus or minus 30) |
| Wikipedia list of video game genres | 12 top-level genres, about 76 subgenres (approximate) |

After removing overlaps, the number of genuinely different core mechanics is probably **150 to 250** (estimate). "500" is only reachable by counting variants: a different grid, real-time instead of turn-based, different win rules. So the plan is about 200 base mechanics, and variants as parameters of a base mechanic.

## Scope

In scope: 2D, single-player first, works offline, runs in a WebView.

Out of scope for now: 3D, anything needing a game server (MMO, MOBA, online battle royale), copying any specific game.

## Why this could matter

- Hits are repeated mechanics. A tested catalogue lets a new game start at "pick a mechanic, add art".
- A standard bot interface turns the catalogue into a benchmark: 200 environments that agents can play and that give difficulty numbers.
- The same pipeline can later carry educational mechanics (for example a network-security defence game) where levels are data and solvability is checked by simulation.

## Honest limits

- Fun cannot be proven by tests. Bots measure difficulty, not enjoyment. Real players are needed.
- Reach on the stores is the hard part, not code. See [ROADMAP](ROADMAP.md).
