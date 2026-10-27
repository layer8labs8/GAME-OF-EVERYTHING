const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_STEPS
} = require('./www/logic.js');

test('createState initializes explorer at Meadow Hub with 100 HP, full stamina, and 0 relics', () => {
  const state = createState(12345);
  assert.equal(state.player.x, 1);
  assert.equal(state.player.y, 0);
  assert.equal(state.player.hp, 100);
  assert.equal(state.player.stamina, 100);
  assert.equal(state.player.onGround, true);
  assert.equal(state.relicsCollected, 0);
  assert.equal(state.gemsCollected, 0);
  assert.equal(state.won, false);
  assert.equal(state.lost, false);
  assert.equal(isOver(state), false);
});

test('move_right collects sky gems and raises score', () => {
  const state = createState(12345);
  // (1, 0) has a gem at start
  const initialGems = state.gemsCollected;
  // Move right across the meadow
  step(state, 'move_right');
  step(state, 'move_right'); // moves to x=3 where gems are located
  assert.ok(state.gemsCollected > initialGems);
  assert.ok(score(state) > 0);
});

test('jump elevates player and consumes stamina', () => {
  const state = createState(12345);
  const staminaBefore = state.player.stamina;
  step(state, 'jump');
  assert.ok(!state.player.onGround);
  assert.ok(state.player.y > 0);
  assert.equal(state.player.stamina, staminaBefore - 10);
});

test('double_jump performs secondary aerial leap', () => {
  const state = createState(12345);
  step(state, 'jump');
  const yAfterJump = state.player.y;
  const actions = legalActions(state);
  assert.ok(actions.includes('double_jump'));

  step(state, 'double_jump');
  assert.ok(state.player.y >= yAfterJump);
});

test('interact at Meadow Shrine unlocks Ground Pound ability', () => {
  const state = createState(12345);
  state.player.x = 5;
  state.player.y = 3;
  assert.equal(state.player.abilities.groundPound, false);

  step(state, 'interact');
  assert.equal(state.player.abilities.groundPound, true);
});

test('interact at Arch Shrine unlocks Glider Wings ability', () => {
  const state = createState(12345);
  state.player.x = 14;
  state.player.y = 5;
  assert.equal(state.player.abilities.glide, false);

  step(state, 'interact');
  assert.equal(state.player.abilities.glide, true);
});

test('ground_pound above stone chest smashes it and obtains Relic 2', () => {
  const state = createState(12345);
  state.player.abilities.groundPound = true;
  state.player.x = 14;
  state.player.y = 3;
  state.player.onGround = false;

  step(state, 'ground_pound');
  assert.equal(state.chestSmashed, true);
  assert.equal(state.relicsCollected, 1);
  const relic2 = state.relics.find(r => r.id === 2);
  assert.equal(relic2.collected, true);
});

test('glide carries player horizontally over chasms', () => {
  const state = createState(12345);
  state.player.abilities.glide = true;
  state.player.x = 16;
  state.player.y = 5;
  state.player.onGround = false;

  step(state, 'glide');
  assert.equal(state.player.x, 18);
  assert.ok(state.player.y >= 4);
});

test('tribute gate unlocks when interacting with 20 or more gems', () => {
  const state = createState(12345);
  state.player.x = 25;
  state.player.y = 2;
  state.gemsCollected = 10;

  step(state, 'interact');
  assert.equal(state.tributeGateOpen, false);

  state.gemsCollected = 20;
  step(state, 'interact');
  assert.equal(state.tributeGateOpen, true);
});

test('collecting all 5 relics and reaching Spire summit triggers victory', () => {
  const state = createState(12345);
  state.relicsCollected = 5;
  state.relics.forEach(r => { r.collected = true; r.insideChest = false; });
  state.player.x = 36;
  state.player.y = 12;

  const { reward, done } = step(state, 'interact');
  assert.equal(done, true);
  assert.equal(state.won, true);
  assert.equal(state.lost, false);
  assert.ok(reward > 500);
});

test('depleting HP from void falls causes defeat', () => {
  const state = createState(12345);
  state.player.hp = 20;
  // Over chasm without ground
  state.player.x = 18;
  state.player.y = 0;
  state.player.onGround = false;

  const { done } = step(state, 'move_right'); // falls into void
  assert.equal(done, true);
  assert.equal(state.lost, true);
  assert.equal(state.won, false);
});

test('illegal action throws without mutating state', () => {
  const state = createState(12345);
  const snapshot = JSON.stringify(state);

  assert.throws(() => step(state, 'teleport_to_moon'));
  assert.equal(JSON.stringify(state), snapshot);

  // Illegal double jump on ground
  assert.throws(() => step(state, 'double_jump'));
  assert.equal(JSON.stringify(state), snapshot);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(8888);
  const s2 = createState(8888);

  const actions = ['move_right', 'move_right', 'jump', 'move_right', 'move_right', 'interact'];
  for (const a of actions) {
    step(s1, a);
    step(s2, a);
  }

  assert.deepEqual(s1, s2);
});
