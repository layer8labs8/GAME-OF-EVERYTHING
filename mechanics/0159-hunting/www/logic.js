// 0159-hunting: Wilderness Stalker - Pure Bot Contract Logic
// Deterministic, zero DOM, pure state machine.

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

const BIOME_NAMES = [
  'Valley Marshes',
  'Pine Forest Ridge',
  'Glacial Peaks',
  'Sacred Tundra'
];

const TARGET_TEMPLATES = [
  { species: 'Whitetail Buck', baseReward: 180, startDist: 140, trophyBase: 70 },
  { species: 'Rocky Mountain Elk', baseReward: 320, startDist: 170, trophyBase: 85 },
  { species: 'Bighorn Sheep', baseReward: 460, startDist: 190, trophyBase: 95 },
  { species: 'Legendary Great White Moose', baseReward: 1200, startDist: 210, trophyBase: 120 }
];

function spawnTarget(state) {
  const tpl = TARGET_TEMPLATES[state.biome];
  state.currentTarget = {
    species: tpl.species,
    distance: tpl.startDist,
    alert: 15,
    trophyScore: tpl.trophyBase,
    isDowned: false,
    reward: tpl.baseReward
  };
}

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 120,
    biome: 0,
    stamina: 100,
    scentMask: 80,
    ammo: 8,
    steadyAim: 90,
    funds: 300,
    currentTarget: null,
    harvestCount: 0,
    spookCount: 0,
    legendaryClaimed: false,
    victory: false,
    defeat: false,
    gameMessage: 'Ranger arrives at Valley Marsh trail. Binoculars ready to scan the tree line.'
  };

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = state.funds;
  val += state.harvestCount * 300;
  if (state.legendaryClaimed) val += 1500;
  val += Math.floor(state.steadyAim * 5);
  val -= state.spookCount * 150;
  if (state.victory) val += 3000;
  return Math.max(0, Math.floor(val));
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  // Camp rest is always available
  actions.push('action:rest_at_blind');

  if (state.funds >= 50 && state.ammo < 12) {
    actions.push('action:restock_supplies');
  }
  if (state.funds >= 25 && state.scentMask < 100) {
    actions.push('action:apply_scent_mask');
  }

  // Trekking to adjacent biomes (when no active stalk is underway)
  if (state.stamina >= 15 && (state.currentTarget === null || state.currentTarget.isDowned)) {
    if (state.biome > 0) {
      actions.push('action:travel_to_biome:' + (state.biome - 1));
    }
    if (state.biome < 3) {
      actions.push('action:travel_to_biome:' + (state.biome + 1));
    }
  }

  // Scouting
  if (state.currentTarget === null) {
    if (state.stamina >= 5) {
      actions.push('action:glass_with_binoculars');
    }
  } else {
    // Active animal in sight
    if (!state.currentTarget.isDowned) {
      if (state.stamina >= 12 && state.currentTarget.distance > 30) {
        actions.push('action:crawl_stalk');
      }
      if (state.stamina >= 6 && state.currentTarget.distance > 40) {
        actions.push('action:use_animal_caller');
      }
      if (state.ammo >= 1) {
        actions.push('action:steady_aim_and_fire');
      }
    } else {
      actions.push('action:harvest_downed_game');
    }
  }

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal hunting action "' + action + '" in current wilderness state');
  }

  const oldScore = score(state);

  if (action === 'action:rest_at_blind') {
    state.stamina = Math.min(100, state.stamina + 45);
    state.steadyAim = Math.min(100, state.steadyAim + 30);
    state.gameMessage = 'Rested in canvas blind with warm coffee. Stamina and steady breath restored.';
  } else if (action === 'action:restock_supplies') {
    state.funds -= 50;
    state.ammo = Math.min(12, state.ammo + 4);
    state.gameMessage = 'Purchased heavy rifle cartridges and hunting gear from ranger outpost.';
  } else if (action === 'action:apply_scent_mask') {
    state.funds -= 25;
    state.scentMask = Math.min(100, state.scentMask + 35);
    state.gameMessage = 'Applied natural pine musk cover scent. Downwind detection minimized.';
  } else if (action.startsWith('action:travel_to_biome:')) {
    const b = parseInt(action.split(':')[2], 10);
    state.stamina = Math.max(0, state.stamina - 15);
    state.biome = b;
    state.currentTarget = null;
    state.gameMessage = 'Trek up elevation into ' + BIOME_NAMES[b] + '.';
  } else if (action === 'action:glass_with_binoculars') {
    state.stamina = Math.max(0, state.stamina - 5);
    spawnTarget(state);
    state.gameMessage = 'Binoculars glassed ' + state.currentTarget.species + ' grazing at ' + state.currentTarget.distance + ' meters!';
  } else if (action === 'action:crawl_stalk') {
    state.stamina = Math.max(0, state.stamina - 12);
    state.currentTarget.distance = Math.max(30, state.currentTarget.distance - 30);
    state.steadyAim = Math.min(100, state.steadyAim + 10);
    if (state.scentMask < 40 && nextRand(state) < 0.35) {
      state.currentTarget.alert += 25;
      state.gameMessage = 'Stalked through brush to ' + state.currentTarget.distance + 'm. Target raised head in caution.';
    } else {
      state.gameMessage = 'Silently stalked through tall grass. Range closed to ' + state.currentTarget.distance + 'm.';
    }
  } else if (action === 'action:use_animal_caller') {
    state.stamina = Math.max(0, state.stamina - 6);
    state.currentTarget.distance = Math.max(30, state.currentTarget.distance - 25);
    state.gameMessage = 'Blew vocal lure call. ' + state.currentTarget.species + ' turned and stepped closer to ' + state.currentTarget.distance + 'm.';
  } else if (action === 'action:steady_aim_and_fire') {
    state.ammo -= 1;
    const hitChance = (state.steadyAim / 100) * (1 - (state.currentTarget.distance / 350));
    const roll = nextRand(state);

    if (roll < Math.max(0.45, hitChance)) {
      state.currentTarget.isDowned = true;
      state.gameMessage = 'BULLSEYE! Clean vital double-lung shot dropped ' + state.currentTarget.species + ' ethically in its tracks!';
    } else {
      state.spookCount += 1;
      state.gameMessage = 'Round clipped a pine branch and went wide! The ' + state.currentTarget.species + ' bolted into deep timber.';
      state.currentTarget = null;
    }
  } else if (action === 'action:harvest_downed_game') {
    state.funds += state.currentTarget.reward;
    state.harvestCount += 1;
    if (state.currentTarget.species === 'Legendary Great White Moose') {
      state.legendaryClaimed = true;
    }
    state.gameMessage = 'Tagged and harvested ' + state.currentTarget.species + '! Claimed $' + state.currentTarget.reward + ' guild bounty.';
    state.currentTarget = null;
  }

  // Turn advance & animal alertness check
  state.turns += 1;

  if (state.currentTarget && !state.currentTarget.isDowned) {
    state.scentMask = Math.max(0, state.scentMask - 3);
    if (state.scentMask <= 25 && nextRand(state) < 0.25) {
      state.currentTarget.alert += 35;
    }
    if (state.currentTarget.alert >= 85) {
      state.spookCount += 1;
      state.gameMessage = 'The ' + state.currentTarget.species + ' caught your scent and spooked into the forest!';
      state.currentTarget = null;
    }
  }

  // Win / Loss evaluation
  if (state.legendaryClaimed && state.harvestCount >= 6 && state.funds >= 3200) {
    state.victory = true;
    state.gameMessage = 'Victory! Crowned Grandmaster Wilderness Stalker! The legendary white moose rack is yours.';
  } else if (state.spookCount >= 5) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Hunting license suspended after repeatedly spooking game.';
  } else if (state.ammo <= 0 && state.funds < 50 && (state.currentTarget === null || !state.currentTarget.isDowned)) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Out of ammunition and capital. Expedition abandoned.';
  } else if (state.turns >= state.maxTurns) {
    if (state.legendaryClaimed && state.funds >= 2400) {
      state.victory = true;
      state.gameMessage = 'Victory: Hunting season concluded with prestigious trophy honors!';
    } else {
      state.gameMessage = 'Hunting season closed by wildlife authority.';
    }
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
    BIOME_NAMES
  };
}
