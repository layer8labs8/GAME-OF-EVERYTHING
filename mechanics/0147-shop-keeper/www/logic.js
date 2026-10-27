/**
 * 0147-shop-keeper: Arcane Emporium
 * Pure merchant shopkeeper simulation engine conforming strictly to the Bot Contract.
 * No browser globals, seedable PRNG, fully deterministic and serializable.
 */

const MAX_TURNS = 120;

const ITEMS = {
  potions: { name: 'Health Potion', cost: 25, price: 55 },
  scrolls: { name: 'Fireball Scroll', cost: 50, price: 110 },
  weapons: { name: 'Runic Sword', cost: 120, price: 250 },
  artifacts: { name: 'Ancient Relic', cost: 280, price: 600 }
};

const SHOP_TIERS = [
  'Quaint Stall',
  'High Street Shop',
  'Grand Emporium',
  'Royal Bazaar'
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

const CUSTOMER_NAMES = ['Sir Galahad', 'Aria the Rogue', 'Mage Cedric', 'Lady Vanya', 'Ranger Thorne', 'Captain Drake'];
const ITEM_KEYS = ['potions', 'scrolls', 'weapons', 'artifacts'];

function spawnCustomer(state, rngFn) {
  const nameIdx = Math.floor(rngFn() * CUSTOMER_NAMES.length);
  // Tier determines likelihood of wanting rare goods
  let itemIdx = Math.floor(rngFn() * (Math.min(ITEM_KEYS.length, state.shopTier + 2)));
  return {
    id: 'c_' + (state.nextCustomerId++),
    name: CUSTOMER_NAMES[nameIdx],
    wants: ITEM_KEYS[itemIdx]
  };
}

function createState(seed = 1) {
  const rng = createPrng(seed);
  const initialCustomers = [];
  let nextId = 1;
  for (let i = 0; i < 3; i++) {
    const nameIdx = Math.floor(rng() * CUSTOMER_NAMES.length);
    const itemIdx = Math.floor(rng() * 2);
    initialCustomers.push({
      id: 'c_' + (nextId++),
      name: CUSTOMER_NAMES[nameIdx],
      wants: ITEM_KEYS[itemIdx]
    });
  }

  return {
    seed: seed >>> 0,
    prngState: seed >>> 0,
    turns: 0,
    maxTurns: MAX_TURNS,
    day: 1,
    gold: 400,
    reputation: 70,
    shopTier: 0,
    shelves: 4,
    stock: {
      potions: 3,
      scrolls: 2,
      weapons: 1,
      artifacts: 0
    },
    customerQueue: initialCustomers,
    customersServed: 0,
    nextCustomerId: nextId,
    score: 0,
    done: false,
    victory: false,
    log: [
      'Arcane Emporium opened its doors in the Citadel Market.',
      'Procure wholesale stock, serve visiting adventurers, and maintain merchant reputation.'
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

function getTotalStock(state) {
  return state.stock.potions + state.stock.scrolls + state.stock.weapons + state.stock.artifacts;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const maxStockCapacity = state.shelves * 2;
  const currentTotal = getTotalStock(state);

  // Customer Transaction
  if (state.customerQueue.length > 0) {
    const cust = state.customerQueue[0];
    if (state.stock[cust.wants] > 0) {
      actions.push('action:sell_item');
      actions.push('action:bargain_sale');
    } else {
      actions.push('action:turn_away_customer');
    }
  }

  // Wholesale Ordering
  if (currentTotal < maxStockCapacity) {
    if (state.gold >= ITEMS.potions.cost) actions.push('action:order_potions');
    if (state.gold >= ITEMS.scrolls.cost) actions.push('action:order_scrolls');
    if (state.gold >= ITEMS.weapons.cost) actions.push('action:order_weapons');
    if (state.gold >= ITEMS.artifacts.cost) actions.push('action:order_artifacts');
  }

  // Facility Upgrades
  if (state.gold >= 250 && state.shelves < 8) {
    actions.push('action:expand_shelves');
  }
  if (state.gold >= 400 && state.shopTier < 3) {
    actions.push('action:renovate_shop');
  }

  // Conclude Business Day (Always legal)
  actions.push('action:close_shop_for_day');

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

  // Sell Item to Patron
  if (action === 'action:sell_item') {
    const cust = state.customerQueue.shift();
    const itemData = ITEMS[cust.wants];
    state.stock[cust.wants] -= 1;
    state.gold += itemData.price;
    state.reputation = Math.min(100, state.reputation + 2);
    state.customersServed += 1;
    reward += 10 + Math.floor(itemData.price / 20);
    state.score += 20 + Math.floor(itemData.price / 10);
    addLog(state, `Sold ${itemData.name} to ${cust.name} for +$${itemData.price} Gold (+2% Rep).`);
  }

  // Bargain Discount Sale
  else if (action === 'action:bargain_sale') {
    const cust = state.customerQueue.shift();
    const itemData = ITEMS[cust.wants];
    const discountedPrice = Math.floor(itemData.price * 0.8);
    state.stock[cust.wants] -= 1;
    state.gold += discountedPrice;
    state.reputation = Math.min(100, state.reputation + 6);
    state.customersServed += 1;
    reward += 12 + Math.floor(discountedPrice / 20);
    state.score += 25 + Math.floor(discountedPrice / 10);
    addLog(state, `Bargained friendly discount on ${itemData.name} for ${cust.name}: Earned +$${discountedPrice} Gold (+6% Rep boost)!`);
  }

  // Turn Away Customer
  else if (action === 'action:turn_away_customer') {
    const cust = state.customerQueue.shift();
    const itemData = ITEMS[cust.wants];
    state.reputation = Math.max(0, state.reputation - 5);
    reward -= 5;
    addLog(state, `${cust.name} left disappointed without ${itemData.name} (-5% Rep).`);
  }

  // Wholesale Ordering
  else if (action === 'action:order_potions') {
    state.gold -= ITEMS.potions.cost;
    state.stock.potions += 1;
    reward += 3;
    state.score += 5;
    addLog(state, `Wholesale delivery received: +1 ${ITEMS.potions.name} (-$${ITEMS.potions.cost}).`);
  } else if (action === 'action:order_scrolls') {
    state.gold -= ITEMS.scrolls.cost;
    state.stock.scrolls += 1;
    reward += 4;
    state.score += 8;
    addLog(state, `Wholesale delivery received: +1 ${ITEMS.scrolls.name} (-$${ITEMS.scrolls.cost}).`);
  } else if (action === 'action:order_weapons') {
    state.gold -= ITEMS.weapons.cost;
    state.stock.weapons += 1;
    reward += 6;
    state.score += 15;
    addLog(state, `Wholesale delivery received: +1 ${ITEMS.weapons.name} (-$${ITEMS.weapons.cost}).`);
  } else if (action === 'action:order_artifacts') {
    state.gold -= ITEMS.artifacts.cost;
    state.stock.artifacts += 1;
    reward += 8;
    state.score += 25;
    addLog(state, `Wholesale delivery received: +1 ${ITEMS.artifacts.name} (-$${ITEMS.artifacts.cost}).`);
  }

  // Expand Shelves
  else if (action === 'action:expand_shelves') {
    state.gold -= 250;
    state.shelves += 2;
    reward += 10;
    state.score += 20;
    addLog(state, `Installed carved oak display shelves: Total shelf capacity now ${state.shelves * 2} items.`);
  }

  // Renovate Shop
  else if (action === 'action:renovate_shop') {
    state.gold -= 400;
    state.shopTier += 1;
    state.reputation = Math.min(100, state.reputation + 10);
    reward += 20;
    state.score += 50;
    addLog(state, `RENOVATION COMPLETE: Upgraded store tier to ${SHOP_TIERS[state.shopTier]} (+10% Rep)!`);
  }

  // Close Shop for Day
  else if (action === 'action:close_shop_for_day') {
    state.day += 1;

    // Daily Market Rent & Guild Taxes
    const guildTax = 60 + state.shopTier * 20;
    state.gold -= guildTax;

    // Unserved patrons leave
    const unservedCount = state.customerQueue.length;
    if (unservedCount > 0) {
      state.reputation = Math.max(0, state.reputation - unservedCount * 2);
      addLog(state, `Day closed: Paid $${guildTax} guild fees. ${unservedCount} patrons left at closing (-${unservedCount * 2}% Rep).`);
    } else {
      state.reputation = Math.min(100, state.reputation + 4);
      addLog(state, `Day closed: Paid $${guildTax} guild fees. Perfect customer service cleared queue (+4% Rep)!`);
    }

    // Spawn Next Day's Customer Cohort
    state.customerQueue = [];
    const customerCount = Math.min(5, Math.floor(state.reputation / 25) + 2 + state.shopTier);
    for (let i = 0; i < customerCount; i++) {
      state.customerQueue.push(spawnCustomer(state, () => getRng(state)));
    }

    reward += 5;
    state.score += 10;
  }

  // Victory Check: Tier 3 (Royal Bazaar) with >= $4,000 Gold and >= 80% Reputation
  if (state.shopTier >= 3 && state.gold >= 4000 && state.reputation >= 80) {
    state.victory = true;
    state.done = true;
    reward += 200;
    state.score += 300;
    addLog(state, 'COMMERCIAL SUPREMACY: Arcane Emporium has become the crown jewel Royal Bazaar of the realm!');
    return { reward, done: true };
  }

  // Defeat Checks
  if (state.gold < -300) {
    state.done = true;
    state.victory = false;
    reward -= 100;
    addLog(state, 'BANKRUPTCY: Deep debt prompted the Merchant Guild to seize your storefront.');
    return { reward, done: true };
  }

  if (state.reputation <= 0) {
    state.done = true;
    state.victory = false;
    reward -= 100;
    addLog(state, 'RUINED REPUTATION: Severe customer outrage revoked your commercial trading license.');
    return { reward, done: true };
  }

  if (state.turns >= state.maxTurns) {
    state.done = true;
    addLog(state, 'Merchant fiscal year concluded.');
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
    ITEMS,
    SHOP_TIERS,
    MAX_TURNS
  };
}
