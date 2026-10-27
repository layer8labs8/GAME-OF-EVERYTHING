const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_STEPS,
  GOAL_HEIGHT
} = require('./www/logic.js');

test('createState initializes explorer in volcanic shaft with 100 HP, 100 stamina, and 4 grapples', () => {
  const state = createState(12345);
  assert.equal(state.player.x, 60);
  assert.equal(state.player.y, 0);
  assert.equal(state.player.hp, 100);
  assert.equal(state.player.stamina, 100);
  assert.equal(state.player.grapples, 4);
  assert.equal(state.player.onGround, true);
  assert.equal(state.scrollY, -5);
  assert.ok(state.platforms.length > 50);
  assert.equal(state.won, false);
  assert.equal(state.lost, false);
  assert.equal(isOver(state), false);
});

test('move_left and move_right reposition player within shaft bounds', () => {
  const state = createState(12345);
  step(state, 'move_left');
  assert.equal(state.player.x, 57);

  step(state, 'move_right');
  assert.equal(state.player.x, 60);
});

test('jump elevates player and auto-scroll advances scrollY upward', () => {
  const state = createState(12345);
  const scrollBefore = state.scrollY;
  const staminaBefore = state.player.stamina;

  step(state, 'jump');
  assert.ok(!state.player.onGround);
  assert.ok(state.player.y > 0);
  assert.equal(state.scrollY, scrollBefore + 2);
  // -10 + 5 passive recovery
  assert.equal(state.player.stamina, staminaBefore - 5);
});

test('wall_kick near shaft wall bounds upward and away from wall', () => {
  const state = createState(12345);
  state.player.x = 3;
  state.player.y = 10;
  state.player.onGround = false;

  const actions = legalActions(state);
  assert.ok(actions.includes('wall_kick'));

  step(state, 'wall_kick');
  assert.ok(state.player.x > 3);
  assert.ok(state.player.y > 10);
});

test('dash_left surges horizontally in mid-air', () => {
  const state = createState(12345);
  state.player.x = 50;
  state.player.y = 20;
  state.player.onGround = false;

  step(state, 'dash_left');
  assert.equal(state.player.x, 42);
});

test('grapple_up expends 1 grapple and reels up to overhead platform', () => {
  const state = createState(12345);
  state.player.x = 60;
  state.player.y = 0;

  const grapplesBefore = state.player.grapples;
  step(state, 'grapple_up');
  assert.equal(state.player.grapples, grapplesBefore - 1);
  assert.ok(state.player.y > 0);
  assert.equal(state.player.onGround, true);
});

test('crumbling platform shatters and disappears after landing', () => {
  const state = createState(12345);
  state.platforms = [
    { id: 1, x1: 0, x2: 120, y: 0, type: 'solid' },
    { id: 777, x1: 50, x2: 70, y: 4, type: 'crumbling' }
  ];
  state.player.x = 60;
  state.player.y = 5;
  state.player.vy = -1;
  state.player.onGround = false;

  step(state, 'move_left'); // lands on crumbling platform 777
  assert.equal(state.player.y, 4);
  assert.equal(state.player.onGround, true);
  // Platform 777 should now be shattered and removed!
  assert.ok(!state.platforms.some(p => p.id === 777));
});

test('collecting obsidian crystals awards points and increases count', () => {
  const state = createState(12345);
  state.crystals = [{ id: 1, x: 57, y: 0, collected: false }];
  state.player.x = 60;
  state.player.y = 0;

  step(state, 'move_left'); // moves to x=57, y=0
  assert.equal(state.crystalsCollected, 1);
  assert.ok(score(state) >= 25);
});

test('falling behind rising lava line causes instant defeat', () => {
  const state = createState(12345);
  state.scrollY = 10;
  state.player.y = 8; // below lava line!

  const { done } = step(state, 'move_left');
  assert.equal(done, true);
  assert.equal(state.lost, true);
  assert.equal(state.won, false);
});

test('reaching caldera rim height triggers victory', () => {
  const state = createState(12345);
  state.player.y = GOAL_HEIGHT - 1;
  state.scrollY = 100;

  const { reward, done } = step(state, 'jump');
  assert.equal(done, true);
  assert.equal(state.won, true);
  assert.equal(state.lost, false);
  assert.ok(reward > 800);
});

test('illegal action throws without mutating state', () => {
  const state = createState(12345);
  const snapshot = JSON.stringify(state);

  assert.throws(() => step(state, 'teleport_jetpack_godmode'));
  assert.equal(JSON.stringify(state), snapshot);

  // Illegal grapple when empty
  state.player.grapples = 0;
  const noGrapples = JSON.stringify(state);
  assert.throws(() => step(state, 'grapple_up'));
  assert.equal(JSON.stringify(state), noGrapples);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(9999);
  const s2 = createState(9999);

  const actions = ['move_left', 'move_left', 'jump', 'move_right', 'move_right'];
  for (const a of actions) {
    step(s1, a);
    step(s2, a);
  }

  assert.deepEqual(s1, s2);
});
