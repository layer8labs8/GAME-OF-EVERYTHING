(function (root) {
  'use strict';

  const MAX_ROUNDS = 5;
  const MAX_STEPS = 60;

  function nextRandom(state) {
    state.rngState = ((state.rngState * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return state.rngState / 0x7fffffff;
  }

  const TRIVIA_BANK = [
    { q: 'What is 8 x 7?', opts: ['54', '56', '58', '64'], ans: 1 },
    { q: 'Which planet is nearest to the Sun?', opts: ['Venus', 'Mars', 'Mercury', 'Earth'], ans: 2 },
    { q: 'How many sides does a hexagon have?', opts: ['5', '6', '7', '8'], ans: 1 },
    { q: 'What is 15 + 28?', opts: ['41', '43', '45', '42'], ans: 1 },
  ];

  function createMiniGame(round, state) {
    if (round === 1) {
      const idx = Math.floor(nextRandom(state) * TRIVIA_BANK.length);
      const item = TRIVIA_BANK[idx];
      return {
        type: 'trivia',
        title: 'Quick Brain Trivia',
        question: item.q,
        options: item.opts,
        answer: item.ans,
      };
    } else if (round === 2) {
      return {
        type: 'balloons',
        title: 'Balloon Blitz',
        balloons: [
          { val: 20, color: 'Red' },
          { val: 100, color: 'Gold' },
          { val: 40, color: 'Blue' },
          { val: 60, color: 'Green' },
        ],
      };
    } else if (round === 3) {
      const colors = ['Red', 'Blue', 'Green', 'Yellow'];
      const targetSeq = [];
      for (let i = 0; i < 3; i++) {
        targetSeq.push(colors[Math.floor(nextRandom(state) * colors.length)]);
      }
      return {
        type: 'pattern',
        title: 'Color Echo Memory',
        sequence: targetSeq,
        currentInput: [],
      };
    } else if (round === 4) {
      return {
        type: 'target_rush',
        title: 'Target Reflex Rush',
        targets: [
          { name: 'Bullseye', pts: 80 },
          { name: 'Moving Gold Ring', pts: 120 },
          { name: 'Silver Star', pts: 60 },
        ],
      };
    } else {
      return {
        type: 'grand_dice',
        title: 'Grand Finale Dice',
        wagers: ['safe', 'risky', 'star_gamble'],
      };
    }
  }

  function createState(seed = 12345) {
    const s = {
      players: [
        { id: 'p0', name: 'You', coins: 0, stars: 0, roundPts: 0 },
        { id: 'cpu1', name: 'Pip', coins: 0, stars: 0, roundPts: 0 },
        { id: 'cpu2', name: 'Buzz', coins: 0, stars: 0, roundPts: 0 },
        { id: 'cpu3', name: 'Rex', coins: 0, stars: 0, roundPts: 0 },
      ],
      round: 1,
      miniGame: null,
      standings: [],
      announcements: ['Welcome to Party Frenzy! Round 1 begins now!'],
      stepCount: 0,
      gameOver: false,
      winner: null,
      rngState: (seed >>> 0) || 12345,
    };

    s.miniGame = createMiniGame(1, s);
    return s;
  }

  function isOver(state) {
    if (state.gameOver) return true;
    if (state.round > MAX_ROUNDS) return true;
    if (state.stepCount >= MAX_STEPS) return true;
    return false;
  }

  function score(state) {
    return state.players[0].stars * 100 + state.players[0].coins;
  }

  function legalActions(state) {
    if (isOver(state)) return [];

    const actions = [];
    const mg = state.miniGame;

    if (mg.type === 'trivia') {
      for (let i = 0; i < mg.options.length; i++) {
        actions.push(`answer:${i}`);
      }
    } else if (mg.type === 'balloons') {
      for (let i = 0; i < mg.balloons.length; i++) {
        actions.push(`pop:${i}`);
      }
    } else if (mg.type === 'pattern') {
      const colors = ['Red', 'Blue', 'Green', 'Yellow'];
      for (let i = 0; i < colors.length; i++) {
        actions.push(`press:${colors[i]}`);
      }
    } else if (mg.type === 'target_rush') {
      for (let i = 0; i < mg.targets.length; i++) {
        actions.push(`shoot:${i}`);
      }
    } else if (mg.type === 'grand_dice') {
      actions.push('roll:safe', 'roll:risky', 'roll:star_gamble');
    }

    return actions;
  }

  function resolveRound(state, playerPts) {
    state.players[0].roundPts = playerPts;

    // Simulate CPU competitors deterministically
    for (let i = 1; i < 4; i++) {
      // CPUs score between 30 and 110 based on RNG
      const cpuPts = Math.floor(nextRandom(state) * 80) + 30;
      state.players[i].roundPts = cpuPts;
    }

    // Rank players for this round
    const ranked = state.players.slice().sort((a, b) => b.roundPts - a.roundPts);
    state.standings = ranked.map(p => p.id);

    // Award rewards by placement
    // 1st: +100 coins, +1 star
    // 2nd: +60 coins
    // 3rd: +30 coins
    // 4th: +10 coins
    const coinsTable = [100, 60, 30, 10];
    let playerPlacement = 0;

    for (let r = 0; r < ranked.length; r++) {
      const p = ranked[r];
      p.coins += coinsTable[r];
      if (r === 0) p.stars += 1;
      if (p.id === 'p0') playerPlacement = r + 1;
    }

    let roundReward = 0;
    if (playerPlacement === 1) {
      roundReward = 25;
      state.announcements.push(`🌟 You won Round ${state.round} with ${playerPts} pts! Earned 1 Star!`);
    } else {
      roundReward = Math.max(2, 20 - playerPlacement * 5);
      state.announcements.push(`Round ${state.round} ended! You placed #${playerPlacement}.`);
    }

    state.round += 1;
    if (state.round <= MAX_ROUNDS) {
      state.miniGame = createMiniGame(state.round, state);
    } else {
      // Conclude tournament
      state.gameOver = true;
      const finalRoster = state.players.slice().sort((a, b) => {
        if (b.stars !== a.stars) return b.stars - a.stars;
        return b.coins - a.coins;
      });
      state.winner = finalRoster[0].id;
      if (state.winner === 'p0') {
        roundReward += 50;
        state.announcements.push('🏆 TOURNAMENT CHAMPION! You captured the Grand Star Trophy!');
      } else {
        state.announcements.push(`Tournament Finished! ${finalRoster[0].name} took 1st place.`);
      }
    }

    return roundReward;
  }

  function step(state, action) {
    if (!action || typeof action !== 'string') {
      throw new Error('Invalid action: ' + action);
    }
    if (isOver(state)) {
      throw new Error('Game is already over');
    }

    const legal = legalActions(state);
    if (!legal.includes(action)) {
      throw new Error('Illegal action: ' + action);
    }

    let reward = 0;
    const mg = state.miniGame;

    if (mg.type === 'trivia') {
      const idx = parseInt(action.split(':')[1], 10);
      const isCorrect = idx === mg.answer;
      const pts = isCorrect ? 100 : 20;
      reward = resolveRound(state, pts);
    } else if (mg.type === 'balloons') {
      const idx = parseInt(action.split(':')[1], 10);
      const balloon = mg.balloons[idx];
      const pts = balloon.val;
      reward = resolveRound(state, pts);
    } else if (mg.type === 'pattern') {
      const color = action.split(':')[1];
      mg.currentInput.push(color);
      const curIdx = mg.currentInput.length - 1;

      if (mg.sequence[curIdx] !== color) {
        // Wrong color! Premature finish
        reward = resolveRound(state, 30);
      } else if (mg.currentInput.length === mg.sequence.length) {
        // Full sequence match! Max score
        reward = resolveRound(state, 120);
      } else {
        // Intermediate pattern step
        reward = 2;
      }
    } else if (mg.type === 'target_rush') {
      const idx = parseInt(action.split(':')[1], 10);
      const target = mg.targets[idx];
      // Quick reflex accuracy roll
      const accuracy = nextRandom(state) > 0.15 ? 1 : 0.5;
      const pts = Math.floor(target.pts * accuracy);
      reward = resolveRound(state, pts);
    } else if (mg.type === 'grand_dice') {
      const wager = action.split(':')[1];
      let pts = 50;
      if (wager === 'safe') {
        pts = Math.floor(nextRandom(state) * 40) + 40; // 40-80
      } else if (wager === 'risky') {
        pts = Math.floor(nextRandom(state) * 110) + 20; // 20-130
      } else if (wager === 'star_gamble') {
        if (nextRandom(state) > 0.45) {
          // Success!
          pts = 150;
          state.announcements.push('🎰 Jackpot Gamble! Maximum points!');
        } else {
          pts = 15;
          state.announcements.push('💨 Gamble fizzled out...');
        }
      }
      reward = resolveRound(state, pts);
    }

    state.stepCount += 1;
    if (state.stepCount >= MAX_STEPS && !state.gameOver) {
      state.gameOver = true;
      state.winner = state.players[0].id;
    }

    const done = isOver(state);
    return { reward, done };
  }

  const partyGameLogic = {
    MAX_ROUNDS,
    MAX_STEPS,
    createState,
    legalActions,
    isOver,
    score,
    step,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = partyGameLogic;
  } else {
    root.partyGameLogic = partyGameLogic;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
