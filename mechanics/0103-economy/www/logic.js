// Pure deterministic simulation logic for 0103-economy (Tycoon Economy)

const MAX_QUARTERS = 20;

const COMMODITY_BASE_PRICES = {
  coal: 20,
  iron: 28,
  grain: 14,
  steel: 65,
  rations: 38,
  electronics: 160
};

const FACILITY_SPECS = {
  coal_mine:   { name: 'Coal Mine', cost: 150, input: null, output: { coal: 10 } },
  iron_mine:   { name: 'Iron Foundry', cost: 200, input: null, output: { iron: 8 } },
  grain_farm:  { name: 'Grain Agriground', cost: 120, input: null, output: { grain: 15 } },
  steel_mill:  { name: 'Bessemer Steel Mill', cost: 300, input: { coal: 5, iron: 5 }, output: { steel: 8 } },
  cannery:     { name: 'Food Canning Plant', cost: 220, input: { grain: 10 }, output: { rations: 12 } },
  tech_lab:    { name: 'Tech Assembly Lab', cost: 450, input: { steel: 4 }, output: { electronics: 6 } }
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

  const prices = {};
  for (const c in COMMODITY_BASE_PRICES) {
    prices[c] = COMMODITY_BASE_PRICES[c];
  }

  const facilities = {};
  for (const f in FACILITY_SPECS) {
    facilities[f] = { count: 0, tier: 1 };
  }
  // Start with 1 basic coal mine and 1 grain farm
  facilities.coal_mine.count = 1;
  facilities.grain_farm.count = 1;

  return {
    seed: numSeed,
    rngStep: 0,
    quarter: 1,
    maxQuarters: MAX_QUARTERS,
    cash: 600,
    debt: 0,
    creditRating: 'A',
    cycle: 'stable', // 'boom', 'stable', 'recession'
    stockPrice: 12.0,
    dividendsPaid: 0,
    prices,
    facilities,
    inventory: {
      coal: 10,
      iron: 0,
      grain: 15,
      steel: 0,
      rations: 0,
      electronics: 0
    },
    history: ['Corporate charter incorporated. Initiated operations with Coal Mine and Grain Agriground.'],
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

function updateMarketPrices(state) {
  const roll = getRngValue(state);

  // Economic cycle shift
  if (roll < 0.25) state.cycle = 'boom';
  else if (roll < 0.65) state.cycle = 'stable';
  else state.cycle = 'recession';

  const cycleMult = state.cycle === 'boom' ? 1.3 : (state.cycle === 'recession' ? 0.75 : 1.0);

  for (const c in COMMODITY_BASE_PRICES) {
    const jitter = 0.85 + getRngValue(state) * 0.3; // 0.85 to 1.15
    state.prices[c] = Math.max(5, Math.floor(COMMODITY_BASE_PRICES[c] * cycleMult * jitter));
  }
}

function legalActions(state) {
  if (state.done) return [];
  const actions = [];
  const cash = state.cash;

  // 1. Build facilities
  for (const f in FACILITY_SPECS) {
    if (cash >= FACILITY_SPECS[f].cost && state.facilities[f].count < 4) {
      actions.push(`build:${f}`);
    }
  }

  // 2. Process goods in processing facilities (steel_mill, cannery, tech_lab)
  for (const f of ['steel_mill', 'cannery', 'tech_lab']) {
    const fac = state.facilities[f];
    if (fac.count > 0) {
      const spec = FACILITY_SPECS[f];
      let hasInputs = true;
      for (const inputCommodity in spec.input) {
        if ((state.inventory[inputCommodity] || 0) < spec.input[inputCommodity]) {
          hasInputs = false;
          break;
        }
      }
      if (hasInputs) {
        actions.push(`process:${f}`);
      }
    }
  }

  // 3. Sell commodities in inventory
  for (const c in state.inventory) {
    const qty = state.inventory[c];
    if (qty >= 5) {
      actions.push(`sell:${c}:5`);
    }
    if (qty >= 10) {
      actions.push(`sell:${c}:10`);
    }
  }

  // 4. Upgrade facilities to Tier 2
  for (const f in state.facilities) {
    const fac = state.facilities[f];
    if (fac.count > 0 && fac.tier === 1) {
      const upCost = Math.floor(FACILITY_SPECS[f].cost * 0.8);
      if (cash >= upCost) {
        actions.push(`upgrade:${f}`);
      }
    }
  }

  // 5. Debt leverage
  if (state.debt < 1500) {
    actions.push('take_loan');
  }
  if (state.debt >= 500 && cash >= 500) {
    actions.push('repay_loan');
  }

  // 6. Shareholder Dividend
  if (cash >= 150) {
    actions.push('issue_dividend');
  }

  // 7. Advance financial quarter
  actions.push('next_quarter');

  return actions;
}

function processQuarterlyTurn(state) {
  // 1. Passive extraction from primary extraction facilities
  for (const f of ['coal_mine', 'iron_mine', 'grain_farm']) {
    const fac = state.facilities[f];
    if (fac.count > 0) {
      const spec = FACILITY_SPECS[f];
      const tierMult = 1 + (fac.tier - 1) * 0.5;
      for (const outCommodity in spec.output) {
        const generated = Math.floor(spec.output[outCommodity] * fac.count * tierMult);
        state.inventory[outCommodity] = (state.inventory[outCommodity] || 0) + generated;
      }
    }
  }

  // 2. Debt interest (5%)
  if (state.debt > 0) {
    const interest = Math.floor(state.debt * 0.05);
    state.cash -= interest;
    state.history.push(`Paid $${interest} interest on outstanding corporate debt.`);
  }

  // 3. Operational overhead & taxes ($20 per operational facility)
  let totalFacilities = 0;
  for (const f in state.facilities) {
    totalFacilities += state.facilities[f].count;
  }
  const overhead = totalFacilities * 15;
  state.cash -= overhead;

  // 4. Update macroeconomic cycle and commodity market prices
  updateMarketPrices(state);
}

function evaluateGameOutcome(state) {
  // Calculate total net worth
  let totalInventoryVal = 0;
  for (const c in state.inventory) {
    totalInventoryVal += state.inventory[c] * (state.prices[c] || 10);
  }

  let totalFacilityVal = 0;
  for (const f in state.facilities) {
    totalFacilityVal += state.facilities[f].count * FACILITY_SPECS[f].cost;
  }

  const netWorth = state.cash - state.debt + totalInventoryVal + totalFacilityVal;

  // Defeat: Insolvency
  if (state.cash < -1500) {
    state.done = true;
    state.winner = 'market';
    state.result = 'bankruptcy';
    state.history.push('INSOLVENCY! Corporate credit seized and bankruptcy liquidation declared.');
    return;
  }

  // Victory: Industrial Hegemony ($5,000 net worth with tech lab or steel mill and low debt)
  const hasAdvancedIndustry = state.facilities.steel_mill.count > 0 || state.facilities.tech_lab.count > 0;
  if (netWorth >= 5000 && hasAdvancedIndustry && state.debt === 0) {
    state.done = true;
    state.winner = 'player';
    state.result = 'industrial_hegemony';
    state.history.push('INDUSTRIAL TRIUMPH! Conglomerate recognized as a global economic powerhouse.');
    return;
  }

  if (state.quarter >= state.maxQuarters) {
    state.done = true;
    if (netWorth >= 3000) {
      state.winner = 'player';
      state.result = 'profitable_empire';
      state.history.push('FINANCIAL SUCCESS! Enterprise concluded fiscal campaign with strong valuation.');
    } else {
      state.winner = 'market';
      state.result = 'stagnation';
      state.history.push('MARKET STAGNATION! Corporate growth failed to outpace inflation.');
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

  if (action.startsWith('build:')) {
    const f = action.split(':')[1];
    const spec = FACILITY_SPECS[f];
    state.cash -= spec.cost;
    state.facilities[f].count += 1;
    reward += 15;
    state.history.push(`Constructed new ${spec.name} for $${spec.cost}.`);
  } else if (action.startsWith('process:')) {
    const f = action.split(':')[1];
    const spec = FACILITY_SPECS[f];
    const fac = state.facilities[f];
    const tierMult = 1 + (fac.tier - 1) * 0.5;

    // Deduct inputs
    for (const inC in spec.input) {
      state.inventory[inC] -= spec.input[inC];
    }
    // Add outputs
    for (const outC in spec.output) {
      const generated = Math.floor(spec.output[outC] * tierMult);
      state.inventory[outC] = (state.inventory[outC] || 0) + generated;
    }
    reward += 10;
    state.history.push(`Operated ${spec.name}, manufacturing finished products.`);
  } else if (action.startsWith('sell:')) {
    const parts = action.split(':');
    const c = parts[1];
    const qty = parseInt(parts[2], 10);

    const unitPrice = state.prices[c];
    const revenue = qty * unitPrice;
    state.inventory[c] -= qty;
    state.cash += revenue;
    reward += Math.floor(revenue * 0.1);
    state.history.push(`Sold ${qty} units of ${c.toUpperCase()} for $${revenue} ($${unitPrice}/unit).`);
  } else if (action.startsWith('upgrade:')) {
    const f = action.split(':')[1];
    const spec = FACILITY_SPECS[f];
    const upCost = Math.floor(spec.cost * 0.8);
    state.cash -= upCost;
    state.facilities[f].tier = 2;
    reward += 20;
    state.history.push(`Upgraded ${spec.name} to Tier 2 Automation.`);
  } else if (action === 'take_loan') {
    state.cash += 500;
    state.debt += 500;
    reward -= 5;
    state.history.push('Drew $500 commercial line of credit.');
  } else if (action === 'repay_loan') {
    state.cash -= 500;
    state.debt -= 500;
    reward += 15;
    state.history.push('Repaid $500 debt principal.');
  } else if (action === 'issue_dividend') {
    state.cash -= 150;
    state.dividendsPaid += 150;
    state.stockPrice += 3.5;
    reward += 20;
    state.history.push(`Disbursed $150 in shareholder dividends. Share price rose to $${state.stockPrice.toFixed(1)}.`);
  } else if (action === 'next_quarter') {
    processQuarterlyTurn(state);
    state.quarter += 1;
    reward += 5;
    state.history.push(`Quarter ${state.quarter} commenced under a ${state.cycle.toUpperCase()} economic climate.`);
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
  let invVal = 0;
  for (const c in state.inventory) {
    invVal += state.inventory[c] * (state.prices[c] || 10);
  }
  let facVal = 0;
  for (const f in state.facilities) {
    facVal += state.facilities[f].count * FACILITY_SPECS[f].cost;
  }
  const netWorth = state.cash - state.debt + invVal + facVal;
  let total = Math.floor(netWorth * 0.2) + Math.floor(state.stockPrice * 10) + state.dividendsPaid;
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
    COMMODITY_BASE_PRICES,
    FACILITY_SPECS
  };
}
