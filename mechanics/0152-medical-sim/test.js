const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  PATIENT_CASES,
  MAX_TURNS
} = require('./www/logic.js');

test('createState initializes Trauma Ward with admitted patient and surgical theater', () => {
  const state = createState(42);
  assert.equal(state.funds, 400);
  assert.equal(state.reputation, 75);
  assert.equal(state.patientsSaved, 0);
  assert.equal(state.fatalities, 0);
  assert.equal(state.currentPatient !== null, true);
  assert.equal(state.currentPatient.phase, 0);
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
});

test('administer_sedation elevates patient stability and calms cardiac rate', () => {
  const state = createState(10);
  state.currentPatient.stability = 50;
  state.currentPatient.heartRate = 120;

  step(state, 'action:administer_sedation');
  assert.equal(state.currentPatient.stability, 70);
  assert.equal(state.currentPatient.heartRate, 105);
});

test('four-phase surgical procedure saves patient and disburses hospital funds', () => {
  const state = createState(10);
  const initFunds = state.funds;
  const payout = state.currentPatient.payout;

  // Phase 0 -> 1: Scalpel Incision
  step(state, 'action:scalpel_incision');
  assert.equal(state.currentPatient.phase, 1);

  // Phase 1 -> 2: Cauterize & Suction
  step(state, 'action:cauterize_and_suction');
  assert.equal(state.currentPatient.phase, 2);

  // Phase 2 -> 3: Execute Repair
  step(state, 'action:execute_repair');
  assert.equal(state.currentPatient.phase, 3);

  // Phase 3 -> Close: Suture & Close
  step(state, 'action:suture_and_close');
  assert.equal(state.currentPatient, null);
  assert.equal(state.patientsSaved, 1);
  assert.equal(state.funds, initFunds + payout);
});

test('admit_next_patient admits emergency trauma arrival when theater is clear', () => {
  const state = createState(10);
  state.currentPatient = null;

  const actions = legalActions(state);
  assert.equal(actions.includes('action:admit_next_patient'), true);

  step(state, 'action:admit_next_patient');
  assert.equal(state.currentPatient !== null, true);
  assert.equal(state.currentPatient.phase, 0);
});

test('defibrillate restores heart rhythm during low stability cardiac emergency', () => {
  const state = createState(10);
  state.currentPatient.stability = 20;

  const actions = legalActions(state);
  assert.equal(actions.includes('action:defibrillate'), true);

  step(state, 'action:defibrillate');
  assert.equal(state.currentPatient.stability >= 50, true);
});

test('fatality occurs when patient stability reaches zero', () => {
  const state = createState(10);
  state.currentPatient.stability = 2; // will drop below 0 on un-sedated action

  step(state, 'action:scalpel_incision');
  assert.equal(state.currentPatient, null);
  assert.equal(state.fatalities, 1);
  assert.equal(state.reputation, 55);
});

test('victory triggered when saving 10 patients with 80%+ reputation and 2000+ funds', () => {
  const state = createState(10);
  state.patientsSaved = 9;
  state.reputation = 80;
  state.funds = 2100;
  state.currentPatient.phase = 3;

  step(state, 'action:suture_and_close');
  assert.equal(state.patientsSaved, 10);
  assert.equal(state.victory, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.equal(score(state) > 100, true);
});

test('defeat triggered when 3 fatalities occur', () => {
  const state = createState(10);
  state.fatalities = 2;
  state.currentPatient.stability = 2;

  step(state, 'action:scalpel_incision');
  assert.equal(state.fatalities, 3);
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
});

test('illegal action throws descriptive error', () => {
  const state = createState(10);
  assert.throws(() => {
    step(state, 'action:amputate_healthy_limb');
  }, /Illegal action/);
});

test('seed determinism produces identical surgical scenarios', () => {
  const s1 = createState(717);
  const s2 = createState(717);

  step(s1, 'action:administer_sedation');
  step(s2, 'action:administer_sedation');
  step(s1, 'action:scalpel_incision');
  step(s2, 'action:scalpel_incision');

  assert.deepEqual(s1, s2);
});
