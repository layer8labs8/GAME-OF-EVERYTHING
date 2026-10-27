# 0052: Typing - Cipher Cascade

A high-speed cyber-defense typing action puzzle game inspired by classics like *ZType* and *The Typing of the Dead*. Hostile encrypted data packets descent through cyberspace channels toward the player's core firewall. By typing exact keystrokes, the player locks on to incoming threats, discharges beam lasers, chains combo streaks, and deploys EMP bursts to safeguard the server network.

## Core Rules

1. **Cyber Grid & Firewall**:
   - 4 vertical transmission lanes ($x \in [0..3]$).
   - Altitude span: $y \in [0..100]$.
   - Firewall baseline at $y \ge 100$. Any breached word damages firewall integrity ($hp \gets hp - 1$).
   - Total firewall integrity: 5 HP.
   - Total words in defense wave: 15 words.

2. **Ciphers & Lock-On Targeting**:
   - Each descending cipher possesses:
     - `id`: unique integer.
     - `word`: target word string (e.g. `"CYBER"`, `"PACKET"`, `"FIREWALL"`).
     - `typed`: string of matched letters so far (e.g. `"CY"`).
     - `lane`: column index ($0..3$).
     - `y`: current vertical position ($0..100$).
     - `speed`: vertical speed per turn (e.g. $+3$).
   - **Target Lock**:
     - When no target is locked (`currentTargetId === null`), typing the first letter of any active cipher establishes lock-on and matches that first character.
     - While locked, subsequent keystrokes must match the next character in that specific cipher.
     - When the final letter of a cipher is typed, the cipher disintegrates, awarding points, boosting combo streak, and releasing lock-on.

3. **Abilities & Scoring**:
   - `empCharges`: 2 tactical EMP blasts. Detonating EMP immediately destroys all on-screen ciphers.
   - `combo`: consecutive words destroyed without breach or mistyping ($1\times \to 5\times$ score multiplier).
   - `score = wordsDestroyed * 100 * comboMultiplier + hp * 60 + empCharges * 40`.

4. **Actions**:
   - `type:<LETTER>`: inputs keystroke `'A'..'Z'` to initiate or advance target destruction.
   - `emp_burst`: expends 1 EMP charge to clear all active threats on screen.
   - `wait`: yields turn, allowing world and falling packets to advance 1 tick.

5. **Scoring & End Conditions**:
   - Victory: successfully destroy all 15 ciphers in the defense wave (`wordsDestroyed >= totalWords`).
   - Defeat: firewall integrity falls to 0 (`hp <= 0`), or turn limit reached before wave completion.
