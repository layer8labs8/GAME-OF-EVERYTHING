# Twenty-One (0086 — Blackjack)

## Rules
Play a `5`-hand series starting with `100` chips (`20` base bet per hand) against a dealer who stands on all `17`s.
- **Card Values**: `2..10` face value, `J/Q/K = 10`, `A = 11` or `1` (reduced from `11` to `1` while total exceeds `21`).
- **Opening Naturals**: A 2-card `21` resolves immediately (`+30` 3:2 payout for player Blackjack, `0` push if dealer also has `21`, `-20` if only dealer has `21`).
- **Player Actions** (`phase === 'player'`):
  - `'hit'`: draw one card; busting (`> 21`) loses `currentBet`; hitting `21` auto-stands.
  - `'stand'`: dealer reveals hole card and draws while total `< 17`, then hands are compared.
  - `'double'`: available on opening 2 cards when `chips >= 40`; doubles `currentBet` to `40`, draws one card, and stands.
- **Between Hands** (`phase === 'between'`): `'deal'` advances to the next hand until `5` hands finish or `chips < 20`.

## State
- `shoe`: array of card integers `0..51`
- `player`: array of card integers
- `dealer`: array of card integers
- `revealDealer`: boolean
- `chips`: integer `>= 0`
- `currentBet`: integer (`20` or `40`)
- `round`: integer `1..5`
- `phase`: `'player' | 'between' | 'over'`
- `handResult`: `'none' | 'blackjack' | 'win' | 'push' | 'lose' | 'bust'`
- `stepCount`: integer
- `rng`: integer 32-bit PRNG state

## Actions
- `'player'` phase: `['hit', 'stand']` (plus `'double'` on 2 cards if `chips >= 40`)
- `'between'` phase: `['deal']`
- `'over'` phase: `[]`

## Score
`state.chips`
