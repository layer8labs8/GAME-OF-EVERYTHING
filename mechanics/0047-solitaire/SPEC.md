# 0047-solitaire: Klondike Solitaire

The quintessential 52-card patience puzzle featuring 7 tableau cascades, 4 suit foundation piles, stock-to-waste recycling, alternating color sequencing, and victory upon assembling all four suits.

## State
- `stock`: array of card objects `{ suit, value, faceUp: false }`
- `waste`: array of card objects (face up)
- `foundations`: dictionary `{ S: number, H: number, D: number, C: number }` (top value in each suit pile, 0 to 13)
- `tableau`: array of 7 column arrays containing card objects `{ suit, value, faceUp: boolean }`
- `stepCount`: integer (max 500)
- `cardsInFoundation`: integer (0 to 52)
- `points`: integer
- `won`: boolean
- `rng`: integer PRNG state

## Suits & Card Representation
- Suits: `'S'` (Spades, Black), `'H'` (Hearts, Red), `'D'` (Diamonds, Red), `'C'` (Clubs, Black)
- Values: `1` (Ace) through `13` (King)
- Colors: `'S'`, `'C'` are Black; `'H'`, `'D'` are Red

## Rules & Moves
1. **Foundation Building**: Built upwards from Ace (`1`) to King (`13`) strictly within the same suit.
2. **Tableau Building**: Built downwards in alternating colors (e.g. Red 8 onto Black 9).
3. **Empty Tableau Space**: Only a King (`13`) or a valid sequence headed by a King can be placed into an empty column.
4. **Card Reveal**: When the top face-down card in a column is exposed, it automatically turns face-up.
5. **Stock Recycle**: When stock is depleted, waste cards can be recycled back into stock.

## Actions
- `{ type: 'draw' }`: draws card from stock to waste, or recycles waste to stock if stock is empty
- `{ type: 'waste_to_foundation' }`: transfers top card of waste to its matching foundation pile
- `{ type: 'waste_to_tableau', col: number }`: moves top card of waste to tableau column `col`
- `{ type: 'tableau_to_foundation', col: number }`: moves top card of column `col` to its foundation pile
- `{ type: 'tableau_to_tableau', fromCol: number, cardIndex: number, toCol: number }`: moves face-up sub-stack from `fromCol` to `toCol`

## Game Over & Scoring
- Victory achieved when all 52 cards are placed in foundations (`cardsInFoundation === 52`).
- Terminated if `stepCount >= 500`.
- Score = `(won ? 1000 : 0) + cardsInFoundation * 20 + points + Math.max(0, 500 - stepCount)`.
