// Pure deterministic logic for 0076: Trading Card Game (Mythic TCG)

const MAX_HERO_HP = 30;
const MAX_MANA = 10;
const MAX_TURNS = 50;
const MAX_TOTAL_ACTIONS = 250;
const MAX_BOARD_SIZE = 5;

const CARD_TEMPLATES = {
  // Minions
  Shieldbearer: { name: 'Shieldbearer', type: 'minion', cost: 1, attack: 0, hp: 4, taunt: true },
  BloodfenRaptor: { name: 'Bloodfen Raptor', type: 'minion', cost: 2, attack: 3, hp: 2 },
  NoviceEngineer: { name: 'Novice Engineer', type: 'minion', cost: 2, attack: 1, hp: 1, battlecry: 'draw' },
  FrostfangShaman: { name: 'Frostfang Shaman', type: 'minion', cost: 3, attack: 2, hp: 3, battlecry: 'face2' },
  SenjinGuardian: { name: 'Senjin Guardian', type: 'minion', cost: 4, attack: 3, hp: 5, taunt: true },
  StormpikeLancer: { name: 'Stormpike Lancer', type: 'minion', cost: 5, attack: 4, hp: 4, charge: true },
  BoulderfistBehemoth: { name: 'Boulderfist Behemoth', type: 'minion', cost: 6, attack: 6, hp: 7 },

  // Spells
  ArcaneShot: { name: 'Arcane Shot', type: 'spell', cost: 1, target: true, damage: 2 },
  Frostbolt: { name: 'Frostbolt', type: 'spell', cost: 2, target: true, damage: 3 },
  Fireball: { name: 'Fireball', type: 'spell', cost: 4, target: true, damage: 6 },
  HolyLight: { name: 'Holy Light', type: 'spell', cost: 2, heal: 6 },
  Flamestrike: { name: 'Flamestrike', type: 'spell', cost: 7, aoe: 4 }
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

function createCard(key, state) {
  const tmpl = CARD_TEMPLATES[key];
  return {
    id: `c_${state.nextCardId++}`,
    key,
    name: tmpl.name,
    type: tmpl.type,
    cost: tmpl.cost,
    attack: tmpl.attack || 0,
    hp: tmpl.hp || 0,
    maxHp: tmpl.hp || 0,
    taunt: tmpl.taunt || false,
    charge: tmpl.charge || false,
    battlecry: tmpl.battlecry || null,
    target: tmpl.target || false,
    damage: tmpl.damage || 0,
    heal: tmpl.heal || 0,
    aoe: tmpl.aoe || 0
  };
}

function buildLibrary(state) {
  const deckKeys = [
    'Shieldbearer', 'Shieldbearer',
    'BloodfenRaptor', 'BloodfenRaptor',
    'NoviceEngineer', 'NoviceEngineer',
    'FrostfangShaman', 'FrostfangShaman',
    'SenjinGuardian', 'SenjinGuardian',
    'StormpikeLancer', 'StormpikeLancer',
    'BoulderfistBehemoth', 'BoulderfistBehemoth',
    'ArcaneShot', 'ArcaneShot',
    'Frostbolt', 'Frostbolt',
    'Fireball', 'Fireball',
    'HolyLight', 'HolyLight',
    'Flamestrike', 'Flamestrike'
  ];
  const deck = deckKeys.map(k => createCard(k, state));
  shuffleList(deck, state);
  return deck;
}

function drawCard(hand, deck, state) {
  if (deck.length > 0 && hand.length < 10) {
    hand.push(deck.pop());
  }
}

function createState(seed = 1) {
  const safeSeed = typeof seed === 'number' ? (seed >>> 0) : 1;
  const rngInitial = (Math.imul(safeSeed ^ 0x6d2b79f5, 1) + 1) >>> 0;

  const state = {
    seed: safeSeed,
    rngState: rngInitial,
    nextCardId: 1,
    turn: 1,
    maxTurns: MAX_TURNS,
    totalActions: 0,
    player: {
      hp: MAX_HERO_HP,
      maxHp: MAX_HERO_HP,
      mana: 1,
      maxMana: 1,
      deck: [],
      hand: [],
      board: []
    },
    opp: {
      hp: MAX_HERO_HP,
      maxHp: MAX_HERO_HP,
      mana: 1,
      maxMana: 1,
      deck: [],
      hand: [],
      board: []
    },
    done: false,
    won: false,
    message: 'Welcome to Mythic TCG. Mana crystals crystalize!'
  };

  state.player.deck = buildLibrary(state);
  state.opp.deck = buildLibrary(state);

  // Initial hand: 3 cards each
  for (let i = 0; i < 3; i++) {
    drawCard(state.player.hand, state.player.deck, state);
    drawCard(state.opp.hand, state.opp.deck, state);
  }

  return state;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const p = state.player;
  const o = state.opp;

  // 1. Play Cards from Hand
  for (const card of p.hand) {
    if (card.cost <= p.mana) {
      if (card.type === 'minion') {
        if (p.board.length < MAX_BOARD_SIZE) {
          actions.push(`play:${card.id}`);
        }
      } else if (card.type === 'spell') {
        if (card.target) {
          // Targeted spells (Arcane Shot, Frostbolt, Fireball)
          actions.push(`play:${card.id},opp_hero`);
          for (const em of o.board) {
            actions.push(`play:${card.id},${em.id}`);
          }
        } else {
          // Non-targeted spells (Holy Light, Flamestrike)
          actions.push(`play:${card.id}`);
        }
      }
    }
  }

  // 2. Attack with Ready Minions
  const hasTaunt = o.board.some(m => m.taunt);
  for (const pm of p.board) {
    if (pm.canAttack && !pm.hasAttacked && pm.attack > 0) {
      if (hasTaunt) {
        for (const em of o.board) {
          if (em.taunt) {
            actions.push(`attack:${pm.id},${em.id}`);
          }
        }
      } else {
        actions.push(`attack:${pm.id},opp_hero`);
        for (const em of o.board) {
          actions.push(`attack:${pm.id},${em.id}`);
        }
      }
    }
  }

  // 3. End Turn
  actions.push('endTurn');
  return actions;
}

function resolveMinionCombat(attacker, defender) {
  defender.hp -= attacker.attack;
  attacker.hp -= defender.attack;
}

function cleanDeadMinions(board) {
  return board.filter(m => m.hp > 0);
}

function runOpponentTurn(state) {
  const o = state.opp;
  const p = state.player;

  // Start of Turn
  if (o.maxMana < MAX_MANA) o.maxMana++;
  o.mana = o.maxMana;
  drawCard(o.hand, o.deck, state);

  // Ready all opponent minions
  for (const m of o.board) {
    m.canAttack = true;
    m.hasAttacked = false;
  }

  // 1. Opponent Minions Attack
  for (const om of o.board) {
    if (!om.canAttack || om.hasAttacked || om.attack <= 0) continue;

    // Check player taunt
    const playerTaunts = p.board.filter(m => m.taunt);
    if (playerTaunts.length > 0) {
      const target = playerTaunts[0];
      resolveMinionCombat(om, target);
      om.hasAttacked = true;
    } else {
      // Check favorable trades
      const killable = p.board.find(pm => pm.hp <= om.attack && pm.attack < om.hp);
      if (killable) {
        resolveMinionCombat(om, killable);
        om.hasAttacked = true;
      } else {
        // Strike hero face
        p.hp -= om.attack;
        om.hasAttacked = true;
      }
    }
    p.board = cleanDeadMinions(p.board);
    o.board = cleanDeadMinions(o.board);
    if (p.hp <= 0) break;
  }

  // 2. Opponent Plays Cards from Hand
  o.hand.sort((a, b) => b.cost - a.cost);
  for (let i = o.hand.length - 1; i >= 0; i--) {
    const card = o.hand[i];
    if (card.cost <= o.mana) {
      if (card.type === 'minion' && o.board.length < MAX_BOARD_SIZE) {
        o.mana -= card.cost;
        o.hand.splice(i, 1);
        const minion = {
          ...card,
          canAttack: card.charge || false,
          hasAttacked: false
        };
        o.board.push(minion);
        if (card.battlecry === 'draw') drawCard(o.hand, o.deck, state);
        if (card.battlecry === 'face2') p.hp -= 2;
      } else if (card.type === 'spell') {
        if (card.name === 'Holy Light' && o.hp < MAX_HERO_HP) {
          o.mana -= card.cost;
          o.hand.splice(i, 1);
          o.hp = Math.min(MAX_HERO_HP, o.hp + 6);
        } else if (card.name === 'Flamestrike' && p.board.length >= 2) {
          o.mana -= card.cost;
          o.hand.splice(i, 1);
          for (const pm of p.board) pm.hp -= 4;
          p.board = cleanDeadMinions(p.board);
        } else if (card.target) {
          // Shoot biggest player minion or face
          o.mana -= card.cost;
          o.hand.splice(i, 1);
          if (p.board.length > 0) {
            p.board[0].hp -= card.damage;
            p.board = cleanDeadMinions(p.board);
          } else {
            p.hp -= card.damage;
          }
        }
      }
    }
  }

  // End of Opponent Turn -> Return to Player
  if (p.hp <= 0) {
    state.done = true;
    state.won = false;
    state.message = 'Defeat! Your champion has fallen in duel.';
    return;
  }

  state.turn++;
  if (p.maxMana < MAX_MANA) p.maxMana++;
  p.mana = p.maxMana;
  drawCard(p.hand, p.deck, state);

  // Ready all player minions
  for (const m of p.board) {
    m.canAttack = true;
    m.hasAttacked = false;
  }

  state.message = `Turn ${state.turn}: Mana refueled to ${p.mana}. Command your champions!`;
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

  const p = state.player;
  const o = state.opp;

  if (action === 'endTurn') {
    runOpponentTurn(state);
  } else if (action.startsWith('play:')) {
    const payload = action.slice(5);
    const [cardId, targetId] = payload.split(',');
    const cardIdx = p.hand.findIndex(c => c.id === cardId);
    const card = p.hand[cardIdx];

    p.mana -= card.cost;
    p.hand.splice(cardIdx, 1);

    if (card.type === 'minion') {
      const minion = {
        ...card,
        canAttack: card.charge || false,
        hasAttacked: false
      };
      p.board.push(minion);
      reward += 15;
      state.message = `Summoned ${card.name} (${card.attack}/${card.hp})!`;

      if (card.battlecry === 'draw') {
        drawCard(p.hand, p.deck, state);
        state.message += ' Battlecry: Drew a card!';
      } else if (card.battlecry === 'face2') {
        o.hp -= 2;
        reward += 10;
        state.message += ' Battlecry: Dealt 2 damage to enemy champion!';
      }
    } else if (card.type === 'spell') {
      if (card.name === 'Holy Light') {
        const healAmt = Math.min(6, MAX_HERO_HP - p.hp);
        p.hp += healAmt;
        reward += 20;
        state.message = `Cast Holy Light: Restored ${healAmt} Health!`;
      } else if (card.name === 'Flamestrike') {
        for (const em of o.board) {
          em.hp -= 4;
        }
        o.board = cleanDeadMinions(o.board);
        reward += 40;
        state.message = 'Cast Flamestrike: Scorched enemy board for 4 damage!';
      } else if (card.target) {
        if (targetId === 'opp_hero') {
          o.hp -= card.damage;
          reward += card.damage * 5;
          state.message = `Cast ${card.name} dealing ${card.damage} damage to enemy champion!`;
        } else {
          const em = o.board.find(m => m.id === targetId);
          if (em) {
            em.hp -= card.damage;
            reward += card.damage * 4;
            state.message = `Cast ${card.name} dealing ${card.damage} damage to ${em.name}!`;
            o.board = cleanDeadMinions(o.board);
          }
        }
      }
    }
  } else if (action.startsWith('attack:')) {
    const payload = action.slice(7);
    const [minionId, targetId] = payload.split(',');
    const pm = p.board.find(m => m.id === minionId);

    pm.hasAttacked = true;

    if (targetId === 'opp_hero') {
      o.hp -= pm.attack;
      reward += pm.attack * 5;
      state.message = `${pm.name} struck enemy champion for ${pm.attack} damage!`;
    } else {
      const em = o.board.find(m => m.id === targetId);
      if (em) {
        resolveMinionCombat(pm, em);
        reward += 20;
        state.message = `${pm.name} clashed with ${em.name}!`;
        p.board = cleanDeadMinions(p.board);
        o.board = cleanDeadMinions(o.board);
      }
    }
  }

  // Check Victory / Defeat conditions
  if (o.hp <= 0) {
    state.done = true;
    state.won = true;
    reward += 1000;
    state.message = 'Champion Victorious! Enemy champion has been conquered!';
  } else if (p.hp <= 0) {
    state.done = true;
    state.won = false;
    reward -= 200;
    state.message = 'Defeat! Your champion has perished in duel.';
  } else if (state.turn >= state.maxTurns || state.totalActions >= MAX_TOTAL_ACTIONS) {
    state.done = true;
    state.won = (p.hp > o.hp);
    state.message = 'Duel turn limit reached.';
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return (
    (MAX_HERO_HP - state.opp.hp) * 50 +
    state.player.hp * 20 +
    (state.won ? 1000 : 0) -
    state.turn * 10
  );
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MAX_HERO_HP,
    MAX_MANA,
    MAX_TURNS,
    MAX_BOARD_SIZE,
    CARD_TEMPLATES,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
