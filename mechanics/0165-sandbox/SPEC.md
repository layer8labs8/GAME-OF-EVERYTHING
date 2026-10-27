# 0165-sandbox: Physics Toybox

A creative elemental particle physics sandbox simulation inspired by *The Powder Toy*, *Sandspiel*, and *Falling Sand*. Players manipulate matter, fluid dynamics, thermodynamics, combustion, and electrical conduction across a 2D cellular automaton canvas to unlock complex alchemy reactions and complete four grand sandbox milestones.

## Core Pillars & Mechanics

- **Elemental Particles & Reactions**:
  - `Sand`: Falls due to gravity; stacks into cones. When heated by Fire, transforms into sparkling `Glass`.
  - `Water`: Fluid density; cascades horizontally, extinguishes `Fire`, irrigates `Plant`.
  - `Plant`: Organic vegetation; absorbs `Water` to grow and propagate; burns aggressively from `Fire`.
  - `Fire`: Thermal plasma; ignites flammable elements, evaporates `Water` into `Steam`, melts sand into `Glass`.
  - `Stone`: Immovable solid bedrock barrier for sculpting bowls and chutes.
  - `Acid`: Reactive corrosive liquid that dissolves organic matter and rock.
  - `Dynamite`: High explosive detonated by `Fire` or `Electricity`, clearing wide blast radiuses.
  - `Electricity`: Rapid charge that arcs through conductive elements and ignites explosives.
- **Physical Grid & Simulation Steps**:
  - A discrete 2D grid (16 columns x 12 rows).
  - Physics tick evaluates gravity, lateral flow, combustion propagation, water absorption, acid corrosion, and blast shockwaves.
- **Milestones & Scientific Synthesis**:
  - `Milestone 1: Verdant Oasis`: Grow at least 12 living plant cells irrigated by water.
  - `Milestone 2: Silica Kiln`: Forge at least 6 glass crystals by firing sand with plasma heat.
  - `Milestone 3: Kinetic Demolition`: Detonate dynamite to vaporize obstacles and achieve a blast combo.
  - `Milestone 4: Arc Conduction`: Conduct electrical sparks across 8 connected particles.
- **Actions**:
  - `action:place_element:<type>:<col>`: Drops element into specified column (0-15).
  - `action:step_simulation`: Runs a physical simulation cycle across the canvas.
  - `action:trigger_lightning_strike`: Discharges electric bolt across canvas center.
  - `action:clear_sandbox`: Clears canvas elements while retaining research points.
  - `action:finalize_masterwork`: Finalizes the creative physics sandbox exhibition for Victory!
- **Victory & Defeat**:
  - Victory: Complete all 4 research milestones and trigger `action:finalize_masterwork`.
  - Max Turns: 120 turns guarantee.
  - Defeat: Turns reach 120 without completing the masterwork.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0-120)
- `maxTurns`: 120
- `grid`: 2D array of element strings (12 rows x 16 cols)
- `elementsPlaced`: integer
- `glassCreated`: integer
- `plantsGrown`: integer
- `explosionsDetonated`: integer
- `electricalArcs`: integer
- `milestones`: object
  - `verdantOasis`: boolean
  - `silicaKiln`: boolean
  - `kineticDemolition`: boolean
  - `arcConduction`: boolean
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
