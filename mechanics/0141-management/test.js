const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TURNS
} = require('./www/logic.js');

test('createState initializes Apex Clinic with baseline staff and admissions', () => {
  const state = createState(42);
  assert.equal(state.day, 1);
  assert.equal(state.funds, 800);
  assert.equal(state.reputation, 75);
  assert.equal(state.hygiene, 90);
  assert.equal(state.capacity, 6);
  assert.equal(state.staff.doctors, 2);
  assert.equal(state.staff.nurses, 2);
  assert.equal(state.staff.orderlies, 1);
  assert.equal(state.patientQueue.length, 3);
  assert.equal(state.patientsTreated, 0);
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
});

test('process_queue treats pending patients and accrues revenue', () => {
  const state = createState(10);
  const initialUntreated = state.patientQueue.filter(p => !p.treated).length;
  assert.equal(initialUntreated > 0, true);

  const initialFunds = state.funds;
  const initialHygiene = state.hygiene;

  step(state, 'action:process_queue');

  const remainingUntreated = state.patientQueue.filter(p => !p.treated).length;
  assert.equal(remainingUntreated < initialUntreated, true);
  assert.equal(state.funds > initialFunds, true);
  assert.equal(state.hygiene < initialHygiene, true);
  assert.equal(state.patientsTreated > 0, true);
});

test('sanitize_clinic restores clinic hygiene level', () => {
  const state = createState(10);
  state.hygiene = 50;

  step(state, 'action:sanitize_clinic');
  assert.equal(state.hygiene > 50, true);
  assert.equal(state.score > 10, true);
});

test('hiring medical and maintenance personnel updates roster and expenses', () => {
  const state = createState(10);
  state.funds = 1000;

  step(state, 'hire:doctor');
  assert.equal(state.staff.doctors, 3);
  assert.equal(state.funds, 850);

  step(state, 'hire:nurse');
  assert.equal(state.staff.nurses, 3);
  assert.equal(state.funds, 750);

  step(state, 'hire:orderly');
  assert.equal(state.staff.orderlies, 2);
  assert.equal(state.funds, 670);
});

test('expanding capacity increases inpatient bed accommodation', () => {
  const state = createState(10);
  state.funds = 1000;
  const initCap = state.capacity;

  step(state, 'action:expand_capacity');
  assert.equal(state.capacity, initCap + 2);
  assert.equal(state.funds, 800);
});

test('training staff increases skill level', () => {
  const state = createState(10);
  state.funds = 500;

  step(state, 'action:train_staff');
  assert.equal(state.staffSkill, 2);
  assert.equal(state.funds, 350);
});

test('end_shift pays staff payroll, discharges treated patients, and admits new queue', () => {
  const state = createState(10);
  const initFunds = state.funds;
  const payroll = state.staff.doctors * 30 + state.staff.nurses * 20 + state.staff.orderlies * 15;

  step(state, 'action:end_shift');
  assert.equal(state.day, 2);
  assert.equal(state.funds, initFunds - payroll);
  assert.equal(state.patientQueue.length > 0, true);
});

test('victory triggered when treating 40+ patients with 80%+ reputation and 1000+ funds', () => {
  const state = createState(10);
  state.patientsTreated = 40;
  state.reputation = 85;
  state.funds = 1200;

  step(state, 'action:sanitize_clinic');
  assert.equal(state.victory, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.equal(score(state) > 100, true);
});

test('defeat triggered when funds drop below -500', () => {
  const state = createState(10);
  state.funds = -510;

  step(state, 'action:sanitize_clinic');
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
});

test('defeat triggered when reputation collapses to zero', () => {
  const state = createState(10);
  state.reputation = 0;

  step(state, 'action:sanitize_clinic');
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
});

test('illegal action throws error', () => {
  const state = createState(10);
  assert.throws(() => {
    step(state, 'action:non_existent_procedure');
  }, /Illegal action/);
});

test('seed determinism produces identical sequences', () => {
  const s1 = createState(999);
  const s2 = createState(999);

  step(s1, 'action:process_queue');
  step(s2, 'action:process_queue');
  step(s1, 'action:end_shift');
  step(s2, 'action:end_shift');

  assert.deepEqual(s1, s2);
});
