// Logic module for 0052-typing (Cipher Cascade)
// Pure deterministic cyber-defense typing action game

const TOTAL_WORDS = 15;
const MAX_TURNS = 90;
const INITIAL_HP = 5;
const INITIAL_EMP = 2;
const SPAWN_INTERVAL = 3;

const WORD_DICTIONARY = [
  "DATA", "BYTE", "NODE", "CODE", "FLOW", "HACK", "GRID", "CHIP",
  "SYNC", "WIFI", "PROXY", "PIXEL", "STACK", "LASER", "CYBER", "ROUTER",
  "SERVER", "CIPHER", "SOCKET", "VECTOR", "KERNEL", "BINARY", "SYSTEM",
  "PACKET", "CRYPTO", "FIREWALL", "PROTOCOL", "DATABASE", "TERMINAL"
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

  return {
    seed,
    turn: 0,
    maxTurns: MAX_TURNS,
    hp: INITIAL_HP,
    maxHp: INITIAL_HP,
    empCharges: INITIAL_EMP,
    wordsDestroyed: 0,
    totalWords: TOTAL_WORDS,
    combo: 0,
    ciphers: [],
    spawnedCount: 0,
    nextSpawnTurn: 0,
    currentTargetId: null,
    won: false,
    lost: false,
    done: false
  };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  const mult = Math.min(5, 1 + Math.floor(state.combo / 3));
  return state.wordsDestroyed * 100 * mult + state.hp * 60 + state.empCharges * 40 + (state.won ? 500 : 0);
}

function legalActions(state) {
  if (state.done) return [];

  const actions = ["wait"];

  if (state.empCharges > 0 && state.ciphers.length > 0) {
    actions.push("emp_burst");
  }

  if (state.currentTargetId === null) {
    // Can lock onto any cipher by typing its first letter
    for (let i = 0; i < state.ciphers.length; i++) {
      const c = state.ciphers[i];
      const act = `type:${c.word[0]}`;
      if (!actions.includes(act)) {
        actions.push(act);
      }
    }
  } else {
    // Locked on: next letter required
    const target = state.ciphers.find(c => c.id === state.currentTargetId);
    if (target && target.typed.length < target.word.length) {
      const nextChar = target.word[target.typed.length];
      actions.push(`type:${nextChar}`);
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

  // 1. Process Action
  if (action === "wait") {
    // Pass turn without action
  } else if (action === "emp_burst") {
    state.empCharges--;
    const count = state.ciphers.length;
    reward += count * 50;
    state.wordsDestroyed += count;
    state.ciphers = [];
    state.currentTargetId = null;
  } else if (action.startsWith("type:")) {
    const char = action.slice(5).toUpperCase();

    if (state.currentTargetId === null) {
      const match = state.ciphers.find(c => c.word[0] === char);
      if (match) {
        state.currentTargetId = match.id;
        match.typed += char;
        reward += 10;

        if (match.typed === match.word) {
          state.wordsDestroyed++;
          state.combo++;
          const mult = Math.min(5, 1 + Math.floor(state.combo / 3));
          reward += 100 * mult;
          state.ciphers = state.ciphers.filter(c => c.id !== match.id);
          state.currentTargetId = null;
        }
      }
    } else {
      const target = state.ciphers.find(c => c.id === state.currentTargetId);
      if (target) {
        const expected = target.word[target.typed.length];
        if (char === expected) {
          target.typed += char;
          reward += 15;

          if (target.typed === target.word) {
            state.wordsDestroyed++;
            state.combo++;
            const mult = Math.min(5, 1 + Math.floor(state.combo / 3));
            reward += 100 * mult;
            state.ciphers = state.ciphers.filter(c => c.id !== target.id);
            state.currentTargetId = null;
          }
        }
      }
    }
  }

  // 2. Spawn incoming ciphers
  if (state.spawnedCount < state.totalWords && state.turn >= state.nextSpawnTurn) {
    const rng = createRng(state.seed + state.spawnedCount * 31);
    const wordIdx = Math.floor(rng() * WORD_DICTIONARY.length) % WORD_DICTIONARY.length;
    const word = WORD_DICTIONARY[wordIdx];
    const lane = Math.floor(rng() * 4) % 4;

    state.ciphers.push({
      id: state.spawnedCount,
      word,
      typed: "",
      lane,
      y: 0,
      speed: 3
    });

    state.spawnedCount++;
    state.nextSpawnTurn = state.turn + SPAWN_INTERVAL;
  }

  // 3. Move active ciphers downward & check breach
  for (let i = 0; i < state.ciphers.length; i++) {
    const c = state.ciphers[i];
    c.y += c.speed;

    if (c.y >= 100) {
      state.hp--;
      state.combo = 0;
      reward -= 50;

      if (state.currentTargetId === c.id) {
        state.currentTargetId = null;
      }
    }
  }

  // Filter out breached ciphers
  state.ciphers = state.ciphers.filter(c => c.y < 100);

  // 4. Advance turn counter
  state.turn++;

  // 5. Evaluate end conditions
  if (state.hp <= 0) {
    state.lost = true;
    state.done = true;
    reward -= 150;
  } else if (state.wordsDestroyed >= state.totalWords) {
    state.won = true;
    state.done = true;
    reward += 300;
  } else if (state.turn >= state.maxTurns) {
    state.done = true;
    if (state.wordsDestroyed >= state.totalWords) {
      state.won = true;
      reward += 300;
    } else {
      state.lost = true;
      reward -= 150;
    }
  } else if (state.spawnedCount >= state.totalWords && state.ciphers.length === 0) {
    state.done = true;
    if (state.hp > 0) {
      state.won = true;
      reward += 300;
    } else {
      state.lost = true;
      reward -= 150;
    }
  }

  return { reward, done: state.done };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TOTAL_WORDS,
    MAX_TURNS,
    INITIAL_HP,
    INITIAL_EMP,
    WORD_DICTIONARY,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
