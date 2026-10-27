// Logic module for 0054-minigames-collection (Micro Blitz)
// Pure deterministic multi-stage microgame gauntlet

const TOTAL_STAGES = 5;
const INITIAL_LIVES = 4;

function createRng(seed) {
  let s = (Math.imul(seed || 1, 1103515245) + 12345) & 0x7fffffff;
  return function() {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s / 0x80000000;
  };
}

function initStage(state) {
  const rng = createRng(state.seed + state.stageIndex * 71);
  state.stageStep = 0;

  if (state.stageIndex === 0) {
    // 1. DODGE
    state.prompt = "DODGE! Move away from danger!";
    state.playerLane = 1;
    state.dangerLane = Math.floor(rng() * 3) % 3;
    state.maxStageSteps = 2;
  } else if (state.stageIndex === 1) {
    // 2. CATCH
    state.prompt = "CATCH! Catch the falling gem!";
    state.playerLane = 1;
    // ensure target lane is different or same
    state.targetLane = Math.floor(rng() * 3) % 3;
    state.maxStageSteps = 2;
  } else if (state.stageIndex === 2) {
    // 3. PUMP
    state.prompt = "PUMP! Inflate the balloon!";
    state.pumps = 0;
    state.targetPumps = 3;
    state.maxStageSteps = 4;
  } else if (state.stageIndex === 3) {
    // 4. MATCH
    state.prompt = "MATCH! Pick the identical symbol!";
    const symbols = ["★", "●", "▲", "◆"];
    const targetIdx = Math.floor(rng() * symbols.length) % symbols.length;
    state.targetSymbol = symbols[targetIdx];

    // Pick 3 options where 1 is the target
    const remaining = symbols.filter(s => s !== state.targetSymbol);
    const correctSlot = Math.floor(rng() * 3) % 3;
    const options = [];
    let remIdx = 0;
    for (let i = 0; i < 3; i++) {
      if (i === correctSlot) options.push(state.targetSymbol);
      else options.push(remaining[remIdx++]);
    }
    state.matchOptions = options;
    state.correctOptionSlot = correctSlot;
    state.maxStageSteps = 1;
  } else if (state.stageIndex === 4) {
    // 5. DEFLECT
    state.prompt = "DEFLECT! Parry the projectile!";
    state.projectileDist = 2; // 2 -> 1 (timing frame) -> 0 (breach)
    state.deflected = false;
    state.maxStageSteps = 2;
  }
}

function createState(seed = 1) {
  const state = {
    seed,
    turn: 0,
    stageIndex: 0,
    totalStages: TOTAL_STAGES,
    lives: INITIAL_LIVES,
    stagesWon: 0,
    score: 0,
    stageStep: 0,
    maxStageSteps: 2,
    prompt: "",
    lastStageResult: null,
    won: false,
    lost: false,
    done: false
  };

  initStage(state);
  return state;
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return state.stagesWon * 200 + state.lives * 100 + (state.won ? 500 : 0);
}

function legalActions(state) {
  if (state.done) return [];

  const st = state.stageIndex;

  if (st === 0 || st === 1) {
    // DODGE or CATCH: move left/right/stay
    const actions = ["stay"];
    if (state.playerLane > 0) actions.push("move_left");
    if (state.playerLane < 2) actions.push("move_right");
    return actions;
  } else if (st === 2) {
    // PUMP
    return ["pump", "wait"];
  } else if (st === 3) {
    // MATCH
    return ["pick:0", "pick:1", "pick:2"];
  } else if (st === 4) {
    // DEFLECT
    return ["deflect", "wait"];
  }

  return ["wait"];
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
  state.stageStep++;
  let stageConcluded = false;
  let stageSuccess = false;

  const st = state.stageIndex;

  if (st === 0) {
    // 1. DODGE
    if (action === "move_left") state.playerLane = Math.max(0, state.playerLane - 1);
    else if (action === "move_right") state.playerLane = Math.min(2, state.playerLane + 1);

    if (state.stageStep >= state.maxStageSteps) {
      stageConcluded = true;
      stageSuccess = (state.playerLane !== state.dangerLane);
    }
  } else if (st === 1) {
    // 2. CATCH
    if (action === "move_left") state.playerLane = Math.max(0, state.playerLane - 1);
    else if (action === "move_right") state.playerLane = Math.min(2, state.playerLane + 1);

    if (state.stageStep >= state.maxStageSteps) {
      stageConcluded = true;
      stageSuccess = (state.playerLane === state.targetLane);
    }
  } else if (st === 2) {
    // 3. PUMP
    if (action === "pump") state.pumps++;

    if (state.pumps >= state.targetPumps) {
      stageConcluded = true;
      stageSuccess = true;
    } else if (state.stageStep >= state.maxStageSteps) {
      stageConcluded = true;
      stageSuccess = false;
    }
  } else if (st === 3) {
    // 4. MATCH
    const pickedIdx = parseInt(action.slice(5), 10);
    stageConcluded = true;
    stageSuccess = (pickedIdx === state.correctOptionSlot);
  } else if (st === 4) {
    // 5. DEFLECT
    if (action === "deflect") {
      if (state.projectileDist === 1) {
        state.deflected = true;
        stageConcluded = true;
        stageSuccess = true;
      } else {
        // Missed timing
        stageConcluded = true;
        stageSuccess = false;
      }
    } else {
      state.projectileDist--;
      if (state.projectileDist <= 0) {
        stageConcluded = true;
        stageSuccess = false;
      }
    }
  }

  // Handle stage outcome
  if (stageConcluded) {
    if (stageSuccess) {
      state.stagesWon++;
      reward += 150;
      state.score += 200;
      state.lastStageResult = { success: true, message: "STAGE CLEARED!" };
    } else {
      state.lives--;
      reward -= 50;
      state.lastStageResult = { success: false, message: "STAGE FAILED!" };
    }

    state.stageIndex++;

    if (state.lives <= 0) {
      state.lost = true;
      state.done = true;
      reward -= 150;
    } else if (state.stageIndex >= TOTAL_STAGES) {
      state.won = true;
      state.done = true;
      reward += 500;
    } else {
      initStage(state);
    }
  }

  return { reward, done: state.done };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TOTAL_STAGES,
    INITIAL_LIVES,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
