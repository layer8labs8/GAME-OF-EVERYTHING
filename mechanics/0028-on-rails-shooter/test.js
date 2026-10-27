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

test('createState initializes player, 100 HP, energy, 4 missiles, and initial enemies', () => {
  const state = createState(42);
  assert.equal(state.player.x, 0);
  assert.equal(state.player.y, 0);
  assert.equal(state.player.hp, 100);
  assert.equal(state.player.energy, 100);
  assert.equal(state.player.heat, 0);
  assert.equal(state.player.missiles, 4);
  assert.ok(state.enemies.length >= 2);
  assert.equal(state.won, false);
  assert.equal(state.lost, false);
  assert.equal(isOver(state), false);
});

test('move actions reposition ship within boundary limits', () => {
  const state = createState(42);
  step(state, 'move_left');
  assert.equal(state.player.x, -1);
  step(state, 'move_left');
  assert.equal(state.player.x, -2);
  // Boundary check: cannot go left beyond -2
  assert.ok(!legalActions(state).includes('move_left'));

  step(state, 'move_up');
  assert.equal(state.player.y, -1);
  assert.ok(!legalActions(state).includes('move_up'));
});

test('fire_blaster increases heat and damages enemy in line of sight', () => {
  const state = createState(42);
  // Put an enemy right in front of player at (0, 0, z=3)
  state.enemies = [{
    id: 99,
    type: 'scout',
    x: 0,
    y: 0,
    z: 3,
    hp: 30,
    maxHp: 30,
    scoreReward: 80
  }];

  const initialScore = score(state);
  const { reward } = step(state, 'fire_blaster');
  assert.equal(state.player.heat, 20 - 5); // +20 from fire, -5 passive turn cooling
  assert.ok(score(state) > initialScore);
  // 30 HP scout with id 99 was destroyed by 35 blaster damage
  assert.ok(!state.enemies.some(e => e.id === 99));
});

test('lock_missile consumes ordnance and damages all visible enemies', () => {
  const state = createState(42);
  state.enemies = [
    { id: 1, type: 'interceptor', x: -1, y: 0, z: 4, hp: 50, maxHp: 50, scoreReward: 150 },
    { id: 2, type: 'scout', x: 1, y: 1, z: 5, hp: 30, maxHp: 30, scoreReward: 80 }
  ];

  const missilesBefore = state.player.missiles;
  step(state, 'lock_missile');
  assert.equal(state.player.missiles, missilesBefore - 1);
  // Scout (30 HP) destroyed by 40 missile damage, interceptor reduced to 10 HP
  assert.ok(!state.enemies.some(e => e.id === 2));
  assert.ok(state.enemies.some(e => e.id === 1 && e.hp === 10));
});

test('barrel_roll consumes 25 energy and deflects enemy fire', () => {
  const state = createState(42);
  // Place enemy about to hit player at z=1
  state.enemies = [{
    id: 1,
    type: 'interceptor',
    x: 0,
    y: 0,
    z: 1,
    hp: 50,
    maxHp: 50,
    scoreReward: 150
  }];

  const hpBefore = state.player.hp;
  const energyBefore = state.player.energy;

  step(state, 'barrel_roll');
  // Consumed 25, regained 10 passive: net -15
  assert.equal(state.player.energy, energyBefore - 15);
  // Hit was deflected, no damage!
  assert.equal(state.player.hp, hpBefore);
});

test('boost consumes 20 energy and surges distance by 35m', () => {
  const state = createState(42);
  const distBefore = state.distance;
  step(state, 'boost');
  assert.equal(state.distance, distBefore + 35);
});

test('vent_heat clears blaster heat and restores capacitors', () => {
  const state = createState(42);
  state.player.heat = 60;
  state.player.energy = 50;

  step(state, 'vent_heat');
  assert.ok(state.player.heat < 60);
  assert.ok(state.player.energy > 50);
});

test('approaching 750m spawns Giga Dreadnought boss', () => {
  const state = createState(42);
  state.distance = 730;
  step(state, 'boost'); // advances to 765m
  assert.ok(state.boss !== null);
  assert.equal(state.boss.active, true);
  assert.equal(state.boss.core, 120);
});

test('slaying boss and reaching 1000m achieves victory', () => {
  const state = createState(42);
  state.distance = 990;
  state.boss = {
    active: true,
    z: 5,
    leftGen: 0,
    rightGen: 0,
    core: 20,
    attackTimer: 0
  };
  state.player.x = 0;

  const { reward, done } = step(state, 'fire_blaster');
  assert.equal(done, true);
  assert.equal(state.won, true);
  assert.equal(state.lost, false);
  assert.ok(reward > 500);
});

test('depleting player HP triggers defeat', () => {
  const state = createState(42);
  state.player.hp = 10;
  state.enemies = [{
    id: 1,
    type: 'interceptor',
    x: 0,
    y: 0,
    z: 1,
    hp: 50,
    maxHp: 50,
    scoreReward: 150
  }];

  const { done } = step(state, 'vent_heat'); // passes enemy, taking 20 damage
  assert.equal(done, true);
  assert.equal(state.lost, true);
  assert.equal(state.won, false);
});

test('illegal action throws without mutating state', () => {
  const state = createState(42);
  const snapshot = JSON.stringify(state);

  assert.throws(() => step(state, 'warp_speed_infinity'));
  assert.equal(JSON.stringify(state), snapshot);

  // Illegal missile when empty
  state.player.missiles = 0;
  const noMissileSnapshot = JSON.stringify(state);
  assert.throws(() => step(state, 'lock_missile'));
  assert.equal(JSON.stringify(state), noMissileSnapshot);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(9999);
  const s2 = createState(9999);

  const actions = ['move_right', 'fire_blaster', 'move_left', 'boost', 'vent_heat'];
  for (const a of actions) {
    step(s1, a);
    step(s2, a);
  }

  assert.deepEqual(s1, s2);
});
