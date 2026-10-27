// Pure deterministic simulation logic for 0108-lane-defense (Lane Bastion)

const NUM_LANES = 3;
const LANE_LENGTH = 8;
const MAX_TURNS = 36;

const TOWER_TYPES = {
  archer: {
    id: 'archer',
    name: 'Archer Spire',
    cost: 25,
    range: 4,
    damage: 8,
    isBlocker: false
  },
  cannon: {
    id: 'cannon',
    name: 'Cannon Bastion',
    cost: 40,
    range: 3,
    damage: 16,
    isBlocker: false
  },
  barricade: {
    id: 'barricade',
    name: 'Stone Barricade',
    cost: 15,
    range: 0,
    damage: 0,
    hp: 45,
    isBlocker: true
  },
  obelisk: {
    id: 'obelisk',
    name: 'Frost Obelisk',
    cost: 35,
    range: 4,
    damage: 10,
    isBlocker: false
  }
};

const WAVE_SCHEDULE = [
  {
    turn: 1,
    enemies: [
      { id: 'g1', type: 'goblin', lane: 0, x: 7, hp: 14, maxHp: 14, speed: 2, dmg: 3, bounty: 6 },
      { id: 'g2', type: 'goblin', lane: 1, x: 7, hp: 14, maxHp: 14, speed: 2, dmg: 3, bounty: 6 }
    ]
  },
  {
    turn: 5,
    enemies: [
      { id: 'g3', type: 'goblin', lane: 0, x: 7, hp: 14, maxHp: 14, speed: 2, dmg: 3, bounty: 6 },
      { id: 'o1', type: 'orc', lane: 1, x: 7, hp: 30, maxHp: 30, speed: 1, dmg: 7, bounty: 12 },
      { id: 'g4', type: 'goblin', lane: 2, x: 7, hp: 14, maxHp: 14, speed: 2, dmg: 3, bounty: 6 }
    ]
  },
  {
    turn: 10,
    enemies: [
      { id: 'o2', type: 'orc', lane: 0, x: 7, hp: 30, maxHp: 30, speed: 1, dmg: 7, bounty: 12 },
      { id: 'o3', type: 'orc', lane: 2, x: 7, hp: 30, maxHp: 30, speed: 1, dmg: 7, bounty: 12 },
      { id: 'g5', type: 'goblin', lane: 1, x: 7, hp: 14, maxHp: 14, speed: 2, dmg: 3, bounty: 6 }
    ]
  },
  {
    turn: 16,
    enemies: [
      { id: 'og1', type: 'ogre', lane: 1, x: 7, hp: 55, maxHp: 55, speed: 1, dmg: 14, bounty: 22 },
      { id: 'o4', type: 'orc', lane: 0, x: 7, hp: 30, maxHp: 30, speed: 1, dmg: 7, bounty: 12 }
    ]
  },
  {
    turn: 22,
    enemies: [
      { id: 'og2', type: 'ogre', lane: 0, x: 7, hp: 55, maxHp: 55, speed: 1, dmg: 14, bounty: 22 },
      { id: 'og3', type: 'ogre', lane: 2, x: 7, hp: 55, maxHp: 55, speed: 1, dmg: 14, bounty: 22 },
      { id: 'o5', type: 'orc', lane: 1, x: 7, hp: 30, maxHp: 30, speed: 1, dmg: 7, bounty: 12 }
    ]
  },
  {
    turn: 28,
    enemies: [
      { id: 'og4', type: 'ogre', lane: 1, x: 7, hp: 60, maxHp: 60, speed: 1, dmg: 15, bounty: 25 },
      { id: 'o6', type: 'orc', lane: 0, x: 7, hp: 30, maxHp: 30, speed: 1, dmg: 7, bounty: 12 },
      { id: 'o7', type: 'orc', lane: 2, x: 7, hp: 30, maxHp: 30, speed: 1, dmg: 7, bounty: 12 }
    ]
  }
];

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x7feb352d, 1) + 1) >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createState(seed = 108108) {
  const numSeed = typeof seed === 'number' ? seed : 108108;
  const rng = createRng(numSeed);

  // Initialize 3 lanes, each has 8 slots (x: 0..7)
  const lanes = [];
  for (let l = 0; l < NUM_LANES; l++) {
    const lane = [];
    for (let x = 0; x < LANE_LENGTH; x++) {
      lane.push({
        lane: l,
        x,
        tower: null // { type, hp }
      });
    }
    lanes.push(lane);
  }

  // Pre-place 1 starter archer tower at Lane 1, slot 1
  lanes[1][1].tower = {
    type: 'archer',
    hp: 30
  };

  return {
    seed: numSeed,
    rngStep: 0,
    turn: 1,
    maxTurns: MAX_TURNS,
    gold: 60,
    fortressHp: 30,
    maxFortressHp: 30,
    heroLane: 1,
    lanes,
    activeCreeps: [],
    history: ['Fortress Gate secured. Monster warbands advancing down tactical lanes.'],
    winner: null,
    done: false
  };
}

function legalActions(state) {
  if (state.done) return [];
  const actions = [];

  // 1. Build tower orders on empty valid slots (x: 1, 2, 3, 4)
  for (let l = 0; l < NUM_LANES; l++) {
    for (let x = 1; x <= 4; x++) {
      if (!state.lanes[l][x].tower) {
        for (const typeKey in TOWER_TYPES) {
          if (state.gold >= TOWER_TYPES[typeKey].cost) {
            actions.push(`build:${typeKey}:${l},${x}`);
          }
        }
      }
    }
  }

  // 2. Reposition Champion Hero to any of the 3 lanes
  for (let l = 0; l < NUM_LANES; l++) {
    if (l !== state.heroLane) {
      actions.push(`hero:${l}`);
    }
  }

  // 3. Advance wave
  actions.push('advance_wave');

  return actions;
}

function step(state, action) {
  if (state.done) {
    throw new Error('Game is already over');
  }

  const valid = legalActions(state);
  if (!valid.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  let reward = 0;

  if (action.startsWith('build:')) {
    const parts = action.split(':');
    const typeKey = parts[1];
    const coords = parts[2].split(',').map(Number);
    const l = coords[0];
    const x = coords[1];

    const towerDef = TOWER_TYPES[typeKey];
    state.gold -= towerDef.cost;
    state.lanes[l][x].tower = {
      type: typeKey,
      hp: towerDef.hp || 30
    };

    reward += 8;
    state.history.push(`Constructed ${towerDef.name} on Lane ${l + 1}, Sector ${x}.`);
  } else if (action.startsWith('hero:')) {
    const lane = Number(action.split(':')[1]);
    state.heroLane = lane;
    reward += 2;
    state.history.push(`Champion Hero deployed to hold Lane ${lane + 1}.`);
  } else if (action === 'advance_wave') {
    // 1. Spawn scheduled creeps for this turn
    const scheduled = WAVE_SCHEDULE.find(w => w.turn === state.turn);
    if (scheduled) {
      scheduled.enemies.forEach(e => {
        state.activeCreeps.push({ ...e });
      });
      state.history.push(`INCOMING WAVE: Hostile host emerged on the horizon!`);
    }

    // 2. Towers fire in their lanes
    for (let l = 0; l < NUM_LANES; l++) {
      for (let x = 0; x < LANE_LENGTH; x++) {
        const slot = state.lanes[l][x];
        if (slot.tower && slot.tower.type !== 'barricade') {
          const tDef = TOWER_TYPES[slot.tower.type];
          // Find closest creep in lane within range
          const creepsInLane = state.activeCreeps.filter(c => c.lane === l && c.x >= x && (c.x - x) <= tDef.range);
          if (creepsInLane.length > 0) {
            creepsInLane.sort((a, b) => a.x - b.x); // Closest to gate
            const target = creepsInLane[0];
            target.hp -= tDef.damage;
            reward += 3;
            if (target.hp <= 0) {
              state.gold += target.bounty;
              reward += target.bounty;
              state.history.push(`${tDef.name} destroyed ${target.type.toUpperCase()} (+${target.bounty}g bounty).`);
            }
          }
        }
      }
    }

    // 3. Hero strikes nearest creep in heroLane
    const heroCreeps = state.activeCreeps.filter(c => c.lane === state.heroLane && c.hp > 0);
    if (heroCreeps.length > 0) {
      heroCreeps.sort((a, b) => a.x - b.x);
      const target = heroCreeps[0];
      target.hp -= 12;
      reward += 4;
      if (target.hp <= 0) {
        state.gold += target.bounty;
        reward += target.bounty;
        state.history.push(`Champion Hero executed ${target.type.toUpperCase()} (+${target.bounty}g bounty).`);
      }
    }

    // Filter out slain creeps
    state.activeCreeps = state.activeCreeps.filter(c => c.hp > 0);

    // 4. Creeps advance and breach
    const remainingCreeps = [];
    state.activeCreeps.forEach(creep => {
      let currentX = creep.x;
      let blocked = false;

      for (let s = 0; s < creep.speed; s++) {
        const nextX = currentX - 1;
        // Check barricade
        if (nextX >= 0 && state.lanes[creep.lane][nextX].tower && state.lanes[creep.lane][nextX].tower.type === 'barricade') {
          const bar = state.lanes[creep.lane][nextX].tower;
          bar.hp -= creep.dmg;
          blocked = true;
          if (bar.hp <= 0) {
            state.lanes[creep.lane][nextX].tower = null;
            state.history.push(`Barricade at Lane ${creep.lane + 1}, Sector ${nextX} collapsed under siege!`);
          }
          break;
        }

        currentX = nextX;
        if (currentX <= 0) {
          // Gate breached!
          state.fortressHp = Math.max(0, state.fortressHp - creep.dmg);
          state.history.push(`${creep.type.toUpperCase()} breached the Fortress Gate dealing ${creep.dmg} damage!`);
          blocked = true;
          break;
        }
      }

      if (currentX > 0 && !blocked) {
        creep.x = currentX;
        remainingCreeps.push(creep);
      } else if (currentX > 0 && blocked) {
        creep.x = currentX;
        remainingCreeps.push(creep);
      }
    });

    state.activeCreeps = remainingCreeps;

    // 5. Passive gold revenue
    state.gold += 14;
    state.turn++;
    reward += 6;
  }

  // Evaluate victory and defeat
  if (state.fortressHp <= 0) {
    state.done = true;
    state.winner = 'enemy';
    state.history.push('FORTRESS FALLEN: Gates shattered. The citadel was sacked.');
    reward -= 80;
  } else if (state.turn > 28 && state.activeCreeps.length === 0) {
    state.done = true;
    state.winner = 'player';
    state.history.push('CITADEL TRIUMPHANT! All hostile incursion waves annihilated!');
    reward += 150;
  } else if (state.turn >= state.maxTurns) {
    state.done = true;
    if (state.fortressHp >= 15) {
      state.winner = 'player';
      state.history.push('SIEGE SURVIVED: Endured all turns with Citadel intact.');
      reward += 100;
    } else {
      state.winner = 'draw';
      state.history.push('EXHAUSTION: Standoff concluded.');
    }
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  let towerVal = 0;
  for (let l = 0; l < NUM_LANES; l++) {
    for (let x = 0; x < LANE_LENGTH; x++) {
      if (state.lanes[l][x].tower) towerVal += 15;
    }
  }

  let total = state.fortressHp * 15 + state.gold * 2 + towerVal + state.turn * 8;
  if (state.winner === 'player') total += 200;
  return Math.max(0, total);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    NUM_LANES,
    LANE_LENGTH,
    TOWER_TYPES,
    WAVE_SCHEDULE
  };
}