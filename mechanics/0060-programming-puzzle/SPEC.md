# 0060: Programming Puzzle - Robo Script

A logic and algorithm design puzzle inspired by *Lightbot*, *RoboZZle*, and *Human Resource Machine*. The player constructs an automated routine using a compact instruction buffer to guide a micro-rover across circuit board chambers, jumping over bus chasms and illuminating memory nodes.

## Core Rules

1. **Circuit Grid**:
   - $8 \times 8$ microchip arena consisting of Conductive Traces (`.`), Insulator Walls (`#`), Bus Chasms (`W`), and Memory Light Nodes (`L`).
   - Rover starts at chamber entrance $(x, y)$ with facing direction:
     - $0$: North (Up)
     - $1$: East (Right)
     - $2$: South (Down)
     - $3$: West (Left)

2. **Instruction Set & Program Buffer**:
   - Program register stores up to 8 sequential instructions (`maxCommands: 8`):
     - `forward`: Advances 1 tile in facing direction (blocked by walls; falling into chasm halts routine).
     - `left`: Rotates facing direction $90^\circ$ counter-clockwise.
     - `right`: Rotates facing direction $90^\circ$ clockwise.
     - `jump`: Leaps 2 tiles forward across a 1-tile gap or obstacle.
     - `light`: Illuminates the target memory node on the rover's current cell.

3. **Actions**:
   - `add:<command>`: Appends command (`forward`, `left`, `right`, `jump`, `light`) to the program buffer.
   - `remove:<index>`: Removes instruction at designated buffer index.
   - `clear`: Empties the program buffer.
   - `run`: Compiles and executes the program routine from the rover start position.

4. **Victory & Scoring**:
   - Clearing a stage requires illuminating all target Memory Light Nodes on the board.
   - 3 sequential microchip stages of escalating algorithmic complexity.
   - Victory: Successfully program and illuminate all 3 stages.
   - Defeat: Exceeding 25 program runs (`runs >= maxRuns`).
   - `score = stagesCleared * 400 + nodesLit * 50 + (won ? 500 : 0) - (runsUsed * 10 + programLength * 5)`.
