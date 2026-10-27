(function (root) {
  'use strict';

  const MAX_ROUNDS = 8;
  const MAX_STEPS = 150;
  const MAX_BENCH = 4;

  const CHAMPIONS = {
    swordsman:    { id: 'swordsman',    name: 'Swordsman',    cost: 1, trait: 'warrior',  hp: 30, atk: 8,  maxMana: 3, abilityDmg: 14 },
    archer:       { id: 'archer',       name: 'Archer',       cost: 1, trait: 'assassin', hp: 20, atk: 10, maxMana: 3, abilityDmg: 20 },
    apprentice:   { id: 'apprentice',   name: 'Apprentice',   cost: 1, trait: 'mage',     hp: 18, atk: 7,  maxMana: 3, abilityDmg: 18 },
    guardian:     { id: 'guardian',     name: 'Guardian',     cost: 2, trait: 'warrior',  hp: 45, atk: 7,  maxMana: 4, abilityDmg: 10, shield: 25 },
    pyromancer:   { id: 'pyromancer',   name: 'Pyromancer',   cost: 2, trait: 'mage',     hp: 24, atk: 11, maxMana: 3, abilityDmg: 25 },
    shadow_blade: { id: 'shadow_blade', name: 'Shadow Blade', cost: 2, trait: 'assassin', hp: 25, atk: 14, maxMana: 3, abilityDmg: 28 },
    titan:        { id: 'titan',        name: 'Stone Titan',  cost: 3, trait: 'warrior',  hp: 60, atk: 12, maxMana: 4, abilityDmg: 22 },
    archmage:     { id: 'archmage',     name: 'Archmage',     cost: 3, trait: 'mage',     hp: 30, atk: 16, maxMana: 4, abilityDmg: 35 },
  };

  const CHAMPION_KEYS = Object.keys(CHAMPIONS);

  function nextRandom(state) {
    state.rngState = ((state.rngState * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return state.rngState / 0x7fffffff;
  }

  function createUnit(champId, star = 1) {
    const base = CHAMPIONS[champId];
    const multHp = star === 1 ? 1 : 2;
    const multAtk = star === 1 ? 1 : 1.8;
    return {
      champId: base.id,
      name: base.name + (star > 1 ? ' ★2' : ''),
      star,
      cost: base.cost,
      trait: base.trait,
      hp: Math.floor(base.hp * multHp),
      maxHp: Math.floor(base.hp * multHp),
      atk: Math.floor(base.atk * multAtk),
      mana: 0,
      maxMana: base.maxMana,
      abilityDmg: Math.floor(base.abilityDmg * (star === 1 ? 1 : 1.7)),
      shield: base.shield ? base.shield * star : 0,
    };
  }

  function rollShop(state) {
    const shop = [];
    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(nextRandom(state) * CHAMPION_KEYS.length);
      shop.push(CHAMPION_KEYS[idx]);
    }
    return shop;
  }

  function checkTripleMerge(state) {
    // Check all champion types for 3x 1-stars across bench and board
    for (let i = 0; i < CHAMPION_KEYS.length; i++) {
      const cId = CHAMPION_KEYS[i];
      const matchBench = [];
      const matchBoard = [];

      for (let b = 0; b < state.bench.length; b++) {
        if (state.bench[b] && state.bench[b].champId === cId && state.bench[b].star === 1) {
          matchBench.push(b);
        }
      }
      for (let b = 0; b < state.board.length; b++) {
        if (state.board[b] && state.board[b].champId === cId && state.board[b].star === 1) {
          matchBoard.push(b);
        }
      }

      const totalMatches = matchBench.length + matchBoard.length;
      if (totalMatches >= 3) {
        // Remove 3 copies
        let toRemove = 3;
        let upgradedOnBoard = false;

        // Keep 1 slot on board if possible, else on bench
        if (matchBoard.length > 0) {
          upgradedOnBoard = true;
          const keepIdx = matchBoard[0];
          state.board[keepIdx] = createUnit(cId, 2);
          toRemove -= 1;
          for (let m = 1; m < matchBoard.length && toRemove > 0; m++) {
            state.board.splice(matchBoard[m], 1);
            toRemove -= 1;
          }
          for (let m = 0; m < matchBench.length && toRemove > 0; m++) {
            state.bench.splice(matchBench[m], 1);
            toRemove -= 1;
          }
        } else {
          const keepIdx = matchBench[0];
          state.bench[keepIdx] = createUnit(cId, 2);
          toRemove -= 1;
          for (let m = 1; m < matchBench.length && toRemove > 0; m++) {
            state.bench.splice(matchBench[m], 1);
            toRemove -= 1;
          }
        }
        state.combatLog.push(`★ UPGRADE! 3x ${CHAMPIONS[cId].name} fused into ★2!`);
      }
    }
  }

  function getAiOpponentSquad(round) {
    const units = [];
    if (round === 1) {
      units.push(createUnit('swordsman', 1));
    } else if (round === 2) {
      units.push(createUnit('swordsman', 1), createUnit('apprentice', 1));
    } else if (round === 3) {
      units.push(createUnit('swordsman', 1), createUnit('archer', 1), createUnit('swordsman', 1));
    } else if (round === 4) {
      units.push(createUnit('guardian', 1), createUnit('pyromancer', 1), createUnit('archer', 1));
    } else if (round === 5) {
      units.push(createUnit('titan', 1), createUnit('shadow_blade', 1), createUnit('pyromancer', 1));
    } else if (round === 6) {
      units.push(createUnit('titan', 1), createUnit('archmage', 1), createUnit('shadow_blade', 1), createUnit('guardian', 1));
    } else if (round === 7) {
      units.push(createUnit('titan', 2), createUnit('archmage', 1), createUnit('shadow_blade', 1));
    } else {
      units.push(createUnit('titan', 2), createUnit('archmage', 2), createUnit('shadow_blade', 2));
    }
    return units;
  }

  function createState(seed = 12345) {
    const s = {
      playerHp: 50,
      enemyHp: 50,
      gold: 5,
      level: 2,
      xp: 0,
      round: 1,
      bench: [],
      board: [],
      shop: [],
      stepCount: 0,
      gameOver: false,
      winner: null,
      combatLog: [],
      rngState: (seed >>> 0) || 12345,
    };

    // Initial starter unit
    s.board.push(createUnit('swordsman', 1));
    s.shop = rollShop(s);
    return s;
  }

  function getTraitCounts(units) {
    const counts = { warrior: 0, mage: 0, assassin: 0 };
    for (let i = 0; i < units.length; i++) {
      if (units[i] && counts[units[i].trait] !== undefined) {
        counts[units[i].trait] += 1;
      }
    }
    return counts;
  }

  function simulateBattleRound(state) {
    const pArmy = state.board.map(u => ({ ...u, curHp: u.hp, curShield: u.shield || 0, curMana: 0 }));
    const eArmy = getAiOpponentSquad(state.round).map(u => ({ ...u, curHp: u.hp, curShield: u.shield || 0, curMana: 0 }));

    // Apply traits
    const pTraits = getTraitCounts(pArmy);
    const eTraits = getTraitCounts(eArmy);

    if (pTraits.warrior >= 2) {
      for (const u of pArmy) u.curShield += 15;
    }
    if (eTraits.warrior >= 2) {
      for (const u of eArmy) u.curShield += 15;
    }

    let pTurn = true;
    let ticks = 0;

    while (pArmy.some(u => u.curHp > 0) && eArmy.some(u => u.curHp > 0) && ticks < 40) {
      ticks += 1;
      const attackers = pTurn ? pArmy.filter(u => u.curHp > 0) : eArmy.filter(u => u.curHp > 0);
      const defenders = pTurn ? eArmy.filter(u => u.curHp > 0) : pArmy.filter(u => u.curHp > 0);

      if (attackers.length === 0 || defenders.length === 0) break;

      const att = attackers[Math.floor(nextRandom(state) * attackers.length)];
      const def = defenders[0]; // frontline focus

      // Check ability cast
      if (att.curMana >= att.maxMana) {
        let dmg = att.abilityDmg;
        const traits = pTurn ? pTraits : eTraits;
        if (traits.mage >= 2) dmg = Math.floor(dmg * 1.5);

        // Apply damage to defender shield & HP
        if (def.curShield > 0) {
          if (def.curShield >= dmg) {
            def.curShield -= dmg;
            dmg = 0;
          } else {
            dmg -= def.curShield;
            def.curShield = 0;
          }
        }
        def.curHp -= dmg;
        att.curMana = 0;
        state.combatLog.push(`${att.name} casts ULTIMATE for ${att.abilityDmg} damage!`);
      } else {
        // Basic attack
        let dmg = att.atk;
        const traits = pTurn ? pTraits : eTraits;
        if (traits.assassin >= 2 && nextRandom(state) < 0.3) {
          dmg = Math.floor(dmg * 2);
          state.combatLog.push(`CRITICAL HIT by ${att.name}!`);
        }

        if (def.curShield > 0) {
          if (def.curShield >= dmg) {
            def.curShield -= dmg;
            dmg = 0;
          } else {
            dmg -= def.curShield;
            def.curShield = 0;
          }
        }
        def.curHp -= dmg;
        att.curMana += 1;
      }

      pTurn = !pTurn;
    }

    const pSurvivors = pArmy.filter(u => u.curHp > 0).length;
    const eSurvivors = eArmy.filter(u => u.curHp > 0).length;

    let roundReward = 0;
    if (pSurvivors > 0) {
      const dmgToEnemy = 3 + pSurvivors * 2;
      state.enemyHp = Math.max(0, state.enemyHp - dmgToEnemy);
      roundReward = 15 + pSurvivors * 3;
      state.combatLog.push(`Victory in Round ${state.round}! Dealt ${dmgToEnemy} damage to rival.`);
    } else {
      const dmgToPlayer = 3 + eSurvivors * 2;
      state.playerHp = Math.max(0, state.playerHp - dmgToPlayer);
      roundReward = -10;
      state.combatLog.push(`Defeat in Round ${state.round}! Took ${dmgToPlayer} damage.`);
    }

    // Advance Round & Income
    state.round += 1;
    const interest = Math.min(3, Math.floor(state.gold / 10));
    state.gold += 5 + interest;
    state.shop = rollShop(state);

    return roundReward;
  }

  function isOver(state) {
    if (state.gameOver) return true;
    if (state.playerHp <= 0 || state.enemyHp <= 0) return true;
    if (state.round > MAX_ROUNDS) return true;
    if (state.stepCount >= MAX_STEPS) return true;
    return false;
  }

  function score(state) {
    let boardVal = 0;
    for (let i = 0; i < state.board.length; i++) {
      boardVal += state.board[i].hp + state.board[i].atk * 2;
    }
    return state.playerHp * 2 - state.enemyHp + state.gold + boardVal;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = [];

    // Buy from shop
    if (state.bench.length < MAX_BENCH) {
      for (let i = 0; i < state.shop.length; i++) {
        const cId = state.shop[i];
        if (cId && state.gold >= CHAMPIONS[cId].cost) {
          actions.push(`buy:${i}`);
        }
      }
    }

    // Deploy from bench to board
    if (state.board.length < state.level) {
      for (let b = 0; b < state.bench.length; b++) {
        actions.push(`deploy:${b}`);
      }
    }

    // Return from board to bench
    if (state.bench.length < MAX_BENCH) {
      for (let b = 0; b < state.board.length; b++) {
        actions.push(`bench:${b}`);
      }
    }

    // Sell unit from bench
    for (let b = 0; b < state.bench.length; b++) {
      actions.push(`sell:${b}`);
    }

    // Reroll shop
    if (state.gold >= 1) {
      actions.push('reroll');
    }

    // Level up
    if (state.gold >= 4 && state.level < 6) {
      actions.push('level_up');
    }

    // Fight round
    actions.push('fight');

    return actions;
  }

  function step(state, action) {
    if (!action || typeof action !== 'string') {
      throw new Error('Invalid action format: ' + action);
    }
    if (isOver(state)) {
      throw new Error('Game is already over');
    }

    const legal = legalActions(state);
    if (!legal.includes(action)) {
      throw new Error('Illegal action: ' + action);
    }

    let reward = 0;

    if (action.startsWith('buy:')) {
      const idx = parseInt(action.split(':')[1], 10);
      const cId = state.shop[idx];
      const champ = CHAMPIONS[cId];
      state.gold -= champ.cost;
      state.bench.push(createUnit(cId, 1));
      state.shop[idx] = null; // purchased
      checkTripleMerge(state);
      reward += 1;
    } else if (action.startsWith('deploy:')) {
      const bIdx = parseInt(action.split(':')[1], 10);
      const unit = state.bench.splice(bIdx, 1)[0];
      state.board.push(unit);
      reward += 1;
    } else if (action.startsWith('bench:')) {
      const bIdx = parseInt(action.split(':')[1], 10);
      const unit = state.board.splice(bIdx, 1)[0];
      state.bench.push(unit);
    } else if (action.startsWith('sell:')) {
      const bIdx = parseInt(action.split(':')[1], 10);
      const unit = state.bench.splice(bIdx, 1)[0];
      state.gold += unit.cost * unit.star;
    } else if (action === 'reroll') {
      state.gold -= 1;
      state.shop = rollShop(state);
    } else if (action === 'level_up') {
      state.gold -= 4;
      state.xp += 4;
      const reqXp = state.level * 4;
      if (state.xp >= reqXp && state.level < 6) {
        state.xp -= reqXp;
        state.level += 1;
        reward += 5;
        state.combatLog.push(`Level Up! Capacity increased to ${state.level}`);
      }
    } else if (action === 'fight') {
      const roundRwd = simulateBattleRound(state);
      reward += roundRwd;
    }

    state.stepCount += 1;

    // Check game termination
    if (state.enemyHp <= 0 || (state.round > MAX_ROUNDS && state.playerHp > state.enemyHp)) {
      state.gameOver = true;
      state.winner = 'player';
      reward += 30;
    } else if (state.playerHp <= 0 || (state.round > MAX_ROUNDS && state.playerHp <= state.enemyHp)) {
      state.gameOver = true;
      state.winner = 'enemy';
      reward -= 20;
    } else if (state.stepCount >= MAX_STEPS) {
      state.gameOver = true;
      state.winner = state.playerHp >= state.enemyHp ? 'player' : 'enemy';
    }

    const done = isOver(state);
    return { reward, done };
  }

  const autoBattlerLogic = {
    CHAMPIONS,
    MAX_ROUNDS,
    MAX_STEPS,
    MAX_BENCH,
    createState,
    legalActions,
    isOver,
    score,
    step,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = autoBattlerLogic;
  } else {
    root.autoBattlerLogic = autoBattlerLogic;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
