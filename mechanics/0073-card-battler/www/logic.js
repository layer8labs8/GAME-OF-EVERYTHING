(function (root) {
  'use strict';

  const MAX_STEPS = 150;
  const HAND_SIZE = 4;

  const CARDS = {
    strike: { type: 'strike', name: 'Strike', cost: 1, damage: 6, block: 0, heal: 0 },
    defend: { type: 'defend', name: 'Defend', cost: 1, damage: 0, block: 5, heal: 0 },
    heavy_slash: { type: 'heavy_slash', name: 'Heavy Slash', cost: 2, damage: 14, block: 0, heal: 0 },
    iron_barrier: { type: 'iron_barrier', name: 'Iron Barrier', cost: 2, damage: 0, block: 12, heal: 0 },
    fireball: { type: 'fireball', name: 'Fireball', cost: 2, damage: 11, block: 0, heal: 0 },
    quick_strike: { type: 'quick_strike', name: 'Quick Strike', cost: 0, damage: 4, block: 0, heal: 0 },
    heal: { type: 'heal', name: 'Heal', cost: 1, damage: 0, block: 0, heal: 7 },
  };

  const ENCOUNTERS = [
    { name: 'Goblin Skirmisher', hp: 22, atkBase: 6 },
    { name: 'Dark Cultist', hp: 32, atkBase: 9 },
    { name: 'Stone Golem', hp: 48, atkBase: 13 },
  ];

  function nextRandom(state) {
    state.rng = ((state.rng * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return state.rng / 0x7fffffff;
  }

  function shuffle(arr, state) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(nextRandom(state) * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
  }

  function spawnEnemy(state, encIdx) {
    const enc = ENCOUNTERS[encIdx];
    state.enemy = {
      name: enc.name,
      hp: enc.hp,
      maxHp: enc.hp,
      block: 0,
      atkBuff: 0,
      intent: rollIntent(state, enc.atkBase, 0),
    };
  }

  function rollIntent(state, atkBase, buff) {
    const roll = nextRandom(state);
    if (roll < 0.6) {
      return { type: 'attack', value: atkBase + buff };
    } else if (roll < 0.85) {
      return { type: 'defend', value: 6 };
    } else {
      return { type: 'buff', value: 2 };
    }
  }

  function drawCards(state, count) {
    for (let i = 0; i < count; i++) {
      if (state.hero.drawPile.length === 0) {
        if (state.hero.discardPile.length === 0) break;
        state.hero.drawPile = [...state.hero.discardPile];
        state.hero.discardPile = [];
        shuffle(state.hero.drawPile, state);
      }
      state.hero.hand.push(state.hero.drawPile.pop());
    }
  }

  function createState(seed = 12345) {
    const curRng = (seed >>> 0) || 1;

    const initialDeck = [
      'strike', 'strike', 'strike', 'strike',
      'defend', 'defend', 'defend', 'defend',
      'heavy_slash', 'heal',
    ];

    const state = {
      encounter: 1,
      stepCount: 0,
      hero: {
        hp: 45,
        maxHp: 45,
        energy: 3,
        maxEnergy: 3,
        block: 0,
        hand: [],
        drawPile: [...initialDeck],
        discardPile: [],
      },
      enemy: null,
      won: false,
      stats: {
        damageDealt: 0,
        damageBlocked: 0,
      },
      rng: curRng,
    };

    shuffle(state.hero.drawPile, state);
    spawnEnemy(state, 0);
    drawCards(state, HAND_SIZE);
    return state;
  }

  function isOver(state) {
    return state.hero.hp <= 0 || state.won || state.stepCount >= MAX_STEPS;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = [];
    for (let i = 0; i < state.hero.hand.length; i++) {
      const cardKey = state.hero.hand[i];
      const card = CARDS[cardKey];
      if (state.hero.energy >= card.cost) {
        actions.push({ type: 'play', cardIndex: i });
      }
    }
    actions.push({ type: 'end_turn' });
    return actions;
  }

  function applyDamage(target, dmg) {
    const blockAbsorb = Math.min(target.block, dmg);
    target.block -= blockAbsorb;
    const remaining = dmg - blockAbsorb;
    target.hp = Math.max(0, target.hp - remaining);
    return { absorbed: blockAbsorb, damage: remaining };
  }

  function step(state, action) {
    if (!action || typeof action.type !== 'string') {
      throw new Error('Invalid action');
    }
    if (isOver(state)) {
      throw new Error('Game is already over');
    }

    let reward = 0;

    if (action.type === 'play') {
      const idx = action.cardIndex;
      if (idx === undefined || idx < 0 || idx >= state.hero.hand.length) {
        throw new Error('Invalid cardIndex: ' + idx);
      }

      const cardKey = state.hero.hand[idx];
      const card = CARDS[cardKey];
      if (state.hero.energy < card.cost) {
        throw new Error('Not enough energy to play card');
      }

      state.hero.energy -= card.cost;
      state.hero.hand.splice(idx, 1);
      state.hero.discardPile.push(cardKey);

      if (card.damage > 0) {
        const res = applyDamage(state.enemy, card.damage);
        state.stats.damageDealt += card.damage;
        reward += card.damage * 2;
      }
      if (card.block > 0) {
        state.hero.block += card.block;
        reward += card.block;
      }
      if (card.heal > 0) {
        state.hero.hp = Math.min(state.hero.maxHp, state.hero.hp + card.heal);
        reward += card.heal * 2;
      }

      // Check if enemy defeated by card
      if (state.enemy.hp <= 0) {
        reward += 50;
        if (state.encounter >= 3) {
          state.won = true;
          reward += 200;
          state.stepCount += 1;
          return { reward, done: true };
        } else {
          state.encounter += 1;
          spawnEnemy(state, state.encounter - 1);
          // Reward card added to deck
          const rewardCards = ['heavy_slash', 'iron_barrier', 'fireball', 'quick_strike'];
          const drafted = rewardCards[Math.floor(nextRandom(state) * rewardCards.length)];
          state.hero.discardPile.push(drafted);

          // Reset turn for next encounter
          state.hero.block = 0;
          state.hero.energy = state.hero.maxEnergy;
          state.hero.discardPile.push(...state.hero.hand);
          state.hero.hand = [];
          drawCards(state, HAND_SIZE);
        }
      }
    } else if (action.type === 'end_turn') {
      // Discard remaining hand
      state.hero.discardPile.push(...state.hero.hand);
      state.hero.hand = [];

      // Enemy executes telegraphed intent
      const intent = state.enemy.intent;
      if (intent.type === 'attack') {
        const res = applyDamage(state.hero, intent.value);
        state.stats.damageBlocked += res.absorbed;
        if (res.damage > 0) {
          reward -= res.damage * 2;
        }
      } else if (intent.type === 'defend') {
        state.enemy.block += intent.value;
      } else if (intent.type === 'buff') {
        state.enemy.atkBuff += intent.value;
      }

      // Check if hero died
      if (state.hero.hp <= 0) {
        state.hero.hp = 0;
        reward -= 100;
        state.stepCount += 1;
        return { reward, done: true };
      }

      // Start new player turn
      state.hero.block = 0;
      state.enemy.block = 0;
      state.hero.energy = state.hero.maxEnergy;
      drawCards(state, HAND_SIZE);

      // Roll next enemy intent
      const enc = ENCOUNTERS[state.encounter - 1];
      state.enemy.intent = rollIntent(state, enc.atkBase, state.enemy.atkBuff);
      reward += 1;
    } else {
      throw new Error('Unknown action type: ' + action.type);
    }

    state.stepCount += 1;
    return { reward, done: isOver(state) };
  }

  function score(state) {
    return (
      (state.won ? 1000 : 0) +
      (state.encounter - 1) * 300 +
      state.hero.hp * 15 +
      state.stats.damageDealt * 5
    );
  }

  const api = {
    MAX_STEPS,
    CARDS,
    ENCOUNTERS,
    createState,
    legalActions,
    step,
    isOver,
    score,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.GameLogic = api;
  }
})(typeof self !== 'undefined' ? self : globalThis);
