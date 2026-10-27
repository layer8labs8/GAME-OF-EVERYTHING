// Logic for 0126-permadeath: Iron Soul
// Pure Bot Contract implementation. Zero UI or platform dependencies.

const GRID_SIZE = 10;
const MAX_TURNS = 250;

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

function generateDepthMap(depth) {
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

  if (depth === 1) {
    // Pillars & Traps
    map[3][3] = '#';
    map[3][6] = '#';
    map[6][3] = '#';
    map[6][6] = '#';
    map[4][5] = 'T'; // Spike Trap
    map[5][4] = 'T'; // Dart Trap
    map[2][7] = 'G'; // Gold
    map[8][8] = '>';
  } else if (depth === 2) {
    // Magma Fissure walls
    for (let x = 2; x <= 7; x++) {
      if (x !== 4 && x !== 5) map[4][x] = '#';
    }
    map[4][4] = 'T'; // Lava Vent
    map[6][3] = 'T';
    map[3][7] = 'G';
    map[7][2] = 'G';
    map[8][8] = '>';
  } else if (depth === 3) {
    // Void maze
    map[2][2] = '#';
    map[2][7] = '#';
    map[7][2] = '#';
    map[7][7] = '#';
    map[5][3] = 'T'; // Void Rift Trap
    map[3][5] = 'T';
    map[6][6] = 'T';
    map[2][5] = 'G';
    map[8][8] = '>';
  } else {
    // Depth 4: The Crucible of Fate
    map[2][4] = '#';
    map[2][5] = '#';
    map[7][4] = '#';
    map[7][5] = '#';
    map[5][2] = '#';
    map[4][2] = '#';
    map[5][7] = '#';
    map[4][7] = '#';
    map[8][8] = 'S'; // Eternal Sigil
  }

  return map;
}

function spawnDepthMonsters(depth) {
  const enemies = [];
  if (depth === 1) {
    enemies.push({ id: 's1', name: 'Skeleton Warden', type: 'skeleton', x: 5, y: 3, hp: 18, maxHp: 18, atk: 7, def: 2 });
    enemies.push({ id: 's2', name: 'Skeleton Warden', type: 'skeleton', x: 3, y: 7, hp: 18, maxHp: 18, atk: 7, def: 2 });
  } else if (depth === 2) {
    enemies.push({ id: 'c1', name: 'Cinder Hound', type: 'hound', x: 6, y: 3, hp: 25, maxHp: 25, atk: 10, def: 3 });
    enemies.push({ id: 'c2', name: 'Cinder Hound', type: 'hound', x: 2, y: 6, hp: 25, maxHp: 25, atk: 10, def: 3 });
  } else if (depth === 3) {
    enemies.push({ id: 'p1', name: 'Phantom Stalker', type: 'phantom', x: 4, y: 6, hp: 35, maxHp: 35, atk: 12, def: 4 });
    enemies.push({ id: 'p2', name: 'Phantom Stalker', type: 'phantom', x: 6, y: 2, hp: 35, maxHp: 35, atk: 12, def: 4 });
  } else {
    // Depth 4 Boss
    enemies.push({ id: 'boss', name: 'The Grim Harvester', type: 'harvester', x: 7, y: 7, hp: 75, maxHp: 75, atk: 15, def: 5 });
  }
  return enemies;
}

function createState(seed = 1) {
  let rngVal = (Math.floor(seed) >>> 0) || 88172635;

  const player = {
    x: 1,
    y: 1,
    hp: 50,
    maxHp: 50,
    elixirs: 2,
    toolkits: 3,
    gold: 0
  };

  const state = {
    seed,
    rngState: rngVal,
    depth: 1,
    maxDepths: 4,
    turns: 0,
    maxTurns: MAX_TURNS,
    score: 0,
    done: false,
    victory: false,
    retired: false,
    causeOfDeath: null,
    player,
    map: generateDepthMap(1),
    enemies: spawnDepthMonsters(1),
    combatLog: ['Mortal Trial initiated. Death is irreversible. Choose your risks with care.']
  };

  return state;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const p = state.player;
  const dirs = ['up', 'down', 'left', 'right'];

  // Movement & Bump Combat
  for (let i = 0; i < dirs.length; i++) {
    const d = dirs[i];
    const off = DIR_OFFSETS[d];
    const nx = p.x + off.dx;
    const ny = p.y + off.dy;

    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
      if (state.map[ny][nx] !== '#') {
        actions.push(`move:${d}`);
      }
    }
  }

  // Disarm adjacent trap 'T'
  if (p.toolkits > 0) {
    for (let i = 0; i < dirs.length; i++) {
      const d = dirs[i];
      const off = DIR_OFFSETS[d];
      const nx = p.x + off.dx;
      const ny = p.y + off.dy;

      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        if (state.map[ny][nx] === 'T') {
          actions.push(`disarm:${d}`);
        }
      }
    }
  }

  // Quaff emergency elixir
  if (p.elixirs > 0 && p.hp < p.maxHp) {
    actions.push('quaff');
  }

  // Staircase actions (Descend or Retire)
  if (state.map[p.y][p.x] === '>') {
    actions.push('descend');
    actions.push('retire');
  }

  // Rest
  actions.push('wait');

  return actions;
}

function resolvePlayerAction(state, action) {
  const p = state.player;

  if (action.startsWith('move:')) {
    const dir = action.split(':')[1];
    const off = DIR_OFFSETS[dir];
    if (!off) throw new Error(`Invalid move direction: ${action}`);

    const nx = p.x + off.dx;
    const ny = p.y + off.dy;

    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE || state.map[ny][nx] === '#') {
      throw new Error(`Invalid destination: ${action}`);
    }

    // Bump combat
    const enemy = state.enemies.find(e => e.x === nx && e.y === ny && e.hp > 0);
    if (enemy) {
      const dmg = Math.max(1, 14 - enemy.def);
      enemy.hp -= dmg;
      state.score += dmg * 4;
      state.combatLog.push(`You strike ${enemy.name} for ${dmg} damage.`);
      if (enemy.hp <= 0) {
        p.gold += 50;
        state.score += 100;
        state.combatLog.push(`Slew ${enemy.name}! Recovered 50 Gold.`);
      }
    } else {
      p.x = nx;
      p.y = ny;

      // Check tile interactions
      const tile = state.map[ny][nx];
      if (tile === 'T') {
        // Sprung lethal trap!
        const trapDmg = 15;
        p.hp = Math.max(0, p.hp - trapDmg);
        state.combatLog.push(`CRITICAL! You triggered an active trap for ${trapDmg} damage!`);
        if (p.hp <= 0) {
          state.causeOfDeath = 'Springing a lethal dungeon trap';
        }
      } else if (tile === 'G') {
        p.gold += 100;
        state.score += 80;
        state.map[ny][nx] = '.';
        state.combatLog.push('Claimed treasure cache (+100 Gold).');
      } else if (tile === 'S') {
        // Eternal Sigil at Depth 4
        state.done = true;
        state.victory = true;
        state.score += 3500 + p.gold * 4;
        state.combatLog.push('TRIUMPH! You claimed the Eternal Sigil and conquered the Mortal Crucible!');
      }
    }
  } else if (action.startsWith('disarm:')) {
    const dir = action.split(':')[1];
    const off = DIR_OFFSETS[dir];
    if (!off) throw new Error(`Invalid disarm: ${action}`);

    const nx = p.x + off.dx;
    const ny = p.y + off.dy;
    if (state.map[ny][nx] !== 'T') throw new Error('Target is not an active trap');

    p.toolkits -= 1;
    state.map[ny][nx] = 't'; // Disarmed trap
    state.score += 50;
    state.combatLog.push('Disarm Success: Trap safely neutralized with toolkit.');
  } else if (action === 'quaff') {
    if (p.elixirs <= 0) throw new Error('No elixirs remaining');
    p.elixirs -= 1;
    p.hp = Math.min(p.maxHp, p.hp + 25);
    state.combatLog.push(`Quaffed Life Elixir! Restored 25 HP (${p.elixirs} remaining).`);
  } else if (action === 'descend') {
    if (state.map[p.y][p.x] !== '>') throw new Error('Cannot descend without staircase');
    state.depth += 1;
    state.score += 400;
    p.x = 1;
    p.y = 1;
    state.map = generateDepthMap(state.depth);
    state.enemies = spawnDepthMonsters(state.depth);
    state.combatLog.push(`Descended into lethal Depth ${state.depth}. Stakes elevated!`);
  } else if (action === 'retire') {
    if (state.map[p.y][p.x] !== '>') throw new Error('Cannot retire without staircase');
    state.done = true;
    state.victory = true;
    state.retired = true;
    state.score += 1500 + p.gold * 3 + state.depth * 300;
    state.combatLog.push('SAFE EXTRACTION: You retired to the Hall of Ancestors as an honored survivor!');
  } else if (action === 'wait') {
    state.combatLog.push('You steady your stance and watch the shadows.');
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
      // Attack player
      const dmg = Math.max(1, e.atk - 2);
      p.hp = Math.max(0, p.hp - dmg);
      state.combatLog.push(`${e.name} strikes with mortal force for ${dmg} damage.`);
      if (p.hp <= 0 && !state.causeOfDeath) {
        state.causeOfDeath = `Struck down by ${e.name} in Depth ${state.depth}`;
      }
    } else if (dist <= 4) {
      // Advance toward player
      let sx = 0;
      let sy = 0;
      if (Math.abs(dx) >= Math.abs(dy)) {
        sx = dx > 0 ? 1 : -1;
      } else {
        sy = dy > 0 ? 1 : -1;
      }

      const nx = e.x + sx;
      const ny = e.y + sy;

      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && state.map[ny][nx] !== '#') {
        const blocked = state.enemies.some(o => o !== e && o.hp > 0 && o.x === nx && o.y === ny);
        if (!blocked && !(nx === p.x && ny === p.y)) {
          e.x = nx;
          e.y = ny;
        }
      }
    }
  }
}

function checkMortalOutcome(state) {
  if (state.player.hp <= 0) {
    state.done = true;
    state.victory = false;
    if (!state.causeOfDeath) state.causeOfDeath = 'Succumbed to mortal wounds';
    state.combatLog.push(`PERMADEATH: ${state.causeOfDeath}. Your soul is erased.`);
    return;
  }

  if (state.turns >= state.maxTurns) {
    state.done = true;
    state.victory = false;
    state.causeOfDeath = 'Crucible ceiling collapsed. Timeframe expired.';
    state.combatLog.push('DEFEAT! Mortal trial timeframe expired.');
  }
}

function step(state, action) {
  const legals = legalActions(state);
  if (!legals.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  state.turns += 1;

  // 1. Resolve player action
  resolvePlayerAction(state, action);

  // 2. Monsters act if game ongoing
  if (!state.done) {
    updateMonsters(state);
  }

  // 3. Permadeath outcome check
  checkMortalOutcome(state);

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
