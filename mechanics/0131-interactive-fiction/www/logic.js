// Logic for 0131-interactive-fiction: Colossal Vault
// Pure Bot Contract implementation. Zero UI or platform dependencies.

const MAX_TURNS = 150;

function nextRng(state) {
  state.rngState = (Math.imul(state.rngState, 1664525) + 1013904223) >>> 0;
  return state.rngState / 4294967296;
}

const LOCATIONS = {
  clearing: {
    name: 'Cottage Clearing',
    desc: 'You stand in a sunlit clearing west of a weathered cottage. A small mailbox stands beside a cobblestone path.',
    exits: { north: 'forest', east: 'cottage' }
  },
  forest: {
    name: 'Whispering Forest',
    desc: 'Dense ancient pines loom around you. A colossal oak tree stretches sturdy branches upward toward the sky.',
    exits: { south: 'clearing', up: 'tree_canopy', east: 'shrine' }
  },
  tree_canopy: {
    name: 'Tree Canopy',
    desc: 'Perched high in the canopy of the oak tree. A weaver bird nest rests securely between two thick branches.',
    exits: { down: 'forest' }
  },
  shrine: {
    name: 'Ancient Shrine',
    desc: 'A quiet moss-covered stone clearing with a weathered marble altar dedicated to ancient travelers.',
    exits: { west: 'forest' }
  },
  cottage: {
    name: 'Cottage Living Room',
    desc: 'The cozy parlor of the cottage. An ornate cedar trophy case stands proudly against the north wall. A dusty rug covers the oak floorboards.',
    exits: { west: 'clearing', down: 'cavern' }
  },
  cavern: {
    name: 'Subterranean Cavern',
    desc: 'A vast cavern hollowed out by ancient subterranean rivers. Damp stalactites hang overhead in the chill air.',
    isDark: true,
    exits: { up: 'cottage' }
  }
};

function createState(seed = 1) {
  let rngVal = (Math.floor(seed) >>> 0) || 991823;

  return {
    seed,
    rngState: rngVal,
    currentLocation: 'clearing',
    turns: 0,
    maxTurns: MAX_TURNS,
    score: 0,
    done: false,
    victory: false,
    inventory: [],
    lanternLit: false,
    treasuresDeposited: 0,
    world: {
      mailbox_open: false,
      mat_moved: false,
      front_door_locked: true,
      rug_moved: false,
      trapdoor_open: false,
      grueWarning: false
    },
    itemsAt: {
      clearing: [],
      forest: [],
      tree_canopy: ['jeweled_egg'],
      shrine: ['golden_chalice'],
      cottage: ['brass_lantern'],
      cavern: ['platinum_ingot']
    },
    combatLog: ['Welcome to Colossal Vault. Seek the 3 Treasures of Legend for the Trophy Case.']
  };
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const loc = state.currentLocation;
  const locDef = LOCATIONS[loc];
  const w = state.world;
  const inv = state.inventory;

  // Navigation
  for (const dir in locDef.exits) {
    if (loc === 'clearing' && dir === 'east' && w.front_door_locked) {
      continue; // door locked
    }
    if (loc === 'cottage' && dir === 'down' && !w.trapdoor_open) {
      continue; // trapdoor closed
    }
    actions.push(`go:${dir}`);
  }

  // Location-specific interactions
  if (loc === 'clearing') {
    actions.push('examine:mailbox');
    actions.push('examine:mat');
    actions.push('examine:door');

    if (!w.mailbox_open) {
      actions.push('open:mailbox');
    }
    if (!w.mat_moved) {
      actions.push('move:mat');
    }
    if (inv.includes('brass_key') && w.front_door_locked) {
      actions.push('unlock:door');
    }
  } else if (loc === 'forest') {
    actions.push('examine:oak_tree');
  } else if (loc === 'tree_canopy') {
    actions.push('examine:bird_nest');
  } else if (loc === 'shrine') {
    actions.push('examine:marble_altar');
  } else if (loc === 'cottage') {
    actions.push('examine:trophy_case');
    actions.push('examine:rug');

    if (!w.rug_moved) {
      actions.push('move:rug');
    }
    if (w.rug_moved && !w.trapdoor_open) {
      actions.push('open:trapdoor');
    }

    // Deposit treasures in trophy case
    const treasures = ['jeweled_egg', 'platinum_ingot', 'golden_chalice'];
    for (let i = 0; i < treasures.length; i++) {
      if (inv.includes(treasures[i])) {
        actions.push(`deposit:${treasures[i]}`);
      }
    }
  } else if (loc === 'cavern') {
    actions.push('examine:stalactites');
  }

  // Item pickup at current location
  const groundItems = state.itemsAt[loc] || [];
  for (let i = 0; i < groundItems.length; i++) {
    actions.push(`take:${groundItems[i]}`);
  }

  // Inventory actions
  if (inv.includes('brass_lantern') && !state.lanternLit) {
    actions.push('light:lantern');
  }

  for (let i = 0; i < inv.length; i++) {
    actions.push(`examine:${inv[i]}`);
    actions.push(`drop:${inv[i]}`);
  }

  actions.push('wait');
  return actions;
}

function resolveAction(state, action) {
  const loc = state.currentLocation;
  const w = state.world;
  const inv = state.inventory;

  if (action.startsWith('go:')) {
    const dir = action.split(':')[1];
    const target = LOCATIONS[loc].exits[dir];
    if (!target) throw new Error(`Invalid direction: ${action}`);

    state.currentLocation = target;
    const destName = LOCATIONS[target].name;
    state.combatLog.push(`You travel ${dir} to ${destName}.`);

    // Check Grue darkness condition
    if (LOCATIONS[target].isDark && !state.lanternLit) {
      if (!w.grueWarning) {
        w.grueWarning = true;
        state.combatLog.push('It is pitch black! You are likely to be eaten by a grue if you linger without light.');
      } else {
        // Slain by Grue!
        state.done = true;
        state.victory = false;
        state.combatLog.push('CRUNCH! You were devoured in the pitch darkness by a ravenous grue.');
      }
    } else {
      w.grueWarning = false;
    }
  } else if (action.startsWith('examine:')) {
    const obj = action.split(':')[1];
    state.score += 10;

    if (obj === 'mailbox') {
      state.combatLog.push(w.mailbox_open ? 'The small wooden mailbox hangs open.' : 'A quaint wooden mailbox. It appears closed.');
    } else if (obj === 'mat') {
      state.combatLog.push(w.mat_moved ? 'A welcome mat pushed aside, revealing a hidden brass key beneath.' : 'A rubber welcome mat that reads "WELCOME HOME". Something bulges beneath it.');
    } else if (obj === 'door') {
      state.combatLog.push(w.front_door_locked ? 'A solid oak door with a brass keyhole. It is firmly locked.' : 'The oak door is unlocked and stands slightly ajar.');
    } else if (obj === 'oak_tree') {
      state.combatLog.push('A massive centuries-old oak tree. Its sturdy limbs can easily be climbed (UP).');
    } else if (obj === 'bird_nest') {
      state.combatLog.push('A nest woven from twigs and twine, holding a dazzling golden jeweled egg.');
    } else if (obj === 'marble_altar') {
      state.combatLog.push('An ancient carved altar. Inscriptions read: "Honor to the Wayfarer".');
    } else if (obj === 'trophy_case') {
      state.combatLog.push(`A magnificent glass trophy case. [${state.treasuresDeposited}/3] legendary treasures resting inside.`);
    } else if (obj === 'rug') {
      state.combatLog.push(w.rug_moved ? 'The rug is rolled back, exposing an iron-ringed trapdoor.' : 'A faded Persian rug covering the center of the wooden floorboards.');
    } else if (obj === 'stalactites') {
      state.combatLog.push('Glistening limestone spears hanging above the cavern floor.');
    } else if (obj === 'brass_lantern') {
      state.combatLog.push(state.lanternLit ? 'A brass lantern burning with a steady, reassuring golden flame.' : 'A polished brass hurricane lantern filled with lamp oil.');
    } else if (obj === 'jeweled_egg') {
      state.combatLog.push('A priceless Fabergé-style egg encrusted with lapis lazuli and rubies.');
    } else if (obj === 'platinum_ingot') {
      state.combatLog.push('A heavy bar of pure refined platinum bearing an ancient imperial seal.');
    } else if (obj === 'golden_chalice') {
      state.combatLog.push('A gleaming chalice crafted from celestial gold.');
    } else {
      state.combatLog.push(`You examine ${obj}. It appears intact.`);
    }
  } else if (action === 'open:mailbox') {
    w.mailbox_open = true;
    state.itemsAt.clearing.push('leaflet');
    state.score += 25;
    state.combatLog.push('You open the mailbox. Inside is a small printed leaflet.');
  } else if (action === 'move:mat') {
    w.mat_moved = true;
    state.itemsAt.clearing.push('brass_key');
    state.score += 50;
    state.combatLog.push('You shift the welcome mat. A small brass key glints on the porch!');
  } else if (action === 'unlock:door') {
    w.front_door_locked = false;
    state.score += 100;
    state.combatLog.push('The brass key turns smoothly with an echoing click. The front door unlocks!');
  } else if (action === 'move:rug') {
    w.rug_moved = true;
    state.score += 50;
    state.combatLog.push('You pull back the heavy rug, revealing a wooden trapdoor with an iron pull-ring.');
  } else if (action === 'open:trapdoor') {
    w.trapdoor_open = true;
    state.score += 50;
    state.combatLog.push('You haul open the heavy trapdoor. A steep wooden ladder leads down into darkness.');
  } else if (action.startsWith('take:')) {
    const item = action.split(':')[1];
    const ground = state.itemsAt[loc];
    const idx = ground.indexOf(item);
    if (idx === -1) throw new Error(`Item not on ground: ${item}`);

    ground.splice(idx, 1);
    inv.push(item);
    state.score += 50;
    state.combatLog.push(`Taken ${item.replace(/_/g, ' ')}.`);
  } else if (action.startsWith('drop:')) {
    const item = action.split(':')[1];
    const idx = inv.indexOf(item);
    if (idx === -1) throw new Error(`Item not in inventory: ${item}`);

    inv.splice(idx, 1);
    state.itemsAt[loc].push(item);
    state.combatLog.push(`Dropped ${item.replace(/_/g, ' ')}.`);
  } else if (action === 'light:lantern') {
    state.lanternLit = true;
    w.grueWarning = false;
    state.score += 100;
    state.combatLog.push('You spark the flint. The brass lantern flares to life, casting away the shadows!');
  } else if (action.startsWith('deposit:')) {
    const item = action.split(':')[1];
    const idx = inv.indexOf(item);
    if (idx === -1) throw new Error(`Treasure not in inventory: ${item}`);

    inv.splice(idx, 1);
    state.treasuresDeposited += 1;
    state.score += 500;
    state.combatLog.push(`You carefully place the ${item.replace(/_/g, ' ')} into the Trophy Case! (${state.treasuresDeposited}/3)`);

    // Check Victory
    if (state.treasuresDeposited >= 3) {
      state.done = true;
      state.victory = true;
      state.score += 3000 + Math.max(0, 150 - state.turns) * 10;
      state.combatLog.push('TRIUMPH! All three legendary treasures rest in the Trophy Case! You have mastered the Colossal Vault!');
    }
  } else if (action === 'wait') {
    state.combatLog.push('Time passes quietly.');
    // Check Grue dark risk on wait
    if (LOCATIONS[loc].isDark && !state.lanternLit) {
      if (!w.grueWarning) {
        w.grueWarning = true;
        state.combatLog.push('It is pitch black! A sinister grue snarls in the shadows!');
      } else {
        state.done = true;
        state.victory = false;
        state.combatLog.push('CRUNCH! The grue leaped from the pitch darkness and ate you whole.');
      }
    }
  } else {
    throw new Error(`Unknown action: ${action}`);
  }
}

function checkTurnLimit(state) {
  if (state.turns >= state.maxTurns && !state.done) {
    state.done = true;
    state.victory = false;
    state.combatLog.push('DEFEAT! Turn limit expired. The vault collapses into myth.');
  }
}

function step(state, action) {
  const legals = legalActions(state);
  if (!legals.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  state.turns += 1;
  resolveAction(state, action);
  checkTurnLimit(state);

  const reward = state.done ? (state.victory ? 1.0 : 0.0) : 0.0;
  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return state.score;
}

function getCurrentLocation(state) {
  return LOCATIONS[state.currentLocation] || null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    getCurrentLocation,
    LOCATIONS
  };
}
