// Logic for 0113-strategy-rpg: Tactics of Aethelgard
// Pure Bot Contract implementation. Zero UI or platform dependencies.

const GRID_SIZE = 6;
const MAX_TURNS = 120;

function makeRng(seed) {
  let s = (Math.floor(seed) >>> 0) || 123456789;
  return function() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function dist(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function getFacingMultiplier(attacker, defender) {
  // Check relative position to determine front, flank, or back
  // defender facing: 'N' (0,-1), 'S' (0,1), 'E' (1,0), 'W' (-1,0)
  const dx = attacker.x - defender.x;
  const dy = attacker.y - defender.y;

  // If attacker is directly behind defender
  if (defender.facing === 'N' && dy > 0 && Math.abs(dx) <= dy) return 1.5;
  if (defender.facing === 'S' && dy < 0 && Math.abs(dx) <= -dy) return 1.5;
  if (defender.facing === 'E' && dx < 0 && Math.abs(dy) <= -dx) return 1.5;
  if (defender.facing === 'W' && dx > 0 && Math.abs(dy) <= dx) return 1.5;

  // If attacker is in front of defender
  if (defender.facing === 'N' && dy < 0) return 1.0;
  if (defender.facing === 'S' && dy > 0) return 1.0;
  if (defender.facing === 'E' && dx > 0) return 1.0;
  if (defender.facing === 'W' && dx < 0) return 1.0;

  // Flank attack
  return 1.25;
}

function updateFacing(unit, targetX, targetY) {
  const dx = targetX - unit.x;
  const dy = targetY - unit.y;
  if (Math.abs(dx) > Math.abs(dy)) {
    unit.facing = dx > 0 ? 'E' : 'W';
  } else if (dy !== 0) {
    unit.facing = dy > 0 ? 'S' : 'N';
  }
}

function getTerrainAt(state, x, y) {
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return null;
  return state.terrain[y][x];
}

function isCellOccupied(state, x, y) {
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    if (p.hp > 0 && p.x === x && p.y === y) return true;
  }
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (e.hp > 0 && e.x === x && e.y === y) return true;
  }
  return false;
}

function createState(seed = 1) {
  const rng = makeRng(seed);

  // Generate terrain: 0 = Plains (.), 1 = Forest (F), 2 = Hill (H)
  const terrain = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const roll = rng();
      if (roll < 0.22) {
        row.push(1); // Forest
      } else if (roll < 0.38) {
        row.push(2); // Hill
      } else {
        row.push(0); // Plains
      }
    }
    terrain.push(row);
  }

  // Ensure deployment zones are Plains
  terrain[4][1] = 0;
  terrain[5][2] = 0;
  terrain[5][0] = 0;
  terrain[1][4] = 0;
  terrain[0][3] = 0;
  terrain[0][5] = 0;

  const players = [
    {
      id: 'p1',
      name: 'Lord Commander',
      role: 'commander',
      hp: 110,
      maxHp: 110,
      atk: 28,
      def: 10,
      move: 2,
      minRange: 1,
      maxRange: 1,
      x: 1,
      y: 4,
      facing: 'N',
      acted: false,
      hasMoved: false,
      cooldown: 0,
      mp: 0,
      maxMp: 0
    },
    {
      id: 'p2',
      name: 'Elven Ranger',
      role: 'ranger',
      hp: 65,
      maxHp: 65,
      atk: 24,
      def: 4,
      move: 2,
      minRange: 2,
      maxRange: 3,
      x: 2,
      y: 5,
      facing: 'N',
      acted: false,
      hasMoved: false,
      cooldown: 0,
      mp: 0,
      maxMp: 0
    },
    {
      id: 'p3',
      name: 'High Mage',
      role: 'mage',
      hp: 55,
      maxHp: 55,
      atk: 32,
      def: 3,
      move: 2,
      minRange: 1,
      maxRange: 2,
      mp: 40,
      maxMp: 40,
      x: 0,
      y: 5,
      facing: 'N',
      acted: false,
      hasMoved: false,
      cooldown: 0
    }
  ];

  const enemies = [
    {
      id: 'e1',
      name: 'Shadow Warlord',
      role: 'warlord',
      hp: 120,
      maxHp: 120,
      atk: 26,
      def: 8,
      move: 2,
      minRange: 1,
      maxRange: 1,
      x: 4,
      y: 1,
      facing: 'S',
      stun: 0
    },
    {
      id: 'e2',
      name: 'Dark Archer',
      role: 'archer',
      hp: 55,
      maxHp: 55,
      atk: 20,
      def: 4,
      move: 2,
      minRange: 2,
      maxRange: 3,
      x: 3,
      y: 0,
      facing: 'S',
      stun: 0
    },
    {
      id: 'e3',
      name: 'Necromancer',
      role: 'necromancer',
      hp: 50,
      maxHp: 50,
      atk: 28,
      def: 3,
      move: 2,
      minRange: 1,
      maxRange: 2,
      x: 5,
      y: 0,
      facing: 'S',
      stun: 0
    }
  ];

  return {
    seed,
    terrain,
    players,
    enemies,
    activeUnitId: 'p1',
    round: 1,
    turnCount: 0,
    score: 0,
    done: false,
    victory: false,
    combatLog: ['Battle began at the plains of Aethelgard.']
  };
}

function findActivePlayer(state) {
  // If activeUnitId is valid and hasn't acted yet
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    if (p.id === state.activeUnitId && p.hp > 0 && !p.acted) {
      return p;
    }
  }
  // Otherwise find first alive unacted player
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    if (p.hp > 0 && !p.acted) {
      return p;
    }
  }
  return null;
}

function legalActions(state) {
  if (state.done) return [];

  const unit = findActivePlayer(state);
  if (!unit) return [];

  const actions = [];

  // Movement actions (if not already moved this turn)
  if (!unit.hasMoved) {
    for (let dy = -unit.move; dy <= unit.move; dy++) {
      for (let dx = -unit.move; dx <= unit.move; dx++) {
        if (dx === 0 && dy === 0) continue;
        const d = Math.abs(dx) + Math.abs(dy);
        if (d <= unit.move) {
          const nx = unit.x + dx;
          const ny = unit.y + dy;
          if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
            if (!isCellOccupied(state, nx, ny)) {
              actions.push(`move:${nx},${ny}`);
            }
          }
        }
      }
    }
  }

  // Attack actions
  const unitTerrain = getTerrainAt(state, unit.x, unit.y);
  const maxRange = unit.maxRange + (unitTerrain === 2 ? 1 : 0); // Hill range bonus
  const minRange = unit.minRange;

  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (e.hp > 0) {
      const d = dist(unit.x, unit.y, e.x, e.y);
      if (d >= minRange && d <= maxRange) {
        actions.push(`attack:${e.id}`);
      }
    }
  }

  // Special skill actions
  if (unit.cooldown <= 0) {
    if (unit.role === 'commander') {
      // Shield Bash: Range 1, heavy damage + stun
      for (let i = 0; i < state.enemies.length; i++) {
        const e = state.enemies[i];
        if (e.hp > 0 && dist(unit.x, unit.y, e.x, e.y) === 1) {
          actions.push(`skill:${e.id}`);
        }
      }
    } else if (unit.role === 'ranger') {
      // Deadly Aim: Range 2 to 4, high precision
      for (let i = 0; i < state.enemies.length; i++) {
        const e = state.enemies[i];
        if (e.hp > 0) {
          const d = dist(unit.x, unit.y, e.x, e.y);
          if (d >= 2 && d <= maxRange + 1) {
            actions.push(`skill:${e.id}`);
          }
        }
      }
    } else if (unit.role === 'mage') {
      // Chain Lightning: costs 20 MP, range 1 to 2
      if (unit.mp >= 20) {
        for (let i = 0; i < state.enemies.length; i++) {
          const e = state.enemies[i];
          if (e.hp > 0) {
            const d = dist(unit.x, unit.y, e.x, e.y);
            if (d >= 1 && d <= maxRange) {
              actions.push(`skill:${e.id}`);
            }
          }
        }
      }
    }
  }

  // Unit can always wait/end its turn
  actions.push('wait');

  return actions;
}

function calculateDamage(attacker, defender, isSkill, attackerTerrain, defenderTerrain) {
  let coverDef = 0;
  if (defenderTerrain === 1) coverDef = 6; // Forest cover
  if (defenderTerrain === 2) coverDef = 3; // Hill fortification

  const effectiveDef = defender.def + coverDef;
  let baseAtk = attacker.atk;
  if (isSkill) {
    baseAtk = Math.round(attacker.atk * 1.4);
  }

  const baseDmg = Math.max(5, baseAtk - effectiveDef);
  const facingMult = getFacingMultiplier(attacker, defender);
  const hillMult = attackerTerrain === 2 ? 1.15 : 1.0;

  return Math.max(2, Math.round(baseDmg * facingMult * hillMult));
}

function executeEnemyPhase(state) {
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (e.hp <= 0) continue;

    if (e.stun > 0) {
      e.stun--;
      state.combatLog.push(`${e.name} is stunned and cannot act!`);
      continue;
    }

    // Find closest alive player target
    let bestTarget = null;
    let bestDist = 999;
    for (let j = 0; j < state.players.length; j++) {
      const p = state.players[j];
      if (p.hp > 0) {
        const d = dist(e.x, e.y, p.x, p.y);
        if (d < bestDist) {
          bestDist = d;
          bestTarget = p;
        }
      }
    }

    if (!bestTarget) break;

    // Movement toward target if out of range
    const eTerrain = getTerrainAt(state, e.x, e.y);
    const maxRange = e.maxRange + (eTerrain === 2 ? 1 : 0);
    const minRange = e.minRange;

    let inRange = bestDist >= minRange && bestDist <= maxRange;

    if (!inRange && e.move > 0) {
      let bestMove = null;
      let minTargetDist = bestDist;

      for (let dy = -e.move; dy <= e.move; dy++) {
        for (let dx = -e.move; dx <= e.move; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (Math.abs(dx) + Math.abs(dy) <= e.move) {
            const nx = e.x + dx;
            const ny = e.y + dy;
            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
              if (!isCellOccupied(state, nx, ny)) {
                const nd = dist(nx, ny, bestTarget.x, bestTarget.y);
                if (nd < minTargetDist) {
                  minTargetDist = nd;
                  bestMove = { x: nx, y: ny };
                }
              }
            }
          }
        }
      }

      if (bestMove) {
        updateFacing(e, bestMove.x, bestMove.y);
        e.x = bestMove.x;
        e.y = bestMove.y;
        bestDist = dist(e.x, e.y, bestTarget.x, bestTarget.y);
        const curTerr = getTerrainAt(state, e.x, e.y);
        const curMaxRange = e.maxRange + (curTerr === 2 ? 1 : 0);
        inRange = bestDist >= e.minRange && bestDist <= curMaxRange;
      }
    }

    // Attack if now in range
    if (inRange) {
      updateFacing(e, bestTarget.x, bestTarget.y);
      const attTerr = getTerrainAt(state, e.x, e.y);
      const defTerr = getTerrainAt(state, bestTarget.x, bestTarget.y);
      const dmg = calculateDamage(e, bestTarget, false, attTerr, defTerr);
      bestTarget.hp = Math.max(0, bestTarget.hp - dmg);
      state.combatLog.push(`${e.name} attacked ${bestTarget.name} for ${dmg} DMG!`);

      if (bestTarget.hp === 0) {
        state.combatLog.push(`${bestTarget.name} has fallen in battle!`);
      }
    }
  }

  // End of round housekeeping
  state.round++;
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    p.acted = false;
    p.hasMoved = false;
    if (p.cooldown > 0) p.cooldown--;
    if (p.mp !== undefined && p.mp < p.maxMp) {
      p.mp = Math.min(p.maxMp, p.mp + 5);
    }
  }

  // Pick first alive player for the new round
  const nextPlayer = state.players.find(p => p.hp > 0);
  state.activeUnitId = nextPlayer ? nextPlayer.id : null;
}

function checkBattleOutcome(state) {
  // Check enemy wipeout
  const allEnemiesDead = state.enemies.every(e => e.hp <= 0);
  if (allEnemiesDead) {
    state.done = true;
    state.victory = true;
    state.score += 500 + Math.max(0, 100 - state.round * 10);
    state.combatLog.push('VICTORY! All hostile forces vanquished!');
    return;
  }

  // Check commander dead or all players dead
  const commander = state.players.find(p => p.role === 'commander');
  const allPlayersDead = state.players.every(p => p.hp <= 0);
  if ((commander && commander.hp <= 0) || allPlayersDead) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! Lord Commander has fallen.');
    return;
  }

  // Turn limit check
  if (state.turnCount >= MAX_TURNS) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! Operations exceeded operational turn limit.');
  }
}

function step(state, action) {
  if (state.done) {
    throw new Error('Game is already over');
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  const unit = findActivePlayer(state);
  if (!unit) {
    throw new Error('No active unit available');
  }

  state.turnCount++;

  let reward = 0.0;

  if (action.startsWith('move:')) {
    const coords = action.slice(5).split(',').map(Number);
    const nx = coords[0];
    const ny = coords[1];
    updateFacing(unit, nx, ny);
    unit.x = nx;
    unit.y = ny;
    unit.hasMoved = true;
    state.combatLog.push(`${unit.name} maneuvered to (${nx}, ${ny}).`);
  } else if (action.startsWith('attack:')) {
    const targetId = action.slice(7);
    const target = state.enemies.find(e => e.id === targetId);
    if (!target) throw new Error('Target not found');

    updateFacing(unit, target.x, target.y);
    const attTerr = getTerrainAt(state, unit.x, unit.y);
    const defTerr = getTerrainAt(state, target.x, target.y);
    const dmg = calculateDamage(unit, target, false, attTerr, defTerr);

    target.hp = Math.max(0, target.hp - dmg);
    unit.acted = true;
    state.score += dmg * 2;
    reward += 0.05;
    state.combatLog.push(`${unit.name} struck ${target.name} for ${dmg} DMG!`);

    if (target.hp === 0) {
      state.score += 150;
      reward += 0.2;
      state.combatLog.push(`${target.name} was defeated!`);
    }
  } else if (action.startsWith('skill:')) {
    const targetId = action.slice(6);
    const target = state.enemies.find(e => e.id === targetId);
    if (!target) throw new Error('Target not found');

    updateFacing(unit, target.x, target.y);
    const attTerr = getTerrainAt(state, unit.x, unit.y);
    const defTerr = getTerrainAt(state, target.x, target.y);
    const dmg = calculateDamage(unit, target, true, attTerr, defTerr);

    target.hp = Math.max(0, target.hp - dmg);
    unit.acted = true;
    unit.cooldown = 2; // 2 turn cooldown for skills

    if (unit.role === 'commander') {
      target.stun = 1;
      state.combatLog.push(`${unit.name} executed Shield Bash on ${target.name} for ${dmg} DMG (STUNNED)!`);
    } else if (unit.role === 'ranger') {
      state.combatLog.push(`${unit.name} sniped ${target.name} with Deadly Aim for ${dmg} DMG!`);
    } else if (unit.role === 'mage') {
      unit.mp -= 20;
      // Secondary chain damage to another adjacent enemy if present
      let chainTarget = state.enemies.find(e => e.id !== target.id && e.hp > 0 && dist(target.x, target.y, e.x, e.y) <= 2);
      if (chainTarget) {
        const chainDmg = Math.round(dmg * 0.6);
        chainTarget.hp = Math.max(0, chainTarget.hp - chainDmg);
        state.combatLog.push(`${unit.name} cast Chain Lightning on ${target.name} (${dmg} DMG) and arced to ${chainTarget.name} (${chainDmg} DMG)!`);
        if (chainTarget.hp === 0) {
          state.score += 150;
          state.combatLog.push(`${chainTarget.name} was incinerated!`);
        }
      } else {
        state.combatLog.push(`${unit.name} unleashed Lightning Bolt on ${target.name} for ${dmg} DMG!`);
      }
    }

    state.score += dmg * 3;
    reward += 0.08;

    if (target.hp === 0) {
      state.score += 150;
      reward += 0.2;
      state.combatLog.push(`${target.name} was eliminated!`);
    }
  } else if (action === 'wait') {
    unit.acted = true;
    state.combatLog.push(`${unit.name} stands on guard.`);
  }

  // Check battle status
  checkBattleOutcome(state);
  if (state.done) {
    return { reward: state.victory ? 1.0 : 0.0, done: true };
  }

  // If active player finished their turn, move to next alive unacted player
  if (unit.acted) {
    const nextUnacted = state.players.find(p => p.hp > 0 && !p.acted);
    if (nextUnacted) {
      state.activeUnitId = nextUnacted.id;
    } else {
      // All player units acted: Run Enemy Phase
      executeEnemyPhase(state);
      checkBattleOutcome(state);
      if (state.done) {
        return { reward: state.victory ? 1.0 : 0.0, done: true };
      }
    }
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return Boolean(state.done);
}

function score(state) {
  return state.score;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
