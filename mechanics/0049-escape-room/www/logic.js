// Logic module for 0049-escape-room (Cryptic Vault)
// Pure deterministic discrete escape room puzzle

const MAX_TURNS = 40;
const STATIONS = ["desk", "painting", "panel", "safe", "door"];

function createRng(seed) {
  let s = (Math.imul(seed || 1, 1103515245) + 12345) & 0x7fffffff;
  return function() {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s / 0x80000000;
  };
}

function createState(seed = 1) {
  const rng = createRng(seed);

  // Randomize 3-digit safe code between 1 and 9
  const safeCode = [
    1 + Math.floor(rng() * 9),
    1 + Math.floor(rng() * 9),
    1 + Math.floor(rng() * 9)
  ];

  // Randomize switch solution (ensure not all same)
  const s0 = rng() > 0.5;
  const s1 = rng() > 0.5;
  const s2 = (!s0 && !s1) ? true : (s0 && s1 ? false : rng() > 0.5);
  const switchSolution = [s0, s1, s2];

  return {
    seed,
    turn: 0,
    turnsLeft: MAX_TURNS,
    mistakes: 0,
    currentStation: "desk",
    inventory: [],
    safeCode,
    switchSolution,
    switches: [false, false, false],
    fuseInserted: false,
    powerOn: false,
    paintingUnscrewed: false,
    deskScrewdriverAvailable: true,
    paintingFuseAvailable: false,
    safeDials: [0, 0, 0],
    safeOpened: false,
    safeKeycardAvailable: false,
    doorUnlocked: false,
    won: false,
    lost: false,
    done: false
  };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  const base = state.turnsLeft * 25 + state.inventory.length * 50 - state.mistakes * 20;
  return base + (state.won ? 1000 : 0);
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  // 1. Perspective navigation
  for (let i = 0; i < STATIONS.length; i++) {
    const s = STATIONS[i];
    if (s !== state.currentStation) {
      actions.push(`examine:${s}`);
    }
  }

  // 2. Station-specific actions
  if (state.currentStation === "desk") {
    if (state.deskScrewdriverAvailable) {
      actions.push("pickup:screwdriver");
    }
  } else if (state.currentStation === "painting") {
    if (!state.paintingUnscrewed && state.inventory.includes("screwdriver")) {
      actions.push("use:screwdriver:painting");
    }
    if (state.paintingFuseAvailable) {
      actions.push("pickup:fuse");
    }
  } else if (state.currentStation === "panel") {
    if (!state.fuseInserted && state.inventory.includes("fuse")) {
      actions.push("use:fuse:panel");
    }
    if (state.fuseInserted) {
      actions.push("toggle_switch:0");
      actions.push("toggle_switch:1");
      actions.push("toggle_switch:2");
    }
  } else if (state.currentStation === "safe") {
    if (!state.safeOpened) {
      actions.push("cycle_dial:0");
      actions.push("cycle_dial:1");
      actions.push("cycle_dial:2");
      actions.push("open_safe");
    }
    if (state.safeKeycardAvailable) {
      actions.push("pickup:keycard");
    }
  } else if (state.currentStation === "door") {
    if (!state.doorUnlocked && state.inventory.includes("keycard")) {
      actions.push("use:keycard:door");
    }
    if (state.doorUnlocked) {
      actions.push("escape");
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

  state.turnsLeft--;
  state.turn++;
  let reward = 0;

  if (action.startsWith("examine:")) {
    const station = action.slice(8);
    state.currentStation = station;
    reward += 5;
  } else if (action === "pickup:screwdriver") {
    state.deskScrewdriverAvailable = false;
    state.inventory.push("screwdriver");
    reward += 50;
  } else if (action === "use:screwdriver:painting") {
    state.paintingUnscrewed = true;
    state.paintingFuseAvailable = true;
    reward += 75;
  } else if (action === "pickup:fuse") {
    state.paintingFuseAvailable = false;
    state.inventory.push("fuse");
    reward += 50;
  } else if (action === "use:fuse:panel") {
    const idx = state.inventory.indexOf("fuse");
    if (idx !== -1) state.inventory.splice(idx, 1);
    state.fuseInserted = true;
    reward += 50;
  } else if (action.startsWith("toggle_switch:")) {
    const idx = parseInt(action.slice(14), 10);
    state.switches[idx] = !state.switches[idx];
    // Check if configuration matches solution
    const match = state.switches[0] === state.switchSolution[0] &&
                  state.switches[1] === state.switchSolution[1] &&
                  state.switches[2] === state.switchSolution[2];
    if (match && state.fuseInserted) {
      state.powerOn = true;
      reward += 100;
    } else {
      state.powerOn = false;
    }
  } else if (action.startsWith("cycle_dial:")) {
    const idx = parseInt(action.slice(11), 10);
    state.safeDials[idx] = (state.safeDials[idx] + 1) % 10;
    reward += 5;
  } else if (action === "open_safe") {
    const codeMatch = state.safeDials[0] === state.safeCode[0] &&
                      state.safeDials[1] === state.safeCode[1] &&
                      state.safeDials[2] === state.safeCode[2];
    if (codeMatch) {
      state.safeOpened = true;
      state.safeKeycardAvailable = true;
      reward += 150;
    } else {
      state.mistakes++;
      reward -= 10;
    }
  } else if (action === "pickup:keycard") {
    state.safeKeycardAvailable = false;
    state.inventory.push("keycard");
    reward += 100;
  } else if (action === "use:keycard:door") {
    if (state.powerOn) {
      state.doorUnlocked = true;
      reward += 200;
    } else {
      state.mistakes++;
      reward -= 20;
    }
  } else if (action === "escape") {
    state.won = true;
    state.done = true;
    reward += 500;
  }

  // End conditions
  if (!state.done && state.turnsLeft <= 0) {
    state.lost = true;
    state.done = true;
    reward -= 200;
  }

  return { reward, done: state.done };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    MAX_TURNS,
    STATIONS,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
