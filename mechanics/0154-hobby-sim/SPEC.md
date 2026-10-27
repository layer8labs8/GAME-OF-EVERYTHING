# 0154-hobby-sim: Miniature Workshop

A tactile, creative tabletop miniature painting and scale model kit building simulation. Players take the role of an aspiring model kit artisan at their cozy hobby workbench, snipping plastic parts off sprues, cleaning mold lines, assembling limbs and hulls with cement, priming, laying base coats, shading recesses, edge-highlighting, and submitting finished masterpieces to hobby exhibitions for medals and prestige.

## Core Pillars & Mechanics

- **Artisan Vitals & Workshop Resources**:
  - `focus`: Hand steadiness and concentration (0-100%). Exhausted focus causes slip-ups; restored by sipping warm herbal tea.
  - `inspiration`: Artistic creativity (0-100%). Consumed when executing masterclass highlights and weathering techniques.
  - `coins`: Currency earned from exhibition trophies and commissions, spent purchasing hobby supplies.
  - `supplies`:
    - `plasticCement`: Bottles of model solvent cement.
    - `sandingPads`: Fine abrasive pads for nub cleanup.
    - `paintPots`: Acrylic model paints (Base, Shades, Layer highlights).
  - `medals`: Gold, Silver, and Bronze exhibition awards.
  - `completedModels`: Total count of finished and judged model kits.
- **Model Kit Workflow & Stages**:
  Each model kit undergoes five procedural fabrication phases:
  - `Phase 0: Snipping`: Cutting plastic pieces from runners using sprue nippers.
  - `Phase 1: Sanding & Trimming`: Filing nub marks and scraping mold lines with a hobby knife.
  - `Phase 2: Assembly`: Cementing sub-assemblies (torso, arms, weapon pods, chassis).
  - `Phase 3: Basecoat & Shading`: Applying smooth acrylic coats and dark ink washes to recesses.
  - `Phase 4: Highlighting & Varnish`: Drybrushing highlights, applying transfers, and sealing with matte varnish.
- **Hobby Workbench Actions**:
  - `action:snip_runner_parts`: Snips components off sprues (-10 focus, advances part trimming).
  - `action:sand_nub_marks`: Cleans imperfections (+15 craftsmanship, -8 focus, consumes sanding pad).
  - `action:cement_subassembly`: Welds parts with model cement (advances assembly stage, consumes cement).
  - `action:apply_base_and_shade`: Layers primer and wash (+20 craftsmanship, consumes paint pot).
  - `action:edge_highlight_details`: Precision detailing (+20 craftsmanship, -12 focus, -15 inspiration).
  - `action:sip_herbal_tea`: Relaxes at the bench (+35 focus, +15 inspiration).
  - `action:restock_hobby_supplies`: Orders cement, sanding pads, and paint jars for 40 coins.
  - `action:enter_exhibition`: Submits completed model to the regional miniature showcase to be judged!
  - `action:unbox_next_kit`: Cracks open the next model kit box from the project queue.
- **Victory & Defeat**:
  - Victory: Complete 5 showcase miniatures and earn at least 3 Gold Medals (Craftsmanship >= 85) with over 1,500 total Hobby Acclaim score.
  - Defeat: Ruin 3 model kits through critical slip-ups or run out of turns (120 max turns).
  - Max Turns: 120 turns guarantee.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0 to 120)
- `maxTurns`: 120
- `focus`: integer (0 to 100)
- `inspiration`: integer (0 to 100)
- `coins`: integer (starts at 120)
- `supplies`: object
  - `plasticCement`: integer
  - `sandingPads`: integer
  - `paintPots`: integer
- `currentModel`: object or null
  - `id`: string
  - `name`: string
  - `genre`: string ('Mecha', 'Fantasy', 'Sci-Fi', 'Historical')
  - `stage`: integer (0 to 4)
  - `craftsmanship`: integer (0 to 100)
  - `partsRemaining`: integer
  - `targetParts`: integer
- `completedModels`: integer
- `ruinedModels`: integer
- `medals`: object
  - `gold`: integer
  - `silver`: integer
  - `bronze`: integer
- `acclaim`: integer
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
