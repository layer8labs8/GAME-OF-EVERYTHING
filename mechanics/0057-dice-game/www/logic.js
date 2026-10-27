// Pure deterministic logic for 0057: Dice Game (Royal Dice)

const CATEGORIES = [
  'ones',
  'twos',
  'threes',
  'fours',
  'fives',
  'sixes',
  'three_of_a_kind',
  'four_of_a_kind',
  'full_house',
  'small_straight',
  'large_straight',
  'yacht',
  'chance'
];

const UPPER_CATEGORIES = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'];

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x6d2b79f5, 1) + 1) >>> 0;
  return function() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rollDie(rng) {
  return Math.floor(rng() * 6) + 1;
}

function calculateCategoryScore(category, dice) {
  const sum = dice.reduce((a, b) => a + b, 0);
  const counts = {};
  for (const d of dice) {
    counts[d] = (counts[d] || 0) + 1;
  }
  const countVals = Object.values(counts);

  switch (category) {
    case 'ones':
      return dice.filter(d => d === 1).reduce((a, b) => a + b, 0);
    case 'twos':
      return dice.filter(d => d === 2).reduce((a, b) => a + b, 0);
    case 'threes':
      return dice.filter(d => d === 3).reduce((a, b) => a + b, 0);
    case 'fours':
      return dice.filter(d => d === 4).reduce((a, b) => a + b, 0);
    case 'fives':
      return dice.filter(d => d === 5).reduce((a, b) => a + b, 0);
    case 'sixes':
      return dice.filter(d => d === 6).reduce((a, b) => a + b, 0);

    case 'three_of_a_kind':
      return countVals.some(c => c >= 3) ? sum : 0;
    case 'four_of_a_kind':
      return countVals.some(c => c >= 4) ? sum : 0;
    case 'full_house':
      return (countVals.includes(3) && countVals.includes(2)) || countVals.includes(5) ? 25 : 0;
    case 'small_straight': {
      const u = Array.from(new Set(dice)).sort((a, b) => a - b).join('');
      return (
        u.includes('1234') ||
        u.includes('2345') ||
        u.includes('3456')
      ) ? 30 : 0;
    }
    case 'large_straight': {
      const u = Array.from(new Set(dice)).sort((a, b) => a - b).join('');
      return (u === '12345' || u === '23456') ? 40 : 0;
    }
    case 'yacht':
      return countVals.includes(5) ? 50 : 0;
    case 'chance':
      return sum;
    default:
      return 0;
  }
}

function startRound(state) {
  state.rollsLeft = 2;
  state.held = [false, false, false, false, false];
  for (let i = 0; i < 5; i++) {
    state.dice[i] = rollDie(state.rng);
  }
  state.message = `Round ${state.round} of 13. Choose to hold, roll, or score.`;
}

function createState(seed = 1) {
  const safeSeed = typeof seed === 'number' ? (seed >>> 0) : 1;
  const rng = createRng(safeSeed);

  const scorecard = {};
  for (const cat of CATEGORIES) {
    scorecard[cat] = null;
  }

  const state = {
    seed: safeSeed,
    rng,
    round: 1,
    maxRounds: 13,
    dice: [1, 1, 1, 1, 1],
    held: [false, false, false, false, false],
    rollsLeft: 2,
    scorecard,
    upperBonusAwarded: false,
    totalScore: 0,
    done: false,
    won: false,
    message: 'Welcome to Royal Dice. Round 1 begin.'
  };

  startRound(state);
  return state;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  // Re-roll action if rolls remaining and not all dice held
  if (state.rollsLeft > 0 && !state.held.every(Boolean)) {
    actions.push('roll');
  }

  // Toggle hold on any die if rolls remaining
  if (state.rollsLeft > 0) {
    for (let i = 0; i < 5; i++) {
      actions.push(`toggle_hold:${i}`);
    }
  }

  // Score actions for all unassigned categories
  for (const cat of CATEGORIES) {
    if (state.scorecard[cat] === null) {
      actions.push(`score:${cat}`);
    }
  }

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

  if (action === 'roll') {
    state.rollsLeft--;
    for (let i = 0; i < 5; i++) {
      if (!state.held[i]) {
        state.dice[i] = rollDie(state.rng);
      }
    }
    state.message = `Rolled dice. Rolls remaining: ${state.rollsLeft}`;
  } else if (action.startsWith('toggle_hold:')) {
    const idx = parseInt(action.slice(12), 10);
    state.held[idx] = !state.held[idx];
    state.message = `Die #${idx + 1} ${state.held[idx] ? 'locked' : 'unlocked'}.`;
  } else if (action.startsWith('score:')) {
    const category = action.slice(6);
    const pts = calculateCategoryScore(category, state.dice);
    state.scorecard[category] = pts;
    state.totalScore += pts;
    reward += pts;

    // Check upper section bonus
    if (!state.upperBonusAwarded) {
      const upperSum = UPPER_CATEGORIES.reduce((acc, cat) => {
        return acc + (state.scorecard[cat] !== null ? state.scorecard[cat] : 0);
      }, 0);
      if (upperSum >= 63) {
        state.upperBonusAwarded = true;
        state.totalScore += 35;
        reward += 35;
      }
    }

    state.message = `Scored ${pts} points in ${category}.`;

    // Advance round or conclude game
    if (state.round >= state.maxRounds) {
      state.done = true;
      state.won = (state.totalScore >= 180);
      state.message = state.won
        ? `Victory! Superb game: ${state.totalScore} total points!`
        : `Game complete! Final score: ${state.totalScore} points.`;
      if (state.won) reward += 100;
    } else {
      state.round++;
      startRound(state);
    }
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return state.totalScore;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CATEGORIES,
    UPPER_CATEGORIES,
    calculateCategoryScore,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
