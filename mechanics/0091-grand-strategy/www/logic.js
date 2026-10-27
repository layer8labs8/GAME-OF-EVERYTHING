// Pure deterministic simulation logic for 0091-grand-strategy (Continental Hegemony)

const START_YEAR = 1400;
const MAX_TURNS = 25; // 1400 to 1425
const LEVY_COST_GOLD = 20;
const LEVY_COST_MANPOWER = 15;
const REFORM_COST_GOLD = 30;
const ALLIANCE_COST_INFLUENCE = 25;
const WAR_COST_INFLUENCE = 15;

const CONTINENTAL_PROVINCES = [
  { id: 0, name: 'Valoria City', nation: 'valoria', dev: 3, x: 90, y: 140, isCapital: true, neighbors: [1, 2, 6] },
  { id: 1, name: 'High Plains', nation: 'valoria', dev: 2, x: 90, y: 250, isCapital: false, neighbors: [0, 2, 3] },
  { id: 2, name: 'Riverlands', nation: 'valoria', dev: 2, x: 190, y: 190, isCapital: false, neighbors: [0, 1, 3, 7] },
  { id: 3, name: 'Sol Citadel', nation: 'solaris', dev: 3, x: 180, y: 310, isCapital: true, neighbors: [1, 2, 4, 5] },
  { id: 4, name: 'Sunport', nation: 'solaris', dev: 2, x: 100, y: 400, isCapital: false, neighbors: [3, 5] },
  { id: 5, name: 'Vineyards', nation: 'solaris', dev: 2, x: 230, y: 410, isCapital: false, neighbors: [3, 4, 11] },
  { id: 6, name: 'Iron Keep', nation: 'iron_duchy', dev: 3, x: 230, y: 90, isCapital: true, neighbors: [0, 7, 8] },
  { id: 7, name: 'Peakhold', nation: 'iron_duchy', dev: 2, x: 290, y: 180, isCapital: false, neighbors: [2, 6, 8, 10] },
  { id: 8, name: 'Pine Valley', nation: 'iron_duchy', dev: 2, x: 350, y: 90, isCapital: false, neighbors: [6, 7, 9] },
  { id: 9, name: 'Steppe Camp', nation: 'shadowfang', dev: 3, x: 410, y: 160, isCapital: true, neighbors: [8, 10] },
  { id: 10, name: 'Nomad Gate', nation: 'shadowfang', dev: 2, x: 370, y: 260, isCapital: false, neighbors: [7, 9, 11] },
  { id: 11, name: 'Dune Watch', nation: 'shadowfang', dev: 2, x: 350, y: 370, isCapital: false, neighbors: [5, 10] }
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

  const provinces = CONTINENTAL_PROVINCES.map(p => ({
    id: p.id,
    name: p.name,
    nation: p.nation,
    dev: p.dev,
    x: p.x,
    y: p.y,
    isCapital: p.isCapital,
    neighbors: [...p.neighbors],
    garrison: p.isCapital ? 6 : 4
  }));

  return {
    seed: numSeed,
    rngStep: 0,
    turn: 1,
    year: START_YEAR,
    maxTurns: MAX_TURNS,
    gold: 80,
    manpower: 60,
    influence: 35,
    stability: 80,
    diplomacy: {
      solaris: 'peace',
      iron_duchy: 'peace',
      shadowfang: 'peace'
    },
    warScore: {
      solaris: 0,
      iron_duchy: 0,
      shadowfang: 0
    },
    aiTreasuries: {
      solaris: 60,
      iron_duchy: 60,
      shadowfang: 60
    },
    provinces,
    history: ['Era begins in 1400. Forge alliances, secure borders, and claim continental hegemony.'],
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

  // 1. Mobilization: recruit levies in player provinces
  if (state.gold >= LEVY_COST_GOLD && state.manpower >= LEVY_COST_MANPOWER) {
    for (let i = 0; i < state.provinces.length; i++) {
      const p = state.provinces[i];
      if (p.nation === 'valoria') {
        actions.push(`recruit_levy:${p.id}`);
      }
    }
  }

  // 2. Domestic governance reform
  if (state.gold >= REFORM_COST_GOLD && state.stability < 100) {
    actions.push('enact_reform');
  }

  // 3. Diplomacy: Alliance or War declaration with other sovereign realms
  const rivalNations = ['solaris', 'iron_duchy', 'shadowfang'];
  for (let i = 0; i < rivalNations.length; i++) {
    const nation = rivalNations[i];
    const status = state.diplomacy[nation];

    if (status === 'peace' && state.influence >= ALLIANCE_COST_INFLUENCE) {
      actions.push(`diplomacy_alliance:${nation}`);
    }
    if (status !== 'at_war' && state.influence >= WAR_COST_INFLUENCE) {
      actions.push(`declare_war:${nation}`);
    }
    if (status === 'at_war' && state.warScore[nation] >= 30) {
      actions.push(`sue_peace:${nation}`);
    }
  }

  // 4. Military campaigns into hostile adjacent provinces
  for (let i = 0; i < state.provinces.length; i++) {
    const fromP = state.provinces[i];
    if (fromP.nation === 'valoria' && fromP.garrison > 1) {
      for (let n = 0; n < fromP.neighbors.length; n++) {
        const toId = fromP.neighbors[n];
        const toP = state.provinces[toId];
        if (toP.nation !== 'valoria') {
          // Can march if at war with their nation
          if (state.diplomacy[toP.nation] === 'at_war') {
            actions.push(`march_campaign:${fromP.id}:${toP.id}`);
          }
        } else {
          // Friendly reinforcement
          actions.push(`march_campaign:${fromP.id}:${toP.id}`);
        }
      }
    }
  }

  // 5. End turn
  actions.push('end_turn');

  return actions;
}

function resolveSiegeCombat(state, attackingTroops, defendingTroops, moraleBonus, defFortBonus) {
  let a = attackingTroops;
  let d = defendingTroops;

  while (a > 0 && d > 0) {
    const rollA = Math.floor(getRngValue(state) * 6) + 1 + moraleBonus;
    const rollD = Math.floor(getRngValue(state) * 6) + 1 + defFortBonus;

    if (rollA > rollD) {
      d -= 1;
    } else {
      a -= 1;
    }
  }

  return {
    attackerSurviving: a,
    defenderSurviving: d,
    attackerWon: d === 0 && a > 0
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

  if (action.startsWith('recruit_levy:')) {
    const pid = parseInt(action.split(':')[1], 10);
    const p = state.provinces.find(pr => pr.id === pid);
    state.gold -= LEVY_COST_GOLD;
    state.manpower -= LEVY_COST_MANPOWER;
    p.garrison += 3;
    reward = 3;
    state.history.push(`Mustered 3 battalions in ${p.name}.`);
  } else if (action === 'enact_reform') {
    state.gold -= REFORM_COST_GOLD;
    state.stability = Math.min(100, state.stability + 15);
    reward = 5;
    state.history.push(`Enacted royal state reforms. Stability rose to ${state.stability}%.`);
  } else if (action.startsWith('diplomacy_alliance:')) {
    const nation = action.split(':')[1];
    state.influence -= ALLIANCE_COST_INFLUENCE;
    state.diplomacy[nation] = 'ally';
    reward = 15;
    state.history.push(`Concluded grand defensive and trade alliance with ${nation.toUpperCase()}.`);
    checkDominionWin(state);
  } else if (action.startsWith('declare_war:')) {
    const nation = action.split(':')[1];
    state.influence -= WAR_COST_INFLUENCE;
    state.diplomacy[nation] = 'at_war';
    state.stability = Math.max(10, state.stability - 5);
    state.warScore[nation] = 0;
    reward = -5;
    state.history.push(`Issued formal Casus Belli. Valoria is now at war with ${nation.toUpperCase()}!`);
  } else if (action.startsWith('sue_peace:')) {
    const nation = action.split(':')[1];
    state.gold += 50; // Indemnity
    state.influence += 15;
    state.diplomacy[nation] = 'peace';
    state.warScore[nation] = 0;
    reward = 35;
    state.history.push(`Peace treaty signed with ${nation.toUpperCase()}. Received 50g indemnities.`);
  } else if (action.startsWith('march_campaign:')) {
    const parts = action.split(':');
    const fromId = parseInt(parts[1], 10);
    const toId = parseInt(parts[2], 10);

    const fromP = state.provinces.find(p => p.id === fromId);
    const toP = state.provinces.find(p => p.id === toId);

    const marching = fromP.garrison - 1;
    fromP.garrison = 1;

    if (toP.nation === 'valoria') {
      toP.garrison += marching;
      reward = 1;
      state.history.push(`Regarrisoned ${toP.name} with ${marching} battalions.`);
    } else {
      const enemyNation = toP.nation;
      const moraleBonus = Math.floor(state.stability / 25);
      const defFort = toP.isCapital ? 2 : 1;

      const battle = resolveSiegeCombat(state, marching, toP.garrison, moraleBonus, defFort);

      if (battle.attackerWon) {
        toP.nation = 'valoria';
        toP.garrison = battle.attackerSurviving;
        state.warScore[enemyNation] = Math.min(100, (state.warScore[enemyNation] || 0) + 25);
        reward = toP.isCapital ? 50 : 25;
        state.history.push(`Glorious triumph! Captured ${toP.name} from ${enemyNation.toUpperCase()}.`);
      } else {
        toP.garrison = battle.defenderSurviving;
        state.warScore[enemyNation] = Math.max(-100, (state.warScore[enemyNation] || 0) - 15);
        reward = -10;
        state.history.push(`Siege of ${toP.name} failed. Defenders repelled Valorian advance.`);
      }
    }

    checkDominionWin(state);
  } else if (action === 'end_turn') {
    // 1. Economic taxation & replenishment
    collectYearlyRevenues(state);

    // 2. AI national decrees
    runContinentalAi(state);

    // 3. Victory & Era Advancement
    checkDominionWin(state);

    if (!state.done) {
      state.turn += 1;
      state.year += 1;
      if (state.turn > state.maxTurns) {
        evaluateEraConclusion(state);
      }
    }

    if (state.done && state.winner === 'player') {
      reward = 100;
    } else if (state.done && state.winner === 'enemy') {
      reward = -50;
    }
  }

  return { reward, done: state.done };
}

function collectYearlyRevenues(state) {
  let devSum = 0;
  for (let i = 0; i < state.provinces.length; i++) {
    if (state.provinces[i].nation === 'valoria') {
      devSum += state.provinces[i].dev;
    }
  }

  const tax = Math.round(devSum * 8 * (state.stability / 100));
  state.gold += tax;

  // Alliance trade revenue
  const rivalNations = ['solaris', 'iron_duchy', 'shadowfang'];
  for (let i = 0; i < rivalNations.length; i++) {
    if (state.diplomacy[rivalNations[i]] === 'ally') {
      state.gold += 15;
    }
  }

  // Manpower & Influence recovery
  state.manpower = Math.min(100, state.manpower + 15);
  state.influence = Math.min(100, state.influence + 10);
}

function runContinentalAi(state) {
  const rivalNations = ['solaris', 'iron_duchy', 'shadowfang'];

  for (let i = 0; i < rivalNations.length; i++) {
    const nation = rivalNations[i];
    const isAtWar = state.diplomacy[nation] === 'at_war';

    // AI recruitment in low garrison provinces
    const owned = state.provinces.filter(p => p.nation === nation);
    if (owned.length === 0) continue;

    for (let k = 0; k < owned.length; k++) {
      if (owned[k].garrison < 4 && state.aiTreasuries[nation] >= 20) {
        owned[k].garrison += 2;
        state.aiTreasuries[nation] -= 20;
      }
    }

    // AI offensive if at war
    if (isAtWar) {
      for (let k = 0; k < owned.length; k++) {
        const fromP = owned[k];
        if (fromP.garrison > 5) {
          // Find adjacent Valoria province
          const target = fromP.neighbors
            .map(id => state.provinces[id])
            .find(p => p.nation === 'valoria');

          if (target && fromP.garrison - 1 >= target.garrison) {
            const marching = fromP.garrison - 1;
            fromP.garrison = 1;

            const battle = resolveSiegeCombat(state, marching, target.garrison, 1, target.isCapital ? 2 : 1);
            if (battle.attackerWon) {
              target.nation = nation;
              target.garrison = battle.attackerSurviving;
              state.warScore[nation] -= 25;
              state.history.push(`${nation.toUpperCase()} army stormed and captured ${target.name}!`);
            } else {
              target.garrison = battle.defenderSurviving;
              state.history.push(`Valorian defenders repelled ${nation.toUpperCase()} assault on ${target.name}.`);
            }
            break;
          }
        }
      }
    }
  }
}

function checkDominionWin(state) {
  let valoriaCount = 0;
  for (let i = 0; i < state.provinces.length; i++) {
    if (state.provinces[i].nation === 'valoria') valoriaCount++;
  }

  // 1. Dominion Victory: 8 or more provinces
  if (valoriaCount >= 8) {
    state.done = true;
    state.winner = 'player';
    state.result = 'dominion_victory';
    state.history.push('Continental Dominion Victory! All of Valoria crowns you Grand Sovereign.');
    return;
  }

  // 2. Hegemonic Alliance: all 3 realms are allies
  const allies = Object.values(state.diplomacy).filter(status => status === 'ally');
  if (allies.length === 3) {
    state.done = true;
    state.winner = 'player';
    state.result = 'hegemony_victory';
    state.history.push('Grand Hegemonic Alliance! The continent enjoys supreme diplomatic concord.');
    return;
  }

  // Defeat conditions: loss of Capital (Valoria City) or 0 provinces
  const capital = state.provinces.find(p => p.id === 0);
  if (capital.nation !== 'valoria' || valoriaCount === 0) {
    state.done = true;
    state.winner = 'enemy';
    state.result = 'defeat';
    state.history.push('Catastrophic Fall! The Capital Valoria City has fallen to foreign subjugation.');
  }
}

function evaluateEraConclusion(state) {
  state.done = true;
  let valoriaCount = 0;
  for (let i = 0; i < state.provinces.length; i++) {
    if (state.provinces[i].nation === 'valoria') valoriaCount++;
  }

  if (valoriaCount >= 4) {
    state.winner = 'player';
    state.result = 'victory';
    state.history.push('Era concluded in 1425. Valoria emerges as the predominant continental power.');
  } else {
    state.winner = 'enemy';
    state.result = 'defeat';
    state.history.push('Era concluded. Valoria was marginalized by neighboring empires.');
  }
}

function isOver(state) {
  return state.done;
}

function score(state) {
  let provCount = 0;
  let totalGarrison = 0;

  for (let i = 0; i < state.provinces.length; i++) {
    if (state.provinces[i].nation === 'valoria') {
      provCount++;
      totalGarrison += state.provinces[i].garrison;
    }
  }

  let s = (provCount * 120) + (totalGarrison * 10) + (state.gold * 1.5) + (state.stability * 2);
  if (state.winner === 'player') s += 500;
  s -= (state.turn - 1) * 5;

  return Math.max(0, Math.round(s));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    CONTINENTAL_PROVINCES,
    START_YEAR,
    MAX_TURNS
  };
}
