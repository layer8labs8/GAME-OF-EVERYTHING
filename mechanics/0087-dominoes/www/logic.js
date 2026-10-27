(function (root) {
  'use strict';

  const MAX_STEPS = 120;

  function nextRandom(state) {
    state.rngState = ((state.rngState * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return state.rngState / 0x7fffffff;
  }

  function generateFullSet() {
    const tiles = [];
    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) {
        tiles.push([i, j]);
      }
    }
    return tiles;
  }

  function shuffle(arr, state) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(nextRandom(state) * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function sumPips(hand) {
    let sum = 0;
    for (let i = 0; i < hand.length; i++) {
      sum += hand[i][0] + hand[i][1];
    }
    return sum;
  }

  function createState(seed = 12345) {
    const s = {
      boneyard: [],
      playerHand: [],
      aiHand: [],
      chain: [],
      leftEnd: null,
      rightEnd: null,
      consecutivePasses: 0,
      playerScore: 0,
      aiScore: 0,
      stepCount: 0,
      gameOver: false,
      winner: null,
      log: ['Game started. Match matching pip ends!'],
      rngState: (seed >>> 0) || 12345,
    };

    const tiles = generateFullSet();
    shuffle(tiles, s);

    s.playerHand = tiles.splice(0, 7);
    s.aiHand = tiles.splice(0, 7);
    s.boneyard = tiles; // 14 tiles remaining

    return s;
  }

  function isOver(state) {
    if (state.gameOver) return true;
    if (state.playerHand.length === 0 || state.aiHand.length === 0) return true;
    if (state.consecutivePasses >= 2) return true;
    if (state.stepCount >= MAX_STEPS) return true;
    return false;
  }

  function score(state) {
    return state.playerScore - state.aiScore;
  }

  function getPlayableActionsForHand(hand, leftEnd, rightEnd) {
    const plays = [];
    if (leftEnd === null) {
      // First tile of the game
      for (let i = 0; i < hand.length; i++) {
        plays.push(`play:${i}:left`);
      }
      return plays;
    }

    for (let i = 0; i < hand.length; i++) {
      const a = hand[i][0];
      const b = hand[i][1];

      if (a === leftEnd || b === leftEnd) {
        plays.push(`play:${i}:left`);
      }
      if (a === rightEnd || b === rightEnd) {
        plays.push(`play:${i}:right`);
      }
    }
    return plays;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const plays = getPlayableActionsForHand(state.playerHand, state.leftEnd, state.rightEnd);
    if (plays.length > 0) {
      return plays;
    }

    // No direct plays
    if (state.boneyard.length > 0) {
      return ['draw'];
    }

    return ['pass'];
  }

  function applyTilePlacement(hand, idx, end, state) {
    const tile = hand.splice(idx, 1)[0];
    const a = tile[0];
    const b = tile[1];

    if (state.chain.length === 0) {
      state.chain.push([a, b]);
      state.leftEnd = a;
      state.rightEnd = b;
    } else if (end === 'left') {
      if (b === state.leftEnd) {
        state.chain.unshift([a, b]);
        state.leftEnd = a;
      } else {
        state.chain.unshift([b, a]);
        state.leftEnd = b;
      }
    } else if (end === 'right') {
      if (a === state.rightEnd) {
        state.chain.push([a, b]);
        state.rightEnd = b;
      } else {
        state.chain.push([b, a]);
        state.rightEnd = a;
      }
    }

    state.consecutivePasses = 0;
  }

  function executeAiTurn(state) {
    if (isOver(state)) return;

    let aiPlays = getPlayableActionsForHand(state.aiHand, state.leftEnd, state.rightEnd);

    // If AI cannot play, draw until it can or boneyard empty
    while (aiPlays.length === 0 && state.boneyard.length > 0) {
      const drawn = state.boneyard.pop();
      state.aiHand.push(drawn);
      state.log.push('AI drew a tile from the boneyard.');
      aiPlays = getPlayableActionsForHand(state.aiHand, state.leftEnd, state.rightEnd);
    }

    if (aiPlays.length > 0) {
      // Pick play with highest pip total
      let bestAct = aiPlays[0];
      let maxPips = -1;

      for (let i = 0; i < aiPlays.length; i++) {
        const act = aiPlays[i];
        const idx = parseInt(act.split(':')[1], 10);
        const pips = state.aiHand[idx][0] + state.aiHand[idx][1];
        if (pips > maxPips) {
          maxPips = pips;
          bestAct = act;
        }
      }

      const parts = bestAct.split(':');
      const idx = parseInt(parts[1], 10);
      const end = parts[2];
      const playedTile = state.aiHand[idx].slice();

      applyTilePlacement(state.aiHand, idx, end, state);
      state.log.push(`AI played [${playedTile[0]}|${playedTile[1]}] on ${end}.`);
    } else {
      state.consecutivePasses += 1;
      state.log.push('AI had no playable tiles and passed.');
    }
  }

  function checkEndGame(state) {
    let reward = 0;

    if (state.playerHand.length === 0) {
      // Player Domino!
      state.gameOver = true;
      state.winner = 'player';
      const aiPips = sumPips(state.aiHand);
      state.playerScore += aiPips;
      reward += 30 + aiPips;
      state.log.push(`🎉 DOMINO! You emptied your hand! +${aiPips} points!`);
    } else if (state.aiHand.length === 0) {
      // AI Domino!
      state.gameOver = true;
      state.winner = 'ai';
      const pPips = sumPips(state.playerHand);
      state.aiScore += pPips;
      reward -= 20;
      state.log.push(`💀 AI called Domino! AI gains +${pPips} points.`);
    } else if (state.consecutivePasses >= 2) {
      // Blocked Game
      state.gameOver = true;
      const pPips = sumPips(state.playerHand);
      const aiPips = sumPips(state.aiHand);

      if (pPips < aiPips) {
        state.winner = 'player';
        const diff = aiPips - pPips;
        state.playerScore += diff;
        reward += 15 + diff;
        state.log.push(`🔒 Game Blocked! You hold fewer pips (${pPips} vs ${aiPips}). Won +${diff} points!`);
      } else if (aiPips < pPips) {
        state.winner = 'ai';
        const diff = pPips - aiPips;
        state.aiScore += diff;
        reward -= 15;
        state.log.push(`🔒 Game Blocked! AI holds fewer pips (${aiPips} vs ${pPips}).`);
      } else {
        state.winner = 'draw';
        state.log.push('🔒 Game Blocked in a tie!');
      }
    }

    return reward;
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

    if (action.startsWith('play:')) {
      const parts = action.split(':');
      const idx = parseInt(parts[1], 10);
      const end = parts[2];
      const playedTile = state.playerHand[idx].slice();

      applyTilePlacement(state.playerHand, idx, end, state);
      state.log.push(`You played [${playedTile[0]}|${playedTile[1]}] on ${end}.`);
      reward += 2;
    } else if (action === 'draw') {
      const drawn = state.boneyard.pop();
      state.playerHand.push(drawn);
      state.log.push(`You drew [${drawn[0]}|${drawn[1]}] from the boneyard.`);
      reward = 0;
    } else if (action === 'pass') {
      state.consecutivePasses += 1;
      state.log.push('You passed your turn.');
      reward = -1;
    }

    // Check if player won immediately
    reward += checkEndGame(state);

    // AI Counter-turn (if game still active and player didn't just draw)
    if (!isOver(state) && action !== 'draw') {
      executeAiTurn(state);
      reward += checkEndGame(state);
    }

    state.stepCount += 1;
    if (state.stepCount >= MAX_STEPS && !state.gameOver) {
      state.gameOver = true;
      state.winner = state.playerScore >= state.aiScore ? 'player' : 'ai';
    }

    const done = isOver(state);
    return { reward, done };
  }

  const dominoesLogic = {
    MAX_STEPS,
    createState,
    legalActions,
    isOver,
    score,
    step,
    sumPips,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = dominoesLogic;
  } else {
    root.dominoesLogic = dominoesLogic;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
