(function (root) {
  const MAX_HANDS = 5;
  const START_CHIPS = 100;
  const BET = 20;

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function buildShoe(state) {
    const deck = Array.from({ length: 52 }, (_, i) => i);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(nextRandom(state) * (i + 1));
      const tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }
    state.shoe = deck;
  }

  function drawCard(state) {
    if (state.shoe.length === 0) buildShoe(state);
    return state.shoe.pop();
  }

  function handInfo(cards) {
    let total = 0;
    let aces = 0;
    for (let i = 0; i < cards.length; i++) {
      const rank = cards[i] % 13;
      if (rank === 0) {
        total += 11;
        aces += 1;
      } else if (rank >= 9) {
        total += 10;
      } else {
        total += rank + 1;
      }
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }
    return { total, soft: aces > 0 };
  }

  function handTotal(cards) {
    return handInfo(cards).total;
  }

  function finishHand(state, result, delta) {
    state.revealDealer = true;
    state.handResult = result;
    state.chips = Math.max(0, state.chips + delta);
    if (state.round >= MAX_HANDS || state.chips < BET) {
      state.phase = 'over';
    } else {
      state.phase = 'between';
    }
    return delta;
  }

  function settleShowdown(state) {
    while (handTotal(state.dealer) < 17) {
      state.dealer.push(drawCard(state));
    }
    const p = handTotal(state.player);
    const d = handTotal(state.dealer);
    if (d > 21 || p > d) {
      return finishHand(state, 'win', state.currentBet);
    }
    if (p < d) {
      return finishHand(state, 'lose', -state.currentBet);
    }
    return finishHand(state, 'push', 0);
  }

  function dealHand(state) {
    if (state.shoe.length < 15) buildShoe(state);
    state.currentBet = BET;
    state.revealDealer = false;
    state.handResult = 'none';
    state.phase = 'player';
    state.player = [drawCard(state), drawCard(state)];
    state.dealer = [drawCard(state), drawCard(state)];

    const p21 = handTotal(state.player) === 21;
    const d21 = handTotal(state.dealer) === 21;
    if (p21 || d21) {
      if (p21 && d21) return finishHand(state, 'push', 0);
      if (p21) return finishHand(state, 'blackjack', Math.floor(BET * 1.5));
      return finishHand(state, 'lose', -BET);
    }
    return 0;
  }

  function createState(seed) {
    const state = {
      shoe: [],
      player: [],
      dealer: [],
      revealDealer: false,
      chips: START_CHIPS,
      currentBet: BET,
      round: 1,
      phase: 'player',
      handResult: 'none',
      stepCount: 0,
      rng: (seed >>> 0) || 1,
    };
    buildShoe(state);
    dealHand(state);
    return state;
  }

  function isOver(state) {
    return state.phase === 'over';
  }

  function legalActions(state) {
    if (state.phase === 'over') return [];
    if (state.phase === 'between') return ['deal'];
    const acts = ['hit', 'stand'];
    if (state.player.length === 2 && state.chips >= BET * 2) {
      acts.push('double');
    }
    return acts;
  }

  function step(state, action) {
    const legal = legalActions(state);
    if (!legal.includes(action)) {
      throw new Error('Illegal action');
    }

    state.stepCount += 1;
    let reward = 0;

    if (action === 'deal') {
      state.round += 1;
      reward = dealHand(state);
      return { reward, done: isOver(state) };
    }

    if (action === 'double') {
      state.currentBet = BET * 2;
      state.player.push(drawCard(state));
      if (handTotal(state.player) > 21) {
        reward = finishHand(state, 'bust', -state.currentBet);
      } else {
        reward = settleShowdown(state);
      }
      return { reward, done: isOver(state) };
    }

    if (action === 'hit') {
      state.player.push(drawCard(state));
      const p = handTotal(state.player);
      if (p > 21) {
        reward = finishHand(state, 'bust', -state.currentBet);
      } else if (p === 21) {
        reward = settleShowdown(state);
      }
      return { reward, done: isOver(state) };
    }

    reward = settleShowdown(state);
    return { reward, done: isOver(state) };
  }

  function score(state) {
    return state.chips;
  }

  const api = { MAX_HANDS, START_CHIPS, BET, handInfo, handTotal, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
