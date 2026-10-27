// Pure deterministic simulation logic for 0098-wargame (Operational Wargame)

const MAX_TURNS = 20;
const ROWS = 5;
const COLS = 5;

// Hex neighbors in odd-r / even-r offset coordinate system
function getHexNeighbors(r, c) {
  const isEven = (r % 2 === 0);
  const deltas = isEven ? [
    [-1, -1], [-1, 0],
    [0, -1],          [0, 1],
    [1, -1],  [1, 0]
  ] : [
    [-1, 0],  [-1, 1],
    [0, -1],          [0, 1],
    [1, 0],   [1, 1]
  ];

  const results = [];
  for (let i = 0; i < deltas.length; i++) {
    const nr = r + deltas[i][0];
    const nc = c + deltas[i][1];
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
      results.push({ r: nr, c: nc });
    }
  }
  return results;
}

function hexDist(r1, c1, r2, c2) {
  // Manhattan approx on hex grid for range check
  const dr = Math.abs(r1 - r2);
  const dc = Math.abs(c1 - c2);
  return Math.max(dr, dc + Math.floor(dr / 2));
}

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x6d2b79f5, 1) + 1) >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getTerrain(r, c) {
  if (r === 2 && c === 2) return { type: 'city', def: 2, name: 'Bastion Central' };
  if ((r === 1 && c === 1) || (r === 1 && c === 3) || (r === 3 && c === 1) || (r === 3 && c === 3)) {
    return { type: 'forest', def: 1, name: 'Ardennes Woods' };
  }
  if ((r === 2 && c === 0) || (r === 2 && c === 4)) {
    return { type: 'depot', def: 1, name: 'Supply Depot' };
  }
  return { type: 'plains', def: 0, name: 'Open Plains' };
}

function createState(seed = 12345) {
  const numSeed = typeof seed === 'number' ? seed : 12345;

  const state = {
    seed: numSeed,
    rngStep: 0,
    turn: 1,
    maxTurns: MAX_TURNS,
    hqs: {
      blue: { r: 0, c: 2 },
      red: { r: 4, c: 2 }
    },
    depots: [
      { id: 'depot_w', r: 2, c: 0, owner: 'neutral' },
      { id: 'depot_e', r: 2, c: 4, owner: 'neutral' }
    ],
    units: [
      // Blue Player Units
      { id: 'u_b_armor', side: 'blue', type: 'armor', name: '1st Armored Div', strength: 10, maxStrength: 10, mp: 3, maxMp: 3, r: 0, c: 1, entrenched: 0, inSupply: true, moved: false, attacked: false },
      { id: 'u_b_inf', side: 'blue', type: 'infantry', name: '3rd Infantry Div', strength: 8, maxStrength: 8, mp: 2, maxMp: 2, r: 0, c: 2, entrenched: 1, inSupply: true, moved: false, attacked: false },
      { id: 'u_b_arty', side: 'blue', type: 'artillery', name: '7th Artillery Reg', strength: 6, maxStrength: 6, mp: 1, maxMp: 1, r: 0, c: 3, entrenched: 0, inSupply: true, moved: false, attacked: false },
      { id: 'u_b_recon', side: 'blue', type: 'recon', name: '4th Recon Mech', strength: 5, maxStrength: 5, mp: 4, maxMp: 4, r: 1, c: 2, entrenched: 0, inSupply: true, moved: false, attacked: false },

      // Red AI Units
      { id: 'u_r_armor', side: 'red', type: 'armor', name: 'Red Panzer Div', strength: 10, maxStrength: 10, mp: 3, maxMp: 3, r: 4, c: 3, entrenched: 0, inSupply: true, moved: false, attacked: false },
      { id: 'u_r_inf', side: 'red', type: 'infantry', name: 'Red Rifle Div', strength: 8, maxStrength: 8, mp: 2, maxMp: 2, r: 4, c: 2, entrenched: 1, inSupply: true, moved: false, attacked: false },
      { id: 'u_r_arty', side: 'red', type: 'artillery', name: 'Red Heavy Arty', strength: 6, maxStrength: 6, mp: 1, maxMp: 1, r: 4, c: 1, entrenched: 0, inSupply: true, moved: false, attacked: false },
      { id: 'u_r_recon', side: 'red', type: 'recon', name: 'Red Scout Mech', strength: 5, maxStrength: 5, mp: 4, maxMp: 4, r: 3, c: 2, entrenched: 0, inSupply: true, moved: false, attacked: false }
    ],
    history: ['Operational theater open. Blue forces staged at Northern Front.'],
    winner: null,
    result: null,
    done: false
  };

  updateSupply(state);
  return state;
}

function getRngValue(state) {
  state.rngStep = (state.rngStep + 1) | 0;
  const rng = createRng(state.seed + state.rngStep);
  return rng();
}

function updateSupply(state) {
  // Tracing supply lines from friendly HQ / captured Depots
  ['blue', 'red'].forEach(side => {
    const hq = state.hqs[side];
    const supplySources = [{ r: hq.r, c: hq.c }];

    state.depots.forEach(d => {
      if (d.owner === side) supplySources.push({ r: d.r, c: d.c });
    });

    // BFS to find all supplied hexes for this side
    const suppliedHexes = new Set();
    const queue = [];

    supplySources.forEach(s => {
      const key = `${s.r},${s.c}`;
      suppliedHexes.add(key);
      queue.push(s);
    });

    while (queue.length > 0) {
      const curr = queue.shift();
      const nbs = getHexNeighbors(curr.r, curr.c);
      for (let i = 0; i < nbs.length; i++) {
        const nb = nbs[i];
        const nKey = `${nb.r},${nb.c}`;
        if (!suppliedHexes.has(nKey)) {
          // Can trace through hex unless blocked by enemy unit
          const blockingEnemy = state.units.some(u => u.side !== side && u.strength > 0 && u.r === nb.r && u.c === nb.c);
          if (!blockingEnemy) {
            suppliedHexes.add(nKey);
            queue.push(nb);
          }
        }
      }
    }

    state.units.filter(u => u.side === side && u.strength > 0).forEach(u => {
      u.inSupply = suppliedHexes.has(`${u.r},${u.c}`);
    });
  });
}

function legalActions(state) {
  if (state.done) return [];
  const actions = [];
  const blueUnits = state.units.filter(u => u.side === 'blue' && u.strength > 0);
  const redUnits = state.units.filter(u => u.side === 'red' && u.strength > 0);

  for (let i = 0; i < blueUnits.length; i++) {
    const u = blueUnits[i];

    // 1. Move to adjacent hexes if MP > 0 and not moved
    if (u.mp > 0 && !u.moved) {
      const nbs = getHexNeighbors(u.r, u.c);
      for (let j = 0; j < nbs.length; j++) {
        const nb = nbs[j];
        // Cannot move into hex occupied by any unit
        const occupied = state.units.some(ou => ou.strength > 0 && ou.r === nb.r && ou.c === nb.c);
        if (!occupied) {
          actions.push(`move:${u.id}:${nb.r},${nb.c}`);
        }
      }
    }

    // 2. Attack adjacent enemy if not attacked
    if (!u.attacked) {
      const nbs = getHexNeighbors(u.r, u.c);
      for (let j = 0; j < nbs.length; j++) {
        const nb = nbs[j];
        const target = redUnits.find(ru => ru.r === nb.r && ru.c === nb.c);
        if (target) {
          actions.push(`attack:${u.id}:${nb.r},${nb.c}`);
        }
      }
    }

    // 3. Artillery bombardment within range 3
    if (u.type === 'artillery' && !u.attacked) {
      for (let j = 0; j < redUnits.length; j++) {
        const ru = redUnits[j];
        const dist = hexDist(u.r, u.c, ru.r, ru.c);
        if (dist >= 1 && dist <= 3) {
          actions.push(`bombard:${u.id}:${ru.r},${ru.c}`);
        }
      }
    }

    // 4. Entrench unit if hasn't acted and entrenchment < 3
    if (!u.moved && !u.attacked && u.entrenched < 3) {
      actions.push(`entrench:${u.id}`);
    }

    // 5. Resupply unit if in supply and damaged
    if (!u.moved && !u.attacked && u.inSupply && u.strength < u.maxStrength) {
      actions.push(`resupply:${u.id}`);
    }
  }

  // Always can conclude operational phase
  actions.push('end_turn');

  return actions;
}

function resolveCombat(state, attacker, defender) {
  const terrain = getTerrain(defender.r, defender.c);

  // Effective Combat Strengths
  let atkPower = attacker.strength * (attacker.inSupply ? 1.0 : 0.5);
  if (attacker.type === 'armor') atkPower *= 1.25;

  let defPower = defender.strength * (defender.inSupply ? 1.0 : 0.5);
  defPower *= (1.0 + terrain.def * 0.25 + defender.entrenched * 0.25);
  if (attacker.type === 'armor' && defender.entrenched > 0) {
    // Armor partially negates entrenchment
    defPower *= 0.85;
  }

  const odds = atkPower / Math.max(0.1, defPower);
  const roll = getRngValue(state);

  let atkLoss = 0;
  let defLoss = 0;
  let retreat = false;

  if (odds >= 2.0) {
    // Overwhelming advantage
    defLoss = Math.floor(4 + roll * 2);
    atkLoss = Math.floor(1 + roll);
    retreat = true;
  } else if (odds >= 1.2) {
    // Substantial advantage
    defLoss = Math.floor(3 + roll * 2);
    atkLoss = Math.floor(2 + roll);
    retreat = (roll > 0.4);
  } else if (odds >= 0.8) {
    // Even contest
    defLoss = Math.floor(2 + roll * 2);
    atkLoss = Math.floor(2 + roll * 2);
    retreat = (roll > 0.7);
  } else {
    // Unfavorable odds
    defLoss = Math.floor(1 + roll);
    atkLoss = Math.floor(3 + roll * 2);
    retreat = false;
  }

  defender.strength = Math.max(0, defender.strength - defLoss);
  attacker.strength = Math.max(0, attacker.strength - atkLoss);
  defender.entrenched = Math.max(0, defender.entrenched - 1);

  let msg = `${attacker.name} attacked ${defender.name} (Odds ${(odds).toFixed(1)}:1). Inflicted -${defLoss}, took -${atkLoss}.`;

  if (defender.strength <= 0) {
    msg += ` ${defender.name} was wiped out!`;
  } else if (retreat) {
    // Attempt retreat to vacant adjacent hex
    const nbs = getHexNeighbors(defender.r, defender.c);
    const freeNb = nbs.find(nb => !state.units.some(u => u.strength > 0 && u.r === nb.r && u.c === nb.c));
    if (freeNb) {
      defender.r = freeNb.r;
      defender.c = freeNb.c;
      defender.entrenched = 0;
      msg += ` ${defender.name} retreated to (${defender.r}, ${defender.c})!`;
    }
  }

  state.history.push(msg);
}

function runEnemyTurn(state) {
  const redUnits = state.units.filter(u => u.side === 'red' && u.strength > 0);
  const blueUnits = state.units.filter(u => u.side === 'blue' && u.strength > 0);

  if (redUnits.length === 0 || blueUnits.length === 0) return;

  for (let i = 0; i < redUnits.length; i++) {
    const ru = redUnits[i];

    // Check artillery bombardment within range 3
    if (ru.type === 'artillery') {
      const target = blueUnits.find(bu => hexDist(ru.r, ru.c, bu.r, bu.c) <= 3);
      if (target) {
        const dmg = 2;
        target.strength = Math.max(0, target.strength - dmg);
        target.entrenched = Math.max(0, target.entrenched - 1);
        state.history.push(`${ru.name} bombarded ${target.name} for -${dmg} str.`);
        continue;
      }
    }

    // Check adjacent attack
    const adjBlue = blueUnits.find(bu => {
      const nbs = getHexNeighbors(ru.r, ru.c);
      return nbs.some(nb => nb.r === bu.r && nb.c === bu.c);
    });

    if (adjBlue) {
      resolveCombat(state, ru, adjBlue);
      continue;
    }

    // Move toward Blue HQ (0, 2) or nearest Blue unit
    const targetHex = blueUnits[0] ? { r: blueUnits[0].r, c: blueUnits[0].c } : state.hqs.blue;
    const nbs = getHexNeighbors(ru.r, ru.c);
    const validNbs = nbs.filter(nb => !state.units.some(u => u.strength > 0 && u.r === nb.r && u.c === nb.c));

    if (validNbs.length > 0) {
      // Pick neighbor closest to targetHex
      validNbs.sort((a, b) => hexDist(a.r, a.c, targetHex.r, targetHex.c) - hexDist(b.r, b.c, targetHex.r, targetHex.c));
      const best = validNbs[0];
      if (hexDist(best.r, best.c, targetHex.r, targetHex.c) < hexDist(ru.r, ru.c, targetHex.r, targetHex.c)) {
        ru.r = best.r;
        ru.c = best.c;
      } else if (ru.entrenched < 3) {
        ru.entrenched += 1;
      }
    } else if (ru.entrenched < 3) {
      ru.entrenched += 1;
    }
  }
}

function checkDepotControl(state) {
  state.depots.forEach(d => {
    const unitHere = state.units.find(u => u.strength > 0 && u.r === d.r && u.c === d.c);
    if (unitHere) {
      if (d.owner !== unitHere.side) {
        d.owner = unitHere.side;
        state.history.push(`${unitHere.name} secured ${d.id === 'depot_w' ? 'West' : 'East'} Supply Depot for ${unitHere.side.toUpperCase()}!`);
      }
    }
  });
}

function evaluateGameOver(state) {
  const blueUnits = state.units.filter(u => u.side === 'blue' && u.strength > 0);
  const redUnits = state.units.filter(u => u.side === 'red' && u.strength > 0);

  // Check HQ capture
  const redHqCaptured = state.units.some(u => u.side === 'blue' && u.strength > 0 && u.r === state.hqs.red.r && u.c === state.hqs.red.c);
  const blueHqCaptured = state.units.some(u => u.side === 'red' && u.strength > 0 && u.r === state.hqs.blue.r && u.c === state.hqs.blue.c);

  if (redHqCaptured || redUnits.length === 0) {
    state.done = true;
    state.winner = 'blue';
    state.result = redHqCaptured ? 'hq_captured' : 'total_annihilation';
    state.history.push('DECISIVE VICTORY! Blue command forces have crushed the hostile army.');
    return;
  }

  if (blueHqCaptured || blueUnits.length === 0) {
    state.done = true;
    state.winner = 'red';
    state.result = blueHqCaptured ? 'hq_lost' : 'annihilated';
    state.history.push('DEFEAT! Blue operations headquarters fell or divisions were wiped out.');
    return;
  }

  if (state.turn >= state.maxTurns) {
    state.done = true;
    // Compare total strength and depots
    const blueStr = blueUnits.reduce((acc, u) => acc + u.strength, 0);
    const redStr = redUnits.reduce((acc, u) => acc + u.strength, 0);
    const blueDepots = state.depots.filter(d => d.owner === 'blue').length;
    const redDepots = state.depots.filter(d => d.owner === 'red').length;

    const blueScore = blueStr + blueDepots * 10;
    const redScore = redStr + redDepots * 10;

    if (blueScore > redScore) {
      state.winner = 'blue';
      state.result = 'operational_supremacy';
      state.history.push('STRATEGIC VICTORY! Blue maintained operational supremacy.');
    } else {
      state.winner = 'red';
      state.result = 'stalemate_lost';
      state.history.push('CAMPAIGN FAILED! Operational initiative was lost.');
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

  if (action.startsWith('move:')) {
    const parts = action.split(':');
    const uid = parts[1];
    const coords = parts[2].split(',').map(Number);
    const unit = state.units.find(u => u.id === uid);

    unit.r = coords[0];
    unit.c = coords[1];
    unit.mp = Math.max(0, unit.mp - 1);
    unit.moved = true;
    unit.entrenched = 0; // Moving cancels entrenchment
    reward += 1;

    checkDepotControl(state);
    updateSupply(state);
  } else if (action.startsWith('attack:')) {
    const parts = action.split(':');
    const uid = parts[1];
    const coords = parts[2].split(',').map(Number);
    const attacker = state.units.find(u => u.id === uid);
    const defender = state.units.find(u => u.side === 'red' && u.r === coords[0] && u.c === coords[1]);

    attacker.attacked = true;
    attacker.mp = 0;

    const initialDefStr = defender.strength;
    resolveCombat(state, attacker, defender);
    reward += (initialDefStr - defender.strength) * 2;

    checkDepotControl(state);
    updateSupply(state);
  } else if (action.startsWith('bombard:')) {
    const parts = action.split(':');
    const uid = parts[1];
    const coords = parts[2].split(',').map(Number);
    const attacker = state.units.find(u => u.id === uid);
    const defender = state.units.find(u => u.side === 'red' && u.r === coords[0] && u.c === coords[1]);

    attacker.attacked = true;
    attacker.mp = 0;

    const roll = getRngValue(state);
    const dmg = Math.floor(2 + roll * 2);
    defender.strength = Math.max(0, defender.strength - dmg);
    defender.entrenched = Math.max(0, defender.entrenched - 1);
    state.history.push(`${attacker.name} bombarded ${defender.name} at (${defender.r}, ${defender.c}) for -${dmg} str.`);
    reward += dmg * 2;

    updateSupply(state);
  } else if (action.startsWith('entrench:')) {
    const parts = action.split(':');
    const uid = parts[1];
    const unit = state.units.find(u => u.id === uid);
    unit.entrenched = Math.min(3, unit.entrenched + 1);
    unit.moved = true;
    unit.attacked = true;
    unit.mp = 0;
    reward += 2;
    state.history.push(`${unit.name} dug in to Entrenchment Level ${unit.entrenched}.`);
  } else if (action.startsWith('resupply:')) {
    const parts = action.split(':');
    const uid = parts[1];
    const unit = state.units.find(u => u.id === uid);
    const healed = Math.min(3, unit.maxStrength - unit.strength);
    unit.strength += healed;
    unit.moved = true;
    unit.attacked = true;
    unit.mp = 0;
    reward += healed * 2;
    state.history.push(`${unit.name} received ${healed} reinforcement divisions.`);
  } else if (action === 'end_turn') {
    // Process Enemy Counter-Offensive
    runEnemyTurn(state);
    checkDepotControl(state);
    updateSupply(state);

    state.turn += 1;

    // Reset Blue units for next turn
    state.units.filter(u => u.side === 'blue' && u.strength > 0).forEach(u => {
      u.mp = u.maxMp;
      u.moved = false;
      u.attacked = false;
    });

    // Reset Red units
    state.units.filter(u => u.side === 'red' && u.strength > 0).forEach(u => {
      u.mp = u.maxMp;
      u.moved = false;
      u.attacked = false;
    });
  }

  evaluateGameOver(state);

  if (state.done) {
    if (state.winner === 'blue') reward += 100;
    else reward -= 50;
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  const blueUnits = state.units.filter(u => u.side === 'blue' && u.strength > 0);
  const redUnits = state.units.filter(u => u.side === 'red' && u.strength > 0);
  const blueStrength = blueUnits.reduce((acc, u) => acc + u.strength, 0);
  const redLosses = 29 - redUnits.reduce((acc, u) => acc + u.strength, 0);
  const blueDepots = state.depots.filter(d => d.owner === 'blue').length;

  let total = blueStrength * 5 + redLosses * 8 + blueDepots * 25;
  if (state.winner === 'blue') total += 150;
  return total;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    getHexNeighbors,
    hexDist,
    getTerrain
  };
}
