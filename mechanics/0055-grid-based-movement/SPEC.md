# 0055: Grid-Based Movement - Crypt Step

A tactical dungeon crawler puzzle. The player navigates grid-based chambers filled with locked doors, pressure plates, sliding boulders, chasm pits, patrol sentries, and golden treasures to reach the exit stairs.

## Core Rules

1. **Grid Environment**:
   - 10x10 tile grid consisting of Walls (`#`), Empty Floors (`.`), Pits (`W`), Doors (`D`), Pressure Plates (`P`), Spikes (`S`), and Exit Stairs (`X`).
   - Movable entities:
     - Player (`@`): Starts at initial entrance coordinates.
     - Boulders (`B`): Can be pushed into empty spaces or into pits (filling the pit into a passable stone floor).
     - Keys (`K`): Collected upon stepping onto them. Required to open doors (`D`).
     - Gems (`G`): Optional collectible jewels awarding bonus points (+50 pts).
     - Sentries (`E`): Patrol back and forth along straight corridors each turn.

2. **Turn Sequence & Movement**:
   - Legal actions: `up`, `down`, `left`, `right`, `wait`.
   - Player movement:
     - Moving into an open floor or collectible steps into that tile.
     - Moving into a Key collects the key.
     - Moving into a locked Door consumes a key and permanently unlocks the door.
     - Moving into a Boulder pushes it forward 1 tile if the destination tile is open floor or pit. Pushing into a pit consumes the boulder and bridges the pit into normal floor.
     - Moving into a Wall or locked Door without keys is illegal.
     - Standing or stepping onto a pressure plate deactivates spike traps.
     - Stepping on an active spike trap deals 1 damage.
     - `wait` passes the turn without moving.
   - Sentry Turn:
     - After player action, each sentry takes 1 step in its current patrol direction.
     - If sentry hits a wall, door, or boulder, it reverses patrol direction.
     - If sentry occupies the player's tile or strikes the player, player takes 1 damage.

3. **Player Stats & Victory Conditions**:
   - Player has 3 Health (`hp: 3`).
   - Max steps per floor: 120 steps.
   - Reaching the exit (`X`) completes the floor.
   - 3 consecutive procedural floors to complete the descent and win!
   - Defeat: `hp <= 0` or running out of steps (`steps >= maxSteps`).

4. **Scoring**:
   - `score = floorsCleared * 300 + gems * 50 + keysCollected * 20 + hp * 100 + (won ? 500 : 0) - totalSteps`.
