// Logic for 0117-mystery-dungeon: Mystery Labyrinth: Wanderer's Descent
// Pure Bot Contract implementation. Zero UI or platform dependencies.

const GRID_SIZE = 8;
const MAX_TURNS = 200;

function nextRng(state) {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState / 4294967296;
}

function dist(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function generateFloor(state, floorNumber) {
  // 8x8 Grid: outer perimeter is solid stone wall (1), interior is floor (0)
  const grid = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      if (x === 0 || x === GRID_SIZE - 1 || y === 0 || y === GRID_SIZE - 1) {
        row.push(1); // Stone wall
      } else {
        // Occasional pillar in interior
        const roll = nextRng(state);
        if (roll < 0.12 && (x !== 1 || y !== 1) && (x !== 6 || y !== 6)) {
          row.push(1);
        } else {
          row.push(0); // Floor
        }
      }
    }
    grid.push(row);
  }

  // Player start
  const playerPos = { x: 1, y: 1 };

  // Stairs or Relic at opposite corner
  const stairsPos = { x: 6, y: 6 };
  grid[stairsPos.y][stairsPos.x] = 0; // ensure passable

  // Monsters for this floor
  const monsters = [];
  if (floorNumber === 1) {
    monsters.push(
      { id: 'm1', name: 'Cave Slime', hp: 20, maxHp: 20, atk: 7, def: 1, x: 4, y: 2, sleep: 0 },
      { id: 'm2', name: 'Dungeon Bat', hp: 15, maxHp: 15, atk: 9, def: 0, x: 5, y: 5, sleep: 0 }
    );
  } else if (floorNumber === 2) {
    monsters.push(
      { id: 'm1', name: 'Crypt Skeleton', hp: 32, maxHp: 32, atk: 12, def: 3, x: 3, y: 4, sleep: 0 },
      { id: 'm2', name: 'Shadow Fiend', hp: 24, maxHp: 24, atk: 14, def: 1, x: 5, y: 2, sleep: 0 }
    );
  } else if (floorNumber === 3) {
    monsters.push(
      { id: 'm1', name: 'Orc Sentinel', hp: 45, maxHp: 45, atk: 16, def: 4, x: 4, y: 4, sleep: 0 },
      { id: 'm2', name: 'Fire Imp', hp: 30, maxHp: 30, atk: 18, def: 2, x: 5, y: 3, sleep: 0 }
    );
  } else {
    // Floor 4: Boss Floor
    monsters.push(
      { id: 'boss', name: 'Minotaur Guardian', hp: 80, maxHp: 80, atk: 22, def: 6, x: 5, y: 5, sleep: 0 }
    );
  }

  // Items on floor
  const items = [];
  if (floorNumber < 4) {
    items.push({ x: 2, y: 3, type: 'apple' });
    if (floorNumber === 1) items.push({ x: 4, y: 5, type: 'herb' });
    if (floorNumber === 2) items.push({ x: 5, y: 1, type: 'sleep_wand' });
    if (floorNumber === 3) items.push({ x: 2, y: 5, type: 'blast_scroll' });
  } else {
    // Golden Relic at boss altar
    items.push({ x: 6, y: 6, type: 'relic' });
  }

  return { grid, playerPos, stairsPos, monsters, items };
}

function createState(seed = 1) {
  let rngVal = (Math.floor(seed) >>> 0) || 8675309;
  const tempState = { rngState: rngVal };

  const floorData = generateFloor(tempState, 1);

  return {
    seed,
    rngState: tempState.rngState,
    floor: 1,
    maxFloors: 4,
    grid: floorData.grid,
    player: {
      x: floorData.playerPos.x,
      y: floorData.playerPos.y,
      hp: 100,
      maxHp: 100,
      belly: 100,
      maxBelly: 100,
      atk: 16,
      def: 3,
      inventory: ['apple', 'herb']
    },
    stairs: floorData.stairsPos,
    monsters: floorData.monsters,
    items: floorData.items,
    turnCount: 0,
    score: 0,
    done: false,
    victory: false,
    combatLog: ['The wanderer enters Floor 1 of the Mystery Labyrinth.']
  };
}

const DIR_OFFSETS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

function isCellWalkable(state, x, y) {
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
  if (state.grid[y][x] === 1) return false; // wall
  // monster blocks walking
  for (let i = 0; i < state.monsters.length; i++) {
    const m = state.monsters[i];
    if (m.hp > 0 && m.x === x && m.y === y) return false;
  }
  return true;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const px = state.player.x;
  const py = state.player.y;

  // Directional actions: move or attack
  const dirs = ['up', 'down', 'left', 'right'];
  for (let i = 0; i < dirs.length; i++) {
    const d = dirs[i];
    const offset = DIR_OFFSETS[d];
    const nx = px + offset.dx;
    const ny = py + offset.dy;

    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
      // Check if monster in target tile -> attack
      let monsterThere = false;
      for (let m = 0; m < state.monsters.length; m++) {
        const mon = state.monsters[m];
        if (mon.hp > 0 && mon.x === nx && mon.y === ny) {
          actions.push(`attack:${d}`);
          monsterThere = true;
          break;
        }
      }
      // If walkable tile with no monster -> move
      if (!monsterThere && state.grid[ny][nx] === 0) {
        actions.push(`move:${d}`);
      }
    }
  }

  // Inventory item actions
  for (let i = 0; i < state.player.inventory.length; i++) {
    actions.push(`use:${i}`);
  }

  // Descend stairs (if standing on stairs tile and not on boss floor)
  if (state.floor < state.maxFloors && px === state.stairs.x && py === state.stairs.y) {
    actions.push('descend');
  }

  // Always can wait a turn
  actions.push('wait');

  return actions;
}

function executeMonstersTurn(state) {
  const px = state.player.x;
  const py = state.player.y;

  for (let i = 0; i < state.monsters.length; i++) {
    const m = state.monsters[i];
    if (m.hp <= 0) continue;

    // Check sleep status
    if (m.sleep > 0) {
      m.sleep--;
      continue;
    }

    const d = dist(m.x, m.y, px, py);

    if (d === 1) {
      // Adjacent: Attack player
      const rawDmg = Math.max(3, m.atk - state.player.def);
      state.player.hp = Math.max(0, state.player.hp - rawDmg);
      state.combatLog.push(`${m.name} struck you for ${rawDmg} DMG!`);
    } else if (d > 1 && d <= 5) {
      // Step closer to player
      let bestX = m.x;
      let bestY = m.y;
      let minTargetDist = d;

      const dirs = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
      ];

      for (let j = 0; j < dirs.length; j++) {
        const nx = m.x + dirs[j].dx;
        const ny = m.y + dirs[j].dy;
        if (isCellWalkable(state, nx, ny) && !(nx === px && ny === py)) {
          const nd = dist(nx, ny, px, py);
          if (nd < minTargetDist) {
            minTargetDist = nd;
            bestX = nx;
            bestY = ny;
          }
        }
      }

      m.x = bestX;
      m.y = bestY;
    }
  }
}

function checkOutcome(state) {
  if (state.player.hp <= 0) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! The wanderer collapsed in the dark labyrinth.');
    return;
  }

  // Check if Minotaur is dead and relic claimed on floor 4
  if (state.floor === 4) {
    const boss = state.monsters.find(m => m.id === 'boss');
    const hasRelic = state.player.inventory.includes('relic');
    if (boss && boss.hp <= 0 && hasRelic) {
      state.done = true;
      state.victory = true;
      state.score += 1000 + Math.max(0, 200 - state.turnCount * 4);
      state.combatLog.push('VICTORY! The Golden Relic has been recovered!');
      return;
    }
  }

  if (state.turnCount >= MAX_TURNS) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! Turn limit exceeded. Trapped in the dungeon.');
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

  state.turnCount++;
  let reward = 0.0;

  if (action.startsWith('move:')) {
    const d = action.slice(5);
    const offset = DIR_OFFSETS[d];
    state.player.x += offset.dx;
    state.player.y += offset.dy;

    // Pick up items on the ground
    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      if (it.x === state.player.x && it.y === state.player.y) {
        if (state.player.inventory.length < 6) {
          state.player.inventory.push(it.type);
          state.combatLog.push(`Picked up ${it.type}!`);
          state.items.splice(i, 1);
          state.score += 25;
          reward += 0.02;
        }
      }
    }
  } else if (action.startsWith('attack:')) {
    const d = action.slice(7);
    const offset = DIR_OFFSETS[d];
    const tx = state.player.x + offset.dx;
    const ty = state.player.y + offset.dy;

    const target = state.monsters.find(m => m.hp > 0 && m.x === tx && m.y === ty);
    if (target) {
      const dmg = Math.max(4, state.player.atk - target.def);
      target.hp = Math.max(0, target.hp - dmg);
      state.score += dmg * 2;
      reward += 0.05;
      state.combatLog.push(`You struck ${target.name} for ${dmg} DMG!`);

      if (target.hp === 0) {
        state.score += 120;
        reward += 0.2;
        state.combatLog.push(`${target.name} dissolved into mist!`);
      }
    }
  } else if (action.startsWith('use:')) {
    const slot = Number(action.slice(4));
    const itemType = state.player.inventory[slot];
    state.player.inventory.splice(slot, 1);

    if (itemType === 'apple') {
      state.player.belly = Math.min(state.player.maxBelly, state.player.belly + 50);
      state.combatLog.push('Ate an Apple. Restored 50 Belly!');
      reward += 0.02;
    } else if (itemType === 'herb') {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 40);
      state.combatLog.push('Consumed Medicinal Herb. Restored 40 HP!');
      reward += 0.03;
    } else if (itemType === 'sleep_wand') {
      // Puts nearest monster to sleep
      let nearest = null;
      let minD = 999;
      for (let i = 0; i < state.monsters.length; i++) {
        const m = state.monsters[i];
        if (m.hp > 0) {
          const d = dist(state.player.x, state.player.y, m.x, m.y);
          if (d < minD) {
            minD = d;
            nearest = m;
          }
        }
      }
      if (nearest) {
        nearest.sleep = 3;
        state.combatLog.push(`Sleep Wand beam put ${nearest.name} to sleep for 3 turns!`);
        reward += 0.05;
      }
    } else if (itemType === 'blast_scroll') {
      // 3x3 blast deals 30 damage
      let hitCount = 0;
      for (let i = 0; i < state.monsters.length; i++) {
        const m = state.monsters[i];
        if (m.hp > 0 && Math.abs(m.x - state.player.x) <= 1 && Math.abs(m.y - state.player.y) <= 1) {
          m.hp = Math.max(0, m.hp - 30);
          hitCount++;
          state.score += 60;
          if (m.hp === 0) {
            state.score += 120;
            reward += 0.15;
            state.combatLog.push(`${m.name} was obliterated by Blast Scroll!`);
          }
        }
      }
      state.combatLog.push(`Blast Scroll detonated! Struck ${hitCount} nearby enemies.`);
      reward += 0.05;
    }
  } else if (action === 'descend') {
    state.floor++;
    state.score += 200;
    reward += 0.25;
    state.combatLog.push(`Descended to Floor ${state.floor}!`);

    // Generate new floor
    const floorData = generateFloor(state, state.floor);
    state.grid = floorData.grid;
    state.player.x = floorData.playerPos.x;
    state.player.y = floorData.playerPos.y;
    state.stairs = floorData.stairsPos;
    state.monsters = floorData.monsters;
    state.items = floorData.items;

    checkOutcome(state);
    return { reward, done: state.done };
  } else if (action === 'wait') {
    state.combatLog.push('You rested and observed your surroundings.');
  }

  // Belly decay and hunger mechanics
  state.player.belly = Math.max(0, state.player.belly - 1);
  if (state.player.belly === 0) {
    state.player.hp = Math.max(0, state.player.hp - 2);
    state.combatLog.push('STARVATION! Lost 2 HP from an empty stomach!');
  } else if (state.player.hp < state.player.maxHp && state.turnCount % 3 === 0) {
    state.player.hp++;
  }

  // Monsters take their turn
  executeMonstersTurn(state);

  // Check victory / defeat
  checkOutcome(state);

  return { reward: state.victory ? 1.0 : (state.done ? 0.0 : reward), done: state.done };
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
