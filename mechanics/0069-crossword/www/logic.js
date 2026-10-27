// Pure deterministic logic for 0069: Crossword (LexiCross)

const MAX_STAGES = 3;
const MAX_MOVES_PER_STAGE = 60;
const HINTS_PER_STAGE = 3;

const STAGE_CONFIGS = [
  {
    stage: 1,
    title: 'Harbor Haven',
    size: 4,
    solution: ['SHIP', 'HERO', 'IRON', 'POND'],
    acrossClues: [
      '1A: Large ocean-faring vessel',
      '2A: Courageous champion or protagonist',
      '3A: Strong magnetic metallic element',
      '4A: Small quiet freshwater pool'
    ],
    downClues: [
      '1D: Large ocean-faring vessel',
      '2D: Courageous champion or protagonist',
      '3D: Strong magnetic metallic element',
      '4D: Small quiet freshwater pool'
    ],
    distractors: ['A', 'T', 'K']
  },
  {
    stage: 2,
    title: 'Winter Stroll',
    size: 4,
    solution: ['SNOW', 'NOVA', 'OVAL', 'WALK'],
    acrossClues: [
      '1A: Frozen crystalline white precipitation',
      '2A: Sudden brilliant stellar explosion',
      '3A: Egg-shaped closed curved outline',
      '4A: Stroll forward on foot at leisure'
    ],
    downClues: [
      '1D: Frozen crystalline white precipitation',
      '2D: Sudden brilliant stellar explosion',
      '3D: Egg-shaped closed curved outline',
      '4D: Stroll forward on foot at leisure'
    ],
    distractors: ['E', 'R', 'T']
  },
  {
    stage: 3,
    title: 'Heart & Hearth',
    size: 5,
    solution: ['HEART', 'EMBER', 'ABUSE', 'RESIN', 'TREND'],
    acrossClues: [
      '1A: Vital chest organ; emotional center',
      '2A: Glowing fragment in fireplace ash',
      '3A: Improper treatment or corrupt misuse',
      '4A: Sticky amber fluid exuded by pines',
      '5A: Prevailing style or general direction'
    ],
    downClues: [
      '1D: Vital chest organ; emotional center',
      '2D: Glowing fragment in fireplace ash',
      '3D: Improper treatment or corrupt misuse',
      '4D: Sticky amber fluid exuded by pines',
      '5D: Prevailing style or general direction'
    ],
    distractors: ['O', 'C', 'L']
  }
];

function createRng(seed) {
  let s = (Math.imul(seed ^ 0x6d2b79f5, 1) + 1) >>> 0;
  return function() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildLetterBank(solution, distractors, rng) {
  const lettersSet = new Set();
  for (const row of solution) {
    for (let i = 0; i < row.length; i++) {
      lettersSet.add(row[i].toUpperCase());
    }
  }
  for (const d of distractors) {
    lettersSet.add(d.toUpperCase());
  }
  const bank = Array.from(lettersSet);
  // Deterministic shuffle
  for (let i = bank.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = bank[i];
    bank[i] = bank[j];
    bank[j] = tmp;
  }
  return bank;
}

function initStage(state, stageNum) {
  const cfg = STAGE_CONFIGS[(stageNum - 1) % STAGE_CONFIGS.length];
  const rng = createRng(state.seed + stageNum * 777);

  state.title = cfg.title;
  state.size = cfg.size;
  state.solution = cfg.solution;
  state.acrossClues = cfg.acrossClues;
  state.downClues = cfg.downClues;
  state.letterBank = buildLetterBank(cfg.solution, cfg.distractors, rng);
  state.grid = Array(cfg.size).fill(null).map(() => Array(cfg.size).fill(''));
  state.stageMoves = 0;
  state.hintsRemaining = HINTS_PER_STAGE;
}

function createState(seed = 1) {
  const safeSeed = typeof seed === 'number' ? (seed >>> 0) : 1;
  const state = {
    seed: safeSeed,
    stage: 1,
    maxStages: MAX_STAGES,
    maxMoves: MAX_MOVES_PER_STAGE,
    stageMoves: 0,
    totalMoves: 0,
    hintsUsed: 0,
    baseScore: 0,
    done: false,
    won: false,
    message: 'Decipher clues and fill intersecting words into the grid.'
  };

  initStage(state, 1);
  return state;
}

function checkGridStatus(state) {
  let allFilled = true;
  let allCorrect = true;
  let correctCount = 0;

  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      const char = state.grid[r][c];
      if (!char) {
        allFilled = false;
        allCorrect = false;
      } else if (char === state.solution[r][c]) {
        correctCount++;
      } else {
        allCorrect = false;
      }
    }
  }

  return { allFilled, allCorrect, correctCount };
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  // Placement actions for empty cells
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      if (state.grid[r][c] === '') {
        for (const char of state.letterBank) {
          actions.push(`set:${r},${c},${char}`);
        }
        if (state.hintsRemaining > 0) {
          actions.push(`reveal:${r},${c}`);
        }
      } else {
        actions.push(`delete:${r},${c}`);
      }
    }
  }

  actions.push('check');
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
  state.stageMoves++;
  state.totalMoves++;

  if (action === 'check') {
    const status = checkGridStatus(state);
    if (status.allCorrect) {
      if (state.stage < state.maxStages) {
        state.baseScore += 500;
        reward += 300;
        state.stage++;
        initStage(state, state.stage);
        state.message = `Grid complete! Advancing to Stage ${state.stage}: ${state.title}.`;
      } else {
        state.won = true;
        state.done = true;
        reward += 1000;
        state.message = 'Master of Lexicon! All crossword grids completed!';
      }
    } else if (status.allFilled) {
      reward -= 20;
      state.message = 'All cells filled, but some letters are incorrect!';
    } else {
      state.message = `Progress: ${status.correctCount} of ${state.size * state.size} letters correct.`;
    }
  } else if (action.startsWith('delete:')) {
    const parts = action.slice(7).split(',');
    const r = parseInt(parts[0], 10);
    const c = parseInt(parts[1], 10);
    state.grid[r][c] = '';
    state.message = `Cleared cell (${r + 1}, ${c + 1}).`;
  } else if (action.startsWith('reveal:')) {
    const parts = action.slice(7).split(',');
    const r = parseInt(parts[0], 10);
    const c = parseInt(parts[1], 10);
    const correctLetter = state.solution[r][c];
    state.grid[r][c] = correctLetter;
    state.hintsRemaining--;
    state.hintsUsed++;
    reward += 10;
    state.message = `Hint revealed letter '${correctLetter}' at (${r + 1}, ${c + 1}).`;

    // Auto check if this completed the grid
    const status = checkGridStatus(state);
    if (status.allCorrect) {
      if (state.stage < state.maxStages) {
        state.baseScore += 500;
        reward += 300;
        state.stage++;
        initStage(state, state.stage);
        state.message = `Grid complete! Advancing to Stage ${state.stage}: ${state.title}.`;
      } else {
        state.won = true;
        state.done = true;
        reward += 1000;
        state.message = 'Master of Lexicon! All crossword grids completed!';
      }
    }
  } else if (action.startsWith('set:')) {
    const parts = action.slice(4).split(',');
    const r = parseInt(parts[0], 10);
    const c = parseInt(parts[1], 10);
    const char = parts[2].toUpperCase();
    state.grid[r][c] = char;

    if (char === state.solution[r][c]) {
      reward += 15;
      state.message = `Placed '${char}' at (${r + 1}, ${c + 1}).`;
    } else {
      reward += 2;
      state.message = `Placed '${char}' at (${r + 1}, ${c + 1}).`;
    }

    // Auto check if this completed the grid
    const status = checkGridStatus(state);
    if (status.allCorrect) {
      if (state.stage < state.maxStages) {
        state.baseScore += 500;
        reward += 300;
        state.stage++;
        initStage(state, state.stage);
        state.message = `Grid complete! Advancing to Stage ${state.stage}: ${state.title}.`;
      } else {
        state.won = true;
        state.done = true;
        reward += 1000;
        state.message = 'Master of Lexicon! All crossword grids completed!';
      }
    }
  }

  if (!state.done && state.stageMoves >= state.maxMoves) {
    state.done = true;
    reward -= 100;
    state.message = 'Scholar fatigue! Move limit reached.';
  }

  return { reward, done: state.done };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  let countCorrect = 0;
  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      if (state.grid[r][c] && state.grid[r][c] === state.solution[r][c]) {
        countCorrect++;
      }
    }
  }
  return (
    state.baseScore +
    countCorrect * 15 +
    (state.won ? 1000 : 0) -
    (state.hintsUsed * 25) -
    state.totalMoves
  );
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MAX_STAGES,
    MAX_MOVES_PER_STAGE,
    HINTS_PER_STAGE,
    STAGE_CONFIGS,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
