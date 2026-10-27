// 0154-hobby-sim: Miniature Workshop - Pure Bot Contract Logic
// Deterministic, zero DOM, pure state machine.

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

const MODEL_TEMPLATES = [
  { name: 'Aegis Vanguard Mecha', genre: 'Mecha', parts: 3, baseReward: 160 },
  { name: 'Highland Gryphon Knight', genre: 'Fantasy', parts: 2, baseReward: 140 },
  { name: 'Solar Interceptor Strike Craft', genre: 'Sci-Fi', parts: 3, baseReward: 170 },
  { name: 'Spitfire Mk IX Fighter', genre: 'Historical', parts: 2, baseReward: 150 },
  { name: 'Dreadnought Titan Armor', genre: 'Mecha', parts: 4, baseReward: 200 }
];

function spawnModel(state) {
  const idx = Math.floor(nextRand(state) * MODEL_TEMPLATES.length);
  const tpl = MODEL_TEMPLATES[idx];
  state.currentModel = {
    id: 'kit_' + (state.completedModels + state.ruinedModels + 1),
    name: tpl.name,
    genre: tpl.genre,
    stage: 0, // 0: Snipping, 1: Sanding, 2: Assembly, 3: Painting, 4: Highlighting/Varnish
    craftsmanship: 50,
    partsRemaining: tpl.parts,
    targetParts: tpl.parts,
    baseReward: tpl.baseReward
  };
}

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 120,
    focus: 90,
    inspiration: 70,
    coins: 140,
    supplies: {
      plasticCement: 4,
      sandingPads: 4,
      paintPots: 5
    },
    currentModel: null,
    completedModels: 0,
    ruinedModels: 0,
    medals: {
      gold: 0,
      silver: 0,
      bronze: 0
    },
    acclaim: 0,
    victory: false,
    defeat: false,
    gameMessage: 'Welcome to Miniature Workshop! Unbox a fresh model kit on your cutting mat.'
  };

  spawnModel(state);
  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = state.acclaim;
  val += state.completedModels * 150;
  val += state.medals.gold * 300;
  val += state.medals.silver * 150;
  val += state.medals.bronze * 50;
  val += Math.floor(state.coins * 1.5);
  val -= state.ruinedModels * 200;
  if (state.victory) val += 2500;
  return Math.max(0, Math.floor(val));
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  // Workshop utility actions
  actions.push('action:sip_herbal_tea');

  if (state.coins >= 40) {
    actions.push('action:restock_hobby_supplies');
  }

  if (state.currentModel === null) {
    actions.push('action:unbox_next_kit');
  } else {
    const m = state.currentModel;
    if (m.stage === 0) {
      if (state.focus >= 10) {
        actions.push('action:snip_runner_parts');
      }
    } else if (m.stage === 1) {
      if (state.focus >= 8 && state.supplies.sandingPads >= 1) {
        actions.push('action:sand_nub_marks');
      }
      actions.push('action:skip_to_assembly');
    } else if (m.stage === 2) {
      if (state.supplies.plasticCement >= 1) {
        actions.push('action:cement_subassembly');
      }
    } else if (m.stage === 3) {
      if (state.supplies.paintPots >= 1) {
        actions.push('action:apply_base_and_shade');
      }
    } else if (m.stage === 4) {
      if (state.focus >= 10 && state.inspiration >= 15) {
        actions.push('action:edge_highlight_details');
      }
      actions.push('action:enter_exhibition');
    }
  }

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal action "' + action + '" in miniature workshop');
  }

  const oldScore = score(state);

  if (action === 'action:sip_herbal_tea') {
    state.focus = Math.min(100, state.focus + 35);
    state.inspiration = Math.min(100, state.inspiration + 20);
    state.gameMessage = 'Sipped warm herbal tea. Restored focus and creative inspiration.';
  } else if (action === 'action:restock_hobby_supplies') {
    state.coins = Math.max(0, state.coins - 40);
    state.supplies.plasticCement += 3;
    state.supplies.sandingPads += 3;
    state.supplies.paintPots += 3;
    state.gameMessage = 'Purchased cement, sanding pads, and paint jars from the hobby store.';
  } else if (action === 'action:unbox_next_kit') {
    spawnModel(state);
    state.gameMessage = 'Unboxed brand new ' + state.currentModel.name + ' kit onto the cutting mat!';
  } else if (state.currentModel) {
    const m = state.currentModel;

    if (action === 'action:snip_runner_parts') {
      state.focus = Math.max(0, state.focus - 10);
      m.partsRemaining -= 1;
      if (m.partsRemaining <= 0) {
        m.stage = 1;
        state.gameMessage = 'All components cleanly snipped from runners! Advancing to sanding.';
      } else {
        state.gameMessage = 'Snipped part cleanly. ' + m.partsRemaining + ' pieces remaining on sprue.';
      }
    } else if (action === 'action:sand_nub_marks') {
      state.focus = Math.max(0, state.focus - 8);
      state.supplies.sandingPads = Math.max(0, state.supplies.sandingPads - 1);
      m.craftsmanship = Math.min(100, m.craftsmanship + 15);
      m.stage = 2;
      state.gameMessage = 'Polished nub marks and mold lines. Craftsmanship elevated to ' + m.craftsmanship + '!';
    } else if (action === 'action:skip_to_assembly') {
      m.stage = 2;
      state.gameMessage = 'Skipped sanding directly to assembly stage.';
    } else if (action === 'action:cement_subassembly') {
      state.supplies.plasticCement = Math.max(0, state.supplies.plasticCement - 1);
      state.focus = Math.max(0, state.focus - 6);
      m.craftsmanship = Math.min(100, m.craftsmanship + 10);
      m.stage = 3;
      state.gameMessage = 'Welded joints with plastic cement. Assembly complete! Advancing to painting.';
    } else if (action === 'action:apply_base_and_shade') {
      state.supplies.paintPots = Math.max(0, state.supplies.paintPots - 1);
      state.focus = Math.max(0, state.focus - 8);
      m.craftsmanship = Math.min(100, m.craftsmanship + 15);
      m.stage = 4;
      state.gameMessage = 'Applied smooth acrylic basecoat and shaded dark panel lines.';
    } else if (action === 'action:edge_highlight_details') {
      state.focus = Math.max(0, state.focus - 10);
      state.inspiration = Math.max(0, state.inspiration - 15);
      m.craftsmanship = Math.min(100, m.craftsmanship + 15);
      state.gameMessage = 'Applied feather-light edge highlights! Craftsmanship reached ' + m.craftsmanship + '.';
    } else if (action === 'action:enter_exhibition') {
      const q = m.craftsmanship;
      let medal = 'bronze';
      let awardAcclaim = 100;
      let awardCoins = 75;

      if (q >= 85) {
        medal = 'gold';
        awardAcclaim = 320;
        awardCoins = 180;
        state.medals.gold += 1;
      } else if (q >= 65) {
        medal = 'silver';
        awardAcclaim = 200;
        awardCoins = 120;
        state.medals.silver += 1;
      } else {
        state.medals.bronze += 1;
      }

      state.acclaim += awardAcclaim;
      state.coins += awardCoins;
      state.completedModels += 1;
      state.gameMessage = 'Exhibition judged "' + m.name + '" (' + q + '% score): Awarded ' + medal.toUpperCase() + ' medal!';
      state.currentModel = null;
    }
  }

  // Turn advance
  state.turns += 1;

  // Win / Loss evaluation
  if (state.completedModels >= 5 && state.medals.gold >= 3 && state.acclaim >= 1500) {
    state.victory = true;
    state.gameMessage = 'Victory! Crowned Grandmaster Model Artisan with an acclaimed trophy showcase!';
  } else if (state.ruinedModels >= 3) {
    state.defeat = true;
    state.gameMessage = 'Defeat: 3 models catastrophically ruined. Workshop forced into hiatus.';
  } else if (state.turns >= state.maxTurns) {
    if (state.completedModels >= 4 && state.medals.gold >= 2) {
      state.victory = true;
      state.gameMessage = 'Victory: Exhibition season concluded with award-winning miniature portfolio!';
    } else {
      state.gameMessage = 'Hobby season concluded. Workshop closed for winter.';
    }
  }

  const newScore = score(state);
  const reward = newScore - oldScore;
  const done = isOver(state);

  return { reward, done };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
