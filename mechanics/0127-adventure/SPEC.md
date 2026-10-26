# 0127-adventure: Isle of Whispers

Classic narrative adventure game featuring interconnected island locations, environmental item puzzles, dialogue clues, quest progression, and lighthouse beacon signaling.

## State
- `currentRoom`: string (`'shore'`, `'jungle'`, `'ruins'`, `'caves'`, `'cliff'`)
- `stepCount`: integer (max 150)
- `inventory`: array of item ids (strings)
- `roomItems`: dictionary mapping room id to array of item ids currently lying on ground
- `flags`: dictionary of story/puzzle milestones:
  - `talkedSailor`: boolean
  - `monkeyFed`: boolean
  - `chestUnlocked`: boolean
  - `templeOpened`: boolean
  - `beaconFixed`: boolean
  - `beaconLit`: boolean
- `questsCompleted`: integer (0 to 5)
- `won`: boolean
- `rng`: integer PRNG state

## Actions
- Navigation:
  - `{ type: 'go', room: string }`: moves to connected adjacent location
- Inventory & Item interaction:
  - `{ type: 'take', item: string }`: collects an item from current room into inventory
  - `{ type: 'use', item: string, target: string }`: uses inventory item on environmental fixture in room
  - `{ type: 'talk', npc: string }`: converses with NPC in room
  - `{ type: 'inspect', target: string }`: examines fixture for clues

## Puzzles & Solutions
1. **Shipwreck Chest**: Using `'rusty_key'` unlocks chest on Shore, revealing the `'moon_lens'`.
2. **Wild Monkey**: Using `'tropical_fruit'` pacifies monkey in Jungle, acquiring the `'sun_stone'`.
3. **Temple Altar**: Placing `'sun_stone'` on Ancient Altar in Ruins unlocks the vault and awards the `'golden_idol'`.
4. **Lighthouse Beacon**: Fitting `'moon_lens'` into Beacon on Cliff and igniting it with `'flint'` summons the rescue vessel, achieving ultimate victory!

## Game Over & Scoring
- Adventure concludes upon victory (`won === true`) or when `stepCount >= 150`.
- Score = `(won ? 1000 : 0) + questsCompleted * 200 + inventory.length * 50 + Math.max(0, 150 - stepCount) * 5`.
