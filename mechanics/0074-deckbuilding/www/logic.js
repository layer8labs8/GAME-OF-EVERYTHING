// Pure deterministic logic for 0074: Deckbuilding (Realm Builder)

const TARGET_VP = 32;
const MAX_TURNS = 25;
const MAX_TOTAL_ACTIONS = 250;
const INITIAL_HAND_SIZE = 5;

const CARD_TEMPLATES = {
  // Treasures
  Copper: { name: 'Copper', type: 'treasure', cost: 0, coins: 1, vp: 0 },
  Silver: { name: 'Silver', type: 'treasure', cost: 3, coins: 2, vp: 0 },
  Gold: { name: 'Gold', type: 'treasure', cost: 6, coins: 3, vp: 0 },

  // Victory
  Estate: { name: 'Estate', type: 'victory', cost: 2, coins: 0, vp: 1 },
  Duchy: { name: 'Duchy', type: 'victory', cost: 5, coins: 0, vp: 3 },
  Province: { name: 'Province', type: 'victory', cost: 8, coins: 0, vp: 6 },

  // Kingdom Actions
  Village: { name: 'Village', type: 'action', cost: 3, cards: 1, actions: 2, buys: 0, coins: 0, vp: 0 },
  Smithy: { name: 'Smithy', type: 'action', cost: 4, cards: 3, actions: 0, buys: 0, coins: 0, vp: 0 },
  Market: { name: 'Market', type: 'action', cost: 5, cards: 1, actions: 1, buys: 1, coins: 1, vp: 0 },
  Festival: { name: 'Festival', type: 'action', cost: 5, cards: 0, actions: 2, buys: 1, coins: 2, vp: 0 },
  Laboratory: { name: 'Laboratory', type: 'action', cost: 5, cards: 2, actions: 1, buys: 0, coins: 0, vp: 0 },
  Workshop: { name: 'Workshop', type: 'action', cost: 3, cards: 0, actions: 0, buys: 0, coins: 0, vp: 0, special: 'gain4' }
};

function getNextRng(state) {
  let s = (state.rngState + 0x6d2b79f5) >>> 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  state.rngState = s;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function shuffleList(list, state) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(getNextRng(state) * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
}

function drawCards(state, count) {
  for (let i = 0; i < count; i++) {
    if (state.deck.length === 0) {
      if (state.discard.length === 0) break;
      state.deck = state.discard;
      state.discard = [];
      shuffleList(state.deck, state);
    }
    if (state.deck.length > 0) {
      state.hand.push(state.deck.pop());
    }
  }
}

function calculateTotalVP(state) {
  let vp = 0;
  const allCards = [
    ...state.deck,
    ...state.hand,
    ...state.discard,
    ...state.playedCards
  ];
  for (const c of allCards) {
    vp += (c.vp || 0);
  }
  return vp;
}

function createState(seed = 1) {
  const safeSeed = typeof seed === 'number' ? (seed >>> 0) : 1;
  const rngInitial = (Math.imul(safeSeed ^ 0x6d2b79f5, 1) + 1) >>> 0;

  let nextCardId = 1;
  function makeCard(name) {
    const tmpl = CARD_TEMPLATES[name];
    return {
      id: `${name}_${nextCardId++}`,
      name: tmpl.name,
      type: tmpl.type,
      cost: tmpl.cost,
      coins: tmpl.coins || 0,
      vp: tmpl.vp || 0,
      cards: tmpl.cards || 0,
      actions: tmpl.actions || 0,
      buys: tmpl.buys || 0,
      special: tmpl.special || null
    };
  }

  // Supply market piles
  const supply = {
    Copper: { cost: 0, count: 30 },
    Silver: { cost: 3, count: 20 },
    Gold: { cost: 6, count: 15 },
    Estate: { cost: 2, count: 10 },
    Duchy: { cost: 5, count: 8 },
    Province: { cost: 8, count: 6 },
    Village: { cost: 3, count: 8 },
    Smithy: { cost: 4, count: 8 },
    Market: { cost: 5, count: 8 },
    Festival: { cost: 5, count: 8 },
    Laboratory: { cost: 5, count: 8 },
    Workshop: { cost: 3, count: 8 }
  };

  const state = {
    seed: safeSeed,
    rngState: rngInitial,
    nextCardId,
    turn: 1,
    maxTurns: MAX_TURNS,
    totalActions: 0,
    actions: 1,
    buys: 1,
    coins: 0,
    totalVP: 3,
    provincesOwned: 0,
    hand: [],
    deck: [],
    discard: [],
    playedCards: [],
    supply,
    done: false,
    won: false,
    message: 'Construct your deck engine. Buy Provinces to secure the realm!'
  };

  // Initial starter deck: 7 Coppers, 3 Estates
  for (let i = 0; i < 7; i++) state.deck.push(makeCard('Copper'));
  for (let i = 0; i < 3; i++) state.deck.push(makeCard('Estate'));
  state.nextCardId = nextCardId;
  shuffleList(state.deck, state);

  drawCards(state, INITIAL_HAND_SIZE);
  return state;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  // Play action cards from hand if actions remaining
  if (state.actions > 0) {
    for (const card of state.hand) {
      if (card.type === 'action') {
        const act = `play:${card.id}`;
        if (!actions.includes(act)) {
          actions.push(act);
        }
      }
    }
  }

  // Play treasure cards from hand
  for (const card of state.hand) {
    if (card.type === 'treasure') {
      const act = `play:${card.id}`;
      if (!actions.includes(act)) {
        actions.push(act);
      }
    }
  }

  // Buy cards from supply if buys remaining and enough coins
  if (state.buys > 0) {
    for (const name of Object.keys(state.supply)) {
      const pile = state.supply[name];
      if (pile.count > 0 && state.coins >= pile.cost) {
        actions.push(`buy:${name}`);
      }
    }
  }

  // End turn is always available
  actions.push('endTurn');
  return actions;
}

function step(state, action) {
  if (state.done) {
    return { reward: 0, done: true };
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  let reward = 0;
  state.totalActions++;

  function makeCard(name) {
    const tmpl = CARD_TEMPLATES[name];
    return {
      id: `${name}_${state.nextCardId++}`,
      name: tmpl.name,
      type: tmpl.type,
      cost: tmpl.cost,
      coins: tmpl.coins || 0,
      vp: tmpl.vp || 0,
      cards: tmpl.cards || 0,
      actions: tmpl.actions || 0,
      buys: tmpl.buys || 0,
      special: tmpl.special || null
    };
  }

  if (action === 'endTurn') {
    // Cleanup phase
    state.discard.push(...state.playedCards);
    state.discard.push(...state.hand);
    state.playedCards = [];
    state.hand = [];

    state.actions = 1;
    state.buys = 1;
    state.coins = 0;
    state.turn++;

    drawCards(state, INITIAL_HAND_SIZE);
    state.totalVP = calculateTotalVP(state);

    state.message = `Turn ${state.turn}: Drew fresh hand. Kingdom VP: ${state.totalVP}.`;

    // Check Victory or Defeat
    if (state.totalVP >= TARGET_VP || state.provincesOwned >= 4) {
      state.won = true;
      state.done = true;
      reward += 500;
      state.message = `Grand Kingdom Ascendant! Reached ${state.totalVP} VP in ${state.turn - 1} turns!`;
    } else if (state.turn > state.maxTurns) {
      state.done = true;
      state.won = false;
      reward -= 100;
      state.message = `Realm deadline reached. Final VP: ${state.totalVP}.`;
    }
  } else if (action.startsWith('play:')) {
    const cardId = action.slice(5);
    const cardIdx = state.hand.findIndex(c => c.id === cardId);
    const card = state.hand[cardIdx];

    state.hand.splice(cardIdx, 1);
    state.playedCards.push(card);

    if (card.type === 'action') {
      state.actions--;
      if (card.cards > 0) drawCards(state, card.cards);
      state.actions += card.actions;
      state.buys += card.buys;
      state.coins += card.coins;

      if (card.special === 'gain4') {
        // Workshop: gain card costing up to 4
        const candidates = ['Smithy', 'Silver', 'Village', 'Estate', 'Copper'];
        for (const cand of candidates) {
          if (state.supply[cand] && state.supply[cand].count > 0) {
            state.supply[cand].count--;
            state.discard.push(makeCard(cand));
            state.message = `Workshop crafted a ${cand} into your discard pile.`;
            break;
          }
        }
      } else {
        state.message = `Played ${card.name}: +${card.cards} Cards, +${card.actions} Actions, +${card.coins} Coins.`;
      }
      reward += 10;
    } else if (card.type === 'treasure') {
      state.coins += card.coins;
      reward += card.coins * 5;
      state.message = `Mints +${card.coins} from ${card.name}. Total Coins: ${state.coins}.`;
    }
  } else if (action.startsWith('buy:')) {
    const name = action.slice(4);
    const pile = state.supply[name];

    state.buys--;
    state.coins -= pile.cost;
    pile.count--;

    const boughtCard = makeCard(name);
    state.discard.push(boughtCard);

    if (name === 'Province') {
      state.provincesOwned++;
      reward += 100;
    } else if (name === 'Duchy') {
      reward += 40;
    } else if (name === 'Gold') {
      reward += 30;
    } else {
      reward += 15;
    }

    state.totalVP = calculateTotalVP(state);
    state.message = `Purchased ${name} for ${pile.cost} coins.`;

    if (state.totalVP >= TARGET_VP || state.provincesOwned >= 4) {
      state.won = true;
      state.done = true;
      reward += 500;
      state.message = `Victory Achieved! Built kingdom of ${state.totalVP} VP!`;
    }
  }

  if (!state.done && state.totalActions >= MAX_TOTAL_ACTIONS) {
    state.done = true;
    state.won = (state.totalVP >= TARGET_VP || state.provincesOwned >= 4);
    state.message = 'Action limit reached for this session.';
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return (
    state.totalVP * 50 +
    (state.won ? 500 : 0) +
    state.coins * 5 -
    state.turn * 15
  );
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TARGET_VP,
    MAX_TURNS,
    MAX_TOTAL_ACTIONS,
    CARD_TEMPLATES,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
