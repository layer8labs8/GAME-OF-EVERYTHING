(function (root) {
  const LANES = 4;
  const TARGET_Y = 540;
  const NOTE_SPEED = 6;
  const MAX_STEPS = 400;
  const ACTIONS = ['wait', 'tap_0', 'tap_1', 'tap_2', 'tap_3'];

  function nextRandom(state) {
    let s = (state.rng + 0x6d2b79f5) | 0;
    state.rng = s;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function generateSong(state) {
    const track = [];
    let curStep = 10;
    let id = 1;
    while (curStep < 340) {
      const lane = Math.floor(nextRandom(state) * LANES);
      track.push({ id: id++, step: curStep, lane });
      const gap = 5 + Math.floor(nextRandom(state) * 8);
      curStep += gap;
    }
    return track;
  }

  function createState(seed) {
    const state = {
      notes: [],
      songTrack: [],
      health: 100,
      streak: 0,
      multiplier: 1,
      points: 0,
      lastRating: 'none',
      misses: 0,
      won: false,
      stepCount: 0,
      rng: (seed >>> 0) || 1,
    };
    state.songTrack = generateSong(state);
    return state;
  }

  function isOver(state) {
    return Boolean(state.health <= 0 || state.won || state.stepCount >= MAX_STEPS);
  }

  function legalActions(state) {
    return isOver(state) ? [] : ACTIONS.slice();
  }

  function step(state, action) {
    if (isOver(state) || typeof action !== 'string' || !ACTIONS.includes(action)) {
      throw new Error('Illegal action');
    }

    state.stepCount += 1;
    let reward = 0;

    // Spawn upcoming notes
    for (let i = 0; i < state.songTrack.length; i++) {
      const item = state.songTrack[i];
      if (item.step === state.stepCount) {
        state.notes.push({ id: item.id, lane: item.lane, y: 0, hit: false });
      }
    }

    // Advance existing notes
    for (let i = 0; i < state.notes.length; i++) {
      state.notes[i].y += NOTE_SPEED;
    }

    // Process Tap Action
    if (action.startsWith('tap_')) {
      const targetLane = parseInt(action.slice(4), 10);
      let bestNote = null;
      let minDiff = Infinity;

      for (let i = 0; i < state.notes.length; i++) {
        const n = state.notes[i];
        if (!n.hit && n.lane === targetLane) {
          const diff = Math.abs(n.y - TARGET_Y);
          if (diff < minDiff) {
            minDiff = diff;
            bestNote = n;
          }
        }
      }

      if (bestNote && minDiff <= 60) {
        bestNote.hit = true;
        let base = 25;
        let rating = 'ok';
        let hpGain = 0;

        if (minDiff <= 16) {
          rating = 'perfect';
          base = 100;
          hpGain = 2;
        } else if (minDiff <= 36) {
          rating = 'good';
          base = 50;
          hpGain = 1;
        }

        state.streak += 1;
        state.multiplier = Math.min(4, 1 + Math.floor(state.streak / 10));
        state.health = Math.min(100, state.health + hpGain);
        const gain = base * state.multiplier;
        state.points += gain;
        reward += gain;
        state.lastRating = rating;
      } else {
        // Off-beat tap
        state.streak = 0;
        state.multiplier = 1;
        state.health = Math.max(0, state.health - 2);
        reward -= 5;
        state.lastRating = 'miss';
      }
    }

    // Detect missed notes that passed baseline
    for (let i = state.notes.length - 1; i >= 0; i--) {
      const n = state.notes[i];
      if (!n.hit && n.y > TARGET_Y + 30) {
        state.streak = 0;
        state.multiplier = 1;
        state.health = Math.max(0, state.health - 5);
        state.misses += 1;
        reward -= 10;
        state.lastRating = 'miss';
        state.notes.splice(i, 1);
      } else if (n.hit) {
        state.notes.splice(i, 1);
      }
    }

    // Victory check
    if (state.stepCount >= MAX_STEPS && state.health > 0) {
      state.won = true;
      state.points += 300;
      reward += 300;
    }

    return { reward, done: isOver(state) };
  }

  function score(state) {
    return state.points;
  }

  const api = { LANES, TARGET_Y, NOTE_SPEED, MAX_STEPS, ACTIONS, createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
