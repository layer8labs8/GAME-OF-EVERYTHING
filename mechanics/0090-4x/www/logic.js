// Pure deterministic simulation logic for 0090-4x (Galactic 4X: Stellar Dominion)

const MAX_TURNS = 30;
const EXPLORE_COST_ENERGY = 5;
const COLONIZE_COST_MINERALS = 15;
const COLONIZE_COST_ENERGY = 10;
const SHIP_COST_MINERALS = 10;
const SHIP_COST_ENERGY = 5;
const TECH_COST_SCIENCE = 20;

const STAR_SYSTEMS = [
  { id: 0, name: 'Sol', x: 80, y: 240, neighbors: [1, 2], yields: { m: 4, e: 4, s: 3 } },
  { id: 1, name: 'Alpha Centauri', x: 180, y: 130, neighbors: [0, 3, 4], yields: { m: 6, e: 2, s: 1 } },
  { id: 2, name: 'Sirius', x: 180, y: 350, neighbors: [0, 4, 5], yields: { m: 2, e: 6, s: 1 } },
  { id: 3, name: 'Vega', x: 280, y: 100, neighbors: [1, 6], yields: { m: 2, e: 2, s: 6 } },
  { id: 4, name: 'Cygnus Core', x: 260, y: 240, neighbors: [1, 2, 5, 6], yields: { m: 3, e: 3, s: 3 } },
  { id: 5, name: 'Arcturus', x: 280, y: 380, neighbors: [2, 4, 7], yields: { m: 4, e: 3, s: 2 } },
  { id: 6, name: 'Polaris', x: 380, y: 150, neighbors: [3, 4, 7], yields: { m: 3, e: 3, s: 4 } },
  { id: 7, name: 'Omicron Prime', x: 400, y: 280, neighbors: [5, 6], yields: { m: 5, e: 5, s: 3 } }
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

  const systems = STAR_SYSTEMS.map(sys => {
    let owner = null;
    let exploredByPlayer = false;
    let exploredByAlien = false;
    let playerFleet = 0;
    let alienFleet = 0;

    if (sys.id === 0) {
      // Sol: Human homeworld
      owner = 'player';
      exploredByPlayer = true;
      playerFleet = 3;
    } else if (sys.id === 7) {
      // Omicron: Alien homeworld
      owner = 'alien';
      exploredByAlien = true;
      alienFleet = 3;
    }

    return {
      id: sys.id,
      name: sys.name,
      x: sys.x,
      y: sys.y,
      neighbors: [...sys.neighbors],
      yields: { ...sys.yields },
      owner,
      exploredByPlayer,
      exploredByAlien,
      playerFleet,
      alienFleet
    };
  });

  return {
    seed: numSeed,
    rngStep: 0,
    turn: 1,
    maxTurns: MAX_TURNS,
    minerals: 25,
    energy: 25,
    science: 5,
    techLevel: 1,
    alienMinerals: 25,
    alienEnergy: 25,
    alienScience: 5,
    alienTechLevel: 1,
    systems,
    history: ['Galactic expedition launched from Sol. Explore the cluster.'],
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

  // 1. eXplore: adjacent unexplored systems from explored ones
  if (state.energy >= EXPLORE_COST_ENERGY) {
    const candidateExploreIds = new Set();
    for (let i = 0; i < state.systems.length; i++) {
      const sys = state.systems[i];
      if (sys.exploredByPlayer) {
        for (let n = 0; n < sys.neighbors.length; n++) {
          const nid = sys.neighbors[n];
          if (!state.systems[nid].exploredByPlayer) {
            candidateExploreIds.add(nid);
          }
        }
      }
    }
    candidateExploreIds.forEach(id => {
      actions.push(`explore:${id}`);
    });
  }

  // 2. eXpand: colonize explored unowned systems
  if (state.minerals >= COLONIZE_COST_MINERALS && state.energy >= COLONIZE_COST_ENERGY) {
    for (let i = 0; i < state.systems.length; i++) {
      const sys = state.systems[i];
      if (sys.exploredByPlayer && sys.owner === null) {
        // Must connect to a player-controlled or fleet-occupied node
        const hasSupply = sys.neighbors.some(nid => {
          const nb = state.systems[nid];
          return nb.owner === 'player' || nb.playerFleet > 0;
        });
        if (hasSupply) {
          actions.push(`colonize:${sys.id}`);
        }
      }
    }
  }

  // 3. eXterminate: build fleet at owned systems
  if (state.minerals >= SHIP_COST_MINERALS && state.energy >= SHIP_COST_ENERGY) {
    for (let i = 0; i < state.systems.length; i++) {
      const sys = state.systems[i];
      if (sys.owner === 'player') {
        actions.push(`build_fleet:${sys.id}`);
      }
    }
  }

  // 4. Fleet maneuver: move fleets to neighboring explored systems
  for (let i = 0; i < state.systems.length; i++) {
    const sys = state.systems[i];
    if (sys.playerFleet > 0) {
      for (let n = 0; n < sys.neighbors.length; n++) {
        const targetId = sys.neighbors[n];
        if (state.systems[targetId].exploredByPlayer) {
          actions.push(`move_fleet:${sys.id}:${targetId}`);
        }
      }
    }
  }

  // 5. eXploit: Research technology
  if (state.techLevel < 5 && state.science >= TECH_COST_SCIENCE) {
    actions.push('research');
  }

  // 6. End turn
  actions.push('end_turn');

  return actions;
}

function resolveSpaceCombat(state, playerShips, alienShips, playerTech, alienTech) {
  let p = playerShips;
  let a = alienShips;

  while (p > 0 && a > 0) {
    const rollP = Math.floor(getRngValue(state) * 6) + 1 + playerTech;
    const rollA = Math.floor(getRngValue(state) * 6) + 1 + alienTech;

    if (rollP >= rollA) {
      a -= 1;
    } else {
      p -= 1;
    }
  }

  return {
    playerSurviving: p,
    alienSurviving: a,
    playerWon: a === 0 && p > 0
  };
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

  if (action.startsWith('explore:')) {
    const targetId = parseInt(action.split(':')[1], 10);
    const targetSys = state.systems.find(s => s.id === targetId);
    state.energy -= EXPLORE_COST_ENERGY;
    targetSys.exploredByPlayer = true;
    reward = 5;
    state.history.push(`Scouted ${targetSys.name}. Planetary telemetry retrieved.`);
  } else if (action.startsWith('colonize:')) {
    const targetId = parseInt(action.split(':')[1], 10);
    const targetSys = state.systems.find(s => s.id === targetId);
    state.minerals -= COLONIZE_COST_MINERALS;
    state.energy -= COLONIZE_COST_ENERGY;
    targetSys.owner = 'player';
    targetSys.playerFleet += 1; // Colony defense drone
    reward = 20;
    state.history.push(`Established interstellar colony on ${targetSys.name}!`);
    checkWinConditions(state);
  } else if (action.startsWith('build_fleet:')) {
    const targetId = parseInt(action.split(':')[1], 10);
    const targetSys = state.systems.find(s => s.id === targetId);
    state.minerals -= SHIP_COST_MINERALS;
    state.energy -= SHIP_COST_ENERGY;
    targetSys.playerFleet += 1;
    reward = 3;
    state.history.push(`Commissioned dreadnought warship at ${targetSys.name}.`);
  } else if (action.startsWith('move_fleet:')) {
    const parts = action.split(':');
    const fromId = parseInt(parts[1], 10);
    const toId = parseInt(parts[2], 10);

    const fromSys = state.systems.find(s => s.id === fromId);
    const toSys = state.systems.find(s => s.id === toId);

    const fleetToMove = fromSys.playerFleet;
    fromSys.playerFleet = 0;

    if (toSys.alienFleet > 0 || toSys.owner === 'alien') {
      const alienGarrison = toSys.alienFleet > 0 ? toSys.alienFleet : 1;
      const combat = resolveSpaceCombat(state, fleetToMove, alienGarrison, state.techLevel, state.alienTechLevel);

      if (combat.playerWon) {
        toSys.playerFleet += combat.playerSurviving;
        toSys.alienFleet = 0;
        toSys.owner = 'player';
        reward = toSys.id === 7 ? 100 : 35;
        state.history.push(`Decisive victory at ${toSys.name}! Alien forces eradicated.`);
      } else {
        toSys.alienFleet = combat.alienSurviving;
        reward = -10;
        state.history.push(`Fleet annihilated during planetary assault at ${toSys.name}.`);
      }
    } else {
      toSys.playerFleet += fleetToMove;
      state.history.push(`Fleet repositioned to ${toSys.name}.`);
      reward = 1;
    }

    checkWinConditions(state);
  } else if (action === 'research') {
    state.science -= TECH_COST_SCIENCE;
    state.techLevel += 1;
    reward = 25;
    state.history.push(`Technological breakthrough! Tech Level increased to ${state.techLevel}.`);
    checkWinConditions(state);
  } else if (action === 'end_turn') {
    // 1. Gather player resources
    harvestPlayerResources(state);

    // 2. Gather alien resources
    harvestAlienResources(state);

    // 3. Alien AI turn
    runAlienAi(state);

    // 4. Turn increment and end conditions
    checkWinConditions(state);

    if (!state.done) {
      state.turn += 1;
      if (state.turn > state.maxTurns) {
        evaluateMaxTurnConclusion(state);
      }
    }

    if (state.done && state.winner === 'player') {
      reward = 100;
    } else if (state.done && state.winner === 'alien') {
      reward = -50;
    }
  }

  return { reward, done: state.done };
}

function harvestPlayerResources(state) {
  const mult = 1 + (state.techLevel - 1) * 0.1;
  for (let i = 0; i < state.systems.length; i++) {
    const sys = state.systems[i];
    if (sys.owner === 'player') {
      state.minerals += Math.round(sys.yields.m * mult);
      state.energy += Math.round(sys.yields.e * mult);
      state.science += Math.round(sys.yields.s * mult);
    }
  }
}

function harvestAlienResources(state) {
  const mult = 1 + (state.alienTechLevel - 1) * 0.1;
  for (let i = 0; i < state.systems.length; i++) {
    const sys = state.systems[i];
    if (sys.owner === 'alien') {
      state.alienMinerals += Math.round(sys.yields.m * mult);
      state.alienEnergy += Math.round(sys.yields.e * mult);
      state.alienScience += Math.round(sys.yields.s * mult);
    }
  }
}

function runAlienAi(state) {
  // Alien tech upgrade
  if (state.alienTechLevel < 5 && state.alienScience >= TECH_COST_SCIENCE) {
    state.alienScience -= TECH_COST_SCIENCE;
    state.alienTechLevel += 1;
  }

  // Alien exploration: find neighboring unexplored systems
  const candidateAlienExplore = [];
  for (let i = 0; i < state.systems.length; i++) {
    const sys = state.systems[i];
    if (sys.exploredByAlien) {
      for (let n = 0; n < sys.neighbors.length; n++) {
        const nb = state.systems[sys.neighbors[n]];
        if (!nb.exploredByAlien) {
          candidateAlienExplore.push(nb);
        }
      }
    }
  }

  if (candidateAlienExplore.length > 0 && state.alienEnergy >= EXPLORE_COST_ENERGY) {
    const chosen = candidateAlienExplore[0];
    chosen.exploredByAlien = true;
    state.alienEnergy -= EXPLORE_COST_ENERGY;
  }

  // Alien expansion / colonization
  for (let i = 0; i < state.systems.length; i++) {
    const sys = state.systems[i];
    if (sys.exploredByAlien && sys.owner === null) {
      if (state.alienMinerals >= COLONIZE_COST_MINERALS && state.alienEnergy >= COLONIZE_COST_ENERGY) {
        state.alienMinerals -= COLONIZE_COST_MINERALS;
        state.alienEnergy -= COLONIZE_COST_ENERGY;
        sys.owner = 'alien';
        sys.alienFleet += 1;
        state.history.push(`Alien Empire colonized ${sys.name}.`);
        break;
      }
    }
  }

  // Alien fleet construction
  const alienOwned = state.systems.filter(s => s.owner === 'alien');
  for (let i = 0; i < alienOwned.length; i++) {
    if (state.alienMinerals >= SHIP_COST_MINERALS && state.alienEnergy >= SHIP_COST_ENERGY) {
      state.alienMinerals -= SHIP_COST_MINERALS;
      state.alienEnergy -= SHIP_COST_ENERGY;
      alienOwned[i].alienFleet += 1;
    }
  }

  // Alien offensive maneuvers
  for (let i = 0; i < state.systems.length; i++) {
    const sys = state.systems[i];
    if (sys.alienFleet > 2) {
      // Find adjacent target
      for (let n = 0; n < sys.neighbors.length; n++) {
        const target = state.systems[sys.neighbors[n]];
        if (target.owner !== 'alien') {
          const marching = sys.alienFleet;
          sys.alienFleet = 0;

          const defenderGarrison = target.playerFleet > 0 ? target.playerFleet : (target.owner === 'player' ? 1 : 0);
          if (defenderGarrison === 0) {
            target.alienFleet += marching;
            target.owner = 'alien';
            state.history.push(`Alien armada seized undefended ${target.name}.`);
          } else {
            const combat = resolveSpaceCombat(state, defenderGarrison, marching, state.techLevel, state.alienTechLevel);
            if (!combat.playerWon) {
              target.alienFleet = combat.alienSurviving;
              target.playerFleet = 0;
              target.owner = 'alien';
              state.history.push(`Alien armada conquered ${target.name}.`);
            } else {
              target.playerFleet = combat.playerSurviving;
              state.history.push(`Human defenses repelled alien raid on ${target.name}.`);
            }
          }
          break;
        }
      }
    }
  }
}

function checkWinConditions(state) {
  // 1. Conquest of Alien Homeworld
  const omicron = state.systems.find(s => s.id === 7);
  if (omicron.owner === 'player') {
    state.done = true;
    state.winner = 'player';
    state.result = 'conquest_victory';
    state.history.push('Total Domination Victory! The alien homeworld has fallen.');
    return;
  }

  // 2. Hegemonic expansion: 5 out of 8 systems
  let playerColonies = 0;
  let alienColonies = 0;
  for (let i = 0; i < state.systems.length; i++) {
    if (state.systems[i].owner === 'player') playerColonies++;
    if (state.systems[i].owner === 'alien') alienColonies++;
  }

  if (playerColonies >= 5) {
    state.done = true;
    state.winner = 'player';
    state.result = 'hegemony_victory';
    state.history.push('Interstellar Hegemony Victory! Sol reigns across the star cluster.');
    return;
  }

  // 3. Technological transcendence
  if (state.techLevel >= 5) {
    state.done = true;
    state.winner = 'player';
    state.result = 'science_victory';
    state.history.push('Technological Transcendence Victory! Dyson Core harnessed.');
    return;
  }

  // Defeat conditions
  const sol = state.systems.find(s => s.id === 0);
  if (sol.owner === 'alien' || playerColonies === 0) {
    state.done = true;
    state.winner = 'alien';
    state.result = 'defeat';
    state.history.push('Catastrophic Defeat! The Sol system has fallen to alien subjugation.');
  }
}

function evaluateMaxTurnConclusion(state) {
  state.done = true;
  let pColonies = 0;
  let aColonies = 0;
  let pFleet = 0;
  let aFleet = 0;

  for (let i = 0; i < state.systems.length; i++) {
    const s = state.systems[i];
    if (s.owner === 'player') pColonies++;
    if (s.owner === 'alien') aColonies++;
    pFleet += s.playerFleet;
    aFleet += s.alienFleet;
  }

  if (pColonies > aColonies || (pColonies === aColonies && pFleet >= aFleet)) {
    state.winner = 'player';
    state.result = 'victory';
    state.history.push('Campaign concluded. Humanity established predominant galactic dominion.');
  } else {
    state.winner = 'alien';
    state.result = 'defeat';
    state.history.push('Campaign concluded. The Alien Empire dominates the cluster.');
  }
}

function isOver(state) {
  return state.done;
}

function score(state) {
  let colonies = 0;
  let fleet = 0;

  for (let i = 0; i < state.systems.length; i++) {
    const s = state.systems[i];
    if (s.owner === 'player') colonies++;
    fleet += s.playerFleet;
  }

  let s = (colonies * 100) + (state.techLevel * 80) + (fleet * 15) + (state.minerals + state.energy + state.science);
  if (state.winner === 'player') s += 500;
  s -= (state.turn - 1) * 5;

  return Math.max(0, s);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    STAR_SYSTEMS,
    MAX_TURNS
  };
}
