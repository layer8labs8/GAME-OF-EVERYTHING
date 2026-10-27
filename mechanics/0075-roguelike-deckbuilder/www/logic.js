// Pure deterministic logic for 0075: Roguelike Deckbuilder (Spire Crawl)

const MAX_TURNS = 70;
const MAX_TOTAL_ACTIONS = 250;
const INITIAL_HAND_SIZE = 5;

const CARD_DATABASE = {
  Strike: { name: 'Strike', type: 'attack', cost: 1, damage: 6, block: 0, desc: 'Deal 6 damage.' },
  'Strike+': { name: 'Strike+', type: 'attack', cost: 1, damage: 9, block: 0, desc: 'Deal 9 damage.' },

  Defend: { name: 'Defend', type: 'skill', cost: 1, damage: 0, block: 5, desc: 'Gain 5 block.' },
  'Defend+': { name: 'Defend+', type: 'skill', cost: 1, damage: 0, block: 8, desc: 'Gain 8 block.' },

  Bash: { name: 'Bash', type: 'attack', cost: 2, damage: 8, block: 0, vulnerable: 2, desc: 'Deal 8 damage. Apply 2 Vulnerable.' },
  'Bash+': { name: 'Bash+', type: 'attack', cost: 2, damage: 11, block: 0, vulnerable: 3, desc: 'Deal 11 damage. Apply 3 Vulnerable.' },

  Survivor: { name: 'Survivor', type: 'skill', cost: 1, damage: 0, block: 8, desc: 'Gain 8 block.' },
  'Survivor+': { name: 'Survivor+', type: 'skill', cost: 1, damage: 0, block: 11, desc: 'Gain 11 block.' },

  Carnage: { name: 'Carnage', type: 'attack', cost: 2, damage: 18, block: 0, desc: 'Deal 18 damage.' },
  'Carnage+': { name: 'Carnage+', type: 'attack', cost: 2, damage: 24, block: 0, desc: 'Deal 24 damage.' },

  IronWave: { name: 'IronWave', type: 'attack', cost: 1, damage: 5, block: 5, desc: 'Gain 5 block. Deal 5 damage.' },
  'IronWave+': { name: 'IronWave+', type: 'attack', cost: 1, damage: 8, block: 8, desc: 'Gain 8 block. Deal 8 damage.' },

  Uppercut: { name: 'Uppercut', type: 'attack', cost: 2, damage: 13, block: 0, weak: 1, vulnerable: 1, desc: 'Deal 13 damage. Apply 1 Weak and 1 Vulnerable.' },
  'Uppercut+': { name: 'Uppercut+', type: 'attack', cost: 2, damage: 16, block: 0, weak: 2, vulnerable: 2, desc: 'Deal 16 damage. Apply 2 Weak and 2 Vulnerable.' },

  Inflame: { name: 'Inflame', type: 'power', cost: 1, damage: 0, block: 0, strength: 2, desc: 'Gain 2 Strength.' },
  'Inflame+': { name: 'Inflame+', type: 'power', cost: 1, damage: 0, block: 0, strength: 3, desc: 'Gain 3 Strength.' },

  Impervious: { name: 'Impervious', type: 'skill', cost: 2, damage: 0, block: 20, desc: 'Gain 20 block.' },
  'Impervious+': { name: 'Impervious+', type: 'skill', cost: 2, damage: 0, block: 28, desc: 'Gain 28 block.' },

  ShrugItOff: { name: 'ShrugItOff', type: 'skill', cost: 1, damage: 0, block: 8, draw: 1, desc: 'Gain 8 block. Draw 1 card.' },
  'ShrugItOff+': { name: 'ShrugItOff+', type: 'skill', cost: 1, damage: 0, block: 11, draw: 1, desc: 'Gain 11 block. Draw 1 card.' }
};

const REWARD_POOL = ['Carnage', 'IronWave', 'Uppercut', 'Inflame', 'Impervious', 'ShrugItOff'];

const ENCOUNTER_DATA = {
  1: {
    name: 'Cultist',
    hp: 48,
    maxHp: 48,
    intents: [
      { type: 'buff', strength: 2, desc: 'Incantation (+2 Strength)' },
      { type: 'attack', damage: 6, desc: 'Dark Strike (6 dmg)' },
      { type: 'attack', damage: 6, desc: 'Dark Strike (6 dmg)' }
    ]
  },
  3: {
    name: 'Lava Golem',
    hp: 72,
    maxHp: 72,
    intents: [
      { type: 'defend', block: 12, desc: 'Obsidian Shell (+12 Block)' },
      { type: 'attack', damage: 16, desc: 'Magma Slam (16 dmg)' },
      { type: 'attack_buff', damage: 8, strength: 2, desc: 'Flame Flare (8 dmg, +2 Str)' }
    ]
  },
  4: {
    name: 'Void Sovereign',
    hp: 115,
    maxHp: 115,
    intents: [
      { type: 'attack', damage: 12, desc: 'Void Cleave (12 dmg)' },
      { type: 'buff', strength: 3, vulnerable: 2, desc: 'Dark Surge (+3 Str, 2 Vuln)' },
      { type: 'multi_attack', damage: 8, hits: 3, desc: 'Shadow Frenzy (3x8 = 24 dmg)' },
      { type: 'defend', block: 20, desc: 'Abyssal Barrier (+20 Block)' }
    ]
  }
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

function makeCard(name, state) {
  const tmpl = CARD_DATABASE[name] || CARD_DATABASE.Strike;
  return {
    id: `${name}_${state.nextCardId++}`,
    name,
    type: tmpl.type,
    cost: tmpl.cost,
    damage: tmpl.damage || 0,
    block: tmpl.block || 0,
    vulnerable: tmpl.vulnerable || 0,
    weak: tmpl.weak || 0,
    strength: tmpl.strength || 0,
    draw: tmpl.draw || 0,
    desc: tmpl.desc
  };
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

function initFloor(state, floorNum) {
  state.floor = floorNum;

  if (floorNum === 2) {
    // Campfire Floor
    state.mode = 'campfire';
    state.enemy = null;
    state.message = 'Campfire resting site. Choose to Rest (+25 HP) or Smith (Upgrade a card).';
  } else {
    // Combat Floor
    state.mode = 'combat';
    const enc = ENCOUNTER_DATA[floorNum];
    state.enemy = {
      name: enc.name,
      hp: enc.hp,
      maxHp: enc.maxHp,
      block: 0,
      strength: 0,
      vulnerable: 0,
      weak: 0,
      turnCount: 0,
      intents: enc.intents,
      currentIntent: enc.intents[0]
    };
    state.player.block = 0;
    state.player.energy = state.player.maxEnergy;

    // Shuffle draw deck and draw starting hand
    state.deck.push(...state.hand, ...state.discard);
    state.hand = [];
    state.discard = [];
    shuffleList(state.deck, state);
    drawCards(state, INITIAL_HAND_SIZE);

    state.message = `Ascended to Floor ${floorNum}: ${state.enemy.name} approaches!`;
  }
}

function updateEnemyIntent(enemy) {
  enemy.turnCount++;
  const cycleIdx = enemy.turnCount % enemy.intents.length;
  enemy.currentIntent = enemy.intents[cycleIdx];
}

function createState(seed = 1) {
  const safeSeed = typeof seed === 'number' ? (seed >>> 0) : 1;
  const rngInitial = (Math.imul(safeSeed ^ 0x6d2b79f5, 1) + 1) >>> 0;

  const state = {
    seed: safeSeed,
    rngState: rngInitial,
    nextCardId: 1,
    floor: 1,
    maxFloors: 4,
    mode: 'combat', // 'combat', 'reward', 'campfire'
    totalTurns: 0,
    totalActions: 0,
    totalDamageDealt: 0,
    player: {
      hp: 75,
      maxHp: 75,
      energy: 3,
      maxEnergy: 3,
      block: 0,
      strength: 0,
      vulnerable: 0,
      weak: 0
    },
    deck: [],
    hand: [],
    discard: [],
    rewardCards: [],
    enemy: null,
    done: false,
    won: false,
    message: 'Spire Crawl begins. Ascend the tower!'
  };

  // Build starter deck: 4 Strikes, 4 Defends, 1 Bash, 1 Survivor
  for (let i = 0; i < 4; i++) state.deck.push(makeCard('Strike', state));
  for (let i = 0; i < 4; i++) state.deck.push(makeCard('Defend', state));
  state.deck.push(makeCard('Bash', state));
  state.deck.push(makeCard('Survivor', state));

  initFloor(state, 1);
  return state;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  if (state.mode === 'combat') {
    // Play affordable cards in hand
    for (const card of state.hand) {
      if (card.cost <= state.player.energy) {
        actions.push(`play:${card.id}`);
      }
    }
    // End turn is always legal in combat
    actions.push('endTurn');
  } else if (state.mode === 'reward') {
    for (const name of state.rewardCards) {
      const act = `chooseReward:${name}`;
      if (!actions.includes(act)) {
        actions.push(act);
      }
    }
    actions.push('skipReward');
  } else if (state.mode === 'campfire') {
    actions.push('rest');
    // Smith upgrade any un-upgraded card in master deck
    const allCards = [...state.deck, ...state.hand, ...state.discard];
    for (const c of allCards) {
      if (!c.name.endsWith('+')) {
        const act = `smith:${c.id}`;
        if (!actions.includes(act)) {
          actions.push(act);
        }
      }
    }
  }

  return actions;
}

function applyDamage(dealer, receiver, rawDamage) {
  let dmg = rawDamage + (dealer.strength || 0);
  if (dealer.weak > 0) dmg = Math.floor(dmg * 0.75);
  if (receiver.vulnerable > 0) dmg = Math.floor(dmg * 1.5);
  dmg = Math.max(0, dmg);

  if (receiver.block >= dmg) {
    receiver.block -= dmg;
    return 0;
  }
  const unblocked = dmg - receiver.block;
  receiver.block = 0;
  receiver.hp = Math.max(0, receiver.hp - unblocked);
  return unblocked;
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

  if (state.mode === 'campfire') {
    if (action === 'rest') {
      const heal = Math.min(25, state.player.maxHp - state.player.hp);
      state.player.hp += heal;
      reward += 20;
      state.message = `Rested at the campfire (+${heal} HP). Ready to ascend!`;
      initFloor(state, 3);
    } else if (action.startsWith('smith:')) {
      const cardId = action.slice(6);
      const allCards = [...state.deck, ...state.hand, ...state.discard];
      const target = allCards.find(c => c.id === cardId);
      if (target && !target.name.endsWith('+')) {
        const upName = target.name + '+';
        const tmpl = CARD_DATABASE[upName];
        if (tmpl) {
          target.name = upName;
          target.damage = tmpl.damage || 0;
          target.block = tmpl.block || 0;
          target.vulnerable = tmpl.vulnerable || 0;
          target.weak = tmpl.weak || 0;
          target.strength = tmpl.strength || 0;
          target.desc = tmpl.desc;
          reward += 30;
          state.message = `Forged and upgraded ${target.name}!`;
        }
      }
      initFloor(state, 3);
    }
  } else if (state.mode === 'reward') {
    if (action.startsWith('chooseReward:')) {
      const cardName = action.slice(13);
      state.deck.push(makeCard(cardName, state));
      reward += 40;
      state.message = `Added ${cardName} to your deck!`;
    } else {
      state.message = 'Skipped card reward.';
    }

    // Advance floor after reward
    if (state.floor === 1) {
      initFloor(state, 2); // Go to campfire
    } else if (state.floor === 3) {
      initFloor(state, 4); // Go to final boss
    }
  } else if (state.mode === 'combat') {
    if (action.startsWith('play:')) {
      const cardId = action.slice(5);
      const idx = state.hand.findIndex(c => c.id === cardId);
      const card = state.hand[idx];

      state.player.energy -= card.cost;
      state.hand.splice(idx, 1);
      state.discard.push(card);

      if (card.block > 0) {
        state.player.block += card.block;
      }
      if (card.strength > 0) {
        state.player.strength += card.strength;
      }
      if (card.draw > 0) {
        drawCards(state, card.draw);
      }
      if (card.damage > 0) {
        const dealt = applyDamage(state.player, state.enemy, card.damage);
        state.totalDamageDealt += dealt;
        reward += dealt;
      }
      if (card.vulnerable > 0) {
        state.enemy.vulnerable += card.vulnerable;
      }
      if (card.weak > 0) {
        state.enemy.weak += card.weak;
      }

      state.message = `Played ${card.name}.`;

      // Check enemy defeat
      if (state.enemy.hp <= 0) {
        reward += 200;
        if (state.floor === 4) {
          state.won = true;
          state.done = true;
          reward += 1000;
          state.message = 'Victory! The Void Sovereign has fallen! The Spire is conquered!';
          return { reward, done: true };
        } else {
          // Open rewards
          state.mode = 'reward';
          const r1 = REWARD_POOL[Math.floor(getNextRng(state) * REWARD_POOL.length)];
          const r2 = REWARD_POOL[Math.floor(getNextRng(state) * REWARD_POOL.length)];
          const r3 = REWARD_POOL[Math.floor(getNextRng(state) * REWARD_POOL.length)];
          state.rewardCards = [r1, r2, r3];
          state.message = `${state.enemy.name} defeated! Choose a card reward or skip.`;
          return { reward, done: false };
        }
      }
    } else if (action === 'endTurn') {
      state.totalTurns++;

      // Enemy turn execution
      const intent = state.enemy.currentIntent;
      if (intent.type === 'attack') {
        const dmg = applyDamage(state.enemy, state.player, intent.damage);
        state.message = `${state.enemy.name} attacked for ${intent.damage} (${dmg} unblocked)!`;
      } else if (intent.type === 'multi_attack') {
        let totalUnblocked = 0;
        for (let i = 0; i < (intent.hits || 1); i++) {
          totalUnblocked += applyDamage(state.enemy, state.player, intent.damage);
        }
        state.message = `${state.enemy.name} executed multi-strike (${totalUnblocked} unblocked)!`;
      } else if (intent.type === 'defend') {
        state.enemy.block += intent.block || 0;
        state.message = `${state.enemy.name} gained ${intent.block} block!`;
      } else if (intent.type === 'buff') {
        state.enemy.strength += intent.strength || 0;
        if (intent.vulnerable) state.player.vulnerable += intent.vulnerable;
        state.message = `${state.enemy.name} powered up (+${intent.strength} Str)!`;
      } else if (intent.type === 'attack_buff') {
        const dmg = applyDamage(state.enemy, state.player, intent.damage);
        state.enemy.strength += intent.strength || 0;
        state.message = `${state.enemy.name} flared for ${dmg} dmg and gained +${intent.strength} Str!`;
      }

      // Check player defeat
      if (state.player.hp <= 0) {
        state.done = true;
        state.won = false;
        reward -= 200;
        state.message = 'Defeat! Slain within the depths of the Spire.';
        return { reward, done: true };
      }

      // Decrement turn statuses
      if (state.player.vulnerable > 0) state.player.vulnerable--;
      if (state.player.weak > 0) state.player.weak--;
      if (state.enemy.vulnerable > 0) state.enemy.vulnerable--;
      if (state.enemy.weak > 0) state.enemy.weak--;

      // Reset block & energy for player turn
      state.player.block = 0;
      state.player.energy = state.player.maxEnergy;

      // Discard current hand and draw 5
      state.discard.push(...state.hand);
      state.hand = [];
      drawCards(state, INITIAL_HAND_SIZE);

      // Enemy plans next turn
      updateEnemyIntent(state.enemy);
    }
  }

  if (!state.done && (state.totalTurns >= MAX_TURNS || state.totalActions >= MAX_TOTAL_ACTIONS)) {
    state.done = true;
    state.won = false;
    reward -= 100;
    state.message = 'Exceeded turn limit in the spire.';
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return (
    (state.floor - 1) * 500 +
    state.totalDamageDealt * 5 +
    state.player.hp * 10 +
    (state.won ? 1000 : 0) -
    state.totalTurns * 5
  );
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CARD_DATABASE,
    REWARD_POOL,
    ENCOUNTER_DATA,
    MAX_TURNS,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
