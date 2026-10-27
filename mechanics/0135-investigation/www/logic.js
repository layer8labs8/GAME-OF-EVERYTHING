/**
 * 0135-investigation: Crime Scene Reconstruction
 * Pure forensic investigation logic conforming strictly to the Bot Contract.
 * No browser globals, seedable PRNG, fully deterministic and serializable.
 */

const MAX_TURNS = 150;

const STATIONS = ['vault_door', 'security_console', 'glass_display', 'ventilation_shaft'];

const TOOLS = ['tool:uv_luminol', 'tool:spectrometer', 'tool:ballistics_laser', 'tool:cipher_decoder'];

const CORRECT_TIMELINE = {
  phase_1: 'event_optic',
  phase_2: 'event_thermite',
  phase_3: 'event_console',
  phase_4: 'event_vitrine'
};

const EVENT_NAMES = {
  event_optic: 'Optic Sensor Disablement (Vent Trajectory)',
  event_thermite: 'Thermal Vault Door Breach (Thermite)',
  event_console: 'Security Console Memory Override',
  event_vitrine: 'Vitrine Impact & Relic Theft'
};

function createPrng(seed) {
  let s = (seed >>> 0) || 123456789;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createState(seed = 1) {
  return {
    seed: seed >>> 0,
    prngState: seed >>> 0,
    turns: 0,
    maxTurns: MAX_TURNS,
    station: 'vault_door',
    evidence: [],
    stationScans: {},
    timelineSlots: {
      phase_1: null,
      phase_2: null,
      phase_3: null,
      phase_4: null
    },
    score: 0,
    done: false,
    victory: false,
    log: [
      'Forensic Team Alpha deployed to Chronos Vault crime scene.',
      'Scan stations with forensic tools and reconstruct the breach timeline.'
    ]
  };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return state.score;
}

function addLog(state, msg) {
  state.log.push(msg);
  if (state.log.length > 20) {
    state.log.shift();
  }
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  // Station navigation
  for (let i = 0; i < STATIONS.length; i++) {
    if (STATIONS[i] !== state.station) {
      actions.push('move:' + STATIONS[i]);
    }
  }

  // Station forensic tool scans
  for (let i = 0; i < TOOLS.length; i++) {
    const tool = TOOLS[i];
    const key = state.station + ':' + tool;
    if (!state.stationScans[key]) {
      actions.push('scan:' + tool);
    }
  }

  // Timeline assignments for unlocked events
  const unlockedEvents = [];
  if (state.evidence.includes('optic_trajectory')) unlockedEvents.push('event_optic');
  if (state.evidence.includes('thermite_residue')) unlockedEvents.push('event_thermite');
  if (state.evidence.includes('corrupted_timestamps')) unlockedEvents.push('event_console');
  if (state.evidence.includes('vitrine_impact')) unlockedEvents.push('event_vitrine');

  const phases = ['phase_1', 'phase_2', 'phase_3', 'phase_4'];
  for (let p = 0; p < phases.length; p++) {
    const phase = phases[p];
    for (let e = 0; e < unlockedEvents.length; e++) {
      const ev = unlockedEvents[e];
      if (state.timelineSlots[phase] !== ev) {
        actions.push('assign:' + phase + ':' + ev);
      }
    }
  }

  // Finalize report if all 4 slots are filled
  if (
    state.timelineSlots.phase_1 &&
    state.timelineSlots.phase_2 &&
    state.timelineSlots.phase_3 &&
    state.timelineSlots.phase_4
  ) {
    actions.push('action:finalize_report');
  }

  return actions;
}

function step(state, action) {
  if (state.done) {
    throw new Error('Game is already over.');
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action "${action}".`);
  }

  state.turns += 1;
  let reward = 0;

  // Navigation
  if (action.startsWith('move:')) {
    const target = action.split(':')[1];
    state.station = target;
    reward += 1;
    addLog(state, `Station shifted to ${target.toUpperCase().replace(/_/g, ' ')}.`);
  }

  // Tool Scans
  else if (action.startsWith('scan:')) {
    const tool = action.slice(5); // e.g. "tool:uv_luminol"
    const key = state.station + ':' + tool;
    state.stationScans[key] = true;
    reward += 5;
    state.score += 10;

    if (state.station === 'vault_door') {
      if (tool === 'tool:spectrometer') {
        if (!state.evidence.includes('thermite_residue')) {
          state.evidence.push('thermite_residue');
          state.score += 20;
          reward += 10;
          addLog(state, 'Spectrometry complete: 2400°C military thermite combustion residue identified!');
        }
      } else if (tool === 'tool:uv_luminol') {
        if (!state.evidence.includes('latent_prints')) {
          state.evidence.push('latent_prints');
          state.score += 10;
          addLog(state, 'UV Luminol illuminated partial glove contact smudges on the bypass frame.');
        }
      } else {
        addLog(state, 'Scan complete: No anomalies detected with this sensor at the vault door.');
      }
    } else if (state.station === 'security_console') {
      if (tool === 'tool:cipher_decoder') {
        if (!state.evidence.includes('corrupted_timestamps')) {
          state.evidence.push('corrupted_timestamps');
          state.score += 20;
          reward += 10;
          addLog(state, 'Cipher decoded: Recovered internal clock memory override recorded at 03:15:22 AM.');
        }
      } else if (tool === 'tool:uv_luminol') {
        if (!state.evidence.includes('keypad_pattern')) {
          state.evidence.push('keypad_pattern');
          state.score += 10;
          addLog(state, 'UV scan revealed numeric keypad heat signatures on keys 3, 7, and 9.');
        }
      } else {
        addLog(state, 'Scan complete: Sensor calibration negative at console.');
      }
    } else if (state.station === 'glass_display') {
      if (tool === 'tool:ballistics_laser') {
        if (!state.evidence.includes('vitrine_impact')) {
          state.evidence.push('vitrine_impact');
          state.score += 20;
          reward += 10;
          addLog(state, 'Laser diffraction: Fracture stress lines prove high-frequency acoustic shatter.');
        }
      } else if (tool === 'tool:spectrometer') {
        if (!state.evidence.includes('glove_polymers')) {
          state.evidence.push('glove_polymers');
          state.score += 10;
          addLog(state, 'Spectrometry identified traces of conductive graphite glove lubricant.');
        }
      } else {
        addLog(state, 'Scan complete: Display vitrine surface yielded no additional data.');
      }
    } else if (state.station === 'ventilation_shaft') {
      if (tool === 'tool:ballistics_laser') {
        if (!state.evidence.includes('optic_trajectory')) {
          state.evidence.push('optic_trajectory');
          state.score += 20;
          reward += 10;
          addLog(state, 'Ballistics trajectory locked: Suppressed dart fired from vent directly into camera lens!');
        }
      } else if (tool === 'tool:uv_luminol') {
        if (!state.evidence.includes('synthetic_fiber')) {
          state.evidence.push('synthetic_fiber');
          state.score += 10;
          addLog(state, 'UV fluorescence highlighted Kevlar woven micro-fiber snagged on louvers.');
        }
      } else {
        addLog(state, 'Scan complete: Ventilation intake clear.');
      }
    }
  }

  // Timeline Assignment
  else if (action.startsWith('assign:')) {
    const parts = action.split(':');
    const phase = parts[1];
    const eventId = parts[2];
    state.timelineSlots[phase] = eventId;
    reward += 2;
    state.score += 5;
    addLog(state, `Assigned "${EVENT_NAMES[eventId]}" to ${phase.toUpperCase().replace('_', ' ')}.`);
  }

  // Finalize Report
  else if (action === 'action:finalize_report') {
    const slots = state.timelineSlots;
    const isCorrect = (
      slots.phase_1 === CORRECT_TIMELINE.phase_1 &&
      slots.phase_2 === CORRECT_TIMELINE.phase_2 &&
      slots.phase_3 === CORRECT_TIMELINE.phase_3 &&
      slots.phase_4 === CORRECT_TIMELINE.phase_4
    );

    if (isCorrect) {
      state.victory = true;
      state.done = true;
      reward += 100;
      state.score += 100;
      addLog(state, 'RECONSTRUCTION CERTIFIED! Complete forensic audit validated by Crime Lab Command.');
      return { reward, done: true };
    } else {
      reward -= 10;
      addLog(state, 'AUDIT FAILED: Timeline contradictions present in forensic sequence. Verify order of breach!');
    }
  }

  // Turn bound check
  if (state.turns >= state.maxTurns) {
    state.done = true;
    addLog(state, 'Investigation timeframe expired without definitive timeline closure.');
  }

  return { reward, done: state.done };
}

// Module export for Node.js test runners & Bot checkers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score,
    MAX_TURNS,
    STATIONS,
    TOOLS,
    CORRECT_TIMELINE,
    EVENT_NAMES
  };
}
