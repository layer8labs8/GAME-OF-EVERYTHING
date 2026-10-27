const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  canPromote,
  CAREER_TITLES,
  SALARIES,
  MAX_TURNS
} = require('./www/logic.js');

test('createState initializes player as an Intern with baseline vitals and funds', () => {
  const state = createState(42);
  assert.equal(state.week, 1);
  assert.equal(state.wealth, 600);
  assert.equal(state.energy, 100);
  assert.equal(state.health, 85);
  assert.equal(state.happiness, 80);
  assert.equal(state.intellect, 15);
  assert.equal(state.careerLevel, 0);
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
});

test('work_shift earns career salary and builds corporate performance', () => {
  const state = createState(10);
  const initWealth = state.wealth;
  const initEnergy = state.energy;
  const initPerf = state.performance;

  step(state, 'action:work_shift');
  assert.equal(state.wealth, initWealth + SALARIES[0]);
  assert.equal(state.energy, initEnergy - 25);
  assert.equal(state.performance, initPerf + 15);
});

test('study_course increases intellect while deducting tuition fee', () => {
  const state = createState(10);
  const initWealth = state.wealth;
  const initIntel = state.intellect;

  step(state, 'action:study_course');
  assert.equal(state.intellect, initIntel + 10);
  assert.equal(state.wealth, initWealth - 150);
});

test('gym_workout restores physical health and fitness', () => {
  const state = createState(10);
  state.health = 50;

  step(state, 'action:gym_workout');
  assert.equal(state.health, 65);
});

test('socialize boosts psychological happiness', () => {
  const state = createState(10);
  state.happiness = 50;

  step(state, 'action:socialize');
  assert.equal(state.happiness, 70);
});

test('rest_and_recharge restores energy reserves', () => {
  const state = createState(10);
  state.energy = 30;

  step(state, 'action:rest_and_recharge');
  assert.equal(state.energy, 65);
});

test('apply_promotion advances career level when qualifications met', () => {
  const state = createState(10);
  state.careerLevel = 0;
  state.performance = 60;
  state.intellect = 30;

  assert.equal(canPromote(state), true);
  const actions = legalActions(state);
  assert.equal(actions.includes('action:apply_promotion'), true);

  step(state, 'action:apply_promotion');
  assert.equal(state.careerLevel, 1);
  assert.equal(CAREER_TITLES[state.careerLevel], 'Junior Associate');
});

test('advance_week deducts living expenses and resets weekly shifts', () => {
  const state = createState(10);
  const initWealth = state.wealth;

  step(state, 'action:advance_week');
  assert.equal(state.week, 2);
  assert.equal(state.wealth < initWealth, true);
});

test('victory triggered when reaching CEO (Level 4) with 8000+ wealth and 70%+ happiness', () => {
  const state = createState(10);
  state.careerLevel = 4;
  state.wealth = 8500;
  state.happiness = 75;

  step(state, 'action:advance_week');
  assert.equal(state.victory, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.equal(score(state) > 100, true);
});

test('defeat triggered when falling deeply into unmanageable debt', () => {
  const state = createState(10);
  state.wealth = -850;

  step(state, 'action:advance_week');
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
});

test('defeat triggered when happiness collapses to zero', () => {
  const state = createState(10);
  state.happiness = 0;

  step(state, 'action:advance_week');
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
});

test('illegal action throws descriptive error', () => {
  const state = createState(10);
  assert.throws(() => {
    step(state, 'action:lottery_jackpot');
  }, /Illegal action/);
});

test('seed determinism produces identical life outcomes', () => {
  const s1 = createState(555);
  const s2 = createState(555);

  step(s1, 'action:work_shift');
  step(s2, 'action:work_shift');
  step(s1, 'action:advance_week');
  step(s2, 'action:advance_week');

  assert.deepEqual(s1, s2);
});
