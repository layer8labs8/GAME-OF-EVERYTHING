// 0173-combat-racing: Nitro Carnage - Pure Bot Contract Logic
// Deterministic, zero DOM, pure state machine.

const RACE_FINISH_KM = 100;
const RIVAL_TEMPLATES = [
  { name: 'Scrap Raider Buggy', hp: 40, damage: 15 },
  { name: 'Iron Juggernaut Truck', hp: 70, damage: 25 },
  { name: 'Nitro Viper Interceptor', hp: 55, damage: 20 },
  { name: 'Apex War Rig Boss', hp: 90, damage: 30 }
];

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

function spawnRival(state) {
  const tplIdx = Math.min(RIVAL_TEMPLATES.length - 1, state.rivalsWrecked);
  const tpl = RIVAL_TEMPLATES[tplIdx];
  const rLane = Math.floor(nextRand(state) * 3);
  return {
    name: tpl.name,
    hp: tpl.hp,
    maxHp: tpl.hp,
    damage: tpl.damage,
    lane: rLane,
    dist: 40 // meters ahead
  };
}

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 120,
    lane: 1, // center lane (0=left, 1=mid, 2=right)
    hull: 100,
    nitro: 80,
    vulcanRounds: 24,
    homingMissiles: 4,
    oilSlicks: 2,
    raceDistance: 0,
    rival: null,
    rivalsWrecked: 0,
    boostActiveTurns: 0,
    victory: false,
    defeat: false,
    gameMessage: 'Engines roaring on the Wasteland Highway. Eliminate rivals and cross 100km finish line.'
  };

  state.rival = spawnRival(state);

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = state.raceDistance * 80;
  val += state.rivalsWrecked * 600;
  val += Math.floor(state.hull * 10);
  val += Math.floor(state.nitro * 5);
  val += state.vulcanRounds * 15;
  val += state.homingMissiles * 100;
  if (state.victory) val += 5000;
  return Math.max(0, Math.floor(val));
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  // Cruise forward is always accessible
  actions.push('action:cruise_forward');

  // Steering
  if (state.lane > 0) {
    actions.push('action:shift_lane:left');
  }
  if (state.lane < 2) {
    actions.push('action:shift_lane:right');
  }

  // Weapons targeting rival
  if (state.rival !== null) {
    if (state.vulcanRounds >= 2) {
      actions.push('action:fire_vulcan_cannon');
    }
    if (state.homingMissiles >= 1) {
      actions.push('action:launch_homing_missile');
    }
  }

  // Defensive oil slick
  if (state.oilSlicks >= 1 && state.rival !== null && state.rival.dist < 20) {
    actions.push('action:deploy_oil_slick');
  }

  // Nitro boost
  if (state.nitro >= 20 && state.boostActiveTurns === 0) {
    actions.push('action:burn_nitro_boost');
  }

  // Repair
  if (state.hull < 100 && state.nitro >= 15) {
    actions.push('action:repair_armor_nanites');
  }

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal combat racing action "' + action + '" in current state');
  }

  const oldScore = score(state);

  let speedGain = state.boostActiveTurns > 0 ? 4 : 2;

  if (action === 'action:shift_lane:left') {
    state.lane = Math.max(0, state.lane - 1);
    state.gameMessage = 'Swerved hard left to Lane ' + state.lane + '.';
  } else if (action === 'action:shift_lane:right') {
    state.lane = Math.min(2, state.lane + 1);
    state.gameMessage = 'Swerved hard right to Lane ' + state.lane + '.';
  } else if (action === 'action:fire_vulcan_cannon') {
    state.vulcanRounds -= 2;
    // Extra accuracy if in same lane
    const sameLane = state.rival.lane === state.lane;
    const dmg = sameLane ? 25 : 12;
    state.rival.hp -= dmg;
    state.gameMessage = 'Unleashed twin vulcan kinetic burst (' + dmg + ' dmg' + (sameLane ? ' direct hit!' : ' glancing hit.') + ')';

    if (state.rival.hp <= 0) {
      state.rivalsWrecked += 1;
      state.vulcanRounds += 6;
      state.nitro = Math.min(100, state.nitro + 25);
      state.gameMessage += ' ' + state.rival.name + ' detonated in a fireball! Salvaged ammo & nitro!';
      state.rival = spawnRival(state);
    }
  } else if (action === 'action:launch_homing_missile') {
    state.homingMissiles -= 1;
    const dmg = 45;
    state.rival.hp -= dmg;
    state.gameMessage = 'BOOM! Heat-seeking missile slammed into ' + state.rival.name + ' (' + dmg + ' dmg)!';

    if (state.rival.hp <= 0) {
      state.rivalsWrecked += 1;
      state.vulcanRounds += 6;
      state.nitro = Math.min(100, state.nitro + 25);
      state.gameMessage += ' Target vaporized! Salvaged supplies from wreckage!';
      state.rival = spawnRival(state);
    }
  } else if (action === 'action:burn_nitro_boost') {
    state.nitro -= 20;
    state.boostActiveTurns = 3;
    speedGain += 3;
    state.gameMessage = 'Nitrous afterburners ignited! Mach surge forward!';
  } else if (action === 'action:deploy_oil_slick') {
    state.oilSlicks -= 1;
    state.rival.dist += 30;
    state.rival.hp -= 15;
    state.gameMessage = 'Deployed slick oil slick! ' + state.rival.name + ' spun out into crash barrier (-15 HP)!';
    if (state.rival.hp <= 0) {
      state.rivalsWrecked += 1;
      state.gameMessage += ' Spun-out rival totaled!';
      state.rival = spawnRival(state);
    }
  } else if (action === 'action:repair_armor_nanites') {
    state.nitro -= 15;
    state.hull = Math.min(100, state.hull + 30);
    state.gameMessage = 'Emergency chassis nanites welded armor plates (+30 Hull).';
  } else if (action === 'action:cruise_forward') {
    state.gameMessage = 'Cruising at top velocity.';
    if (nextRand(state) < 0.45) {
      state.vulcanRounds += 4;
      state.nitro = Math.min(100, state.nitro + 10);
      state.gameMessage += ' Snatched trackside ammo crate (+4 Vulcan, +10 Nitro).';
    }
  }

  // Advance race track distance
  state.raceDistance = Math.min(RACE_FINISH_KM, state.raceDistance + speedGain);

  if (state.boostActiveTurns > 0) {
    state.boostActiveTurns -= 1;
  }

  // Rival behavioral AI
  if (state.rival !== null) {
    // Rival closes distance
    state.rival.dist -= 6;

    // Rival shifts lane occasionally
    if (nextRand(state) < 0.3) {
      state.rival.lane = Math.floor(nextRand(state) * 3);
    }

    // Rival attacks if close
    if (state.rival.dist <= 10) {
      if (state.rival.lane === state.lane) {
        state.hull = Math.max(0, state.hull - state.rival.damage);
        state.gameMessage += ' ' + state.rival.name + ' rammed your vehicle from behind! -' + state.rival.damage + ' Hull!';
        state.rival.dist = 25; // rebounds back
      } else {
        const graze = Math.floor(state.rival.damage / 2);
        state.hull = Math.max(0, state.hull - graze);
        state.gameMessage += ' ' + state.rival.name + ' raked your side with kinetic fire! -' + graze + ' Hull.';
      }
    }
  }

  state.turns += 1;

  // Victory / Defeat checks
  if (state.raceDistance >= RACE_FINISH_KM && state.hull > 0 && state.rivalsWrecked >= 2) {
    state.victory = true;
    state.gameMessage = 'VICTORY! Crossed 100km finish line in 1st place as undisputed Road Champion!';
  } else if (state.hull <= 0) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Vehicle hull crushed and obliterated in the scrapzone.';
  } else if (state.turns >= state.maxTurns && !state.victory) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Time elapsed before securing 1st place and required rival takedowns.';
  }

  const newScore = score(state);
  const reward = newScore - oldScore;
  const done = isOver(state);

  return { reward, done };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    RACE_FINISH_KM,
    RIVAL_TEMPLATES
  };
}
