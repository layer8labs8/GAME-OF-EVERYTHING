// Mahjong Solitaire deterministic logic
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MahjongSolitaire = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_STEPS = 60;

  const TILE_PAIRS_POOL = [
    '1B', '2B', '3B', '4B', '5B', '6B',
    '1C', '2C', '3C', '4C', '5C', '6C',
    '1D', '2D', '3D', '4D',
    'DR', 'DG'
  ]; // 18 unique types -> 18 pairs = 36 tiles

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function createSlotLayout() {
    const slots = [];
    let id = 1;

    // Tier 0 (Base): 24 tiles (4 rows x 6 cols)
    for (let y = 0; y < 4; y++) {
      for (let x = 1; x <= 6; x++) {
        slots.push({ id: id++, x, y, z: 0 });
      }
    }

    // Tier 1 (Mid): 10 tiles
    // Center block (4 x 2)
    for (let y = 1; y <= 2; y++) {
      for (let x = 2; x <= 5; x++) {
        slots.push({ id: id++, x, y, z: 1 });
      }
    }
    // Top ridge (2 tiles)
    slots.push({ id: id++, x: 3, y: 0, z: 1 });
    slots.push({ id: id++, x: 4, y: 0, z: 1 });

    // Tier 2 (Apex): 2 tiles
    slots.push({ id: id++, x: 3, y: 1, z: 2 });
    slots.push({ id: id++, x: 4, y: 2, z: 2 });

    return slots; // exactly 36 slots
  }

  function isTileFree(t, tilesList) {
    // 1. Check if covered by any tile in tier above
    for (let i = 0; i < tilesList.length; i++) {
      const o = tilesList[i];
      if (o.z > t.z && o.x === t.x && o.y === t.y) {
        return false;
      }
    }

    // 2. Check lateral flanks on the same tier
    let hasLeft = false;
    let hasRight = false;

    for (let i = 0; i < tilesList.length; i++) {
      const o = tilesList[i];
      if (o.z === t.z && o.y === t.y) {
        if (o.x === t.x - 1) hasLeft = true;
        if (o.x === t.x + 1) hasRight = true;
      }
    }

    // Free if at least one side is open
    return (!hasLeft || !hasRight);
  }

  function createState(seed = 12345) {
    const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
    const state = {
      rng: s,
      stepCount: 0,
      scoreVal: 0,
      combo: 0,
      won: false,
      lost: false,
      tiles: []
    };

    const slots = createSlotLayout();

    // Reverse construction: repeatedly select 2 free slots and assign them a matching pair type
    const remainingSlots = slots.map(sl => ({ ...sl }));
    const pairTypes = TILE_PAIRS_POOL.slice();

    // Shuffle pairTypes pool
    for (let i = pairTypes.length - 1; i > 0; i--) {
      const j = Math.floor(nextRandom(state) * (i + 1));
      const tmp = pairTypes[i];
      pairTypes[i] = pairTypes[j];
      pairTypes[j] = tmp;
    }

    const assignedTiles = [];
    let pairIdx = 0;

    while (remainingSlots.length >= 2 && pairIdx < pairTypes.length) {
      // Find all currently free slots in remainingSlots
      const freeSlots = remainingSlots.filter(sl => isTileFree(sl, remainingSlots));
      if (freeSlots.length < 2) {
        // Fallback: pick any 2 remaining slots if layout edge-case
        freeSlots.push(...remainingSlots.filter(sl => !freeSlots.includes(sl)));
      }

      const idx1 = Math.floor(nextRandom(state) * freeSlots.length);
      const slot1 = freeSlots.splice(idx1, 1)[0];

      const idx2 = Math.floor(nextRandom(state) * freeSlots.length);
      const slot2 = freeSlots.splice(idx2, 1)[0];

      const type = pairTypes[pairIdx++];

      assignedTiles.push({
        id: slot1.id,
        type,
        x: slot1.x,
        y: slot1.y,
        z: slot1.z
      });

      assignedTiles.push({
        id: slot2.id,
        type,
        x: slot2.x,
        y: slot2.y,
        z: slot2.z
      });

      // Remove from remainingSlots
      const rem1 = remainingSlots.findIndex(s => s.id === slot1.id);
      if (rem1 !== -1) remainingSlots.splice(rem1, 1);
      const rem2 = remainingSlots.findIndex(s => s.id === slot2.id);
      if (rem2 !== -1) remainingSlots.splice(rem2, 1);
    }

    // Sort by ID for deterministic order
    assignedTiles.sort((a, b) => a.id - b.id);
    state.tiles = assignedTiles;

    return state;
  }

  function isOver(state) {
    return state.lost || state.won || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const freeTiles = state.tiles.filter(t => isTileFree(t, state.tiles));
    const actions = [];

    for (let i = 0; i < freeTiles.length; i++) {
      for (let j = i + 1; j < freeTiles.length; j++) {
        const t1 = freeTiles[i];
        const t2 = freeTiles[j];
        if (t1.type === t2.type) {
          const first = Math.min(t1.id, t2.id);
          const second = Math.max(t1.id, t2.id);
          actions.push(`match_${first}_${second}`);
        }
      }
    }

    return actions;
  }

  function score(state) {
    return state.scoreVal;
  }

  function step(state, action) {
    if (isOver(state)) {
      throw new Error('Game is over; no actions allowed');
    }
    const legals = legalActions(state);
    if (!legals.includes(action)) {
      throw new Error(`Illegal action "${action}"`);
    }

    const prevScore = state.scoreVal;
    state.stepCount++;

    const parts = action.split('_');
    const id1 = parseInt(parts[1], 10);
    const id2 = parseInt(parts[2], 10);

    // Remove matched tiles
    state.tiles = state.tiles.filter(t => t.id !== id1 && t.id !== id2);

    state.combo++;
    const matchPoints = Math.round(100 * (1 + (state.combo - 1) * 0.25));
    state.scoreVal += matchPoints;

    // Check win condition
    if (state.tiles.length === 0) {
      state.won = true;
      state.scoreVal += 1500;
    } else {
      // Check if stalemate (no legal moves remain)
      const nextLegals = legalActions(state);
      if (nextLegals.length === 0) {
        state.lost = true;
      }
    }

    const reward = state.scoreVal - prevScore;
    const done = isOver(state);
    return { reward, done };
  }

  return {
    createState,
    legalActions,
    step,
    isOver,
    score,
    isTileFree
  };
});
