(function (root) {
  const SIZE = 7;
  const CELLS = SIZE * SIZE;
  const MAX_FLOORS = 3;
  const MAX_STEPS = 600;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function updateVision(state) {
    const hr = state.hero.y;
    const hc = state.hero.x;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (Math.abs(r - hr) + Math.abs(c - hc) <= 2) {
          state.revealed[r * SIZE + c] = true;
        }
      }
    }
  }

  function buildFloor(state) {
    state.grid = new Array(CELLS).fill(0);
    state.revealed = new Array(CELLS).fill(false);
    state.monsters = [];

    // Outer walls
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (r === 0 || r === SIZE - 1 || c === 0 || c === SIZE - 1) {
          state.grid[r * SIZE + c] = 1; // Wall
        }
      }
    }

    // A few random interior walls
    for (let i = 0; i < 3; i++) {
      const r = 2 + Math.floor(nextRandom(state) * 3);
      const c = 2 + Math.floor(nextRandom(state) * 3);
      if (!(r === 1 && c === 1) && !(r === 5 && c === 5)) {
        state.grid[r * SIZE + c] = 1;
      }
    }

    state.hero.x = 1;
    state.hero.y = 1;

    // Stairs at bottom right
    state.grid[5 * SIZE + 5] = 5;

    // Available interior positions
    const open = [];
    for (let r = 1; r < SIZE - 1; r++) {
      for (let c = 1; c < SIZE - 1; c++) {
        const idx = r * SIZE + c;
        if (state.grid[idx] === 0 && !(r === 1 && c === 1) && !(r === 5 && c === 5)) {
          open.push(idx);
        }
      }
    }

    // Shuffle open spots
    for (let i = open.length - 1; i > 0; i--) {
      const j = Math.floor(nextRandom(state) * (i + 1));
      const tmp = open[i];
      open[i] = open[j];
      open[j] = tmp;
    }

    // Place 2-3 monsters
    const monsterCount = 2 + (state.floor > 1 ? 1 : 0);
    for (let m = 0; m < monsterCount && open.length > 0; m++) {
      const idx = open.pop();
      const hp = 8 + state.floor * 4;
      const atk = 2 + state.floor * 2;
      state.grid[idx] = 2; // Monster
      state.monsters.push({ idx, hp, maxHp: hp, atk, type: state.floor });
    }

    // Place 1 Chest
    if (open.length > 0) {
      state.grid[open.pop()] = 3;
    }

    // Place 1 Potion
    if (open.length > 0) {
      state.grid[open.pop()] = 4;
    }

    updateVision(state);
  }

  function createState(seed) {
    const state = {
      grid: [],
      revealed: [],
      monsters: [],
      hero: { x: 1, y: 1, hp: 30, maxHp: 30, atk: 6, potions: 1, gold: 0 },
      floor: 1,
      points: 0,
      won: false,
      stepCount: 0,
      rng: (seed >>> 0) || 1,
    };
    buildFloor(state);
    return state;
  }

  function isOver(state) {
    return Boolean(state.hero.hp <= 0 || state.won || state.stepCount >= MAX_STEPS);
  }

  function legalActions(state) {
    if (isOver(state)) return [];
    const acts = [];
    const h = state.hero;

    const DIRS = [
      { act: 'up', r: h.y - 1, c: h.x },
      { act: 'down', r: h.y + 1, c: h.x },
      { act: 'left', r: h.y, c: h.x - 1 },
      { act: 'right', r: h.y, c: h.x + 1 },
    ];

    for (let i = 0; i < DIRS.length; i++) {
      const d = DIRS[i];
      if (d.r >= 0 && d.r < SIZE && d.c >= 0 && d.c < SIZE) {
        if (state.grid[d.r * SIZE + d.c] !== 1) {
          acts.push(d.act);
        }
      }
    }

    if (h.potions > 0 && h.hp < h.maxHp) {
      acts.push('potion');
    }

    return acts;
  }

  function step(state, action) {
    const legal = legalActions(state);
    if (!legal.includes(action)) {
      throw new Error('Illegal action');
    }

    state.stepCount += 1;
    let reward = 0;
    const h = state.hero;

    if (action === 'potion') {
      h.potions -= 1;
      const heal = Math.min(15, h.maxHp - h.hp);
      h.hp += heal;
      reward += heal;
      return { reward, done: isOver(state) };
    }

    let nr = h.y;
    let nc = h.x;
    if (action === 'up') nr -= 1;
    else if (action === 'down') nr += 1;
    else if (action === 'left') nc -= 1;
    else if (action === 'right') nc += 1;

    const targetIdx = nr * SIZE + nc;
    const targetType = state.grid[targetIdx];

    if (targetType === 2) {
      // Monster battle
      const mIdx = state.monsters.findIndex((m) => m.idx === targetIdx);
      if (mIdx >= 0) {
        const mon = state.monsters[mIdx];
        mon.hp -= h.atk;
        if (mon.hp <= 0) {
          state.monsters.splice(mIdx, 1);
          state.grid[targetIdx] = 0;
          h.gold += 15;
          state.points += 40;
          reward += 40;
          // Step into cleared cell
          h.x = nc;
          h.y = nr;
        } else {
          // Counter-attack
          h.hp -= mon.atk;
          reward -= mon.atk;
        }
      }
    } else if (targetType === 3) {
      // Chest
      state.grid[targetIdx] = 0;
      h.x = nc;
      h.y = nr;
      h.gold += 30;
      state.points += 50;
      reward += 50;
    } else if (targetType === 4) {
      // Potion pickup
      state.grid[targetIdx] = 0;
      h.x = nc;
      h.y = nr;
      h.potions += 1;
      state.points += 20;
      reward += 20;
    } else if (targetType === 5) {
      // Stairs
      if (state.floor >= MAX_FLOORS) {
        state.won = true;
        state.points += 500;
        reward += 500;
      } else {
        state.floor += 1;
        state.points += 100;
        reward += 100;
        buildFloor(state);
      }
    } else {
      // Floor step
      h.x = nc;
      h.y = nr;
      state.points += 1;
      reward += 1;
    }

    updateVision(state);
    return { reward, done: isOver(state) };
  }

  function score(state) {
    return state.points;
  }

  const api = { SIZE, CELLS, MAX_FLOORS, MAX_STEPS, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
