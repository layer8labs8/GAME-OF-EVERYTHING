// Pure deterministic simulation logic for 0099-diplomacy (Diplomacy)

const MAX_SEASONS = 16;

const PROVINCES = {
  london:   { id: 'london', name: 'London', type: 'coastal', sc: true, owner: 'britain', adj: ['channel', 'northsea'], x: 120, y: 100 },
  paris:    { id: 'paris', name: 'Paris', type: 'inland', sc: true, owner: 'france', adj: ['brest', 'burgundy', 'belgium'], x: 180, y: 320 },
  brest:    { id: 'brest', name: 'Brest', type: 'coastal', sc: true, owner: 'france', adj: ['paris', 'channel', 'burgundy'], x: 60, y: 320 },
  berlin:   { id: 'berlin', name: 'Berlin', type: 'inland', sc: true, owner: 'prussia', adj: ['ruhr', 'burgundy'], x: 400, y: 220 },
  belgium:  { id: 'belgium', name: 'Belgium', type: 'coastal', sc: true, owner: 'neutral', adj: ['paris', 'burgundy', 'ruhr', 'channel', 'northsea'], x: 260, y: 200 },
  ruhr:     { id: 'ruhr', name: 'Ruhr', type: 'inland', sc: false, owner: 'prussia', adj: ['berlin', 'belgium', 'burgundy'], x: 330, y: 240 },
  burgundy: { id: 'burgundy', name: 'Burgundy', type: 'inland', sc: false, owner: 'neutral', adj: ['paris', 'brest', 'belgium', 'ruhr', 'berlin'], x: 250, y: 320 },
  channel:  { id: 'channel', name: 'Eng. Channel', type: 'sea', sc: false, owner: null, adj: ['london', 'brest', 'belgium', 'northsea'], x: 120, y: 210 },
  northsea: { id: 'northsea', name: 'North Sea', type: 'sea', sc: false, owner: null, adj: ['london', 'channel', 'belgium'], x: 260, y: 90 }
};

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

  // Deep clone province owners
  const scMap = {};
  for (const pid in PROVINCES) {
    if (PROVINCES[pid].sc) {
      scMap[pid] = PROVINCES[pid].owner;
    }
  }

  return {
    seed: numSeed,
    rngStep: 0,
    seasonIndex: 0, // 0 to 15 (Spring 1901 to Fall 1908)
    maxSeasons: MAX_SEASONS,
    supplyCenters: scMap,
    pacts: {
      britain: false,
      prussia: false
    },
    units: [
      // France (Player)
      { id: 'u_f_army', power: 'france', type: 'army', prov: 'paris', order: { type: 'hold' } },
      { id: 'u_f_fleet', power: 'france', type: 'fleet', prov: 'brest', order: { type: 'hold' } },

      // Britain (AI)
      { id: 'u_b_fleet1', power: 'britain', type: 'fleet', prov: 'london', order: { type: 'hold' } },
      { id: 'u_b_fleet2', power: 'britain', type: 'fleet', prov: 'channel', order: { type: 'hold' } },

      // Prussia (AI)
      { id: 'u_p_army1', power: 'prussia', type: 'army', prov: 'berlin', order: { type: 'hold' } },
      { id: 'u_p_army2', power: 'prussia', type: 'army', prov: 'ruhr', order: { type: 'hold' } }
    ],
    history: ['Spring 1901: European powers mobilize forces. Belgian territory remains uncontested.'],
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

function canUnitOccupy(unitType, targetProvId) {
  const prov = PROVINCES[targetProvId];
  if (!prov) return false;
  if (unitType === 'army') {
    return prov.type === 'inland' || prov.type === 'coastal';
  } else if (unitType === 'fleet') {
    return prov.type === 'sea' || prov.type === 'coastal';
  }
  return false;
}

function legalActions(state) {
  if (state.done) return [];
  const actions = [];
  const frenchUnits = state.units.filter(u => u.power === 'france');

  frenchUnits.forEach(u => {
    // 1. Hold
    actions.push(`order_hold:${u.id}`);

    // 2. Move to adjacent valid provinces
    const curProv = PROVINCES[u.prov];
    curProv.adj.forEach(targetId => {
      if (canUnitOccupy(u.type, targetId)) {
        actions.push(`order_move:${u.id}:${targetId}`);
      }
    });

    // 3. Support Hold adjacent unit
    state.units.forEach(other => {
      if (other.id !== u.id && curProv.adj.includes(other.prov)) {
        actions.push(`order_support_hold:${u.id}:${other.id}`);
      }
    });

    // 4. Support Move into adjacent province that u can reach
    curProv.adj.forEach(targetId => {
      if (canUnitOccupy(u.type, targetId)) {
        state.units.forEach(movingUnit => {
          if (movingUnit.id !== u.id && movingUnit.prov !== targetId) {
            const movingProv = PROVINCES[movingUnit.prov];
            if (movingProv.adj.includes(targetId) && canUnitOccupy(movingUnit.type, targetId)) {
              actions.push(`order_support_move:${u.id}:${movingUnit.id}:${targetId}`);
            }
          }
        });
      }
    });
  });

  // Diplomatic Pacts (only if not already active)
  if (!state.pacts.britain) actions.push('pact:britain');
  if (!state.pacts.prussia) actions.push('pact:prussia');

  // Conclude seasonal orders
  actions.push('resolve_season');

  return actions;
}

function assignAiOrders(state) {
  const roll = getRngValue(state);

  // British Fleet AI
  const bF1 = state.units.find(u => u.id === 'u_b_fleet1');
  const bF2 = state.units.find(u => u.id === 'u_b_fleet2');

  if (bF1) {
    if (bF1.prov === 'london') {
      bF1.order = { type: 'move', target: 'northsea' };
    } else {
      bF1.order = { type: 'hold' };
    }
  }

  if (bF2) {
    if (state.pacts.britain) {
      // Honors pact: attacks Belgium or supports French entry
      bF2.order = { type: 'move', target: 'belgium' };
    } else {
      // 50% chance to raid Brest or move to Belgium
      bF2.order = (roll < 0.5) ? { type: 'move', target: 'belgium' } : { type: 'move', target: 'brest' };
    }
  }

  // Prussian Army AI
  const pA1 = state.units.find(u => u.id === 'u_p_army1');
  const pA2 = state.units.find(u => u.id === 'u_p_army2');

  if (pA2) {
    if (state.pacts.prussia) {
      // Moves to Belgium or supports Prussian thrust
      pA2.order = { type: 'move', target: 'belgium' };
    } else {
      // May probe Burgundy or Belgium
      pA2.order = (roll < 0.6) ? { type: 'move', target: 'belgium' } : { type: 'move', target: 'burgundy' };
    }
  }

  if (pA1) {
    if (pA1.prov === 'berlin') {
      pA1.order = { type: 'move', target: 'ruhr' };
    } else {
      pA1.order = { type: 'hold' };
    }
  }
}

function resolveSimultaneousSeason(state) {
  // Step 1: Assign AI orders
  assignAiOrders(state);

  const units = state.units;

  // Step 2: Cut supports
  // A support order is cut if the supporting unit is attacked by any unit from an unrelated province
  units.forEach(supporter => {
    if (supporter.order.type === 'support_hold' || supporter.order.type === 'support_move') {
      // Check if any hostile unit moves into supporter's province
      const isAttacked = units.some(attacker => {
        if (attacker.id === supporter.id) return false;
        if (attacker.order.type === 'move' && attacker.order.target === supporter.prov) {
          // If supporter was supporting an attack on the attacker's province, support is not cut (standard Diplomacy rule)
          if (supporter.order.type === 'support_move' && supporter.order.targetProv === attacker.prov) {
            return false;
          }
          return true;
        }
        return false;
      });

      if (isAttacked) {
        state.history.push(`${supporter.power.toUpperCase()} support from ${supporter.prov} was CUT by enemy attack!`);
        supporter.order = { type: 'hold' };
      }
    }
  });

  // Step 3: Calculate strengths for each destination province
  const incomingMoves = {}; // provId -> array of { unit, strength }
  const stationaryUnits = {}; // provId -> { unit, strength }

  units.forEach(u => {
    if (u.order.type === 'move') {
      const dest = u.order.target;
      if (!incomingMoves[dest]) incomingMoves[dest] = [];

      // Base move strength is 1 + supporting moves
      let str = 1;
      units.forEach(s => {
        if (s.order.type === 'support_move' && s.order.targetUnitId === u.id && s.order.targetProv === dest) {
          str += 1;
        }
      });
      incomingMoves[dest].push({ unit: u, strength: str });
    } else {
      // Holding or supporting (which holds defensively)
      let str = 1;
      units.forEach(s => {
        if (s.order.type === 'support_hold' && s.order.targetUnitId === u.id) {
          str += 1;
        }
      });
      stationaryUnits[u.prov] = { unit: u, strength: str };
    }
  });

  // Step 4: Resolve each destination
  const successfulMoves = [];
  const dislodgedUnits = [];

  for (const provId in incomingMoves) {
    const moves = incomingMoves[provId];
    moves.sort((a, b) => b.strength - a.strength);

    const bestMove = moves[0];
    const runnerUpStr = moves.length > 1 ? moves[1].strength : 0;

    const defender = stationaryUnits[provId];

    if (bestMove.strength > runnerUpStr) {
      // Top mover beats other movers
      if (!defender) {
        // Unoccupied province
        successfulMoves.push(bestMove.unit);
      } else if (bestMove.strength > defender.strength) {
        // Dislodges holding defender
        successfulMoves.push(bestMove.unit);
        dislodgedUnits.push(defender.unit);
      } else {
        // Bounced by defender
        state.history.push(`${bestMove.unit.power.toUpperCase()} move to ${provId} bounced by ${defender.unit.power.toUpperCase()} defense (${bestMove.strength} vs ${defender.strength}).`);
      }
    } else {
      // Stand-off / Bounce among equal attackers
      state.history.push(`Stand-off at ${provId}! Forces bounced with equal strength ${bestMove.strength}.`);
    }
  }

  // Step 5: Execute successful moves
  successfulMoves.forEach(u => {
    const oldProv = u.prov;
    u.prov = u.order.target;
    state.history.push(`${u.power.toUpperCase()} successfully advanced into ${u.prov} from ${oldProv}.`);
  });

  // Step 6: Handle dislodged defenders
  dislodgedUnits.forEach(du => {
    // Attempt retreat to adjacent empty province
    const curP = PROVINCES[du.prov];
    const occupied = units.map(u => u.prov);
    const retreatOptions = curP.adj.filter(adjId => !occupied.includes(adjId) && canUnitOccupy(du.type, adjId));

    if (retreatOptions.length > 0) {
      du.prov = retreatOptions[0];
      state.history.push(`${du.power.toUpperCase()} unit was dislodged and retreated to ${du.prov}.`);
    } else {
      // Trapped and disbanded
      state.history.push(`${du.power.toUpperCase()} unit at ${du.prov} was dislodged with no retreat and disbanded!`);
      const idx = state.units.indexOf(du);
      if (idx !== -1) state.units.splice(idx, 1);
    }
  });

  // Reset all unit orders to hold
  state.units.forEach(u => {
    u.order = { type: 'hold' };
  });

  // Step 7: Fall Adjustments for Supply Centers
  const isFall = (state.seasonIndex % 2 === 1);
  if (isFall) {
    state.units.forEach(u => {
      const p = PROVINCES[u.prov];
      if (p && p.sc && state.supplyCenters[u.prov] !== u.power) {
        state.supplyCenters[u.prov] = u.power;
        state.history.push(`${u.power.toUpperCase()} secured Supply Center in ${p.name}!`);
      }
    });
  }

  // Advance season
  state.seasonIndex += 1;

  // Evaluate victory/defeat
  evaluateGameOutcome(state);
}

function evaluateGameOutcome(state) {
  // French SCs count
  let frenchScs = 0;
  let britishScs = 0;
  let prussianScs = 0;

  for (const sc in state.supplyCenters) {
    const owner = state.supplyCenters[sc];
    if (owner === 'france') frenchScs += 1;
    else if (owner === 'britain') britishScs += 1;
    else if (owner === 'prussia') prussianScs += 1;
  }

  const frenchUnits = state.units.filter(u => u.power === 'france');

  // Dominance: 3 out of 5 SCs
  if (frenchScs >= 3) {
    state.done = true;
    state.winner = 'france';
    state.result = 'continental_dominance';
    state.history.push('DIPLOMATIC TRIUMPH! France achieves hegemony over Western Europe.');
    return;
  }

  if (britishScs >= 3 || prussianScs >= 3) {
    state.done = true;
    state.winner = britishScs >= 3 ? 'britain' : 'prussia';
    state.result = 'foreign_hegemony';
    state.history.push('MISSION FAILED! A rival coalition has seized continental hegemony.');
    return;
  }

  // Defeat if Paris lost or French army wiped out
  if (state.supplyCenters['paris'] !== 'france' || frenchUnits.length === 0) {
    state.done = true;
    state.winner = 'rivals';
    state.result = 'capital_lost';
    state.history.push('COLLAPSE! Paris fell to foreign powers or French forces were destroyed.');
    return;
  }

  if (state.seasonIndex >= state.maxSeasons) {
    state.done = true;
    if (frenchScs > britishScs && frenchScs > prussianScs) {
      state.winner = 'france';
      state.result = 'majority_sc';
      state.history.push('DIPLOMATIC VICTORY! France holds the greatest balance of power.');
    } else {
      state.winner = 'rivals';
      state.result = 'stalemate';
      state.history.push('STALEMATE! Balance of power dissolved into European deadlock.');
    }
  }
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

  if (action.startsWith('order_hold:')) {
    const uid = action.split(':')[1];
    const u = state.units.find(un => un.id === uid);
    u.order = { type: 'hold' };
    reward += 1;
  } else if (action.startsWith('order_move:')) {
    const parts = action.split(':');
    const uid = parts[1];
    const targetProv = parts[2];
    const u = state.units.find(un => un.id === uid);
    u.order = { type: 'move', target: targetProv };
    reward += 1;
  } else if (action.startsWith('order_support_hold:')) {
    const parts = action.split(':');
    const uid = parts[1];
    const targetUnitId = parts[2];
    const u = state.units.find(un => un.id === uid);
    u.order = { type: 'support_hold', targetUnitId };
    reward += 2;
  } else if (action.startsWith('order_support_move:')) {
    const parts = action.split(':');
    const uid = parts[1];
    const targetUnitId = parts[2];
    const targetProv = parts[3];
    const u = state.units.find(un => un.id === uid);
    u.order = { type: 'support_move', targetUnitId, targetProv };
    reward += 3;
  } else if (action.startsWith('pact:')) {
    const power = action.split(':')[1];
    state.pacts[power] = true;
    state.history.push(`DIPLOMATIC TREATY: France signed a Non-Aggression Pact with ${power.toUpperCase()}.`);
    reward += 5;
  } else if (action === 'resolve_season') {
    resolveSimultaneousSeason(state);
    reward += 10;
  }

  if (state.done) {
    if (state.winner === 'france') reward += 100;
    else reward -= 50;
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  let scs = 0;
  for (const p in state.supplyCenters) {
    if (state.supplyCenters[p] === 'france') scs += 1;
  }
  const units = state.units.filter(u => u.power === 'france').length;
  let total = scs * 50 + units * 25 + (state.pacts.britain ? 15 : 0) + (state.pacts.prussia ? 15 : 0);
  if (state.winner === 'france') total += 150;
  return total;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    PROVINCES,
    canUnitOccupy
  };
}
