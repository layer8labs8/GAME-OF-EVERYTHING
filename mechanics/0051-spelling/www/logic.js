// Logic module for 0051-spelling (Rune Scribe)
// Pure deterministic Spelling Bee word puzzle

const TARGET_SCORE = 100;
const MAX_TURNS = 30;

function createRng(seed) {
  let s = (Math.imul(seed || 1, 1103515245) + 12345) & 0x7fffffff;
  return function() {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s / 0x80000000;
  };
}

const HIVE_TEMPLATES = [
  // Hive 0: Center P, Pangram: COMPACT
  {
    center: "P",
    outer: ["A", "C", "I", "M", "O", "T"],
    pangrams: ["COMPACT"],
    words: [
      "COMPACT", "IMPACT", "OPTIC", "TOPIC", "ATOP", "PACT", "CAMP",
      "PICA", "PITA", "COOP", "POOP", "TAMP", "POMP", "MOPP", "CAPO",
      "PICO", "MICA", "PANT", "PAST", "PICT", "PIMA", "COPT"
    ]
  },
  // Hive 1: Center T, Pangram: STATION (S, T, A, I, O, N, M)
  {
    center: "T",
    outer: ["A", "I", "M", "N", "O", "S"],
    pangrams: ["STATION"],
    words: [
      "STATION", "SAINT", "TAINT", "TITAN", "TOAST", "MOIST", "ATOM",
      "MAST", "MIST", "MOST", "OMIT", "INTO", "ONTO", "STAT", "TINT",
      "ANTI", "MINT", "STOMA", "SONANT", "ANION", "ATONIC", "MANTO"
    ]
  },
  // Hive 2: Center R, Pangram: TRIUMPH
  {
    center: "R",
    outer: ["H", "I", "M", "P", "T", "U"],
    pangrams: ["TRIUMPH"],
    words: [
      "TRIUMPH", "TRUMP", "TRIP", "TRIM", "RUMP", "HURT", "RUTH",
      "PURR", "PRIM", "RIPT", "TURR", "MURR", "TRIT", "PRUT", "THIR",
      "RUMOR", "RITUAL", "PURIT", "UPRIGHT", "HIRP"
    ]
  },
  // Hive 3: Center E, Pangram: MAJESTY
  {
    center: "E",
    outer: ["A", "J", "M", "S", "T", "Y"],
    pangrams: ["MAJESTY"],
    words: [
      "MAJESTY", "STEAM", "TEAMS", "YEAST", "MEAT", "MEET", "SEEM",
      "STEM", "TAME", "MATE", "SATE", "SEAT", "EASY", "MESS", "EYES",
      "SEET", "TEAS", "MESA", "EAST", "SEAM", "SAME", "MATEY"
    ]
  },
  // Hive 4: Center O, Pangram: FORTUNE
  {
    center: "O",
    outer: ["E", "F", "N", "R", "T", "U"],
    pangrams: ["FORTUNE"],
    words: [
      "FORTUNE", "FRONT", "FONT", "ROOT", "FOOT", "NOTE", "TONE",
      "TORE", "ROTE", "ROOF", "ONTO", "OUTRUN", "OUTRE", "OFTEN",
      "TENOR", "ROUTE", "TORTE", "TURNOVER", "FORTE", "FORT", "ROTO"
    ]
  }
];

function isPangram(word, letters) {
  const w = word.toUpperCase();
  for (let i = 0; i < letters.length; i++) {
    if (!w.includes(letters[i])) return false;
  }
  return true;
}

function calculateWordScore(word, allLetters) {
  const len = word.length;
  if (len < 4) return 0;
  let pts = (len === 4) ? 1 : len;
  if (isPangram(word, allLetters)) {
    pts += 7;
  }
  return pts;
}

function getRank(score) {
  if (score >= 100) return "Archmage";
  if (score >= 60) return "Scholar";
  if (score >= 25) return "Apprentice";
  return "Beginner";
}

function createState(seed = 1) {
  const rng = createRng(seed);
  const templateIdx = Math.floor(rng() * HIVE_TEMPLATES.length) % HIVE_TEMPLATES.length;
  const tmpl = HIVE_TEMPLATES[templateIdx];

  const centerLetter = tmpl.center;
  const outerLetters = [...tmpl.outer];
  const allLetters = [centerLetter, ...outerLetters];

  // Unique valid words
  const validWords = Array.from(new Set(tmpl.words.map(w => w.toUpperCase())));

  return {
    seed,
    turn: 0,
    turnsLeft: MAX_TURNS,
    score: 0,
    targetScore: TARGET_SCORE,
    centerLetter,
    outerLetters,
    allLetters,
    validWords,
    foundWords: [],
    currentInput: "",
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
  return state.score + (state.won ? 300 : 0) + state.turnsLeft * 10;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = ["shuffle"];

  if (state.currentInput.length > 0) {
    actions.push("delete_letter");
    actions.push("clear");
  }

  // Letters available to tap
  for (let i = 0; i < state.allLetters.length; i++) {
    actions.push(`add_letter:${state.allLetters[i]}`);
  }

  // Submit current typed input
  if (state.currentInput.length >= 4) {
    actions.push("submit");
  }

  // Direct word submit actions for unfound words
  for (let i = 0; i < state.validWords.length; i++) {
    const w = state.validWords[i];
    if (!state.foundWords.includes(w)) {
      actions.push(`submit_word:${w}`);
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

  if (action === "shuffle") {
    // Permute the 6 outer letters
    const rng = createRng(state.seed + state.turn * 17);
    for (let i = state.outerLetters.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = state.outerLetters[i];
      state.outerLetters[i] = state.outerLetters[j];
      state.outerLetters[j] = tmp;
    }
    state.allLetters = [state.centerLetter, ...state.outerLetters];
    reward += 1;
  } else if (action.startsWith("add_letter:")) {
    const ch = action.slice(11).toUpperCase();
    state.currentInput += ch;
    reward += 1;
  } else if (action === "delete_letter") {
    if (state.currentInput.length > 0) {
      state.currentInput = state.currentInput.slice(0, -1);
    }
  } else if (action === "clear") {
    state.currentInput = "";
  } else if (action === "submit" || action.startsWith("submit_word:")) {
    const word = (action === "submit") ? state.currentInput : action.slice(12).toUpperCase();

    state.turnsLeft--;
    state.turn++;

    if (word.length < 4) {
      state.lastResult = { success: false, message: "Too short (min 4 letters)" };
      reward -= 2;
    } else if (!word.includes(state.centerLetter)) {
      state.lastResult = { success: false, message: `Missing center letter (${state.centerLetter})` };
      reward -= 2;
    } else if (state.foundWords.includes(word)) {
      state.lastResult = { success: false, message: "Already found" };
      reward -= 2;
    } else if (state.validWords.includes(word)) {
      const pts = calculateWordScore(word, state.allLetters);
      const isPang = isPangram(word, state.allLetters);

      state.score += pts;
      state.foundWords.push(word);
      state.currentInput = "";
      state.lastResult = {
        success: true,
        word,
        points: pts,
        isPangram: isPang,
        message: isPang ? `PANGRAM! +${pts} pts` : `Spellcrafted! +${pts} pts`
      };
      reward += pts;
    } else {
      state.lastResult = { success: false, message: "Not in lexicon" };
      reward -= 2;
    }
  }

  // Evaluate end conditions
  if (state.score >= state.targetScore) {
    state.won = true;
    state.done = true;
    reward += 300;
  } else if (state.turnsLeft <= 0) {
    state.lost = true;
    state.done = true;
    reward -= 100;
  }

  return { reward, done: state.done };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TARGET_SCORE,
    MAX_TURNS,
    HIVE_TEMPLATES,
    isPangram,
    calculateWordScore,
    getRank,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
