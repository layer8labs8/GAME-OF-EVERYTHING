// Pure deterministic simulation logic for 0089-strategy (Territory Strategy)

const MAX_TURNS = 30;
const RECRUIT_COST = 2;

const MAP_NODES = [
  { id: 0, name: 'Nordmark', neighbors: [1, 3], income: 1, x: 120, y: 110 },
  { id: 1, name: 'Frostpeak', neighbors: [0, 2, 4], income: 1, x: 240, y: 90 },
  { id: 2, name: 'Sunhaven', neighbors: [1, 5], income: 1, x: 360, y: 110 },
  { id: 3, name: 'Ironhold', neighbors: [0, 4, 6], income: 1, x: 100, y: 240 },
  { id: 4, name: 'Crownland', neighbors: [1, 3, 5, 7], income: 3, x: 240, y: 230 },
  { id: 5, name: 'Goldcoast', neighbors: [2, 4, 8], income: 1, x: 380, y: 240 },
  { id: 6, name: 'Shadowfen', neighbors: [3, 7], income: 1, x: 120, y: 370 },
  { id: 7, name: 'Verdantia', neighbors: [4, 6, 8], income: 1, x: 240, y: 390 },
  { id: 8, name: 'Emberfall', neighbors: [5, 7], income: 1, x: 360, y: 370 }
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
  const territories = MAP_NODES.map(node => {
    let owner = 'neutral';
    let armies = 2;

    if (node.id === 3) {
      owner = 'player';
      armies = 5;
    } else if (node.id === 6) {
      owner = 'player';
      armies = 4;
    } else if (node.id === 2) {
      owner = 'enemy';
      armies = 4;
    } else if (node.id === 5) {
      owner = 'enemy';
      armies = 5;
    } else if (node.id === 4) {
      owner = 'neutral';
      armies = 4; // Capital citadel
    } else if (node.id === 1 || node.id === 7) {
      owner = 'neutral';
      armies = 3;
    }

    return {
      id: node.id,
      name: node.name,
      owner,
      armies,
      income: node.income,
      neighbors: [...node.neighbors],
      x: node.x,
      y: node.y
    };
  });

  return {
    seed: numSeed,
    rngStep: 0,
    turn: 1,
    maxTurns: MAX_TURNS,
    gold: 6,
    enemyGold: 6,
    territories,
    history: ['Territory campaign begun. Deploy battalions and seize provinces.'],
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

function calculateIncome(territories, faction) {
  let sum = 0;
  for (let i = 0; i < territories.length; i++) {
    if (territories[i].owner === faction) {
      sum += territories[i].income;
    }
  }
  return sum;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  // 1. Recruitment actions if affordable
  if (state.gold >= RECRUIT_COST) {
    for (let i = 0; i < state.territories.length; i++) {
      const t = state.territories[i];
      if (t.owner === 'player') {
        actions.push(`recruit:${t.id}`);
      }
    }
  }

  // 2. Attack / Reinforce actions from player territories with armies > 1
  for (let i = 0; i < state.territories.length; i++) {
    const t = state.territories[i];
    if (t.owner === 'player' && t.armies > 1) {
      for (let n = 0; n < t.neighbors.length; n++) {
        const targetId = t.neighbors[n];
        actions.push(`attack:${t.id}:${targetId}`);
      }
    }
  }

  // 3. End turn is always legal to advance
  actions.push('end_turn');

  return actions;
}

function resolveBattle(state, attackerArmies, defenderArmies, isPlayerAttacking) {
  let a = attackerArmies;
  let d = defenderArmies;

  while (a > 0 && d > 0) {
    const rollA = Math.floor(getRngValue(state) * 6) + 1;
    // Fort defense advantage: +1 to roll
    const rollD = Math.floor(getRngValue(state) * 6) + 2;

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

  if (action.startsWith('recruit:')) {
    const tid = parseInt(action.split(':')[1], 10);
    const terr = state.territories.find(t => t.id === tid);
    state.gold -= RECRUIT_COST;
    terr.armies += 1;
    reward = 2;
    state.history.push(`Recruited 1 battalion to ${terr.name}.`);
  } else if (action.startsWith('attack:')) {
    const parts = action.split(':');
    const fromId = parseInt(parts[1], 10);
    const toId = parseInt(parts[2], 10);

    const fromTerr = state.territories.find(t => t.id === fromId);
    const toTerr = state.territories.find(t => t.id === toId);

    const marching = fromTerr.armies - 1;
    fromTerr.armies = 1;

    if (toTerr.owner === 'player') {
      toTerr.armies += marching;
      state.history.push(`Reinforced ${toTerr.name} with ${marching} battalions.`);
      reward = 1;
    } else {
      const defenderOwner = toTerr.owner;
      const battle = resolveBattle(state, marching, toTerr.armies, true);

      if (battle.attackerWon) {
        toTerr.owner = 'player';
        toTerr.armies = battle.attackerSurviving;
        reward = defenderOwner === 'enemy' ? 25 : 12;
        state.history.push(`Conquered ${toTerr.name}! ${battle.attackerSurviving} battalions secured the fortress.`);
      } else {
        toTerr.armies = battle.defenderSurviving;
        reward = -5;
        state.history.push(`Assault on ${toTerr.name} failed. Defenders hold fortress with ${battle.defenderSurviving} troops.`);
      }
    }

    checkFactionDefeat(state);
  } else if (action === 'end_turn') {
    // 1. Collect player revenue
    const playerInc = calculateIncome(state.territories, 'player');
    state.gold += playerInc;

    // 2. Collect enemy revenue
    const enemyInc = calculateIncome(state.territories, 'enemy');
    state.enemyGold += enemyInc;

    // 3. Enemy AI turn
    runEnemyAi(state);

    // 4. Advance turn counter and check completion
    checkFactionDefeat(state);

    if (!state.done) {
      state.turn += 1;
      if (state.turn > state.maxTurns) {
        evaluateMaxTurnConclusion(state);
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

function runEnemyAi(state) {
  // Recruitment: invest enemy gold into friendly territories
  while (state.enemyGold >= RECRUIT_COST) {
    const enemyTerrs = state.territories.filter(t => t.owner === 'enemy');
    if (enemyTerrs.length === 0) break;

    // Prioritize territory with lowest armies
    enemyTerrs.sort((a, b) => a.armies - b.armies);
    enemyTerrs[0].armies += 1;
    state.enemyGold -= RECRUIT_COST;
  }

  // Attack phase: find aggressive maneuvers
  const enemyTerrsWithArmies = state.territories.filter(t => t.owner === 'enemy' && t.armies > 2);
  for (let i = 0; i < enemyTerrsWithArmies.length; i++) {
    const fromTerr = enemyTerrsWithArmies[i];
    if (fromTerr.armies <= 2) continue;

    // Find hostile neighbor
    const targets = fromTerr.neighbors
      .map(id => state.territories.find(t => t.id === id))
      .filter(t => t.owner !== 'enemy');

    if (targets.length === 0) continue;

    // Pick target: prefer player territory or lower defense
    targets.sort((a, b) => {
      if (a.owner === 'player' && b.owner !== 'player') return -1;
      if (b.owner === 'player' && a.owner !== 'player') return 1;
      return a.armies - b.armies;
    });

    const chosen = targets[0];
    const marching = fromTerr.armies - 1;
    if (marching >= chosen.armies) {
      fromTerr.armies = 1;
      const battle = resolveBattle(state, marching, chosen.armies, false);

      if (battle.attackerWon) {
        chosen.owner = 'enemy';
        chosen.armies = battle.attackerSurviving;
        state.history.push(`Enemy conquered ${chosen.name} with ${battle.attackerSurviving} remaining battalions.`);
      } else {
        chosen.armies = battle.defenderSurviving;
        state.history.push(`Enemy assault on ${chosen.name} was repelled.`);
      }
    }
  }
}

function checkFactionDefeat(state) {
  let playerTerrs = 0;
  let enemyTerrs = 0;

  for (let i = 0; i < state.territories.length; i++) {
    if (state.territories[i].owner === 'player') playerTerrs++;
    if (state.territories[i].owner === 'enemy') enemyTerrs++;
  }

  if (enemyTerrs === 0 || playerTerrs === state.territories.length) {
    state.done = true;
    state.winner = 'player';
    state.result = 'victory';
    state.history.push('Glorious victory! The realm is united under your banner.');
  } else if (playerTerrs === 0 || enemyTerrs === state.territories.length) {
    state.done = true;
    state.winner = 'enemy';
    state.result = 'defeat';
    state.history.push('Defeat! The enemy empire conquered your strongholds.');
  }
}

function evaluateMaxTurnConclusion(state) {
  state.done = true;
  let playerTerrs = 0;
  let enemyTerrs = 0;
  let playerArmies = 0;
  let enemyArmies = 0;

  for (let i = 0; i < state.territories.length; i++) {
    const t = state.territories[i];
    if (t.owner === 'player') {
      playerTerrs++;
      playerArmies += t.armies;
    } else if (t.owner === 'enemy') {
      enemyTerrs++;
      enemyArmies += t.armies;
    }
  }

  if (playerTerrs > enemyTerrs || (playerTerrs === enemyTerrs && playerArmies >= enemyArmies)) {
    state.winner = 'player';
    state.result = 'victory';
    state.history.push('Campaign ended. You control superior territorial dominion!');
  } else {
    state.winner = 'enemy';
    state.result = 'defeat';
    state.history.push('Campaign ended. Enemy forces hold dominion.');
  }
}

function isOver(state) {
  return state.done;
}

function score(state) {
  let playerTerrs = 0;
  let playerArmies = 0;

  for (let i = 0; i < state.territories.length; i++) {
    const t = state.territories[i];
    if (t.owner === 'player') {
      playerTerrs++;
      playerArmies += t.armies;
    }
  }

  let s = (playerTerrs * 150) + (playerArmies * 15) + (state.gold * 2);
  if (state.winner === 'player') {
    s += 500;
  }
  s -= (state.turn - 1) * 5;

  return Math.max(0, s);
}

// Module export for Node environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    MAP_NODES,
    MAX_TURNS,
    RECRUIT_COST
  };
}
