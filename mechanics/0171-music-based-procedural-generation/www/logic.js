// 0171-music-based-procedural-generation: Beat Odyssey - Pure Bot Contract Logic
// Deterministic, zero DOM, pure state machine.

const TRACK_LENGTH = 100;
const LANES = [0, 1, 2];

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

function generateProceduralTrack(state) {
  const track = [];
  for (let m = 0; m < TRACK_LENGTH; m++) {
    // Procedural musical frequency amplitudes
    const bass = (Math.sin(m * 0.15 + state.seed * 0.01) + Math.cos(m * 0.05) + 2) / 4 * 100;
    const mid = (Math.sin(m * 0.3 + state.seed * 0.02) + 1) / 2 * 100;
    const treble = (Math.cos(m * 0.45 + state.seed * 0.03) + 1) / 2 * 100;

    const slice = {
      measure: m,
      bass: Math.floor(bass),
      mid: Math.floor(mid),
      treble: Math.floor(treble),
      elements: [null, null, null] // lanes 0, 1, 2
    };

    // Bass creates sonic barriers
    if (bass > 62) {
      const hLane = Math.floor(nextRand(state) * 3);
      slice.elements[hLane] = 'hazard';
    }

    // Mid creates Chroma energy gems
    if (mid > 45) {
      const gLane = Math.floor(nextRand(state) * 3);
      if (!slice.elements[gLane]) {
        slice.elements[gLane] = 'gem';
      }
    }

    // Treble creates Harmonizer shield repair rings
    if (treble > 68) {
      const rLane = Math.floor(nextRand(state) * 3);
      if (!slice.elements[rLane]) {
        slice.elements[rLane] = 'harmonizer';
      }
    }

    track.push(slice);
  }
  return track;
}

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 120,
    lane: 1, // center lane
    shield: 100,
    energy: 30,
    measure: 0,
    combo: 0,
    overdriveTurns: 0,
    gemsCollected: 0,
    barriersCleared: 0,
    track: [],
    victory: false,
    defeat: false,
    gameMessage: 'Procedural audio synth track generated. Surf the frequency highway to measure 100.'
  };

  state.track = generateProceduralTrack(state);

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = state.measure * 80;
  val += state.gemsCollected * 150;
  val += state.barriersCleared * 250;
  val += state.combo * 50;
  val += Math.floor(state.shield * 10);
  val += Math.floor(state.energy * 5);
  if (state.victory) val += 5000;
  return Math.max(0, Math.floor(val));
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  // Always legal to ride the beat
  actions.push('action:ride_beat');

  // Steering
  if (state.lane > 0) {
    actions.push('action:shift_lane:left');
  }
  if (state.lane < 2) {
    actions.push('action:shift_lane:right');
  }

  // Sonic Blast
  if (state.energy >= 20) {
    actions.push('action:pulse_sonic_blast');
  }

  // Overdrive
  if (state.energy >= 30 && state.overdriveTurns === 0) {
    actions.push('action:engage_overdrive');
  }

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal rhythm action "' + action + '" in current state');
  }

  const oldScore = score(state);

  let sonicBlasted = false;

  if (action === 'action:shift_lane:left') {
    state.lane = Math.max(0, state.lane - 1);
    state.gameMessage = 'Shifted ship to Lane ' + state.lane + ' (Left).';
  } else if (action === 'action:shift_lane:right') {
    state.lane = Math.min(2, state.lane + 1);
    state.gameMessage = 'Shifted ship to Lane ' + state.lane + ' (Right).';
  } else if (action === 'action:pulse_sonic_blast') {
    state.energy -= 20;
    sonicBlasted = true;
    state.barriersCleared += 1;
    state.gameMessage = 'Sonic blast discharged! Vaporized frequency distortion ahead.';
  } else if (action === 'action:engage_overdrive') {
    state.energy -= 30;
    state.overdriveTurns = 4;
    state.gameMessage = 'Overdrive engaged! Supersonic invulnerability and double score!';
  } else if (action === 'action:ride_beat') {
    state.gameMessage = 'Rode harmonic audio flow in Lane ' + state.lane + '.';
  }

  // Evaluate current track measure
  if (state.measure < state.track.length) {
    const slice = state.track[state.measure];
    const elem = slice.elements[state.lane];

    if (elem === 'hazard') {
      if (state.overdriveTurns > 0 || sonicBlasted) {
        state.barriersCleared += 1;
        state.combo += 1;
        state.gameMessage += ' Pierced straight through barrier safely!';
      } else {
        state.shield = Math.max(0, state.shield - 25);
        state.combo = 0;
        state.gameMessage += ' Crashed into sonic barrier! -25 Shield. Combo reset.';
      }
    } else if (elem === 'gem') {
      state.gemsCollected += 1;
      state.energy = Math.min(100, state.energy + 15);
      state.combo += 1;
      state.gameMessage += ' Collected Chroma Gem (+15 Energy, Combo ' + state.combo + 'x)!';
    } else if (elem === 'harmonizer') {
      state.shield = Math.min(100, state.shield + 20);
      state.combo += 2;
      state.gameMessage += ' Harmonizer Ring attuned (+20 Shield, +2 Combo)!';
    }
  }

  // Advance measure and turns
  state.measure += 1;
  state.turns += 1;

  if (state.overdriveTurns > 0) {
    state.overdriveTurns -= 1;
  }

  // Victory / Defeat checks
  if (state.measure >= TRACK_LENGTH && state.shield > 0) {
    state.victory = true;
    state.gameMessage = 'Victory! Completed 100 measures of procedural synthwave highway!';
  } else if (state.shield <= 0) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Sonic shields breached. Ship dispersed in frequency static.';
  } else if (state.turns >= state.maxTurns && !state.victory) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Song tempo dissipated before finishing track.';
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
    TRACK_LENGTH,
    LANES
  };
}
