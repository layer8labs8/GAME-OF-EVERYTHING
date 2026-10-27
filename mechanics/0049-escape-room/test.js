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

test('createState initializes stations, code, solution, inventory and turns', () => {
  const state = createState(42);
  assert.equal(state.currentStation, 'desk');
  assert.equal(state.turnsLeft, MAX_TURNS);
  assert.equal(state.inventory.length, 0);
  assert.equal(state.safeCode.length, 3);
  assert.equal(state.switchSolution.length, 3);
  assert.equal(state.powerOn, false);
  assert.equal(state.doorUnlocked, false);
  assert.equal(state.done, false);
});

test('examine switches perspective and awards exploration points', () => {
  const state = createState(42);
  const res = step(state, 'examine:painting');
  assert.equal(state.currentStation, 'painting');
  assert.ok(res.reward > 0);
});

test('retrieving screwdriver from desk and unscrewing painting reveals fuse', () => {
  const state = createState(42);
  // On desk: pick up screwdriver
  step(state, 'pickup:screwdriver');
  assert.ok(state.inventory.includes('screwdriver'));
  assert.equal(state.deskScrewdriverAvailable, false);

  // Move to painting
  step(state, 'examine:painting');
  // Use screwdriver
  step(state, 'use:screwdriver:painting');
  assert.equal(state.paintingUnscrewed, true);
  assert.equal(state.paintingFuseAvailable, true);

  // Pick up fuse
  step(state, 'pickup:fuse');
  assert.ok(state.inventory.includes('fuse'));
  assert.equal(state.paintingFuseAvailable, false);
});

test('inserting fuse and matching switch configuration restores power', () => {
  const state = createState(42);
  state.inventory.push('fuse');

  step(state, 'examine:panel');
  step(state, 'use:fuse:panel');
  assert.equal(state.fuseInserted, true);

  // Set switches according to solution
  for (let i = 0; i < 3; i++) {
    if (state.switches[i] !== state.switchSolution[i]) {
      step(state, `toggle_switch:${i}`);
    }
  }

  assert.equal(state.powerOn, true);
});

test('cycling safe dials to match passcode unlocks safe and grants keycard', () => {
  const state = createState(42);
  step(state, 'examine:safe');

  // Cycle dials until they match safeCode
  for (let i = 0; i < 3; i++) {
    while (state.safeDials[i] !== state.safeCode[i]) {
      step(state, `cycle_dial:${i}`);
    }
  }

  step(state, 'open_safe');
  assert.equal(state.safeOpened, true);
  assert.equal(state.safeKeycardAvailable, true);

  step(state, 'pickup:keycard');
  assert.ok(state.inventory.includes('keycard'));
});

test('opening safe with incorrect dials fails and records mistake', () => {
  const state = createState(42);
  step(state, 'examine:safe');
  // safeCode elements are between 1..9, so dials at 0-0-0 won't match
  step(state, 'open_safe');
  assert.equal(state.safeOpened, false);
  assert.equal(state.mistakes, 1);
});

test('full escape sequence unlocks door and achieves victory', () => {
  const state = createState(42);
  // Prepare prerequisites
  state.powerOn = true;
  state.inventory.push('keycard');

  step(state, 'examine:door');
  step(state, 'use:keycard:door');
  assert.equal(state.doorUnlocked, true);

  const res = step(state, 'escape');
  assert.equal(state.won, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.ok(score(state) >= 1000);
});

test('exhausting turns triggers defeat', () => {
  const state = createState(42);
  state.turnsLeft = 1;

  step(state, 'examine:safe');
  assert.equal(state.turnsLeft, 0);
  assert.equal(state.lost, true);
  assert.equal(state.done, true);
});

test('illegal action throws without mutating state', () => {
  const state = createState(42);
  const snapshot = JSON.stringify(state);

  assert.throws(() => {
    step(state, 'escape'); // door not unlocked
  });

  assert.equal(JSON.stringify(state), snapshot);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  const actions = ['pickup:screwdriver', 'examine:painting', 'use:screwdriver:painting'];
  for (const a of actions) {
    step(s1, a);
    step(s2, a);
  }

  assert.deepEqual(s1, s2);
});
