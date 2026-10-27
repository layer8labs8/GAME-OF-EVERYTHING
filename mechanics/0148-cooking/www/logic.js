/**
 * 0148-cooking: Bistro Rush
 * Pure culinary kitchen simulation engine conforming strictly to the Bot Contract.
 * No browser globals, seedable PRNG, fully deterministic and serializable.
 */

const MAX_TURNS = 120;

const MENU_ITEMS = [
  { name: 'Bruschetta Rustica', basePayout: 45 },
  { name: 'Pasta Primavera', basePayout: 70 },
  { name: 'Seared Filet Mignon', basePayout: 110 }
];

function createPrng(seed) {
  let s = (seed >>> 0) || 123456789;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getRng(state) {
  let s = (state.prngState >>> 0) || 123456789;
  s = (s + 0x6D2B79F5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  state.prngState = s;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function createOrder(state, rngFn) {
  const mIdx = Math.floor(rngFn() * MENU_ITEMS.length);
  const item = MENU_ITEMS[mIdx];
  return {
    id: 't_' + (state.nextOrderId++),
    name: item.name,
    payout: item.basePayout,
    patience: 4
  };
}

function createState(seed = 1) {
  const rng = createPrng(seed);
  let nextId = 1;
  const initialOrders = [];
  for (let i = 0; i < 2; i++) {
    const mIdx = Math.floor(rng() * MENU_ITEMS.length);
    const item = MENU_ITEMS[mIdx];
    initialOrders.push({
      id: 't_' + (nextId++),
      name: item.name,
      payout: item.basePayout,
      patience: 4
    });
  }

  return {
    seed: seed >>> 0,
    prngState: seed >>> 0,
    turns: 0,
    maxTurns: MAX_TURNS,
    serviceHour: 18,
    revenue: 300,
    critique: 75,
    cleanPlates: 4,
    pantry: {
      rawProduce: 8,
      rawMeat: 6
    },
    station: {
      preppedProduce: 2,
      cookedPortions: 2,
      platedDishes: 1
    },
    orders: initialOrders,
    dishesServed: 0,
    nextOrderId: nextId,
    score: 0,
    done: false,
    victory: false,
    log: [
      'Dinner service commenced at Bistro Rush.',
      'Prep ingredients, sear stove portions, plate fine dishes, and expedite customer tickets.'
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
  state.log.push(line);
  if (state.log.length > 20) {
    state.log.shift();
  }
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  // Cutting board prep
  if (state.pantry.rawProduce >= 2 && state.station.preppedProduce < 8) {
    actions.push('action:prep_produce');
  }

  // Stove cooking
  if (state.pantry.rawMeat >= 2 && state.station.cookedPortions < 8) {
    actions.push('action:cook_stove');
  }

  // Plating assembly
  if (state.station.preppedProduce >= 1 && state.station.cookedPortions >= 1 && state.cleanPlates >= 1 && state.station.platedDishes < 4) {
    actions.push('action:plate_dish');
  }

  // Expedite / Serve Ticket
  if (state.orders.length > 0 && state.station.platedDishes >= 1) {
    actions.push('action:serve_order');
  }

  // Dish pit wash
  if (state.cleanPlates < 6) {
    actions.push('action:wash_dishes');
  }

  // Restock Pantry Ingredients
  if (state.revenue >= 50 && (state.pantry.rawProduce < 12 || state.pantry.rawMeat < 10)) {
    actions.push('action:restock_pantry');
  }

  // Advance Service Hour / Clock
  actions.push('action:advance_rush');

  return actions;
}

function step(state, action) {
  if (state.done) {
    throw new Error('Simulation is already over.');
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action "${action}".`);
  }

  state.turns += 1;
  let reward = 0;

  // Prep Produce
  if (action === 'action:prep_produce') {
    state.pantry.rawProduce -= 2;
    state.station.preppedProduce += 2;
    reward += 4;
    state.score += 8;
    addLog(state, 'Chef diced and prepped fresh vegetables (+2 Prepped Produce).');
  }

  // Cook Stove
  else if (action === 'action:cook_stove') {
    state.pantry.rawMeat -= 2;
    state.station.cookedPortions += 2;
    reward += 6;
    state.score += 12;
    addLog(state, 'Sizzled prime cuts on skillet with aromatics (+2 Cooked Portions).');
  }

  // Plate Dish
  else if (action === 'action:plate_dish') {
    state.station.preppedProduce -= 1;
    state.station.cookedPortions -= 1;
    state.cleanPlates -= 1;
    state.station.platedDishes += 1;
    reward += 8;
    state.score += 16;
    addLog(state, 'Assembled gourmet plate with fresh garnish (+1 Plated Dish ready for expo).');
  }

  // Serve Order
  else if (action === 'action:serve_order') {
    const ticket = state.orders.shift();
    state.station.platedDishes -= 1;

    // Fast delivery gives tip bonus
    const tip = ticket.patience >= 3 ? 20 : (ticket.patience >= 2 ? 10 : 0);
    const totalEarnings = ticket.payout + tip;

    state.revenue += totalEarnings;
    state.critique = Math.min(100, state.critique + 3);
    state.dishesServed += 1;

    reward += 15 + Math.floor(totalEarnings / 10);
    state.score += 30 + Math.floor(totalEarnings / 5);

    addLog(state, `EXPEDITED ORDER #${ticket.id} (${ticket.name}): Collected +$${totalEarnings} ($${tip} tip)! Michelin review +3%.`);
  }

  // Wash Dishes
  else if (action === 'action:wash_dishes') {
    state.cleanPlates = Math.min(6, state.cleanPlates + 2);
    reward += 3;
    state.score += 6;
    addLog(state, 'Sanitized porcelain dinner plates at the dish station (+2 Clean Plates).');
  }

  // Restock Pantry
  else if (action === 'action:restock_pantry') {
    state.revenue -= 50;
    state.pantry.rawProduce += 6;
    state.pantry.rawMeat += 4;
    reward += 4;
    state.score += 10;
    addLog(state, 'Received artisanal market delivery (+6 Produce, +4 Meat, -$50).');
  }

  // Advance Rush
  else if (action === 'action:advance_rush') {
    state.serviceHour += 1;
    if (state.serviceHour > 23) state.serviceHour = 18;

    // Kitchen facility utilities overhead
    state.revenue -= 15;

    // Decrement order patience
    const remainingOrders = [];
    for (let i = 0; i < state.orders.length; i++) {
      const order = state.orders[i];
      order.patience -= 1;
      if (order.patience <= 0) {
        state.critique = Math.max(0, state.critique - 8);
        addLog(state, `⚠️ Table ticket #${order.id} expired! Impatient guests walked out (-8% Critique).`);
      } else {
        remainingOrders.push(order);
      }
    }
    state.orders = remainingOrders;

    // Spawn new ticket if space permits
    if (state.orders.length < 3) {
      state.orders.push(createOrder(state, () => getRng(state)));
      addLog(state, 'New dinner reservation arrived at expeditor station.');
    }

    reward += 4;
    state.score += 8;
  }

  // Victory Check: Serve 25 dishes, >= $1,500 Revenue, >= 85% Critique
  if (state.dishesServed >= 25 && state.revenue >= 1500 && state.critique >= 85) {
    state.victory = true;
    state.done = true;
    reward += 200;
    state.score += 300;
    addLog(state, 'THREE MICHELIN STARS: Bistro Rush has attained ultimate culinary excellence!');
    return { reward, done: true };
  }

  // Defeat Checks
  if (state.revenue < -200) {
    state.done = true;
    state.victory = false;
    reward -= 100;
    addLog(state, 'INSOLVENCY: Restaurant operating deficit forced immediate closure.');
    return { reward, done: true };
  }

  if (state.critique <= 0) {
    state.done = true;
    state.victory = false;
    reward -= 100;
    addLog(state, 'HEALTH CLOSURE: Disastrous culinary reviews shuttered the dining room.');
    return { reward, done: true };
  }

  if (state.turns >= state.maxTurns) {
    state.done = true;
    addLog(state, 'Dinner service shift completed.');
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
    MENU_ITEMS,
    MAX_TURNS
  };
}
