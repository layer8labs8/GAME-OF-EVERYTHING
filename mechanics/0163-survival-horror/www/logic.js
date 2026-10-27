// 0163-survival-horror: Shadow Descent - Pure Bot Contract Logic
// Deterministic, zero DOM, pure state machine.

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

const SECTOR_NAMES = [
  'Emergency Ward',
  'Containment Labs',
  'Deep Morgue',
  'Extraction Core'
];

const SECTOR_KEYS = [
  'Ward Keycard',
  'Bio Lab Fuse',
  'Eagle Medallion',
  'Extraction Key'
];

const MONSTER_TEMPLATES = [
  { name: 'Shambling Infected', hp: 30, maxHp: 30, damage: 15 },
  { name: 'Acid Spitter Lurker', hp: 45, maxHp: 45, damage: 20 },
  { name: 'Blade-Arm Stalker', hp: 60, maxHp: 60, damage: 25 },
  { name: 'Core Tyrant Abomination', hp: 90, maxHp: 90, damage: 30 }
];

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 120,
    sector: 0,
    health: 100,
    sanity: 90,
    battery: 80,
    handgunRounds: 10,
    shotgunShells: 4,
    greenHerbs: 1,
    spareBatteries: 1,
    keyItems: [],
    sectorPuzzlesSolved: [false, false, false, false],
    currentMonster: null,
    monstersSlain: 0,
    victory: false,
    defeat: false,
    gameMessage: 'Awakened in Emergency Ward. Blood drips in the hallway. Find a way out.'
  };

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = state.sector * 500;
  val += state.monstersSlain * 250;
  val += Math.floor(state.health * 5);
  val += Math.floor(state.sanity * 5);
  val += state.handgunRounds * 20;
  val += state.shotgunShells * 40;
  if (state.victory) val += 3000;
  return Math.max(0, Math.floor(val));
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  // Safe Haven rest is always accessible
  actions.push('action:rest_in_safe_room');

  // Inventory usage
  if (state.greenHerbs >= 1 && state.health < 100) {
    actions.push('action:use_green_herb');
  }
  if (state.spareBatteries >= 1 && state.battery < 100) {
    actions.push('action:recharge_flashlight');
  }

  // Active monster combat
  if (state.currentMonster !== null) {
    if (state.handgunRounds >= 1) {
      actions.push('action:precision_handgun_shot');
    }
    if (state.shotgunShells >= 1) {
      actions.push('action:shotgun_blast');
    }
    if (state.sanity >= 10) {
      actions.push('action:dodge_evasion');
    }
    if (state.battery >= 10) {
      actions.push('action:flee_combat');
    }
    return actions;
  }

  // Room exploration (when not engaged in combat)
  actions.push('action:explore_chamber');

  // Puzzle solving
  const reqKey = SECTOR_KEYS[state.sector];
  if (!state.sectorPuzzlesSolved[state.sector] && state.keyItems.includes(reqKey)) {
    actions.push('action:solve_sector_puzzle');
  }

  // Sector transit
  if (state.sectorPuzzlesSolved[state.sector]) {
    if (state.sector < 3) {
      actions.push('action:advance_to_sector:' + (state.sector + 1));
    } else {
      actions.push('action:trigger_extraction_flare');
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
    throw new Error('Illegal survival horror action "' + action + '" in current state');
  }

  const oldScore = score(state);

  if (action === 'action:rest_in_safe_room') {
    state.sanity = Math.min(100, state.sanity + 35);
    state.gameMessage = 'Entered tranquil safe room. Soothing music and warm lamplight calm your racing pulse.';
  } else if (action === 'action:use_green_herb') {
    state.greenHerbs -= 1;
    state.health = Math.min(100, state.health + 35);
    state.gameMessage = 'Applied crushed green herb poultice. Flesh wounds bind closed.';
  } else if (action === 'action:recharge_flashlight') {
    state.spareBatteries -= 1;
    state.battery = Math.min(100, state.battery + 50);
    state.gameMessage = 'Inserted fresh lithium cell into flashlight. Piercing beam cuts through the gloom.';
  } else if (action === 'action:explore_chamber') {
    state.battery = Math.max(0, state.battery - 8);
    state.sanity = Math.max(0, state.sanity - 2);

    const reqKey = SECTOR_KEYS[state.sector];
    if (!state.keyItems.includes(reqKey)) {
      state.keyItems.push(reqKey);
      state.gameMessage = 'Discovered critical key item: [' + reqKey + '] hidden in a locker!';
    } else {
      const roll = nextRand(state);
      if (roll < 0.35) {
        state.handgunRounds += 4;
        state.gameMessage = 'Found a box of 9mm handgun rounds (+4 ammo).';
      } else if (roll < 0.65) {
        state.shotgunShells += 2;
        state.gameMessage = 'Scavenged 12-gauge shotgun shells (+2 shells).';
      } else if (roll < 0.85) {
        state.greenHerbs += 1;
        state.gameMessage = 'Harvested a fresh medicinal green herb.';
      } else {
        state.spareBatteries += 1;
        state.gameMessage = 'Recovered a spare flashlight battery.';
      }
    }

    // Encounter chance
    if (nextRand(state) < 0.45 && state.currentMonster === null) {
      const tpl = MONSTER_TEMPLATES[state.sector];
      state.currentMonster = {
        name: tpl.name,
        hp: tpl.hp,
        maxHp: tpl.hp,
        damage: tpl.damage
      };
      state.gameMessage += ' A ' + tpl.name + ' lunged from the shadows!';
    }
  } else if (action === 'action:precision_handgun_shot') {
    state.handgunRounds -= 1;
    const isCrit = nextRand(state) < 0.35;
    const dmg = isCrit ? 28 : 16;
    state.currentMonster.hp -= dmg;
    state.gameMessage = 'Fired 9mm round! (' + dmg + ' dmg' + (isCrit ? ' CRITICAL HIT!)' : ')');

    if (state.currentMonster.hp <= 0) {
      state.monstersSlain += 1;
      state.gameMessage += ' The ' + state.currentMonster.name + ' collapsed lifeless!';
      state.currentMonster = null;
    } else {
      state.health = Math.max(0, state.health - state.currentMonster.damage);
      state.sanity = Math.max(0, state.sanity - 6);
      state.gameMessage += ' Beast countered violently! -' + state.currentMonster.damage + ' Health.';
    }
  } else if (action === 'action:shotgun_blast') {
    state.shotgunShells -= 1;
    const dmg = 45;
    state.currentMonster.hp -= dmg;
    state.gameMessage = 'BOOM! Heavy 12-gauge buckshot tore through the creature (' + dmg + ' dmg)!';

    if (state.currentMonster.hp <= 0) {
      state.monstersSlain += 1;
      state.gameMessage += ' The ' + state.currentMonster.name + ' was obliterated!';
      state.currentMonster = null;
    } else {
      state.gameMessage += ' The heavy blast staggered the beast, interrupting its strike.';
    }
  } else if (action === 'action:dodge_evasion') {
    state.sanity = Math.max(0, state.sanity - 10);
    state.gameMessage = 'Tactical evasive sidestep! Narrowly avoided the monster claws.';
  } else if (action === 'action:flee_combat') {
    state.battery = Math.max(0, state.battery - 10);
    state.sanity = Math.max(0, state.sanity - 12);
    state.currentMonster = null;
    state.gameMessage = 'Fled down the iron corridor, slamming the bulkhead door behind you!';
  } else if (action === 'action:solve_sector_puzzle') {
    state.sectorPuzzlesSolved[state.sector] = true;
    state.gameMessage = 'Fitted key item into the pneumatic lock. Sector blast doors unsealed!';
  } else if (action.startsWith('action:advance_to_sector:')) {
    const s = parseInt(action.split(':')[2], 10);
    state.sector = s;
    state.currentMonster = null;
    state.gameMessage = 'Advanced into ' + SECTOR_NAMES[s] + '. Darkness thickens.';
  } else if (action === 'action:trigger_extraction_flare') {
    state.victory = true;
    state.gameMessage = 'Victory! Emergency distress flare fired! Rescue helicopter touches down on helipad.';
  }

  // Turn advance & darkness horror
  state.turns += 1;

  if (state.battery <= 0) {
    state.sanity = Math.max(0, state.sanity - 8);
    state.gameMessage += ' (Total darkness grips you in claustrophobic terror! -8 Sanity.)';
  }

  // Win / Loss evaluation
  if (state.health <= 0) {
    state.defeat = true;
    state.gameMessage = 'Defeat: You died in the dark corridors of Blackwood Research Complex.';
  } else if (state.sanity <= 0) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Psychological collapse into screaming catatonia.';
  } else if (state.turns >= state.maxTurns) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Complex decontamination incinerators purged all biological matter.';
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
    SECTOR_NAMES,
    SECTOR_KEYS
  };
}
