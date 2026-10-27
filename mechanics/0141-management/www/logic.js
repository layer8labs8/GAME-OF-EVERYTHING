/**
 * 0141-management: Apex Clinic
 * Pure healthcare management simulation engine conforming strictly to the Bot Contract.
 * No browser globals, seedable PRNG, fully deterministic and serializable.
 */

const MAX_TURNS = 150;

const PATIENT_TYPES = [
  { name: 'Influenza', severity: 'mild', payout: 70 },
  { name: 'Compound Fracture', severity: 'mild', payout: 80 },
  { name: 'Cardiac Strain', severity: 'moderate', payout: 110 },
  { name: 'Neuro Anomaly', severity: 'moderate', payout: 130 },
  { name: 'Acute Trauma', severity: 'severe', payout: 180 }
];

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
  const rng = createPrng(seed);

  // Initial patient intake
  const initialQueue = [];
  for (let i = 0; i < 3; i++) {
    const tIdx = Math.floor(rng() * 3);
    const pType = PATIENT_TYPES[tIdx];
    initialQueue.push({
      id: 'p_' + (i + 1),
      name: pType.name,
      severity: pType.severity,
      payout: pType.payout,
      treated: false
    });
  }

  return {
    seed: seed >>> 0,
    prngState: seed >>> 0,
    turns: 0,
    maxTurns: MAX_TURNS,
    day: 1,
    funds: 800,
    reputation: 75,
    hygiene: 90,
    capacity: 6,
    staffSkill: 1,
    staff: {
      doctors: 2,
      nurses: 2,
      orderlies: 1
    },
    patientQueue: initialQueue,
    patientsTreated: 0,
    nextPatientId: 4,
    score: 10,
    done: false,
    victory: false,
    log: [
      'Apex Clinic doors opened to the public for Day 1.',
      'Treat incoming patient queues, maintain hygiene, and balance payroll.'
    ]
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

function getUntreatedCount(state) {
  let count = 0;
  for (let i = 0; i < state.patientQueue.length; i++) {
    if (!state.patientQueue[i].treated) count++;
  }
  return count;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  // Clinical treatment
  if (getUntreatedCount(state) > 0 && (state.staff.doctors > 0 || state.staff.nurses > 0)) {
    actions.push('action:process_queue');
  }

  // Facility hygiene
  if (state.hygiene < 95) {
    actions.push('action:sanitize_clinic');
  }

  // Hiring
  if (state.funds >= 150 && state.staff.doctors < 5) {
    actions.push('hire:doctor');
  }
  if (state.funds >= 100 && state.staff.nurses < 5) {
    actions.push('hire:nurse');
  }
  if (state.funds >= 80 && state.staff.orderlies < 4) {
    actions.push('hire:orderly');
  }

  // Hospital upgrades
  if (state.funds >= 200 && state.capacity < 12) {
    actions.push('action:expand_capacity');
  }
  if (state.funds >= 150 && state.staffSkill < 3) {
    actions.push('action:train_staff');
  }

  // Shift conclusion
  actions.push('action:end_shift');

  return actions;
}

function step(state, action) {
  if (state.done) {
    throw new Error('Management simulation is already over.');
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action "${action}".`);
  }

  state.turns += 1;
  let reward = 0;

  // Process Queue
  if (action === 'action:process_queue') {
    const bandwidth = state.staff.doctors * 2 + state.staff.nurses + state.staffSkill;
    let curedThisBatch = 0;
    let earnedThisBatch = 0;

    for (let i = 0; i < state.patientQueue.length; i++) {
      const p = state.patientQueue[i];
      if (!p.treated && curedThisBatch < bandwidth) {
        p.treated = true;
        curedThisBatch += 1;
        earnedThisBatch += p.payout;
        state.patientsTreated += 1;
      }
    }

    state.funds += earnedThisBatch;
    state.hygiene = Math.max(10, state.hygiene - curedThisBatch * 3);
    state.reputation = Math.min(100, state.reputation + 2);
    reward += 8 + curedThisBatch * 2;
    state.score += 15 + curedThisBatch * 5;
    addLog(state, `Medical Staff processed ${curedThisBatch} patients: Earned +$${earnedThisBatch} in medical revenues.`);
  }

  // Sanitize Clinic
  else if (action === 'action:sanitize_clinic') {
    const boost = 20 + state.staff.orderlies * 5;
    state.hygiene = Math.min(100, state.hygiene + boost);
    reward += 4;
    state.score += 5;
    addLog(state, `Orderly sterilization sweep complete (+${boost}% Clinic Hygiene).`);
  }

  // Hire Staff
  else if (action === 'hire:doctor') {
    state.funds -= 150;
    state.staff.doctors += 1;
    reward += 5;
    state.score += 10;
    addLog(state, `Recruited certified Physician Dr. Sterling (Active Doctors: ${state.staff.doctors}).`);
  } else if (action === 'hire:nurse') {
    state.funds -= 100;
    state.staff.nurses += 1;
    reward += 4;
    state.score += 8;
    addLog(state, `Recruited Clinical Nurse Sarah (Active Nurses: ${state.staff.nurses}).`);
  } else if (action === 'hire:orderly') {
    state.funds -= 80;
    state.staff.orderlies += 1;
    reward += 3;
    state.score += 6;
    addLog(state, `Recruited Maintenance Orderly Arthur (Active Orderlies: ${state.staff.orderlies}).`);
  }

  // Upgrades
  else if (action === 'action:expand_capacity') {
    state.funds -= 200;
    state.capacity += 2;
    reward += 10;
    state.score += 20;
    addLog(state, `Expanded clinical ward capacity: Now accommodation for ${state.capacity} inpatient beds.`);
  } else if (action === 'action:train_staff') {
    state.funds -= 150;
    state.staffSkill += 1;
    reward += 10;
    state.score += 20;
    addLog(state, `Medical symposium completed: Staff skill advanced to Level ${state.staffSkill}!`);
  }

  // End Shift
  else if (action === 'action:end_shift') {
    state.day += 1;

    // Daily payroll expense
    const payroll = state.staff.doctors * 30 + state.staff.nurses * 20 + state.staff.orderlies * 15;
    state.funds -= payroll;

    // Remove treated patients and discharge them
    const retainedQueue = [];
    let untreatedLeftovers = 0;
    for (let i = 0; i < state.patientQueue.length; i++) {
      if (!state.patientQueue[i].treated) {
        retainedQueue.push(state.patientQueue[i]);
        untreatedLeftovers += 1;
      }
    }

    if (untreatedLeftovers > 0) {
      state.reputation = Math.max(0, state.reputation - untreatedLeftovers * 2);
      addLog(state, `Day concluded: Paid $${payroll} payroll. ${untreatedLeftovers} untreated patients left dissatisfied (-${untreatedLeftovers * 2}% Rep).`);
    } else {
      state.reputation = Math.min(100, state.reputation + 4);
      addLog(state, `Day concluded: Paid $${payroll} payroll. All daily admissions were cleanly cleared (+4% Rep)!`);
    }

    // Admit new patient intake
    state.patientQueue = retainedQueue;
    const availableBeds = state.capacity - state.patientQueue.length;
    const newIntake = Math.min(availableBeds, Math.floor(state.reputation / 25) + 2);

    for (let i = 0; i < newIntake; i++) {
      const rand = getRng(state);
      const tIdx = Math.floor(rand * PATIENT_TYPES.length);
      const pType = PATIENT_TYPES[tIdx];
      state.patientQueue.push({
        id: 'p_' + state.nextPatientId++,
        name: pType.name,
        severity: pType.severity,
        payout: pType.payout,
        treated: false
      });
    }

    reward += 5;
    state.score += 10;
  }

  // Victory Check
  if (state.patientsTreated >= 40 && state.reputation >= 80 && state.funds >= 1000) {
    state.victory = true;
    state.done = true;
    reward += 100;
    state.score += 150;
    addLog(state, 'HOSPITAL EXCELLENCE AWARD: Apex Clinic has become the gold standard medical center!');
    return { reward, done: true };
  }

  // Defeat Checks
  if (state.funds < -500) {
    state.done = true;
    state.victory = false;
    reward -= 50;
    addLog(state, 'Bankrupt! Facility finances collapsed into administration.');
    return { reward, done: true };
  }
  if (state.reputation <= 0) {
    state.done = true;
    state.victory = false;
    reward -= 50;
    addLog(state, 'Medical malpractice revoked clinic operating license.');
    return { reward, done: true };
  }

  // Safety Turn limit
  if (state.turns >= state.maxTurns) {
    state.done = true;
    addLog(state, 'Annual audit timeframe concluded.');
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
    PATIENT_TYPES
  };
}
