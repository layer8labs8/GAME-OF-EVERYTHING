(function (root) {
  'use strict';

  const GRID_SIZE = 7;
  const TARGET_VP = 25;
  const MAX_STEPS = 120;

  function nextRandom(state) {
    state.rngState = ((state.rngState * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return state.rngState / 0x7fffffff;
  }

  function rollD6(state) {
    return Math.floor(nextRandom(state) * 6) + 1;
  }

  function dist(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2);
  }

  function createInitialMap() {
    // 0: Open, 1: Forest (cover), 2: Rock (obstacle), 3: Shrine
    const grid = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      grid.push(new Array(GRID_SIZE).fill(0));
    }

    // Rocks (impassable)
    grid[3][0] = 2;
    grid[3][6] = 2;
    grid[2][2] = 2;
    grid[4][4] = 2;

    // Forests (+2 cover)
    grid[1][1] = 1;
    grid[1][5] = 1;
    grid[5][1] = 1;
    grid[5][5] = 1;
    grid[3][3] = 1;

    // Relic Shrines
    grid[3][1] = 3;
    grid[3][5] = 3;

    return grid;
  }

  function createInitialUnits() {
    return {
      p_paladin: { id: 'p_paladin', team: 'p', name: 'Paladin', hp: 35, maxHp: 35, atk: 10, range: 1, move: 2, r: 6, c: 2, alive: true },
      p_mage:    { id: 'p_mage',    team: 'p', name: 'Mage',    hp: 18, maxHp: 18, atk: 12, range: 2, move: 2, r: 6, c: 3, alive: true },
      p_ranger:  { id: 'p_ranger',  team: 'p', name: 'Ranger',  hp: 22, maxHp: 22, atk: 8,  range: 3, move: 2, r: 6, c: 4, alive: true },

      e_knight:  { id: 'e_knight',  team: 'e', name: 'Void Knight',  hp: 35, maxHp: 35, atk: 10, range: 1, move: 2, r: 0, c: 2, alive: true },
      e_necro:   { id: 'e_necro',   team: 'e', name: 'Necromancer',  hp: 18, maxHp: 18, atk: 12, range: 2, move: 2, r: 0, c: 3, alive: true },
      e_archer:  { id: 'e_archer',  team: 'e', name: 'Void Archer',  hp: 22, maxHp: 22, atk: 8,  range: 3, move: 2, r: 0, c: 4, alive: true },
    };
  }

  function createState(seed = 12345) {
    return {
      grid: createInitialMap(),
      units: createInitialUnits(),
      shrines: {
        '3,1': { owner: null, name: 'West Shrine' },
        '3,5': { owner: null, name: 'East Shrine' },
      },
      playerVp: 0,
      aiVp: 0,
      ap: 3,
      round: 1,
      stepCount: 0,
      gameOver: false,
      winner: null,
      combatLog: [],
      rngState: (seed >>> 0) || 12345,
    };
  }

  function isOccupied(units, r, c) {
    for (const key in units) {
      const u = units[key];
      if (u.alive && u.r === r && u.c === c) return u;
    }
    return null;
  }

  function isOver(state) {
    if (state.gameOver) return true;
    if (state.playerVp >= TARGET_VP || state.aiVp >= TARGET_VP) return true;
    if (state.stepCount >= MAX_STEPS) return true;

    const pAlive = Object.values(state.units).some(u => u.team === 'p' && u.alive);
    const eAlive = Object.values(state.units).some(u => u.team === 'e' && u.alive);
    if (!pAlive || !eAlive) return true;

    return false;
  }

  function score(state) {
    return state.playerVp - state.aiVp;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = [];
    const pUnits = Object.values(state.units).filter(u => u.team === 'p' && u.alive);
    const eUnits = Object.values(state.units).filter(u => u.team === 'e' && u.alive);

    if (state.ap > 0) {
      for (let i = 0; i < pUnits.length; i++) {
        const u = pUnits[i];

        // 1. Move actions
        for (let dr = -u.move; dr <= u.move; dr++) {
          for (let dc = -u.move; dc <= u.move; dc++) {
            if (Math.abs(dr) + Math.abs(dc) > u.move) continue;
            if (dr === 0 && dc === 0) continue;
            const nr = u.r + dr;
            const nc = u.c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
              if (state.grid[nr][nc] !== 2 && !isOccupied(state.units, nr, nc)) {
                actions.push(`move:${u.id}:${nr},${nc}`);
              }
            }
          }
        }

        // 2. Attack actions
        for (let j = 0; j < eUnits.length; j++) {
          const eu = eUnits[j];
          if (dist(u.r, u.c, eu.r, eu.c) <= u.range) {
            actions.push(`attack:${u.id}:${eu.id}`);
          }
        }

        // 3. Claim action
        const key = `${u.r},${u.c}`;
        if (state.shrines[key] && state.shrines[key].owner !== 'p') {
          actions.push(`claim:${u.id}`);
        }
      }
    }

    // End turn is always legal to pass or begin enemy counter-phase
    actions.push('end_turn');
    return actions;
  }

  function executeAiTurn(state) {
    let aiAp = 3;
    const eUnits = Object.values(state.units).filter(u => u.team === 'e' && u.alive);
    const pUnits = Object.values(state.units).filter(u => u.team === 'p' && u.alive);

    while (aiAp > 0 && eUnits.length > 0 && pUnits.length > 0) {
      let acted = false;

      // 1. Prioritize attacking a player unit in range
      for (let i = 0; i < eUnits.length; i++) {
        const eu = eUnits[i];
        if (!eu.alive) continue;
        for (let j = 0; j < pUnits.length; j++) {
          const pu = pUnits[j];
          if (!pu.alive) continue;
          if (dist(eu.r, eu.c, pu.r, pu.c) <= eu.range) {
            const roll = rollD6(state);
            const inCover = state.grid[pu.r][pu.c] === 1;
            const dmg = Math.max(1, eu.atk + roll - 3 - (inCover ? 2 : 0));
            pu.hp -= dmg;
            state.combatLog.push(`${eu.name} strikes ${pu.name} for ${dmg} dmg (d6=${roll})`);
            if (pu.hp <= 0) {
              pu.alive = false;
              state.aiVp += 5;
              state.combatLog.push(`${pu.name} was slain!`);
            }
            aiAp -= 1;
            acted = true;
            break;
          }
        }
        if (acted) break;
      }
      if (acted) continue;

      // 2. Claim shrine if standing on one
      for (let i = 0; i < eUnits.length; i++) {
        const eu = eUnits[i];
        if (!eu.alive) continue;
        const key = `${eu.r},${eu.c}`;
        if (state.shrines[key] && state.shrines[key].owner !== 'e') {
          state.shrines[key].owner = 'e';
          state.aiVp += 2;
          state.combatLog.push(`${eu.name} claimed ${state.shrines[key].name}!`);
          aiAp -= 1;
          acted = true;
          break;
        }
      }
      if (acted) continue;

      // 3. Move toward closest shrine or closest player unit
      for (let i = 0; i < eUnits.length; i++) {
        const eu = eUnits[i];
        if (!eu.alive) continue;

        let targetR = 3;
        let targetC = 3;
        // Target an unowned shrine or nearest player
        const unownedShrine = Object.entries(state.shrines).find(([k, v]) => v.owner !== 'e');
        if (unownedShrine) {
          const [sr, sc] = unownedShrine[0].split(',').map(Number);
          targetR = sr;
          targetC = sc;
        } else if (pUnits.find(p => p.alive)) {
          const aliveP = pUnits.find(p => p.alive);
          targetR = aliveP.r;
          targetC = aliveP.c;
        }

        // Find best move square towards target
        let bestSq = null;
        let bestDist = dist(eu.r, eu.c, targetR, targetC);

        for (let dr = -eu.move; dr <= eu.move; dr++) {
          for (let dc = -eu.move; dc <= eu.move; dc++) {
            if (Math.abs(dr) + Math.abs(dc) > eu.move) continue;
            if (dr === 0 && dc === 0) continue;
            const nr = eu.r + dr;
            const nc = eu.c + dc;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
              if (state.grid[nr][nc] !== 2 && !isOccupied(state.units, nr, nc)) {
                const d = dist(nr, nc, targetR, targetC);
                if (d < bestDist) {
                  bestDist = d;
                  bestSq = { r: nr, c: nc };
                }
              }
            }
          }
        }

        if (bestSq) {
          eu.r = bestSq.r;
          eu.c = bestSq.c;
          aiAp -= 1;
          acted = true;
          break;
        }
      }

      if (!acted) {
        break; // No viable AI moves
      }
    }

    // Award VP for holding shrines at end of round
    for (const key in state.shrines) {
      const shrine = state.shrines[key];
      if (shrine.owner === 'p') {
        state.playerVp += 2;
      } else if (shrine.owner === 'e') {
        state.aiVp += 2;
      }
    }

    state.round += 1;
    state.ap = 3;
  }

  function step(state, action) {
    if (!action || typeof action !== 'string') {
      throw new Error('Invalid action: ' + action);
    }
    if (isOver(state)) {
      throw new Error('Game is already over');
    }

    const legal = legalActions(state);
    if (!legal.includes(action)) {
      throw new Error('Illegal action: ' + action);
    }

    let reward = 0;

    if (action === 'end_turn') {
      executeAiTurn(state);
    } else if (action.startsWith('move:')) {
      const parts = action.split(':');
      const uId = parts[1];
      const [tr, tc] = parts[2].split(',').map(Number);
      const unit = state.units[uId];
      unit.r = tr;
      unit.c = tc;
      state.ap -= 1;
      reward += 1;
    } else if (action.startsWith('attack:')) {
      const parts = action.split(':');
      const uId = parts[1];
      const targetId = parts[2];
      const attacker = state.units[uId];
      const defender = state.units[targetId];

      const roll = rollD6(state);
      const inCover = state.grid[defender.r][defender.c] === 1;
      const dmg = Math.max(1, attacker.atk + roll - 3 - (inCover ? 2 : 0));
      defender.hp -= dmg;
      reward += Math.floor(dmg * 0.5);

      state.combatLog.push(`${attacker.name} strikes ${defender.name} for ${dmg} dmg (d6=${roll})`);
      if (defender.hp <= 0) {
        defender.alive = false;
        state.playerVp += 5;
        reward += 10;
        state.combatLog.push(`${defender.name} was eliminated!`);
      }
      state.ap -= 1;
    } else if (action.startsWith('claim:')) {
      const parts = action.split(':');
      const uId = parts[1];
      const unit = state.units[uId];
      const key = `${unit.r},${unit.c}`;
      if (state.shrines[key]) {
        state.shrines[key].owner = 'p';
        state.playerVp += 2;
        reward += 8;
        state.combatLog.push(`${unit.name} claimed ${state.shrines[key].name}!`);
      }
      state.ap -= 1;
    }

    // Auto-trigger enemy phase if all player AP spent
    if (state.ap === 0 && !isOver(state)) {
      executeAiTurn(state);
    }

    state.stepCount += 1;

    // Check game termination
    const pAlive = Object.values(state.units).some(u => u.team === 'p' && u.alive);
    const eAlive = Object.values(state.units).some(u => u.team === 'e' && u.alive);

    if (state.playerVp >= TARGET_VP || !eAlive) {
      state.gameOver = true;
      state.winner = 'p';
      reward += 25;
    } else if (state.aiVp >= TARGET_VP || !pAlive) {
      state.gameOver = true;
      state.winner = 'e';
      reward -= 20;
    } else if (state.stepCount >= MAX_STEPS) {
      state.gameOver = true;
      state.winner = state.playerVp >= state.aiVp ? 'p' : 'e';
    }

    const done = isOver(state);
    return { reward, done };
  }

  const tabletopLogic = {
    GRID_SIZE,
    TARGET_VP,
    MAX_STEPS,
    createState,
    legalActions,
    isOver,
    score,
    step,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = tabletopLogic;
  } else {
    root.tabletopLogic = tabletopLogic;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
