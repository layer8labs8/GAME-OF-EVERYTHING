# 0049: Escape Room - Cryptic Vault

An immersive first-person discrete escape room puzzle. The player is trapped inside a high-security subterranean testing chamber with locked vault doors, an unpowered terminal, a secured wall safe, and hidden mechanical compartments. By inspecting room stations, uncovering hidden tools, decoding environmental ciphers, and routing electrical power, the player unlatches the vault door and escapes before life support terminates.

## Core Rules

1. **Room Stations & Perspectives**:
   - `desk`: antique workbench holding drawers with tools and notes.
   - `painting`: vintage portrait hiding a concealed circuit schematic and fuse behind a screwed frame.
   - `panel`: high-voltage circuit breaker with 3 toggle switches and an empty fuse socket.
   - `safe`: reinforced steel safe with a 3-digit combination tumbler lock ($0..9$ per dial).
   - `door`: heavy blast door requiring active terminal power and a high-security keycard.

2. **Inventory & Items**:
   - `screwdriver`: found in the desk drawer. Used to unscrew the painting frame.
   - `fuse`: discovered behind the painting. Used in the circuit breaker panel.
   - `keycard`: stored inside the wall safe. Used on the vault door card scanner.
   - Items picked up enter `state.inventory`.

3. **Puzzle Progression**:
   - **Step 1 (Desk)**: Inspect desk to discover and pick up the `screwdriver`.
   - **Step 2 (Painting)**: Use screwdriver on the painting to reveal the electrical schematic note and the spare `fuse`. Pick up `fuse`.
   - **Step 3 (Breaker Panel)**: Insert fuse into panel (`use:fuse:panel`). Toggle switches to match the schematic. When correct, power is restored!
   - **Step 4 (Safe)**: Powered terminal displays the 3-digit safe passcode. Cycle dials on the safe until they match the code, then execute `open_safe` to retrieve the `keycard`.
   - **Step 5 (Vault Door)**: Insert `keycard` into the door scanner with power online. The vault unlocks! Execute `escape` to win.

4. **Actions**:
   - `examine:<station>`: focuses camera on station (`desk`, `painting`, `panel`, `safe`, `door`).
   - `pickup:<item>`: picks up an exposed item (`screwdriver`, `fuse`, `keycard`).
   - `use:<item>:<target>`: applies inventory item to target station.
   - `toggle_switch:<index>`: toggles circuit switch ($0, 1, 2$) between ON and OFF.
   - `cycle_dial:<index>`: increments safe tumbler dial ($0, 1, 2$) modulo 10.
   - `open_safe`: attempts unlocking safe when dials match the solution code.
   - `escape`: steps through the unlocked vault door to achieve victory.

5. **Scoring & End Conditions**:
   - `score = (won ? 1000 : 0) + turnsLeft * 25 + inventory.length * 50 - mistakes * 20`.
   - Victory: execute `escape` through the unlocked vault door.
   - Defeat: `turnsLeft <= 0` before escaping.
