// 0178-score-attack: Arcade Blast - Pure Bot Contract Logic
// Deterministic high-speed score-attack arcade engine. Zero DOM, zero browser keywords.

const TARGET_TYPES = [
  { type: 'ruby', name: 'Ruby Gem', baseScore: 150, weight: 35 },
  { type: 'sapphire', name: 'Sapphire Crystal', baseScore: 300, weight: 30 },
  { type: 'emerald', name: 'Emerald Star', baseScore: 600, weight: 18 },
  { type: 'diamond', name: 'Diamond Crown', baseScore: 1200, weight: 7 },
  { type: 'skull', name: 'Hazard Skull', baseScore: -400, weight: 10 }
];

const PLATINUM_THRESHOLD = 75000;
const GOLD_THRESHOLD = 50000;

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

function spawnTarget(state) {
  const roll = Math.floor(nextRand(state) * 100);
  let acc = 0;
  for (const t of TARGET_TYPES) {
    acc += t.weight;
    if (roll < acc) {
      return { type: t.type, name: t.name, baseScore: t.baseScore };
    }
  }
  return { type: 'ruby', name: 'Ruby Gem', baseScore: 150 };
}

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 80,
    points: 0,
    combo: 0,
    comboMultiplier: 1,
    comboDecay: 3,
    frenzyMeter: 0,
    frenzyActive: 0,
    shield: 3,
    slots: [],
    gemsCleared: 0,
    victory: false,
    defeat: false,
    gameMessage: 'Neon Arcade Matrix primed. Chain gems, avoid hazard skulls, and reach 75,000 points!'
  };

  // Populate 4 initial target slots
  for (let i = 0; i < 4; i++) {
    state.slots.push(spawnTarget(state));
  }

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = state.points;
  val += state.gemsCleared * 50;
  val += state.shield * 2000;
  if (state.victory) val += 20000;
  return Math.max(0, Math.floor(val));
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  // Blast each slot
  for (let i = 0; i < state.slots.length; i++) {
    actions.push('action:blast_target:' + i);
  }

  // Laser overdrive
  if (state.frenzyMeter >= 40) {
    actions.push('action:charge_overdrive_laser');
  }

  // Frenzy Burst
  if (state.frenzyMeter >= 100 || state.frenzyActive > 0) {
    actions.push('action:trigger_frenzy_burst');
  }

  // Refresh targets
  actions.push('action:refresh_targets');

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal score attack action "' + action + '" in current state');
  }

  const oldScore = score(state);

  // Apply Action
  if (action.startsWith('action:blast_target:')) {
    const idx = parseInt(action.split(':')[2], 10);
    const target = state.slots[idx];

    if (target.type === 'skull') {
      // Hit Hazard
      state.combo = 0;
      state.comboMultiplier = 1;
      state.comboDecay = 0;
      state.shield -= 1;
      state.points = Math.max(0, state.points - 400);
      state.gameMessage = 'BOOM! Blasted Hazard Skull! Shield damaged (-400 pts, combo broken)!';
    } else {
      // Hit Gem
      state.combo += 1;
      state.comboMultiplier = Math.min(10, 1 + Math.floor(state.combo / 3));
      state.comboDecay = 4;
      const frenzyBoost = state.frenzyActive > 0 ? 2 : 1;
      const earned = target.baseScore * state.comboMultiplier * frenzyBoost;
      state.points += earned;
      state.frenzyMeter = Math.min(100, state.frenzyMeter + 16);
      state.gemsCleared += 1;
      state.gameMessage = 'Shattered ' + target.name + ' for +' + earned + ' pts! (' + state.comboMultiplier + 'x Combo)';
    }

    // Replace slot with fresh spawn
    state.slots[idx] = spawnTarget(state);
  } else if (action === 'action:charge_overdrive_laser') {
    state.frenzyMeter = Math.max(0, state.frenzyMeter - 40);
    let totalEarned = 0;
    for (let i = 0; i < state.slots.length; i++) {
      const t = state.slots[i];
      if (t.type !== 'skull') {
        const earned = t.baseScore * state.comboMultiplier;
        totalEarned += earned;
        state.gemsCleared += 1;
      }
      state.slots[i] = spawnTarget(state);
    }
    state.points += totalEarned;
    state.combo += 2;
    state.comboMultiplier = Math.min(10, 1 + Math.floor(state.combo / 3));
    state.comboDecay = 4;
    state.gameMessage = 'OVERDRIVE LASER! Cleared entire matrix for +' + totalEarned + ' pts!';
  } else if (action === 'action:trigger_frenzy_burst') {
    state.frenzyMeter = 0;
    state.frenzyActive = 5;
    state.combo = Math.max(state.combo, 15);
    state.comboMultiplier = 10;
    state.comboDecay = 6;
    let burstEarned = 0;
    for (let i = 0; i < state.slots.length; i++) {
      const t = state.slots[i];
      if (t.type !== 'skull') {
        burstEarned += t.baseScore * 10 * 2;
        state.gemsCleared += 1;
      }
      state.slots[i] = spawnTarget(state);
    }
    state.points += burstEarned;
    state.gameMessage = 'HYPER FRENZY BURST ACTIVATED! Max 10x multiplier & +' + burstEarned + ' pts!';
  } else if (action === 'action:refresh_targets') {
    for (let i = 0; i < state.slots.length; i++) {
      state.slots[i] = spawnTarget(state);
    }
    state.gameMessage = 'Scrambled target slots with fresh matrix spawns.';
  }

  // Handle Frenzy / Combo Decay
  if (state.frenzyActive > 0) {
    state.frenzyActive -= 1;
    if (state.frenzyActive === 0) {
      state.gameMessage += ' (Frenzy mode cooled down).';
    }
  } else {
    state.comboDecay -= 1;
    if (state.comboDecay <= 0 && state.combo > 0) {
      state.combo = Math.max(0, state.combo - 2);
      state.comboMultiplier = Math.min(10, 1 + Math.floor(state.combo / 3));
      state.comboDecay = 3;
    }
  }

  state.turns += 1;

  // Victory / Defeat verification
  if (state.points >= PLATINUM_THRESHOLD) {
    state.victory = true;
    state.gameMessage = 'PLATINUM GRAND CHAMPION! Breached 75,000 points with ' + state.points + ' pts!';
  } else if (state.shield <= 0) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Shield collapsed from explosive hazard detonations!';
  } else if (state.turns >= state.maxTurns) {
    if (state.points >= GOLD_THRESHOLD) {
      state.victory = true;
      state.gameMessage = 'VICTORY! Mastered Gold Medal tier with ' + state.points + ' pts!';
    } else {
      state.defeat = true;
      state.gameMessage = 'Defeat: Arcade clock ran out before achieving 50,000 Gold tier.';
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
    score,
    TARGET_TYPES,
    PLATINUM_THRESHOLD,
    GOLD_THRESHOLD,
    spawnTarget
  };
}
