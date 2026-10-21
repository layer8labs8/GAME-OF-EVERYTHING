# Roadmap

Checked boxes are done. Unchecked boxes are intentions, not promises.

## Phase 0: foundation

- [x] Private monorepo with a registry of mechanics (idea-stage list from Steam tags and classic mechanics)
- [x] Two playable mechanics with tests: 0001 Dodge Arcade, 0002 Block Placement Puzzle
- [x] CI: tests, registry check, status check, secret scan
- [x] Per-mechanic APK workflow (GitHub Actions + Capacitor)
- [ ] APK from this repository verified on a phone

## Phase 1: contract and pilot

- [x] Level contract: `levels` registry field, `levels.json`, solver and checker ([LEVELS](LEVELS.md)), with Sokoban as the reference
- [ ] Finalise the bot interface (`env.js`)
- [ ] Build the writer-checker loop ([PIPELINE](PIPELINE.md))
- [ ] Pilot: 10 different mechanics through the loop
- [ ] Measure solved share, loops per mechanic, tokens, rejected patches

## Phase 2: scale

- [ ] 100 mechanics at `logic` or better
- [ ] Variants as parameters of base mechanics
- [ ] Independent tests from person-written examples for each mechanic

## Phase 3: bots

- [ ] Random and scripted bots for every module with `env.js`
- [ ] Difficulty and solvability numbers per level
- [ ] Decide whether training a learning agent is worth it. Fine-tuning a language model on a few hundred modules is probably less useful than retrieval over this library.

## Phase 4: art and audio

- [ ] Choose a style (pixel art, cartoon or chibi)
- [ ] Try an open image model on a free GPU notebook; review licences first
- [ ] Code-generated sound effects

## Phase 5: first release

- [ ] Pick one or two mechanics with the best chance of repeat play
- [ ] Store account, privacy policy, test group
- [ ] Rating and share prompt. No in-app payment link until store payment rules are checked.
- [ ] Measure retention (day 1, 7, 30) before building more

## Ideas parked

- An educational defence game (network security) where each level teaches one concept and is checked by simulation. Content must be sourced and reviewed; see [LEGAL](LEGAL.md).
- Making the repository public after a licence review.
