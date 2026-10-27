// Logic module for 0053-trivia (Chronicle Quiz)
// Pure deterministic quiz show puzzle game

const TOTAL_ROUNDS = 10;
const MAX_STRIKES = 3;

const QUESTION_BANK = [
  {
    category: "Computing",
    prompt: "What does CPU stand for in computer hardware?",
    options: ["Central Processing Unit", "Core Power Utility", "Command Program User", "Control Protocol Unit"],
    correctIndex: 0
  },
  {
    category: "Astronomy",
    prompt: "Which planet in our solar system is widely known as the Red Planet?",
    options: ["Venus", "Jupiter", "Mars", "Saturn"],
    correctIndex: 2
  },
  {
    category: "Technology",
    prompt: "In which year was the World Wide Web released into the public domain?",
    options: ["1985", "1991", "1998", "2001"],
    correctIndex: 1
  },
  {
    category: "Physics",
    prompt: "What is the approximate speed of light in a vacuum?",
    options: ["150,000 km/s", "300,000 km/s", "500,000 km/s", "1,000,000 km/s"],
    correctIndex: 1
  },
  {
    category: "Gaming",
    prompt: "Which pioneering gaming company released the coin-op arcade game Pong in 1972?",
    options: ["Nintendo", "Atari", "Sega", "Namco"],
    correctIndex: 1
  },
  {
    category: "Biology",
    prompt: "Which organelle is universally dubbed the powerhouse of the cell?",
    options: ["Ribosome", "Endoplasmic Reticulum", "Mitochondria", "Nucleus"],
    correctIndex: 2
  },
  {
    category: "Computing",
    prompt: "What was the official internal development codename for Windows 95?",
    options: ["Memphis", "Chicago", "Cairo", "Daytona"],
    correctIndex: 1
  },
  {
    category: "Programming",
    prompt: "Which dynamic programming language was created in 1995 by Brendan Eich?",
    options: ["Python", "Ruby", "JavaScript", "PHP"],
    correctIndex: 2
  },
  {
    category: "Geography",
    prompt: "What is the deepest surveyed marine trench on planet Earth?",
    options: ["Java Trench", "Puerto Rico Trench", "Mariana Trench", "Tonga Trench"],
    correctIndex: 2
  },
  {
    category: "Astronomy",
    prompt: "What is the largest moon of Saturn, renowned for liquid methane seas?",
    options: ["Europa", "Ganymede", "Titan", "Triton"],
    correctIndex: 2
  },
  {
    category: "Gaming",
    prompt: "Which classic 1996 first-person shooter revolutionized competitive Rocket Jumping?",
    options: ["Doom", "Quake", "Duke Nukem 3D", "Unreal"],
    correctIndex: 1
  },
  {
    category: "Physics",
    prompt: "Which subatomic particle carries a negative electric charge?",
    options: ["Proton", "Neutron", "Positron", "Electron"],
    correctIndex: 3
  },
  {
    category: "Technology",
    prompt: "What does the abbreviation HTML stand for?",
    options: ["HyperText Markup Language", "High Transfer Mode Link", "Hyperlink Text Mesh Layout", "Home Tool Markup Logic"],
    correctIndex: 0
  },
  {
    category: "History",
    prompt: "Who is celebrated by computer historians as the world's first programmer?",
    options: ["Charles Babbage", "Alan Turing", "Ada Lovelace", "Grace Hopper"],
    correctIndex: 2
  },
  {
    category: "Chemistry",
    prompt: "What is the chemical formula for common table salt?",
    options: ["KCl", "NaCl", "NaOH", "CaCO3"],
    correctIndex: 1
  },
  {
    category: "Space History",
    prompt: "Which Apollo spaceflight achieved the first human lunar landing in July 1969?",
    options: ["Apollo 8", "Apollo 11", "Apollo 13", "Apollo 17"],
    correctIndex: 1
  },
  {
    category: "Programming",
    prompt: "What is the standard file extension for Python source scripts?",
    options: [".pt", ".py", ".pyt", ".pys"],
    correctIndex: 1
  },
  {
    category: "Medicine",
    prompt: "Which human organ consumes roughly 20% of the body's total metabolic energy?",
    options: ["Heart", "Liver", "Brain", "Lungs"],
    correctIndex: 2
  },
  {
    category: "Strategy",
    prompt: "In classical Chess, which piece is restricted exclusively to diagonal movement?",
    options: ["Rook", "Knight", "Bishop", "Pawn"],
    correctIndex: 2
  },
  {
    category: "Astronomy",
    prompt: "Which planet holds the title of the hottest surface in the solar system?",
    options: ["Mercury", "Venus", "Mars", "Jupiter"],
    correctIndex: 1
  }
];

function createRng(seed) {
  let s = (Math.imul(seed || 1, 1103515245) + 12345) & 0x7fffffff;
  return function() {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s / 0x80000000;
  };
}

function createState(seed = 1) {
  const rng = createRng(seed);

  // Deterministically shuffle and select 10 questions
  const pool = [...QUESTION_BANK];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }

  const questions = pool.slice(0, TOTAL_ROUNDS);

  return {
    seed,
    turn: 0,
    round: 0,
    totalRounds: TOTAL_ROUNDS,
    questions,
    strikes: 0,
    maxStrikes: MAX_STRIKES,
    score: 0,
    streak: 0,
    maxStreak: 0,
    correctCount: 0,
    lifelines: {
      fiftyFifty: 1,
      doubleDown: 1,
      skip: 1
    },
    doubleDownActive: false,
    eliminated: [],
    lastResult: null,
    won: false,
    lost: false,
    done: false
  };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return state.score + (state.won ? 500 : 0) + (MAX_STRIKES - state.strikes) * 50;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  // Lifelines
  if (state.lifelines.fiftyFifty > 0 && state.eliminated.length === 0) {
    actions.push("use_lifeline:fifty_fifty");
  }
  if (state.lifelines.doubleDown > 0 && !state.doubleDownActive) {
    actions.push("use_lifeline:double_down");
  }
  if (state.lifelines.skip > 0) {
    actions.push("use_lifeline:skip");
  }

  // Answer options
  for (let i = 0; i < 4; i++) {
    if (!state.eliminated.includes(i)) {
      actions.push(`answer:${i}`);
    }
  }

  return actions;
}

function step(state, action) {
  if (state.done) {
    throw new Error("Game is already over");
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  let reward = 0;
  state.turn++;

  if (action === "use_lifeline:fifty_fifty") {
    state.lifelines.fiftyFifty--;
    const currentQ = state.questions[state.round];
    const correctIdx = currentQ.correctIndex;

    // Pick 2 wrong indices to eliminate deterministically
    const wrongIndices = [0, 1, 2, 3].filter(idx => idx !== correctIdx);
    const rng = createRng(state.seed + state.round * 47);
    if (rng() > 0.5) {
      state.eliminated = [wrongIndices[0], wrongIndices[1]];
    } else {
      state.eliminated = [wrongIndices[1], wrongIndices[2]];
    }
    reward += 5;
  } else if (action === "use_lifeline:double_down") {
    state.lifelines.doubleDown--;
    state.doubleDownActive = true;
    reward += 5;
  } else if (action === "use_lifeline:skip") {
    state.lifelines.skip--;
    reward += 5;
    state.round++;
    state.eliminated = [];
    state.doubleDownActive = false;

    if (state.round >= state.totalRounds) {
      state.won = true;
      state.done = true;
      reward += 300;
    }
  } else if (action.startsWith("answer:")) {
    const chosenIdx = parseInt(action.slice(7), 10);
    const currentQ = state.questions[state.round];

    if (chosenIdx === currentQ.correctIndex) {
      state.correctCount++;
      state.streak++;
      if (state.streak > state.maxStreak) state.maxStreak = state.streak;

      let mult = 1.0;
      if (state.streak === 2) mult = 1.5;
      else if (state.streak === 3) mult = 2.0;
      else if (state.streak >= 4) mult = 3.0;

      let pts = Math.round(100 * mult);
      if (state.doubleDownActive) pts *= 2;

      state.score += pts;
      reward += pts;
      state.lastResult = {
        correct: true,
        points: pts,
        prompt: currentQ.prompt,
        correctAnswer: currentQ.options[currentQ.correctIndex]
      };
    } else {
      state.strikes++;
      state.streak = 0;
      reward -= 25;
      state.lastResult = {
        correct: false,
        points: 0,
        prompt: currentQ.prompt,
        chosen: currentQ.options[chosenIdx],
        correctAnswer: currentQ.options[currentQ.correctIndex]
      };
    }

    state.round++;
    state.eliminated = [];
    state.doubleDownActive = false;

    // Evaluate end conditions
    if (state.strikes >= state.maxStrikes) {
      state.lost = true;
      state.done = true;
      reward -= 100;
    } else if (state.round >= state.totalRounds) {
      state.won = true;
      state.done = true;
      reward += 500;
    }
  }

  return { reward, done: state.done };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TOTAL_ROUNDS,
    MAX_STRIKES,
    QUESTION_BANK,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
