# Coin Forge (0169 — Clicker)

## Rules
Mint as many gold coins as possible within a `150`-step forge shift by balancing anvil strikes and three compounding workshop upgrades.
- **Formulas**:
  - `multiplier = 1 + multLevel`
  - `passive = autoLevel * 2 * multiplier`
  - `'tap'`: rolls a `12%` critical strike (`2x`), minting `(1 + tapLevel * 2) * multiplier * (crit ? 2 : 1) + passive` coins.
  - `'tick'` (available when `autoLevel > 0`): advances one idle step, minting `passive` coins.
  - Upgrades (`'up_tap'`, `'up_auto'`, `'up_mult'`): spend `coins` to raise `tapLevel` (base cost `12`, `×1.65`), `autoLevel` (base cost `18`, `×1.65`), or `multLevel` (base cost `55`, `×2.1`), then collect `passive` income for that step.
- Shift ends when `stepCount >= 150`.

## State
- `coins`: integer `>= 0` (spendable balance)
- `totalMinted`: integer `>= 0` (cumulative coins forged)
- `tapLevel`: integer `>= 0`
- `autoLevel`: integer `>= 0`
- `multLevel`: integer `>= 0`
- `lastCrit`: boolean
- `stepCount`: integer `0..150`
- `rng`: integer 32-bit PRNG state

## Actions
 Subset of `['tap', 'tick', 'up_tap', 'up_auto', 'up_mult']` currently affordable/unlocked (`[]` when `stepCount >= 150`).

## Score
`state.totalMinted`
