// Pure deterministic simulation logic for 0104-trading (Merchant Guild)

const MAX_VOYAGES = 25;

const PORTS = {
  venice: {
    id: 'venice',
    name: 'Republic of Venice',
    x: 140, y: 110,
    routes: ['genoa', 'ragusa', 'constantinople'],
    basePrices: { grain: 24, wine: 18, weapons: 55, silk: 120, spices: 155 }
  },
  genoa: {
    id: 'genoa',
    name: 'Genoa Port',
    x: 60, y: 160,
    routes: ['venice', 'alexandria', 'ragusa'],
    basePrices: { grain: 26, wine: 45, weapons: 32, silk: 110, spices: 140 }
  },
  ragusa: {
    id: 'ragusa',
    name: 'Ragusa Haven',
    x: 230, y: 170,
    routes: ['venice', 'genoa', 'constantinople', 'alexandria'],
    basePrices: { grain: 12, wine: 32, weapons: 60, silk: 95, spices: 130 }
  },
  constantinople: {
    id: 'constantinople',
    name: 'Constantinople',
    x: 380, y: 190,
    routes: ['venice', 'ragusa', 'alexandria'],
    basePrices: { grain: 36, wine: 40, weapons: 65, silk: 48, spices: 110 }
  },
  alexandria: {
    id: 'alexandria',
    name: 'Alexandria Gateway',
    x: 320, y: 360,
    routes: ['genoa', 'ragusa', 'constantinople'],
    basePrices: { grain: 30, wine: 52, weapons: 85, silk: 85, spices: 58 }
  }
};

const COMMODITIES = ['grain', 'wine', 'weapons', 'silk', 'spices'];

const SHIP_TIERS = [
  { tier: 1, name: 'Merchant Sloop', cargo: 20, maxHp: 60, cannons: 1, upCost: 300 },
  { tier: 2, name: 'Trade Caravel', cargo: 45, maxHp: 95, cannons: 2, upCost: 650 },
  { tier: 3, name: 'Grand Galleon', cargo: 90, maxHp: 150, cannons: 4, upCost: 0 }
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

  // Clone local port prices with minor seed-based supply fluctuations
  const portPrices = {};
  for (const pid in PORTS) {
    portPrices[pid] = {};
    for (const c of COMMODITIES) {
      portPrices[pid][c] = PORTS[pid].basePrices[c];
    }
  }

  return {
    seed: numSeed,
    rngStep: 0,
    voyage: 1,
    maxVoyages: MAX_VOYAGES,
    port: 'venice',
    gold: 300,
    shipTier: 1,
    hp: 60,
    maxHp: 60,
    cannons: 1,
    cargoCap: 20,
    escorts: 0,
    warehouses: [],
    cargo: {
      grain: 0,
      wine: 0,
      weapons: 0,
      silk: 0,
      spices: 0
    },
    prices: portPrices,
    history: ['Merchant fleet docked in Venice. Sloop rigged and cargo hold prepared for Mediterranean trade.'],
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

function getTotalCargo(state) {
  let count = 0;
  for (const c of COMMODITIES) {
    count += (state.cargo[c] || 0);
  }
  return count;
}

function legalActions(state) {
  if (state.done) return [];
  const actions = [];
  const curPort = PORTS[state.port];
  const curPrices = state.prices[state.port];
  const totalCargo = getTotalCargo(state);
  const remainingCargo = state.cargoCap - totalCargo;
  const gold = state.gold;
  const hasWarehouse = state.warehouses.includes(state.port);
  const discount = hasWarehouse ? 0.85 : 1.0;

  // 1. Buy commodities in current port
  COMMODITIES.forEach(c => {
    const unitPrice = Math.floor(curPrices[c] * discount);
    if (remainingCargo >= 5 && gold >= unitPrice * 5) {
      actions.push(`buy:${c}:5`);
    }
    if (remainingCargo >= 10 && gold >= unitPrice * 10) {
      actions.push(`buy:${c}:10`);
    }
  });

  // 2. Sell commodities in current port
  COMMODITIES.forEach(c => {
    const qty = state.cargo[c] || 0;
    if (qty >= 5) {
      actions.push(`sell:${c}:5`);
    }
    if (qty >= 10) {
      actions.push(`sell:${c}:10`);
    }
  });

  // 3. Sail to connected ports
  curPort.routes.forEach(dest => {
    actions.push(`sail:${dest}`);
  });

  // 4. Upgrade Ship Tier
  if (state.shipTier < 3) {
    const curTierSpec = SHIP_TIERS[state.shipTier - 1];
    if (gold >= curTierSpec.upCost) {
      actions.push('upgrade_ship');
    }
  }

  // 5. Hire Escort Warship (80 gold, max 2)
  if (gold >= 80 && state.escorts < 2) {
    actions.push('hire_escort');
  }

  // 6. Repair Hull (30 gold for +30 HP)
  if (gold >= 30 && state.hp < state.maxHp) {
    actions.push('repair_hull');
  }

  // 7. Build Warehouse in current port (350 gold)
  if (gold >= 350 && !hasWarehouse) {
    actions.push(`build_warehouse:${state.port}`);
  }

  return actions;
}

function applyMarketJitter(state) {
  for (const pid in PORTS) {
    for (const c of COMMODITIES) {
      const base = PORTS[pid].basePrices[c];
      const roll = getRngValue(state);
      const mod = 0.85 + roll * 0.3; // 85% to 115%
      state.prices[pid][c] = Math.max(5, Math.floor(base * mod));
    }
  }
}

function resolveSeaVoyage(state, destPort) {
  const roll = getRngValue(state);

  if (roll < 0.28) {
    // Corsair Pirate Ambush
    if (state.escorts > 0) {
      state.escorts -= 1;
      state.history.push(`Corsair pirates ambushed the convoy! Mercenary escort engaged and repelled the threat.`);
    } else if (state.cannons >= 2) {
      // Cannons defend ship
      const hullDmg = 12;
      state.hp = Math.max(0, state.hp - hullDmg);
      state.history.push(`Corsair raiders attacked! Flagship cannons returned fire, repelling pirates with -${hullDmg} hull damage.`);
    } else {
      // Unprotected raid
      const hullDmg = 25;
      state.hp = Math.max(0, state.hp - hullDmg);

      // Plunder 5 random cargo if available
      for (const c of COMMODITIES) {
        if (state.cargo[c] >= 5) {
          state.cargo[c] -= 5;
          state.history.push(`Pirates raided the hold and plundered 5 units of ${c.toUpperCase()}!`);
          break;
        }
      }
      state.history.push(`Corsairs pillaged the unprotected vessel (-${hullDmg} hull integrity)!`);
    }
  } else if (roll < 0.45) {
    // Favorable Trade Winds
    const speedBonus = 35;
    state.gold += speedBonus;
    state.history.push(`Brisk trade winds accelerated passage to ${PORTS[destPort].name} (Earned +$${speedBonus} speed bonus).`);
  } else {
    state.history.push(`Smooth maritime passage through the Mediterranean into ${PORTS[destPort].name}.`);
  }

  state.port = destPort;
  state.voyage += 1;
  applyMarketJitter(state);
}

function evaluateGameOutcome(state) {
  // Defeat 1: Shipwrecked
  if (state.hp <= 0) {
    state.done = true;
    state.winner = 'corsairs';
    state.result = 'shipwreck';
    state.history.push('SHIPWRECK! Flagship succumbed to damage and sank beneath the waves.');
    return;
  }

  // Defeat 2: Stranded Bankrupt
  const totalCargo = getTotalCargo(state);
  if (state.gold < 15 && totalCargo === 0) {
    state.done = true;
    state.winner = 'pauper';
    state.result = 'bankruptcy';
    state.history.push('BANKRUPTCY! Merchant guild dissolved due to total loss of capital and cargo.');
    return;
  }

  // Victory: Merchant Magnate ($4000 gold, Galleon tier 3, and 2+ warehouses)
  if (state.gold >= 4000 && state.shipTier >= 3 && state.warehouses.length >= 2) {
    state.done = true;
    state.winner = 'player';
    state.result = 'merchant_magnate';
    state.history.push('COMMERCIAL TRIUMPH! Player recognized as the Supreme Merchant Magnate of the Mediterranean.');
    return;
  }

  if (state.voyage > state.maxVoyages) {
    state.done = true;
    if (state.gold >= 2500) {
      state.winner = 'player';
      state.result = 'prosperous_trader';
      state.history.push('PROSPEROUS VOYAGE! Trade charter concluded with substantial riches.');
    } else {
      state.winner = 'rivals';
      state.result = 'modest_merchant';
      state.history.push('EXPEDITION CONCLUDED: Enterprise maintained modest merchant solvency.');
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

  if (action.startsWith('buy:')) {
    const parts = action.split(':');
    const c = parts[1];
    const qty = parseInt(parts[2], 10);

    const hasWarehouse = state.warehouses.includes(state.port);
    const discount = hasWarehouse ? 0.85 : 1.0;
    const unitPrice = Math.floor(state.prices[state.port][c] * discount);
    const cost = qty * unitPrice;

    state.gold -= cost;
    state.cargo[c] = (state.cargo[c] || 0) + qty;
    // Buying elevates local price slightly due to demand
    state.prices[state.port][c] = Math.floor(state.prices[state.port][c] * 1.05);

    reward += 5;
    state.history.push(`Purchased ${qty} units of ${c.toUpperCase()} in ${PORTS[state.port].name} for $${cost}.`);
  } else if (action.startsWith('sell:')) {
    const parts = action.split(':');
    const c = parts[1];
    const qty = parseInt(parts[2], 10);

    const unitPrice = state.prices[state.port][c];
    const revenue = qty * unitPrice;

    state.cargo[c] -= qty;
    state.gold += revenue;
    // Selling depresses local market price slightly
    state.prices[state.port][c] = Math.max(5, Math.floor(state.prices[state.port][c] * 0.95));

    reward += Math.floor(revenue * 0.1);
    state.history.push(`Sold ${qty} units of ${c.toUpperCase()} in ${PORTS[state.port].name} for $${revenue} ($${unitPrice}/u).`);
  } else if (action.startsWith('sail:')) {
    const dest = action.split(':')[1];
    resolveSeaVoyage(state, dest);
    reward += 10;
  } else if (action === 'upgrade_ship') {
    const curTierSpec = SHIP_TIERS[state.shipTier - 1];
    state.gold -= curTierSpec.upCost;
    state.shipTier += 1;
    const currentTierSpec = SHIP_TIERS[state.shipTier - 1];

    state.cargoCap = currentTierSpec.cargo;
    state.maxHp = currentTierSpec.maxHp;
    state.hp = currentTierSpec.maxHp;
    state.cannons = currentTierSpec.cannons;

    reward += 35;
    state.history.push(`Commissioned new flagship: ${currentTierSpec.name} (${currentTierSpec.cargo} Cargo, ${currentTierSpec.cannons} Cannons).`);
  } else if (action === 'hire_escort') {
    state.gold -= 80;
    state.escorts += 1;
    reward += 10;
    state.history.push('Hired mercenary warship escort to safeguard against pirates.');
  } else if (action === 'repair_hull') {
    state.gold -= 30;
    state.hp = Math.min(state.maxHp, state.hp + 35);
    reward += 5;
    state.history.push(`Caulked and repaired hull to ${state.hp}/${state.maxHp} HP.`);
  } else if (action.startsWith('build_warehouse:')) {
    const p = action.split(':')[1];
    state.gold -= 350;
    state.warehouses.push(p);
    reward += 30;
    state.history.push(`Constructed Guild Warehouse in ${PORTS[p].name} (-15% purchase discount).`);
  }

  evaluateGameOutcome(state);

  if (state.done) {
    if (state.winner === 'player') reward += 100;
    else reward -= 50;
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  let cargoVal = 0;
  for (const c of COMMODITIES) {
    cargoVal += (state.cargo[c] || 0) * (PORTS.venice.basePrices[c] || 20);
  }
  const tierBonus = state.shipTier * 100;
  const warehouseBonus = state.warehouses.length * 75;

  let total = Math.floor(state.gold * 0.25) + Math.floor(cargoVal * 0.2) + tierBonus + warehouseBonus;
  if (state.winner === 'player') total += 150;
  return Math.max(0, total);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    PORTS,
    COMMODITIES,
    SHIP_TIERS
  };
}
