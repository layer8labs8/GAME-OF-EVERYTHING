/**
 * 0136-walking-simulator: Solitary Echoes
 * Pure walking simulator narrative engine conforming strictly to the Bot Contract.
 * No browser globals, seedable PRNG, fully deterministic and serializable.
 */

const MAX_TURNS = 150;

const LOCATIONS = ['coastal_trail', 'cottage', 'groves', 'overlook', 'observatory'];

const ADJACENT_PATHS = {
  coastal_trail: ['cottage', 'groves'],
  cottage: ['coastal_trail', 'groves'],
  groves: ['coastal_trail', 'cottage', 'overlook'],
  overlook: ['groves', 'observatory'],
  observatory: ['overlook']
};

const LOCATION_PROPS = {
  coastal_trail: ['cairn', 'foghorn_post'],
  cottage: ['piano', 'postcard_desk'],
  groves: ['windchime_tree', 'carved_trunk'],
  overlook: ['binoculars', 'weather_station'],
  observatory: ['star_chart_desk', 'telescope_console']
};

function createPrng(seed) {
  let s = (seed >>> 0) || 123456789;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createState(seed = 1) {
  return {
    seed: seed >>> 0,
    prngState: seed >>> 0,
    turns: 0,
    maxTurns: MAX_TURNS,
    location: 'coastal_trail',
    discoveredMemories: [],
    inspectedProps: {},
    tunedLocations: {},
    clarity: 10,
    score: 0,
    done: false,
    victory: false,
    monologue: [
      'The ferry departed three days ago. The fog has settled over Orford Isle.',
      'A path winds up toward the old cliffside observatory. Take your time.'
    ]
  };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return state.score;
}

function addLog(state, line) {
  state.monologue.push(line);
  if (state.monologue.length > 20) {
    state.monologue.shift();
  }
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  // Movement along adjacent walking trails
  const neighbors = ADJACENT_PATHS[state.location] || [];
  for (let i = 0; i < neighbors.length; i++) {
    actions.push('walk:' + neighbors[i]);
  }

  // Environmental prop inspections at current location
  const props = LOCATION_PROPS[state.location] || [];
  for (let i = 0; i < props.length; i++) {
    const p = props[i];
    if (!state.inspectedProps[p]) {
      actions.push('inspect:' + p);
    }
  }

  // Radio frequency tuning if location not yet tuned
  if (!state.tunedLocations[state.location]) {
    actions.push('tune:radio');
  }

  // Reflective contemplation
  actions.push('contemplate:surroundings');

  // Climax action: Telescope alignment at the observatory if all 4 memories are gathered
  if (state.location === 'observatory') {
    if (state.discoveredMemories.length >= 4) {
      actions.push('action:align_telescope');
    }
  }

  return actions;
}

function step(state, action) {
  if (state.done) {
    throw new Error('Journey has already reached its conclusion.');
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action "${action}".`);
  }

  state.turns += 1;
  let reward = 0;

  // Walk
  if (action.startsWith('walk:')) {
    const dest = action.split(':')[1];
    state.location = dest;
    reward += 2;
    state.score += 5;

    if (dest === 'cottage') {
      addLog(state, 'You step onto the porch of the old fisherman cottage. The scent of pine and salt clings to the wood.');
    } else if (dest === 'groves') {
      addLog(state, 'The sound of the sea softens as towering pines filter the amber twilight.');
    } else if (dest === 'overlook') {
      addLog(state, 'You reach the high promontory. The entire horizon unfurls in deep shades of indigo.');
    } else if (dest === 'observatory') {
      addLog(state, 'The copper dome of the Starlight Observatory rises quietly against the evening sky.');
    } else {
      addLog(state, 'You follow the rocky coastal trail, pebbles crunching beneath your boots.');
    }
  }

  // Inspect Props
  else if (action.startsWith('inspect:')) {
    const prop = action.split(':')[1];
    state.inspectedProps[prop] = true;
    reward += 5;
    state.score += 15;
    state.clarity += 10;

    if (prop === 'cairn') {
      if (!state.discoveredMemories.includes('memory_departure')) {
        state.discoveredMemories.push('memory_departure');
        state.score += 25;
        reward += 15;
        addLog(state, 'Memory Restored: "He placed the final stone on the cairn before walking toward the harbor without looking back."');
      }
    } else if (prop === 'piano') {
      if (!state.discoveredMemories.includes('memory_melody')) {
        state.discoveredMemories.push('memory_melody');
        state.score += 25;
        reward += 15;
        addLog(state, 'Memory Restored: You press a yellowed ivory key. The resonance of a half-forgotten lullaby fills the quiet room.');
      }
    } else if (prop === 'windchime_tree') {
      if (!state.discoveredMemories.includes('memory_storm')) {
        state.discoveredMemories.push('memory_storm');
        state.score += 25;
        reward += 15;
        addLog(state, 'Memory Restored: "The gale blew for three days. But the light on the peak never flickered out."');
      }
    } else if (prop === 'binoculars') {
      if (!state.discoveredMemories.includes('memory_constellation')) {
        state.discoveredMemories.push('memory_constellation');
        state.score += 25;
        reward += 15;
        addLog(state, 'Memory Restored: Looking through the brass optics, you recognize the stellar alignment: the Stella Maris beacon.');
      }
    } else if (prop === 'foghorn_post') {
      addLog(state, 'The brass plaque reads: "Erected 1912 for those who wander the outer shoals."');
    } else if (prop === 'postcard_desk') {
      addLog(state, 'Postcards from distant ports lie stacked in an open drawer, unmailed.');
    } else if (prop === 'carved_trunk') {
      addLog(state, 'A carving in the bark shows two sets of initials inside a compass rose.');
    } else if (prop === 'weather_station') {
      addLog(state, 'The barometer needle hovers calmly over fair skies.');
    } else if (prop === 'star_chart_desk') {
      addLog(state, 'Hand-drawn celestial charts chart coordinates to the northern constellation.');
    } else if (prop === 'telescope_console') {
      addLog(state, 'The refractor gears are oiled and waiting for the 4 core coordinate memories.');
    }
  }

  // Tune Radio
  else if (action === 'tune:radio') {
    state.tunedLocations[state.location] = true;
    reward += 4;
    state.score += 10;
    state.clarity += 5;
    addLog(state, 'Static crackles across the transistor speaker... a faint broadcast melody weaves through the sea breeze.');
  }

  // Contemplate
  else if (action === 'contemplate:surroundings') {
    reward += 1;
    state.score += 5;
    state.clarity += 5;
    addLog(state, 'You stand still for a breath, listening to the tide and watching the distant lighthouse beam sweep the water.');
  }

  // Align Telescope Climax
  else if (action === 'action:align_telescope') {
    state.victory = true;
    state.done = true;
    reward += 100;
    state.score += 100;
    addLog(state, 'JOURNEY TRANSCENDED: The telescope lenses click into celestial focus. The light of Stella Maris floods the dome with quiet peace.');
    return { reward, done: true };
  }

  // Time bound
  if (state.turns >= state.maxTurns) {
    state.done = true;
    addLog(state, 'Night fully blankets the island as your evening walk comes to a peaceful rest.');
  }

  return { reward, done: state.done };
}

// Module export for Node.js test runners & Bot checkers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    MAX_TURNS,
    LOCATIONS,
    LOCATION_PROPS
  };
}
