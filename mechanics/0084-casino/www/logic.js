(function (root) {
  'use strict';

  const START_BANKROLL = 500;
  const TARGET_BANKROLL = 1500;
  const MAX_SPINS = 25;
  const MAX_STEPS = 120;
  const CHIP_UNIT = 25;

  const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

  function nextRandom(state) {
    state.rngState = ((state.rngState * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return state.rngState / 0x7fffffff;
  }

  function createState(seed = 12345) {
    return {
      bankroll: START_BANKROLL,
      bets: [], // array of { type, amt }
      lastWinningNumber: null,
      history: [],
      spinCount: 0,
      stepCount: 0,
      gameOver: false,
      winner: null,
      log: ['Welcome to Grand Casino Roulette! Minimum bet is 25 chips.'],
      rngState: (seed >>> 0) || 12345,
    };
  }

  function isOver(state) {
    if (state.gameOver) return true;
    if (state.bankroll >= TARGET_BANKROLL) return true;
    if (state.bankroll < CHIP_UNIT && state.bets.length === 0) return true;
    if (state.spinCount >= MAX_SPINS) return true;
    if (state.stepCount >= MAX_STEPS) return true;
    return false;
  }

  function score(state) {
    let onTable = 0;
    for (let i = 0; i < state.bets.length; i++) onTable += state.bets[i].amt;
    return state.bankroll + onTable;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = [];

    // If bets placed on table, can spin or clear
    if (state.bets.length > 0) {
      actions.push('spin');
      actions.push('clear_bets');
    }

    // Placing bets (if enough chips remaining in bankroll)
    if (state.bankroll >= CHIP_UNIT) {
      actions.push('bet:red:25');
      actions.push('bet:black:25');
      actions.push('bet:even:25');
      actions.push('bet:odd:25');
      actions.push('bet:low:25');
      actions.push('bet:high:25');
      actions.push('bet:dozen1:25');
      actions.push('bet:dozen2:25');
      actions.push('bet:dozen3:25');

      // Key inside single-number wagers (0, 7, 17, 23, etc.)
      for (let n = 0; n <= 36; n++) {
        actions.push(`bet:num_${n}:25`);
      }
    }

    return actions;
  }

  function evaluateSpin(state) {
    const winNum = Math.floor(nextRandom(state) * 37); // 0 to 36
    state.lastWinningNumber = winNum;
    state.history.push(winNum);

    const isRed = RED_NUMBERS.includes(winNum);
    const isBlack = BLACK_NUMBERS.includes(winNum);
    const isEven = winNum > 0 && winNum % 2 === 0;
    const isOdd = winNum > 0 && winNum % 2 === 1;
    const isLow = winNum >= 1 && winNum <= 18;
    const isHigh = winNum >= 19 && winNum <= 36;
    const isDozen1 = winNum >= 1 && winNum <= 12;
    const isDozen2 = winNum >= 13 && winNum <= 24;
    const isDozen3 = winNum >= 25 && winNum <= 36;

    let totalPayout = 0;
    let totalWagered = 0;

    for (let i = 0; i < state.bets.length; i++) {
      const b = state.bets[i];
      totalWagered += b.amt;
      let won = false;
      let mult = 0;

      if (b.type === 'red' && isRed) { won = true; mult = 2; }
      else if (b.type === 'black' && isBlack) { won = true; mult = 2; }
      else if (b.type === 'even' && isEven) { won = true; mult = 2; }
      else if (b.type === 'odd' && isOdd) { won = true; mult = 2; }
      else if (b.type === 'low' && isLow) { won = true; mult = 2; }
      else if (b.type === 'high' && isHigh) { won = true; mult = 2; }
      else if (b.type === 'dozen1' && isDozen1) { won = true; mult = 3; }
      else if (b.type === 'dozen2' && isDozen2) { won = true; mult = 3; }
      else if (b.type === 'dozen3' && isDozen3) { won = true; mult = 3; }
      else if (b.type.startsWith('num_')) {
        const betNum = parseInt(b.type.split('_')[1], 10);
        if (betNum === winNum) { won = true; mult = 36; }
      }

      if (won) {
        totalPayout += b.amt * mult;
      }
    }

    state.bankroll += totalPayout;
    state.bets = [];
    state.spinCount += 1;

    const net = totalPayout - totalWagered;
    const colorLabel = winNum === 0 ? 'GREEN' : isRed ? 'RED' : 'BLACK';
    state.log.push(`🎰 Ball landed on ${winNum} ${colorLabel}! Payout: +${totalPayout} chips (Net: ${net >= 0 ? '+' : ''}${net}).`);

    return net;
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

    if (action.startsWith('bet:')) {
      const parts = action.split(':');
      const bType = parts[1];
      const amt = parseInt(parts[2], 10);

      state.bankroll -= amt;
      state.bets.push({ type: bType, amt });
      reward = 1;
    } else if (action === 'clear_bets') {
      let returned = 0;
      for (let i = 0; i < state.bets.length; i++) returned += state.bets[i].amt;
      state.bankroll += returned;
      state.bets = [];
      reward = 0;
    } else if (action === 'spin') {
      const net = evaluateSpin(state);
      reward = Math.floor(net / CHIP_UNIT);
    }

    state.stepCount += 1;

    // Check game conditions
    if (state.bankroll >= TARGET_BANKROLL) {
      state.gameOver = true;
      state.winner = 'player';
      reward += 50;
      state.log.push('🏆 HIGH-ROLLER VICTORY! You accumulated 1,500+ chips!');
    } else if (state.bankroll < CHIP_UNIT && state.bets.length === 0) {
      state.gameOver = true;
      state.winner = 'house';
      reward -= 30;
      state.log.push('💀 BUST! You ran out of chips.');
    } else if (state.spinCount >= MAX_SPINS) {
      state.gameOver = true;
      state.winner = state.bankroll >= START_BANKROLL ? 'player' : 'house';
      state.log.push(`25 Spins Completed! Final Bankroll: ${state.bankroll} chips.`);
    }

    const done = isOver(state);
    return { reward, done };
  }

  const casinoLogic = {
    START_BANKROLL,
    TARGET_BANKROLL,
    MAX_SPINS,
    MAX_STEPS,
    CHIP_UNIT,
    RED_NUMBERS,
    BLACK_NUMBERS,
    createState,
    legalActions,
    isOver,
    score,
    step,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = casinoLogic;
  } else {
    root.casinoLogic = casinoLogic;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
