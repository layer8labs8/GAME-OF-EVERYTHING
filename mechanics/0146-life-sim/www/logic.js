/**
 * 0146-life-sim: Metro Life
 * Pure life balance and career simulation engine conforming strictly to the Bot Contract.
 * No browser globals, seedable PRNG, fully deterministic and serializable.
 */

const MAX_TURNS = 120;

const CAREER_TITLES = [
  'Intern',
  'Junior Associate',
  'Senior Manager',
  'Division Director',
  'Chief Executive Officer'
];

const SALARIES = [200, 450, 900, 1800, 3500];
const INTELLECT_REQS = [25, 50, 75, 90];

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

function createState(seed = 1) {
  return {
    seed: seed >>> 0,
    prngState: seed >>> 0,
    turns: 0,
    maxTurns: MAX_TURNS,
    week: 1,
    wealth: 600,
    energy: 100,
    health: 85,
    happiness: 80,
    intellect: 15,
    careerLevel: 0,
    performance: 20,
    shiftsWorkedThisWeek: 0,
    score: 0,
    done: false,
    victory: false,
    log: [
      'Graduated college and settled in Metro City as an Intern.',
      'Balance career hustle, university studies, health, and social life.'
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

function canPromote(state) {
  if (state.careerLevel >= 4) return false;
  const neededIntellect = INTELLECT_REQS[state.careerLevel];
  return state.performance >= 50 && state.intellect >= neededIntellect;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = [];

  // Work Shift (Requires energy)
  if (state.energy >= 25) {
    actions.push('action:work_shift');
  }

  // University Study (Requires energy and tuition)
  if (state.energy >= 20 && state.wealth >= 150 && state.intellect < 100) {
    actions.push('action:study_course');
  }

  // Gym Workout (Requires energy and gym fee)
  if (state.energy >= 15 && state.wealth >= 40 && state.health < 100) {
    actions.push('action:gym_workout');
  }

  // Social Outing (Requires energy and spending money)
  if (state.energy >= 10 && state.wealth >= 60 && state.happiness < 100) {
    actions.push('action:socialize');
  }

  // Rest & Recharge
  if (state.energy < 100 || state.health < 100) {
    actions.push('action:rest_and_recharge');
  }

  // Career Promotion
  if (canPromote(state)) {
    actions.push('action:apply_promotion');
  }

  // Advance Calendar Week (Always legal)
  actions.push('action:advance_week');

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

  // Work Shift
  if (action === 'action:work_shift') {
    state.energy -= 25;
    const salary = SALARIES[state.careerLevel];
    state.wealth += salary;
    state.performance = Math.min(100, state.performance + 15);
    state.shiftsWorkedThisWeek += 1;

    // Fatigue drops happiness slightly
    state.happiness = Math.max(10, state.happiness - 3);

    reward += 10 + state.careerLevel * 5;
    state.score += 20 + state.careerLevel * 10;
    addLog(state, `Completed work shift as ${CAREER_TITLES[state.careerLevel]}: Earned +$${salary} (+15 Performance).`);
  }

  // Study Course
  else if (action === 'action:study_course') {
    state.energy -= 20;
    state.wealth -= 150;
    state.intellect = Math.min(100, state.intellect + 10);
    reward += 8;
    state.score += 15;
    addLog(state, `Attended evening corporate certification lecture (+10 Intellect).`);
  }

  // Gym Workout
  else if (action === 'action:gym_workout') {
    state.energy -= 15;
    state.wealth -= 40;
    state.health = Math.min(100, state.health + 15);
    state.happiness = Math.min(100, state.happiness + 5);
    reward += 6;
    state.score += 12;
    addLog(state, `Completed high-intensity fitness workout (+15 Health, +5 Happiness).`);
  }

  // Social Outing
  else if (action === 'action:socialize') {
    state.energy -= 10;
    state.wealth -= 60;
    state.happiness = Math.min(100, state.happiness + 20);
    reward += 6;
    state.score += 12;
    addLog(state, `Enjoyed weekend dinner & cocktails with friends (+20 Happiness).`);
  }

  // Rest & Recharge
  else if (action === 'action:rest_and_recharge') {
    state.energy = Math.min(100, state.energy + 35);
    state.health = Math.min(100, state.health + 5);
    reward += 4;
    state.score += 8;
    addLog(state, `Unwound with deep restorative sleep (+35 Energy, +5 Health).`);
  }

  // Apply Promotion
  else if (action === 'action:apply_promotion') {
    state.careerLevel += 1;
    state.performance = 20;
    reward += 50 + state.careerLevel * 20;
    state.score += 100 + state.careerLevel * 40;
    addLog(state, `PROMOTION GRANTED: Promoted to ${CAREER_TITLES[state.careerLevel]}! Salary increased to $${SALARIES[state.careerLevel]}/shift.`);
  }

  // Advance Week
  else if (action === 'action:advance_week') {
    state.week += 1;

    // Weekly Living Expenses (Rent, groceries, utilities)
    const livingCost = 200 + state.careerLevel * 50;
    state.wealth -= livingCost;

    // Reset weekly work shifts and natural baseline regeneration
    state.energy = Math.min(100, state.energy + 30);
    state.shiftsWorkedThisWeek = 0;

    // If no work was done, performance drops
    if (state.shiftsWorkedThisWeek === 0) {
      state.performance = Math.max(0, state.performance - 10);
    }

    // Health / Burnout checks
    if (state.energy <= 20) {
      state.health = Math.max(0, state.health - 10);
      state.happiness = Math.max(0, state.happiness - 10);
      addLog(state, `Week ${state.week}: Paid $${livingCost} living costs. Warning: High exhaustion causing burnout!`);
    } else {
      addLog(state, `Week ${state.week} begins: Paid $${livingCost} living expenses and refreshed energy.`);
    }

    reward += 5;
    state.score += 10;
  }

  // Victory Check: CEO rank (Level 4) with >= $8,000 wealth and >= 70% happiness
  if (state.careerLevel >= 4 && state.wealth >= 8000 && state.happiness >= 70) {
    state.victory = true;
    state.done = true;
    reward += 200;
    state.score += 300;
    addLog(state, 'EXECUTIVE FULFILLMENT: You conquered Metro City as a prosperous and fulfilled CEO!');
    return { reward, done: true };
  }

  // Defeat Checks
  if (state.wealth < -800) {
    state.done = true;
    state.victory = false;
    reward -= 100;
    addLog(state, 'INSOLVENCY: Overwhelming debt forced personal bankruptcy.');
    return { reward, done: true };
  }

  if (state.health <= 0 || state.happiness <= 0) {
    state.done = true;
    state.victory = false;
    reward -= 100;
    addLog(state, 'TOTAL COLLAPSE: Extreme burnout ended your career trajectory.');
    return { reward, done: true };
  }

  if (state.turns >= state.maxTurns) {
    state.done = true;
    addLog(state, 'Career retrospective completed.');
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
    canPromote,
    CAREER_TITLES,
    SALARIES,
    MAX_TURNS
  };
}
