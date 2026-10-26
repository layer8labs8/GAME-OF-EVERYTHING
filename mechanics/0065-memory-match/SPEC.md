## Rules
Memory Match is played on a 4×4 grid (16 cards) containing 8 pairs of distinct symbols (values 0–7). All cards start face down. The player has 20 turns. Each turn consists of flipping two cards sequentially:
- First flip: choose a face‑down, unmatched card → it turns face up.
- Second flip: choose another face‑down, unmatched card → it turns face up.
  * If the two symbols match, both cards stay face up and are marked **matched**. The player earns a reward.
  * If they differ, both cards are flipped face down again. The player loses a turn and receives a penalty.
A turn is consumed after the second flip. The game ends when:
- All 8 pairs are matched (win), or
- Turns run out (lose), or
- 400 total flips (steps) have been executed (forced end).

## State
The state is a plain JSON object with the following fields:

- `grid`: Array[16] of objects, each with:
  - `symbol`: integer 0–7 (the card’s hidden value)
  - `faceUp`: boolean (true if currently visible)
  - `matched`: boolean (true if permanently revealed and removed from play)
- `turnsLeft`: integer ≥ 0, remaining turns (starts at 20)
- `firstFlip`: integer 0–15 or `null`; index of the first card flipped in the current turn, or `null` if no card has been flipped yet this turn
- `stepCount`: integer ≥ 0; number of flip actions taken so far
- `rng`: integer; current seed of a linear congruential generator (used only during initial shuffle)

## Actions
An action is an integer `0`–`15` representing the index of the card to flip.  
Legal actions are all indices `i` where `grid[i].faceUp === false` and `grid[i].matched === false`, and additionally `i !== firstFlip` when `firstFlip !== null`.

## Step rules
`step(state, action)` mutates `state` and returns `{ reward: number, done: boolean }`.

1. If `action` not in `legalActions(state)`, throw `Error`.
2. Increment `state.stepCount`.
3. If `state.firstFlip === null` (first flip of a turn):
   - Set `state.grid[action].faceUp = true`.
   - Set `state.firstFlip = action`.
   - `reward = 0`.
4. Else (second flip of a turn):
   - Let `i = state.firstFlip`, `j = action`.
   - Set `state.grid[j].faceUp = true`.
   - If `state.grid[i].symbol === state.grid[j].symbol` (match):
        - Set `state.grid[i].matched = state.grid[j].matched = true`.
        - `reward = 10`.
   - Else (mismatch):
        - Set `state.grid[i].faceUp = state.grid[j].faceUp = false`.
        - `reward = -1`.
   - Decrement `state.turnsLeft` by 1.
   - Set `state.firstFlip = null`.
5. After the above, check termination:
   - If all cards have `matched === true`: `done = true`, `reward += 50` (win bonus).
   - Else if `state.turnsLeft === 0`: `done = true`.
   - Else if `state.stepCount >= 400`: `done = true`.
   - Else `done = false`.
6. Return `{ reward, done }`.

## Score
`score(state)` returns a number computed solely from the current state:
```
matchedPairs = number of indices i with state.grid[i].matched === true / 2
base = matchedPairs * 10
bonus = (matchedPairs === 8) ? 50 : 0
return base + bonus
```

## Examples
All examples use a 4×4 grid with indices 0–15 (row‑major). The symbol layout for these examples is fixed as:
```
indices:  0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
symbols:  0  0  1  1  2  2  3  3  4  4  5  5  6  6  7  7
```
(So pairs are (0,1), (2,3), (4,5), (6,7), (8,9), (10,11), (12,13), (14,15).)

### Example 1 – First flip
**Situation**:  
`turnsLeft=20`, `firstFlip=null`, `stepCount=5`, all cards `faceUp=false`, `matched=false`.  
**Action**: `0`  
**After step**:  
`grid[0].faceUp=true`, `firstFlip=0`, `stepCount=6`, `turnsLeft=20`, `reward=0`, `done=false`.

### Example 2 – Second flip matches
**Situation**:  
`turnsLeft=20`, `firstFlip=0` (card 0 is face up, symbol 0), `stepCount=6`, card 1 is face down, symbol 0, all others face down.  
**Action**: `1`  
**After step**:  
`grid[0].matched=grid[1].matched=true`, `grid[0].faceUp=grid[1].faceUp=true`, `firstFlip=null`, `turnsLeft=19`, `stepCount=7`, `reward=10`, `done=false`.

### Example 3 – Second flip mismatches
**Situation**:  
`turnsLeft=20`, `firstFlip=0` (symbol 0), `stepCount=6`, card 2 is face down, symbol 1.  
**Action**: `2`  
**After step**:  
`grid[0].faceUp=false`, `grid[2].faceUp=false`, `firstFlip=null`, `turnsLeft=19`, `stepCount=7`, `reward=-1`, `done=false`.

### Example 4 – Winning move (last pair)
**Situation**:  
`turnsLeft=5`, `firstFlip=14` (symbol 7), `stepCount=30`, card 15 is face down, symbol 7, all other cards `matched=true`.  
**Action**: `15`  
**After step**:  
`grid[14].matched=grid[15].matched=true`, `firstFlip=null`, `turnsLeft=4`, `stepCount=31`, `reward=60` (10 + 50 bonus), `done=true`.

### Example 5 – Turns run out on a mismatch
**Situation**:  
`turnsLeft=1`, `firstFlip=4` (symbol 2), `stepCount=38`, card 6 is face down, symbol 3.  
**Action**: `6`  
**After step**:  
`grid[4].faceUp=grid[6].faceUp=false`, `firstFlip=null`, `turnsLeft=0`, `stepCount=39`, `reward=-1`, `done=true`.

### Example 6 – Step limit reached (400 steps)
**Situation**:  
`turnsLeft=10`, `firstFlip=null`, `stepCount=399`, some cards face up/matched.  
**Action**: `7` (any legal flip)  
**After step**:  
`stepCount=400`, `firstFlip=7` (if first flip) or `firstFlip=null` and `turnsLeft` decremented (if second flip), `done=true` (forced end). Reward according to match/mismatch or 0 for first flip.
