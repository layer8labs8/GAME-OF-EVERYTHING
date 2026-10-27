// Pure deterministic simulation logic for 0097-tactical (Tactical Breach)

const MAX_TURNS = 25;
const INITIAL_BOMB_TIMER = 18;

const ROOM_SPECS = [
  { id: 0, name: 'Staging Foyer', x: 80, y: 120, w: 140, h: 100 },
  { id: 1, name: 'Security Office', x: 260, y: 120, w: 140, h: 100 },
  { id: 2, name: 'Central Hall', x: 80, y: 260, w: 140, h: 140 },
  { id: 3, name: 'Server Vault', x: 260, y: 260, w: 140, h: 140 }
];

const DOOR_SPECS = [
  { id: 0, r1: 0, r2: 1, name: 'Door 0-1 (Security)' },
  { id: 1, r1: 0, r2: 2, name: 'Door 0-2 (Hallway)' },
  { id: 2, r1: 1, r2: 3, name: 'Door 1-3 (Side Access)' },
  { id: 3, r1: 2, r2: 3, name: 'Door 2-3 (Vault Main)' }
];

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x6d2b79f5, 1) + 1) >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createState(seed = 12345) {
  const numSeed = typeof seed === 'number' ? seed : 12345;

  return {
    seed: numSeed,
    rngStep: 0,
    turn: 1,
    maxTurns: MAX_TURNS,
    bombTimer: INITIAL_BOMB_TIMER,
    bombDefused: false,
    defuseProgress: 0, // Needs 100 to defuse
    rooms: [
      { id: 0, breached: true, stunned: 0 },
      { id: 1, breached: false, stunned: 0 },
      { id: 2, breached: false, stunned: 0 },
      { id: 3, breached: false, stunned: 0 }
    ],
    doors: [
      { id: 0, open: false },
      { id: 1, open: false },
      { id: 2, open: false },
      { id: 3, open: false }
    ],
    operators: [
      { id: 'shield', name: 'Shield (Pointman)', hp: 80, maxHp: 80, room: 0, flashbangs: 2, dmg: 30, armor: 0.5 },
      { id: 'breacher', name: 'Breacher (Hammer)', hp: 60, maxHp: 60, room: 0, charges: 2, dmg: 25, armor: 0.25 },
      { id: 'scout', name: 'Scout (Marksman)', hp: 50, maxHp: 50, room: 0, smokes: 2, dmg: 40, armor: 0.1 }
    ],
    tangos: [
      { id: 't1', name: 'Sentry 1', room: 1, hp: 35, maxHp: 35, dmg: 15, stunned: 0 },
      { id: 't2', name: 'Sentry 2', room: 1, hp: 35, maxHp: 35, dmg: 15, stunned: 0 },
      { id: 't3', name: 'Gunner 1', room: 2, hp: 40, maxHp: 40, dmg: 20, stunned: 0 },
      { id: 't4', name: 'Gunner 2', room: 2, hp: 40, maxHp: 40, dmg: 20, stunned: 0 },
      { id: 't5', name: 'Leader Viper', room: 3, hp: 50, maxHp: 50, dmg: 25, stunned: 0 },
      { id: 't6', name: 'Tech Pyro', room: 3, hp: 50, maxHp: 50, dmg: 25, stunned: 0 }
    ],
    history: ['SWAT entry team stacked up outside Staging Foyer. Defuse chemical bomb before detonation.'],
    winner: null,
    result: null,
    done: false
  };
}

function getRngValue(state) {
  state.rngStep = (state.rngStep + 1) | 0;
  const rng = createRng(state.seed + state.rngStep);
  return rng();
}

function legalActions(state) {
  if (state.done) return [];
  const actions = [];
  const aliveOps = state.operators.filter(o => o.hp > 0);
  const aliveTangos = state.tangos.filter(t => t.hp > 0);

  // 1. Breach Door actions
  for (let i = 0; i < state.doors.length; i++) {
    const door = state.doors[i];
    if (!door.open) {
      const spec = DOOR_SPECS[door.id];
      // Can breach if at least one operative is in r1 or r2
      const opAtDoor = aliveOps.some(o => o.room === spec.r1 || o.room === spec.r2);
      if (opAtDoor) {
        // Flashbang breach
        const shieldOp = aliveOps.find(o => o.id === 'shield' && o.flashbangs > 0);
        if (shieldOp && (shieldOp.room === spec.r1 || shieldOp.room === spec.r2)) {
          actions.push(`breach_door:${door.id}:flashbang`);
        }
        // Explosive charge breach
        const breacherOp = aliveOps.find(o => o.id === 'breacher' && o.charges > 0);
        if (breacherOp && (breacherOp.room === spec.r1 || breacherOp.room === spec.r2)) {
          actions.push(`breach_door:${door.id}:charge`);
        }
        // Lockpick silent breach
        actions.push(`breach_door:${door.id}:pick`);
      }
    }
  }

  // 2. Advance Room actions
  for (let i = 0; i < aliveOps.length; i++) {
    const op = aliveOps[i];
    for (let d = 0; d < state.doors.length; d++) {
      const door = state.doors[d];
      if (door.open) {
        const spec = DOOR_SPECS[door.id];
        let targetRoom = null;
        if (op.room === spec.r1) targetRoom = spec.r2;
        else if (op.room === spec.r2) targetRoom = spec.r1;

        if (targetRoom !== null) {
          actions.push(`advance_room:${op.id}:${targetRoom}`);
        }
      }
    }
  }

  // 3. Engage Tango in same room
  for (let i = 0; i < aliveOps.length; i++) {
    const op = aliveOps[i];
    for (let j = 0; j < aliveTangos.length; j++) {
      const t = aliveTangos[j];
      if (t.room === op.room) {
        actions.push(`engage_target:${op.id}:${t.id}`);
      }
    }
  }

  // 4. Defuse Device in Room 3
  if (!state.bombDefused) {
    const opsInVault = aliveOps.filter(o => o.room === 3);
    for (let i = 0; i < opsInVault.length; i++) {
      actions.push(`defuse_device:${opsInVault[i].id}`);
    }
  }

  // 5. Tactical wait / regroup
  actions.push('wait');

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

  if (action.startsWith('breach_door:')) {
    const parts = action.split(':');
    const did = parseInt(parts[1], 10);
    const method = parts[2];
    const door = state.doors.find(d => d.id === did);
    door.open = true;

    const spec = DOOR_SPECS[did];
    // Find unbreached room on the other side
    const targetRoomId = !state.rooms[spec.r2].breached ? spec.r2 : spec.r1;
    const room = state.rooms[targetRoomId];
    room.breached = true;

    if (method === 'flashbang') {
      const shield = state.operators.find(o => o.id === 'shield');
      shield.flashbangs -= 1;
      // Stun all tangos in room for 2 turns
      state.tangos.filter(t => t.room === targetRoomId).forEach(t => {
        t.stunned = 2;
      });
      reward = 10;
      state.history.push(`Flashbang breached ${DOOR_SPECS[did].name}! Hostiles blinded & disoriented.`);
    } else if (method === 'charge') {
      const breacher = state.operators.find(o => o.id === 'breacher');
      breacher.charges -= 1;
      // Stun and deal 15 blast dmg
      state.tangos.filter(t => t.room === targetRoomId).forEach(t => {
        t.stunned = 1;
        t.hp = Math.max(0, t.hp - 15);
      });
      reward = 12;
      state.history.push(`Breaching charge exploded ${DOOR_SPECS[did].name}! Blast shattered defenders.`);
    } else if (method === 'pick') {
      reward = 5;
      state.history.push(`Lockpicked ${DOOR_SPECS[did].name} silently. Entry corridor secured.`);
    }

    state.tangos = state.tangos.filter(t => t.hp > 0);
  } else if (action.startsWith('advance_room:')) {
    const parts = action.split(':');
    const opId = parts[1];
    const rid = parseInt(parts[2], 10);
    const op = state.operators.find(o => o.id === opId);
    op.room = rid;
    reward = 2;
    state.history.push(`${op.name} established position in ${ROOM_SPECS[rid].name}.`);
  } else if (action.startsWith('engage_target:')) {
    const parts = action.split(':');
    const opId = parts[1];
    const tid = parts[2];
    const op = state.operators.find(o => o.id === opId);
    const tango = state.tangos.find(t => t.id === tid);

    tango.hp = Math.max(0, tango.hp - op.dmg);
    if (tango.hp === 0) {
      reward = tango.id === 't5' ? 40 : 20;
      state.history.push(`${op.name} eliminated ${tango.name}! Sector neutralizing.`);
    } else {
      reward = 6;
      state.history.push(`${op.name} hit ${tango.name} for ${op.dmg} ballistic damage.`);
    }

    state.tangos = state.tangos.filter(t => t.hp > 0);
  } else if (action.startsWith('defuse_device:')) {
    const opId = action.split(':')[1];
    const op = state.operators.find(o => o.id === opId);
    state.defuseProgress += 50;

    if (state.defuseProgress >= 100) {
      state.bombDefused = true;
      reward = 60;
      state.history.push(`${op.name} successfully disarmed the chemical bomb!`);
    } else {
      reward = 20;
      state.history.push(`${op.name} cut initiation relays (50% defused).`);
    }
  }

  // --- HOSTILE REACTION PHASE ---
  runTangoReturnFire(state);

  // Decrement stun timers
  state.tangos.forEach(t => {
    if (t.stunned > 0) t.stunned -= 1;
  });

  // Decrement Bomb Timer
  if (!state.bombDefused) {
    state.bombTimer -= 1;
    if (state.bombTimer <= 0) {
      state.done = true;
      state.winner = 'enemy';
      state.result = 'bomb_detonated';
      state.history.push('CRITICAL FAILURE: Chemical bomb detonated! Compound destroyed.');
      reward = -100;
    }
  }

  // Check Victory / Defeat
  checkMissionSuccess(state);

  if (!state.done) {
    state.turn += 1;
    if (state.turn > state.maxTurns) {
      evaluateTimeoutConclusion(state);
      reward = state.winner === 'player' ? 50 : -40;
    }
  }

  if (state.done && state.winner === 'player') {
    reward += 100;
  } else if (state.done && state.winner === 'enemy') {
    reward -= 50;
  }

  return { reward, done: state.done };
}

function runTangoReturnFire(state) {
  const aliveTangos = state.tangos.filter(t => t.hp > 0 && t.stunned === 0);
  const aliveOps = state.operators.filter(o => o.hp > 0);

  for (let i = 0; i < aliveTangos.length; i++) {
    const tango = aliveTangos[i];
    // Find operators in the same room
    const opsInRoom = aliveOps.filter(o => o.room === tango.room);
    if (opsInRoom.length > 0) {
      // Prioritize Shield (draws fire) or lowest HP
      opsInRoom.sort((a, b) => {
        if (a.id === 'shield') return -1;
        if (b.id === 'shield') return 1;
        return a.hp - b.hp;
      });

      const target = opsInRoom[0];
      const absorbedDmg = Math.round(tango.dmg * (1 - target.armor));
      target.hp = Math.max(0, target.hp - absorbedDmg);
      state.history.push(`${tango.name} returned fire on ${target.name} dealing ${absorbedDmg} damage!`);
    }
  }

  state.operators = state.operators.filter(o => o.hp > 0);
}

function checkMissionSuccess(state) {
  const aliveTangos = state.tangos.filter(t => t.hp > 0);
  const aliveOps = state.operators.filter(o => o.hp > 0);

  if (aliveOps.length === 0) {
    state.done = true;
    state.winner = 'enemy';
    state.result = 'squad_kia';
    state.history.push('SWAT tactical squad neutralized. Mission failed.');
    return;
  }

  if (aliveTangos.length === 0 && state.bombDefused) {
    state.done = true;
    state.winner = 'player';
    state.result = 'victory';
    state.history.push('TACTICAL TRIUMPH! Compound cleared and explosive neutralized.');
  }
}

function evaluateTimeoutConclusion(state) {
  state.done = true;
  const aliveTangos = state.tangos.filter(t => t.hp > 0).length;

  if (state.bombDefused && aliveTangos === 0) {
    state.winner = 'player';
    state.result = 'victory';
    state.history.push('Operation concluded. Objective accomplished.');
  } else {
    state.winner = 'enemy';
    state.result = 'defeat';
    state.history.push('Operation timed out. Hostiles secured the perimeter.');
  }
}

function isOver(state) {
  return state.done;
}

function score(state) {
  let s = (INITIAL_BOMB_TIMER - Math.max(0, state.bombTimer)) * 5;
  if (state.bombDefused) s += 300;
  for (let i = 0; i < state.operators.length; i++) {
    s += state.operators[i].hp * 2;
  }
  const deadTangos = 6 - state.tangos.filter(t => t.hp > 0).length;
  s += deadTangos * 40;

  if (state.winner === 'player') s += 500;
  s -= (state.turn - 1) * 4;

  return Math.max(0, Math.round(s));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    MAX_TURNS,
    ROOM_SPECS,
    DOOR_SPECS
  };
}
