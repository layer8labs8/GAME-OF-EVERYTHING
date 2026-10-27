// Logic for 0124-traditional-roguelike: Rogue's Descent
// Pure Bot Contract implementation. Zero UI or platform dependencies.

const MAP_WIDTH = 10;
const MAP_HEIGHT = 10;
const MAX_TURNS = 250;
const FOV_RADIUS = 4;

function nextRng(state) {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState / 4294967296;
}

function randInt(state, min, max) {
  return min + Math.floor(nextRng(state) * (max - min + 1));
}

const DIR_OFFSETS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 }
};

function generateFloorMap(state, floorNumber) {
  // 10x10 map with outer walls and rooms
  const map = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (x === 0 || x === MAP_WIDTH - 1 || y === 0 || y === MAP_HEIGHT - 1) {
        row.push('#');
      } else {
        row.push('.');
      }
    }
    map.push(row);
  }

  // Add internal architectural pillars and walls based on floor
  if (floorNumber === 1) {
    // 2 small pillars
    map[3][3] = '#';
    map[3][6] = '#';
    map[6][3] = '#';
    map[6][6] = '#';
  } else if (floorNumber === 2) {
    // Dividing corridor wall with 2 passages
    for (let x = 2; x <= 7; x++) {
      if (x !== 4 && x !== 5) {
        map[4][x] = '#';
      }
    }
  } else {
    // Sanctum pillars
    map[2][2] = '#';
    map[2][7] = '#';
    map[7][2] = '#';
    map[7][7] = '#';
    map[4][4] = '#';
    map[4][5] = '#';
    map[5][4] = '#';
    map[5][5] = '#';
  }

  // Place stairs or amulet
  if (floorNumber < 3) {
    map[8][8] = '>';
  } else {
    map[8][8] = 'A'; // Amulet of Yendor
  }

  return map;
}

function computeFOV(state) {
  const visible = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    visible.push(new Array(MAP_WIDTH).fill(false));
  }

  const px = state.player.x;
  const py = state.player.y;
  visible[py][px] = true;
  state.explored[py][px] = true;

  // Cast rays in circle
  const rays = 36;
  for (let i = 0; i < rays; i++) {
    const angle = (i * 2 * Math.PI) / rays;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    for (let r = 1; r <= FOV_RADIUS; r++) {
      const rx = Math.round(px + cos * r);
      const ry = Math.round(py + sin * r);

      if (rx < 0 || rx >= MAP_WIDTH || ry < 0 || ry >= MAP_HEIGHT) break;

      visible[ry][rx] = true;
      state.explored[ry][rx] = true;

      // Obstacles block further sight along this ray
      if (state.map[ry][rx] === '#') {
        break;
      }
    }
  }

  state.visible = visible;
}

function spawnFloorEntities(state, floorNumber) {
  const enemies = [];
  const items = [];

  if (floorNumber === 1) {
    enemies.push({ id: 'r1', name: 'Cave Rat', type: 'rat', x: 4, y: 2, hp: 14, maxHp: 14, atk: 5, def: 1 });
    enemies.push({ id: 'g1', name: 'Goblin Scout', type: 'goblin', x: 7, y: 4, hp: 20, maxHp: 20, atk: 7, def: 2 });
    enemies.push({ id: 'g2', name: 'Goblin Slinger', type: 'goblin', x: 2, y: 7, hp: 18, maxHp: 18, atk: 6, def: 2 });

    items.push({ id: 'f1', type: 'food', name: 'Ration of Hardtack', x: 3, y: 2 });
    items.push({ id: 'p1', type: 'potion', color: 'crimson', name: 'Crimson Potion', x: 6, y: 5 });
    items.push({ id: 's1', type: 'scroll', scrollType: 'parchment', name: 'Parchment Scroll', x: 5, y: 7 });
  } else if (floorNumber === 2) {
    enemies.push({ id: 's1', name: 'Crypt Skeleton', type: 'skeleton', x: 3, y: 2, hp: 26, maxHp: 26, atk: 10, def: 3 });
    enemies.push({ id: 'o1', name: 'Orc Marauder', type: 'orc', x: 7, y: 3, hp: 35, maxHp: 35, atk: 12, def: 4 });
    enemies.push({ id: 'o2', name: 'Orc Sentry', type: 'orc', x: 4, y: 7, hp: 32, maxHp: 32, atk: 11, def: 4 });

    items.push({ id: 'f2', type: 'food', name: 'Salted Jerky', x: 5, y: 2 });
    items.push({ id: 'p2', type: 'potion', color: 'azure', name: 'Azure Potion', x: 2, y: 6 });
    items.push({ id: 's2', type: 'scroll', scrollType: 'papyrus', name: 'Papyrus Scroll', x: 7, y: 6 });
  } else {
    // Floor 3: Sanctum of Yendor
    enemies.push({ id: 'boss', name: 'The Dread Chimera', type: 'chimera', x: 7, y: 7, hp: 80, maxHp: 80, atk: 16, def: 5 });
    enemies.push({ id: 'g3', name: 'Sanctum Horror', type: 'horror', x: 6, y: 3, hp: 30, maxHp: 30, atk: 11, def: 3 });

    items.push({ id: 'p3', type: 'potion', color: 'emerald', name: 'Emerald Potion', x: 3, y: 6 });
    items.push({ id: 's3', type: 'scroll', scrollType: 'vellum', name: 'Vellum Scroll', x: 6, y: 2 });
  }

  state.enemies = enemies;
  state.items = items;
}

function createState(seed = 1) {
  let rngVal = (Math.floor(seed) >>> 0) || 71239841;

  const explored = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    explored.push(new Array(MAP_WIDTH).fill(false));
  }

  const player = {
    x: 1,
    y: 1,
    hp: 50,
    maxHp: 50,
    atk: 10,
    def: 3,
    hunger: 100, // 0 to 100
    inventory: [
      { id: 'f0', type: 'food', name: 'Traveler Rations' }
    ]
  };

  const state = {
    seed,
    rngState: rngVal,
    floor: 1,
    maxFloors: 3,
    turns: 0,
    maxTurns: MAX_TURNS,
    score: 0,
    kills: 0,
    done: false,
    victory: false,
    hasAmulet: false,
    identified: {
      potions: { crimson: false, azure: false, emerald: false },
      scrolls: { parchment: false, vellum: false, papyrus: false }
    },
    player,
    map: [],
    visible: [],
    explored,
    enemies: [],
    items: [],
    combatLog: ['You descend into the perilous Caverns of Yendor. Seek the Amulet!']
  };

  state.map = generateFloorMap(state, 1);
  spawnFloorEntities(state, 1);
  computeFOV(state);

  return state;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const p = state.player;

  // Directional actions (move or bump attack)
  const dirs = ['up', 'down', 'left', 'right'];
  for (let i = 0; i < dirs.length; i++) {
    const d = dirs[i];
    const off = DIR_OFFSETS[d];
    const nx = p.x + off.dx;
    const ny = p.y + off.dy;

    if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
      if (state.map[ny][nx] !== '#') {
        actions.push(`move:${d}`);
      }
    }
  }

  // Rest / Wait
  actions.push('wait');

  // Ground item pickup
  const itemOnTile = state.items.find(it => it.x === p.x && it.y === p.y);
  if (itemOnTile && p.inventory.length < 6) {
    actions.push('pickup');
  }

  // Staircase descent
  if (state.map[p.y][p.x] === '>' && state.floor < state.maxFloors) {
    actions.push('descend');
  }

  // Inventory actions
  for (let i = 0; i < p.inventory.length; i++) {
    const it = p.inventory[i];
    if (it.type === 'food') {
      actions.push(`eat:${i}`);
    } else if (it.type === 'potion') {
      actions.push(`quaff:${i}`);
    } else if (it.type === 'scroll') {
      actions.push(`read:${i}`);
    }
  }

  return actions;
}

function resolvePlayerTurn(state, action) {
  const p = state.player;

  if (action.startsWith('move:')) {
    const dir = action.split(':')[1];
    const off = DIR_OFFSETS[dir];
    if (!off) throw new Error(`Invalid move direction: ${action}`);

    const nx = p.x + off.dx;
    const ny = p.y + off.dy;

    if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT || state.map[ny][nx] === '#') {
      throw new Error(`Invalid move destination: ${action}`);
    }

    // Check enemy bump attack
    const enemy = state.enemies.find(e => e.x === nx && e.y === ny && e.hp > 0);
    if (enemy) {
      const dmg = Math.max(1, p.atk - enemy.def);
      enemy.hp -= dmg;
      state.score += dmg * 3;
      state.combatLog.push(`You strike ${enemy.name} for ${dmg} damage.`);

      if (enemy.hp <= 0) {
        state.kills += 1;
        state.score += 50;
        state.combatLog.push(`Defeated ${enemy.name}!`);
      }
    } else {
      // Walk forward
      p.x = nx;
      p.y = ny;

      // Check if stepped on Amulet of Yendor
      if (state.map[ny][nx] === 'A' && !state.hasAmulet) {
        state.hasAmulet = true;
        state.score += 1000;
        state.combatLog.push('GLORIOUS! You claimed the fabled Amulet of Yendor!');
      }
    }
  } else if (action === 'wait') {
    // Rest turn: restore 1 HP if hunger > 30
    if (p.hunger > 30 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + 1);
    }
    state.combatLog.push('You steady your breath and wait.');
  } else if (action === 'pickup') {
    const idx = state.items.findIndex(it => it.x === p.x && it.y === p.y);
    if (idx === -1 || p.inventory.length >= 6) {
      throw new Error('No item on tile or inventory full');
    }
    const it = state.items.splice(idx, 1)[0];
    p.inventory.push(it);
    state.score += 20;
    state.combatLog.push(`Picked up ${it.name}.`);
  } else if (action === 'descend') {
    if (state.map[p.y][p.x] !== '>' || state.floor >= state.maxFloors) {
      throw new Error('Cannot descend from current position');
    }
    state.floor += 1;
    state.score += 200;
    p.x = 1;
    p.y = 1;

    // Reset explored for new floor
    state.explored = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      state.explored.push(new Array(MAP_WIDTH).fill(false));
    }

    state.map = generateFloorMap(state, state.floor);
    spawnFloorEntities(state, state.floor);
    state.combatLog.push(`Descended to Floor ${state.floor} of the Caverns.`);
  } else if (action.startsWith('eat:')) {
    const idx = parseInt(action.split(':')[1], 10);
    const item = p.inventory[idx];
    if (!item || item.type !== 'food') throw new Error(`Invalid eat target: ${action}`);

    p.inventory.splice(idx, 1);
    p.hunger = Math.min(100, p.hunger + 40);
    p.hp = Math.min(p.maxHp, p.hp + 5);
    state.combatLog.push(`Consumed ${item.name}. Hunger satiated.`);
  } else if (action.startsWith('quaff:')) {
    const idx = parseInt(action.split(':')[1], 10);
    const item = p.inventory[idx];
    if (!item || item.type !== 'potion') throw new Error(`Invalid quaff target: ${action}`);

    p.inventory.splice(idx, 1);
    state.identified.potions[item.color] = true;

    if (item.color === 'crimson') {
      const heal = 25;
      p.hp = Math.min(p.maxHp, p.hp + heal);
      state.combatLog.push(`Quaffed Crimson Potion! Restored ${heal} HP (Identified: Healing).`);
    } else if (item.color === 'azure') {
      p.atk += 3;
      state.combatLog.push('Quaffed Azure Potion! ATK permanently boosted by +3 (Identified: Fortitude).');
    } else {
      // Emerald toxicity
      const poisonDmg = 8;
      p.hp = Math.max(0, p.hp - poisonDmg);
      state.combatLog.push(`Quaffed Emerald Potion! Toxic burning inflicts ${poisonDmg} damage (Identified: Toxicity).`);
    }
  } else if (action.startsWith('read:')) {
    const idx = parseInt(action.split(':')[1], 10);
    const item = p.inventory[idx];
    if (!item || item.type !== 'scroll') throw new Error(`Invalid read target: ${action}`);

    p.inventory.splice(idx, 1);
    state.identified.scrolls[item.scrollType] = true;

    if (item.scrollType === 'parchment') {
      // Magic mapping: reveal entire floor
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          state.explored[y][x] = true;
        }
      }
      state.combatLog.push('Read Parchment Scroll! A radiant vision maps the cavern (Identified: Magic Mapping).');
    } else if (item.scrollType === 'vellum') {
      // Teleportation: find walkable empty cell
      const candidates = [];
      for (let y = 1; y < MAP_HEIGHT - 1; y++) {
        for (let x = 1; x < MAP_WIDTH - 1; x++) {
          if (state.map[y][x] !== '#' && !(x === p.x && y === p.y)) {
            if (!state.enemies.some(e => e.x === x && e.y === y && e.hp > 0)) {
              candidates.push({ x, y });
            }
          }
        }
      }
      if (candidates.length > 0) {
        const dest = candidates[randInt(state, 0, candidates.length - 1)];
        p.x = dest.x;
        p.y = dest.y;
      }
      state.combatLog.push('Read Vellum Scroll! Reality warps and teleports you away (Identified: Teleportation).');
    } else {
      // Papyrus: Firestorm hits all visible enemies
      let hitCount = 0;
      for (const e of state.enemies) {
        if (e.hp > 0 && state.visible[e.y][e.x]) {
          e.hp -= 20;
          hitCount++;
          if (e.hp <= 0) {
            state.kills++;
            state.score += 50;
          }
        }
      }
      state.combatLog.push(`Read Papyrus Scroll! Blazing flames engulf ${hitCount} visible foes (Identified: Firestorm).`);
    }
  } else {
    throw new Error(`Unknown action: ${action}`);
  }
}

function updateMonsters(state) {
  const p = state.player;

  for (const e of state.enemies) {
    if (e.hp <= 0) continue;

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.abs(dx) + Math.abs(dy);

    if (dist === 1) {
      // Adjacent: Attack player
      const dmg = Math.max(1, e.atk - p.def);
      p.hp = Math.max(0, p.hp - dmg);
      state.combatLog.push(`${e.name} attacks you for ${dmg} damage.`);
    } else if (dist <= 5) {
      // Pursue player
      let stepX = 0;
      let stepY = 0;

      if (Math.abs(dx) >= Math.abs(dy)) {
        stepX = dx > 0 ? 1 : -1;
      } else {
        stepY = dy > 0 ? 1 : -1;
      }

      const tx = e.x + stepX;
      const ty = e.y + stepY;

      // Check walkability and occupancy
      if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT && state.map[ty][tx] !== '#') {
        const blockedByMonster = state.enemies.some(other => other !== e && other.hp > 0 && other.x === tx && other.y === ty);
        const blockedByPlayer = (tx === p.x && ty === p.y);
        if (!blockedByMonster && !blockedByPlayer) {
          e.x = tx;
          e.y = ty;
        }
      }
    }
  }
}

function updateHunger(state) {
  const p = state.player;
  if (state.turns % 2 === 0) {
    p.hunger = Math.max(0, p.hunger - 1);
  }

  // Starvation damage
  if (p.hunger <= 0) {
    p.hp = Math.max(0, p.hp - 2);
    state.combatLog.push('You are starving! Malnutrition drains your vitality (-2 HP).');
  }
}

function checkGameEnd(state) {
  if (state.player.hp <= 0) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! Your soul is forever bound to the Caverns of Yendor.');
    return;
  }

  if (state.hasAmulet && state.floor === 3) {
    // If amulet claimed and chimera defeated, automatic triumphant escape
    const chimera = state.enemies.find(e => e.type === 'chimera');
    if (!chimera || chimera.hp <= 0) {
      state.done = true;
      state.victory = true;
      state.score += 2500;
      state.combatLog.push('TRIUMPH! The Chimera is slain and you ascend victorious with the Amulet of Yendor!');
      return;
    }
  }

  if (state.turns >= state.maxTurns) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! Dungeon passage collapsed. Timeframe expired.');
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

  // 2. Monsters react
  updateMonsters(state);

  // 3. Hunger simulation
  updateHunger(state);

  // 4. Update Field of View
  computeFOV(state);

  // 5. Outcome check
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
