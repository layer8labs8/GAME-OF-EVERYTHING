// Logic for 0128-action-adventure: Sunken Spire
// Pure Bot Contract implementation. Zero UI or platform dependencies.

const GRID_SIZE = 10;
const MAX_TURNS = 250;

function nextRng(state) {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState / 4294967296;
}

const DIR_OFFSETS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

function generateWingMap(wing) {
  const map = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      if (x === 0 || x === GRID_SIZE - 1 || y === 0 || y === GRID_SIZE - 1) {
        row.push('#');
      } else {
        row.push('.');
      }
    }
    map.push(row);
  }

  if (wing === 1) {
    // Sun Courtyard
    // Barrier dividing the hall
    map[4][4] = 'G'; // Barrier Gate
    map[4][5] = '#';
    map[4][6] = '#';
    map[4][3] = '#';

    // Crystal switch across corner
    map[2][7] = '*'; // Crystal switch

    // Small key on ground
    map[7][2] = 'k';

    // Transition door to Wing 2
    map[8][8] = 'D'; // Locked Door
  } else if (wing === 2) {
    // Fire Foundry
    // Cracked walls hiding rooms
    map[4][4] = 'C'; // Cracked wall
    map[4][5] = '#';
    map[4][6] = '#';
    map[4][3] = '#';

    // Master Key behind cracked barrier
    map[2][6] = 'B'; // Master Key

    // Heart container
    map[6][2] = 'H';

    // Door to Wing 3
    map[8][8] = 'D';
  } else {
    // Wing 3: Sunken Vault
    // Chasm across center
    for (let y = 1; y <= 8; y++) {
      if (y !== 4) {
        map[y][4] = '~'; // Chasm/water
      }
    }
    map[4][5] = 'P'; // Hookshot Post on eastern bank

    // Boss Chamber Door
    map[7][7] = 'X'; // Boss Door

    // Solar Relic behind boss
    map[8][8] = 'R';
  }

  return map;
}

function spawnWingEnemies(wing) {
  const enemies = [];
  if (wing === 1) {
    enemies.push({ id: 'e1', name: 'Desert Stalker', type: 'stalker', x: 5, y: 2, hp: 16, maxHp: 16, atk: 5, stunned: 0 });
    enemies.push({ id: 'e2', name: 'Desert Stalker', type: 'stalker', x: 6, y: 7, hp: 16, maxHp: 16, atk: 5, stunned: 0 });
  } else if (wing === 2) {
    enemies.push({ id: 'm1', name: 'Armored Minotaur', type: 'minotaur', x: 5, y: 6, hp: 30, maxHp: 30, atk: 8, stunned: 0 });
    enemies.push({ id: 'e3', name: 'Fire Imp', type: 'imp', x: 7, y: 2, hp: 14, maxHp: 14, atk: 6, stunned: 0 });
  } else {
    // Wing 3: Boss
    enemies.push({ id: 'boss', name: 'The Gorgon Titan', type: 'boss', x: 7, y: 6, hp: 60, maxHp: 60, atk: 12, stunned: 0 });
  }
  return enemies;
}

function createState(seed = 1) {
  let rngVal = (Math.floor(seed) >>> 0) || 12398451;

  const player = {
    x: 1,
    y: 1,
    hp: 30,
    maxHp: 30,
    tools: ['sword', 'boomerang'],
    keys: 0,
    hasMasterKey: false,
    bombsCount: 5
  };

  const state = {
    seed,
    rngState: rngVal,
    wing: 1,
    maxWings: 3,
    turns: 0,
    maxTurns: MAX_TURNS,
    score: 0,
    enemiesKilled: 0,
    done: false,
    victory: false,
    player,
    map: generateWingMap(1),
    enemies: spawnWingEnemies(1),
    combatLog: ['Entered Sunken Spire. Seek the Solar Relic in the depths.']
  };

  return state;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const p = state.player;
  const dirs = ['up', 'down', 'left', 'right'];

  // Movement & Bump Attack
  for (let i = 0; i < dirs.length; i++) {
    const d = dirs[i];
    const off = DIR_OFFSETS[d];
    const nx = p.x + off.dx;
    const ny = p.y + off.dy;

    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
      const tile = state.map[ny][nx];
      // Can move into walkable tiles (not wall, not water, not closed gate/door)
      if (tile === '.' || tile === 'k' || tile === 'B' || tile === 'H' || tile === 'R') {
        actions.push(`move:${d}`);
      } else if (tile === '#' || tile === '~' || tile === 'G' || tile === 'D' || tile === 'X' || tile === 'C' || tile === 'P') {
        // If there is an enemy on the tile, bump combat is legal
        if (state.enemies.some(e => e.x === nx && e.y === ny && e.hp > 0)) {
          actions.push(`move:${d}`);
        }
      }
    }
  }

  // Boomerang tool (hits switches, stuns enemies up to 5 tiles away)
  if (p.tools.includes('boomerang')) {
    for (let i = 0; i < dirs.length; i++) {
      actions.push(`throw_boomerang:${dirs[i]}`);
    }
  }

  // Bombs tool (destroys cracked walls)
  if (p.tools.includes('bombs') && p.bombsCount > 0) {
    for (let i = 0; i < dirs.length; i++) {
      const d = dirs[i];
      const off = DIR_OFFSETS[d];
      const nx = p.x + off.dx;
      const ny = p.y + off.dy;
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        if (state.map[ny][nx] === 'C') {
          actions.push(`place_bomb:${d}`);
        }
      }
    }
  }

  // Hookshot tool (grapples to Post 'P' across chasm '~')
  if (p.tools.includes('hookshot')) {
    for (let i = 0; i < dirs.length; i++) {
      const d = dirs[i];
      const off = DIR_OFFSETS[d];
      // Check if post P lies in this line
      for (let dist = 1; dist <= 6; dist++) {
        const tx = p.x + off.dx * dist;
        const ty = p.y + off.dy * dist;
        if (tx < 0 || tx >= GRID_SIZE || ty < 0 || ty >= GRID_SIZE) break;
        if (state.map[ty][tx] === '#') break;
        if (state.map[ty][tx] === 'P') {
          actions.push(`hookshot:${d}`);
          break;
        }
      }
    }
  }

  // Unlock doors (D with small key, X with master key)
  for (let i = 0; i < dirs.length; i++) {
    const d = dirs[i];
    const off = DIR_OFFSETS[d];
    const nx = p.x + off.dx;
    const ny = p.y + off.dy;

    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
      if (state.map[ny][nx] === 'D' && p.keys > 0) {
        actions.push(`unlock:${d}`);
      } else if (state.map[ny][nx] === 'X' && p.hasMasterKey) {
        actions.push(`unlock:${d}`);
      }
    }
  }

  actions.push('wait');
  return actions;
}

function resolvePlayerTurn(state, action) {
  const p = state.player;

  if (action.startsWith('move:')) {
    const dir = action.split(':')[1];
    const off = DIR_OFFSETS[dir];
    if (!off) throw new Error(`Invalid move: ${action}`);

    const nx = p.x + off.dx;
    const ny = p.y + off.dy;

    // Check bump attack
    const enemy = state.enemies.find(e => e.x === nx && e.y === ny && e.hp > 0);
    if (enemy) {
      const dmg = 10;
      enemy.hp -= dmg;
      state.score += dmg * 4;
      state.combatLog.push(`Sword Slash strikes ${enemy.name} for ${dmg} damage.`);
      if (enemy.hp <= 0) {
        state.enemiesKilled += 1;
        state.score += 80;
        state.combatLog.push(`Defeated ${enemy.name}!`);
      }
    } else {
      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) {
        throw new Error('Out of bounds');
      }
      const tile = state.map[ny][nx];
      if (tile === '#' || tile === '~' || tile === 'G' || tile === 'D' || tile === 'X' || tile === 'C' || tile === 'P') {
        throw new Error(`Cannot move into blocked tile: ${tile}`);
      }

      p.x = nx;
      p.y = ny;

      // Item interactions
      if (tile === 'k') {
        p.keys += 1;
        state.score += 100;
        state.map[ny][nx] = '.';
        state.combatLog.push(`Found Small Key! (${p.keys} in pouch)`);
      } else if (tile === 'B') {
        p.hasMasterKey = true;
        state.score += 250;
        state.map[ny][nx] = '.';
        state.combatLog.push('TRIUMPH! Found the Boss Master Key!');
      } else if (tile === 'H') {
        p.maxHp += 10;
        p.hp = p.maxHp;
        state.score += 150;
        state.map[ny][nx] = '.';
        state.combatLog.push('Heart Container acquired! Vitality increased (+10 Max HP).');
      } else if (tile === 'R') {
        // Solar Relic claimed!
        state.done = true;
        state.victory = true;
        state.score += 3000;
        state.combatLog.push('VICTORY! You claimed the Solar Relic of the Sunken Spire!');
      }
    }
  } else if (action.startsWith('throw_boomerang:')) {
    const dir = action.split(':')[1];
    const off = DIR_OFFSETS[dir];
    if (!off) throw new Error(`Invalid boomerang throw: ${action}`);

    let hit = false;
    for (let dist = 1; dist <= 5; dist++) {
      const tx = p.x + off.dx * dist;
      const ty = p.y + off.dy * dist;

      if (tx < 0 || tx >= GRID_SIZE || ty < 0 || ty >= GRID_SIZE || state.map[ty][tx] === '#') {
        break;
      }

      // Check crystal switch
      if (state.map[ty][tx] === '*') {
        // Toggle barrier gates 'G' into '.'
        let toggled = 0;
        for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
            if (state.map[y][x] === 'G') {
              state.map[y][x] = '.';
              toggled++;
            }
          }
        }
        hit = true;
        state.score += 50;
        state.combatLog.push(`Boomerang struck Crystal Switch! ${toggled} barrier gates lowered.`);
        break;
      }

      // Check enemy stun
      const enemy = state.enemies.find(e => e.x === tx && e.y === ty && e.hp > 0);
      if (enemy) {
        enemy.stunned = 2;
        hit = true;
        state.score += 20;
        state.combatLog.push(`Boomerang struck and stunned ${enemy.name}!`);
        break;
      }
    }

    if (!hit) {
      state.combatLog.push('Boomerang flies through the chamber and returns.');
    }
  } else if (action.startsWith('place_bomb:')) {
    const dir = action.split(':')[1];
    const off = DIR_OFFSETS[dir];
    if (!off) throw new Error(`Invalid bomb: ${action}`);

    const nx = p.x + off.dx;
    const ny = p.y + off.dy;
    if (state.map[ny][nx] !== 'C') throw new Error('Target is not a cracked wall');

    p.bombsCount -= 1;
    state.map[ny][nx] = '.';
    state.score += 60;
    state.combatLog.push('BOMB DETONATION! Cracked wall blasted into rubble.');
  } else if (action.startsWith('hookshot:')) {
    const dir = action.split(':')[1];
    const off = DIR_OFFSETS[dir];
    if (!off) throw new Error(`Invalid hookshot: ${action}`);

    let postFound = null;
    for (let dist = 1; dist <= 6; dist++) {
      const tx = p.x + off.dx * dist;
      const ty = p.y + off.dy * dist;
      if (tx < 0 || tx >= GRID_SIZE || ty < 0 || ty >= GRID_SIZE || state.map[ty][tx] === '#') break;
      if (state.map[ty][tx] === 'P') {
        postFound = { x: tx - off.dx, y: ty - off.dy };
        break;
      }
    }

    if (!postFound) throw new Error('No post in trajectory');

    p.x = postFound.x;
    p.y = postFound.y;
    state.score += 40;
    state.combatLog.push('Hookshot pulled you across the chasm safely!');
  } else if (action.startsWith('unlock:')) {
    const dir = action.split(':')[1];
    const off = DIR_OFFSETS[dir];
    if (!off) throw new Error(`Invalid unlock: ${action}`);

    const nx = p.x + off.dx;
    const ny = p.y + off.dy;
    const tile = state.map[ny][nx];

    if (tile === 'D') {
      if (p.keys <= 0) throw new Error('No keys');
      p.keys -= 1;
      state.map[ny][nx] = '.';
      state.score += 100;
      state.combatLog.push('Unlocked Iron Door with Small Key.');

      // Advance wing if at sector exit (8, 8)
      if (nx === 8 && ny === 8 && state.wing < state.maxWings) {
        state.wing += 1;
        state.score += 400;
        p.x = 1;
        p.y = 1;
        if (state.wing === 2) {
          p.tools.push('bombs');
          state.combatLog.push('Advanced to Wing 2: The Fire Foundry! Acquired Bombs.');
        } else if (state.wing === 3) {
          p.tools.push('hookshot');
          state.combatLog.push('Advanced to Wing 3: The Sunken Vault! Acquired Hookshot.');
        }
        state.map = generateWingMap(state.wing);
        state.enemies = spawnWingEnemies(state.wing);
      }
    } else if (tile === 'X') {
      if (!p.hasMasterKey) throw new Error('No master key');
      state.map[ny][nx] = '.';
      state.score += 200;
      state.combatLog.push('Master Key unlocked the Boss Sanctum door!');
    } else {
      throw new Error('Not a locked door');
    }
  } else if (action === 'wait') {
    state.combatLog.push('You observe the chamber and hold your ground.');
  } else {
    throw new Error(`Unknown action: ${action}`);
  }
}

function updateEnemies(state) {
  const p = state.player;

  for (const e of state.enemies) {
    if (e.hp <= 0) continue;

    if (e.stunned > 0) {
      e.stunned -= 1;
      state.combatLog.push(`${e.name} is stunned and cannot act.`);
      continue;
    }

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.abs(dx) + Math.abs(dy);

    if (dist === 1) {
      // Melee strike player
      p.hp = Math.max(0, p.hp - e.atk);
      state.combatLog.push(`${e.name} attacks you for ${e.atk} damage.`);
    } else if (dist <= 4) {
      // Step toward player
      let sx = 0;
      let sy = 0;
      if (Math.abs(dx) >= Math.abs(dy)) {
        sx = dx > 0 ? 1 : -1;
      } else {
        sy = dy > 0 ? 1 : -1;
      }

      const nx = e.x + sx;
      const ny = e.y + sy;

      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        const tile = state.map[ny][nx];
        if (tile === '.' || tile === 'k' || tile === 'B' || tile === 'H' || tile === 'R') {
          const blocked = state.enemies.some(o => o !== e && o.hp > 0 && o.x === nx && o.y === ny);
          if (!blocked && !(nx === p.x && ny === p.y)) {
            e.x = nx;
            e.y = ny;
          }
        }
      }
    }
  }
}

function checkGameEnd(state) {
  if (state.player.hp <= 0) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! Your quest ends in the sunken ruins.');
    return;
  }

  if (state.turns >= state.maxTurns) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! Temple mechanism locked down. Timeframe expired.');
  }
}

function step(state, action) {
  const legals = legalActions(state);
  if (!legals.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  state.turns += 1;

  // 1. Resolve player action
  resolvePlayerTurn(state, action);

  // 2. Resolve enemies if game not over
  if (!state.done) {
    updateEnemies(state);
  }

  // 3. Outcome
  checkGameEnd(state);

  const reward = state.done ? (state.victory ? 1.0 : 0.0) : 0.0;
  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
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
