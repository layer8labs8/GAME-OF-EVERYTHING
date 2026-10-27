/**
 * 0152-medical-sim: Trauma Ward
 * Pure emergency surgical simulation engine conforming strictly to the Bot Contract.
 * No browser globals, seedable PRNG, fully deterministic and serializable.
 */

const MAX_TURNS = 120;

const PATIENT_CASES = [
  { name: 'Acute Appendicitis', payout: 180, initStability: 75, initHr: 95 },
  { name: 'Thoracic Trauma', payout: 260, initStability: 65, initHr: 120 },
  { name: 'Subdural Hematoma', payout: 290, initStability: 55, initHr: 135 },
  { name: 'Aortic Repair', payout: 340, initStability: 50, initHr: 145 }
];

const PATIENT_NAMES = ['Arthur Pendelton', 'Elena Rostova', 'Marcus Vance', 'Diana Prince', 'David Miller', 'Clara Oswald'];

function createPrng(seed) {
  let s = (seed >>> 0) || 123456789;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getRng(state) {
  let s = (state.prngState >>> 0) || 123456789;
  s = (s + 0x6D2B79F5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  state.prngState = s;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function createPatient(state, rngFn) {
  const cIdx = Math.floor(rngFn() * PATIENT_CASES.length);
  const nIdx = Math.floor(rngFn() * PATIENT_NAMES.length);
  const pc = PATIENT_CASES[cIdx];

  return {
    id: 'p_' + (state.nextPatientId++),
    name: PATIENT_NAMES[nIdx],
    condition: pc.name,
    stability: pc.initStability,
    heartRate: pc.initHr,
    bloodLoss: 30,
    phase: 0,
    payout: pc.payout
  };
}

function createState(seed = 1) {
  const rng = createPrng(seed);
  let nextId = 1;

  const firstCase = PATIENT_CASES[0];
  const initialPatient = {
    id: 'p_' + (nextId++),
    name: 'Arthur Pendelton',
    condition: firstCase.name,
    stability: firstCase.initStability,
    heartRate: firstCase.initHr,
    bloodLoss: 25,
    phase: 0,
    payout: firstCase.payout
  };

  return {
    seed: seed >>> 0,
    prngState: seed >>> 0,
    turns: 0,
    maxTurns: MAX_TURNS,
    funds: 400,
    reputation: 75,
    patientsSaved: 0,
    fatalities: 0,
    currentPatient: initialPatient,
    nextPatientId: nextId,
    score: 0,
    done: false,
    victory: false,
    log: [
      'Trauma Ward surgical theater prepared for emergency intake.',
      'Stabilize vitals, incise, cauterize hemorrhage, repair trauma, and suture closed.'
    ]
  };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return state.score;
}

function addLog(state, line) {
  state.log.push(line);
  if (state.log.length > 20) {
    state.log.shift();
  }
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];
  const p = state.currentPatient;

  if (!p) {
    actions.push('action:admit_next_patient');
    return actions;
  }

  // Defibrillate if cardiac arrest / low stability
  if (p.stability < 35) {
    actions.push('action:defibrillate');
  }

  // Sedation (Always legal during surgery)
  if (p.stability < 95) {
    actions.push('action:administer_sedation');
  }

  // Phase-specific actions
  if (p.phase === 0) {
    actions.push('action:scalpel_incision');
  } else if (p.phase === 1) {
    actions.push('action:cauterize_and_suction');
  } else if (p.phase === 2) {
    actions.push('action:execute_repair');
  } else if (p.phase === 3) {
    actions.push('action:suture_and_close');
  }

  return actions;
}

function step(state, action) {
  if (state.done) {
    throw new Error('Simulation is already over.');
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action "${action}".`);
  }

  state.turns += 1;
  let reward = 0;
  const p = state.currentPatient;

  // Admit Next Patient
  if (action === 'action:admit_next_patient') {
    state.currentPatient = createPatient(state, () => getRng(state));
    reward += 5;
    state.score += 10;
    addLog(state, `Ambulance admission: ${state.currentPatient.name} wheeled in (${state.currentPatient.condition}).`);
    return { reward, done: false };
  }

  // Administer Sedation
  if (action === 'action:administer_sedation') {
    p.stability = Math.min(100, p.stability + 20);
    p.heartRate = Math.max(70, p.heartRate - 15);
    reward += 4;
    state.score += 8;
    addLog(state, `Administered IV anesthetic: Vitals stabilized to ${p.stability}%, Heart Rate ${p.heartRate} bpm.`);
  }

  // Defibrillate
  else if (action === 'action:defibrillate') {
    p.stability = Math.min(60, p.stability + 35);
    p.heartRate = 85;
    reward += 8;
    state.score += 20;
    addLog(state, 'CLEAR! Delivered 200J defibrillator shock: Sinus heart rhythm restored!');
  }

  // Scalpel Incision
  else if (action === 'action:scalpel_incision') {
    p.phase = 1;
    p.bloodLoss += 15;
    p.stability = Math.max(0, p.stability - 8);
    reward += 8;
    state.score += 15;
    addLog(state, 'Precision scalpel incision executed: Surgical cavity accessed.');
  }

  // Cauterize and Suction
  else if (action === 'action:cauterize_and_suction') {
    p.phase = 2;
    p.bloodLoss = Math.max(0, p.bloodLoss - 30);
    p.stability = Math.min(100, p.stability + 5);
    reward += 10;
    state.score += 25;
    addLog(state, 'Electrocautery suction complete: Active bleeding clamped and field cleared.');
  }

  // Execute Repair
  else if (action === 'action:execute_repair') {
    p.phase = 3;
    p.stability = Math.max(0, p.stability - 6);
    reward += 15;
    state.score += 40;
    addLog(state, `Internal organ pathology repaired successfully for ${p.name}!`);
  }

  // Suture and Close
  else if (action === 'action:suture_and_close') {
    const earnings = p.payout;
    state.funds += earnings;
    state.reputation = Math.min(100, state.reputation + 4);
    state.patientsSaved += 1;
    state.currentPatient = null; // Operation complete!

    reward += 30 + Math.floor(earnings / 15);
    state.score += 60 + Math.floor(earnings / 8);
    addLog(state, `SURGERY SUCCESS: Suture closure sterile and complete! Discharged patient for +$${earnings} Hospital Funds.`);

    // Check Victory
    if (state.patientsSaved >= 10 && state.reputation >= 80 && state.funds >= 2000) {
      state.victory = true;
      state.done = true;
      reward += 200;
      state.score += 300;
      addLog(state, 'SURGICAL EXCELLENCE: Chief Surgeon honored with prestigious Fellowship of Medicine!');
      return { reward, done: true };
    }

    return { reward, done: false };
  }

  // Natural Intra-Operative Stability Degradation
  if (p && action !== 'action:administer_sedation' && action !== 'action:defibrillate') {
    p.stability = Math.max(0, p.stability - 6);
    p.heartRate = Math.min(180, p.heartRate + 4);

    // Cardiac Arrest Check
    if (p.stability <= 0) {
      state.fatalities += 1;
      state.reputation = Math.max(0, state.reputation - 20);
      state.currentPatient = null;
      reward -= 50;
      addLog(state, `FATALITY: Patient ${p.name} succumbed to cardiac arrest (-20% Rep).`);

      if (state.fatalities >= 3 || state.reputation <= 0) {
        state.done = true;
        state.victory = false;
        addLog(state, 'MALPRACTICE INQUIRY: Medical board revoked surgical operating license.');
        return { reward, done: true };
      }
    }
  }

  // Defeat Checks
  if (state.funds < -200) {
    state.done = true;
    state.victory = false;
    reward -= 100;
    addLog(state, 'HOSPITAL BANKRUPTCY: Operating ward seized by creditors.');
    return { reward, done: true };
  }

  if (state.turns >= state.maxTurns) {
    state.done = true;
    addLog(state, 'Emergency shift timeframe concluded.');
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
    PATIENT_CASES,
    MAX_TURNS
  };
}
