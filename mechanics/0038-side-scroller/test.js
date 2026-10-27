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

test('createState initializes Cyber Ronin with 100 HP, 100 stamina, 5 shurikens, and stage enemies', () => {
  const state = createState(12345);
  assert.equal(state.player.x, 2);
  assert.equal(state.player.y, 0);
  assert.equal(state.player.hp, 100);
  assert.equal(state.player.stamina, 100);
  assert.equal(state.player.shurikens, 5);
  assert.equal(state.player.facing, 1);
  assert.equal(state.player.onGround, true);
  assert.ok(state.enemies.length >= 6);
  assert.ok(state.enemies.some(e => e.type === 'boss'));
  assert.equal(state.won, false);
  assert.equal(state.lost, false);
  assert.equal(isOver(state), false);
});

test('move_right and move_left adjust position and orient facing direction', () => {
  const state = createState(12345);
  step(state, 'move_right');
  assert.equal(state.player.x, 5);
  assert.equal(state.player.facing, 1);

  step(state, 'move_left');
  assert.equal(state.player.x, 2);
  assert.equal(state.player.facing, -1);
});

test('jump vaults player airborne and consumes stamina', () => {
  const state = createState(12345);
  const staminaBefore = state.player.stamina;
  step(state, 'jump');
  assert.ok(!state.player.onGround);
  assert.ok(state.player.y > 0);
  // -10 jump, +5 passive recovery = -5
  assert.equal(state.player.stamina, staminaBefore - 5);
});

test('slash hits enemy in front, inflicts damage and increments combo', () => {
  const state = createState(12345);
  // Place enemy right in front of player at x=5
  state.enemies = [{
    id: 11,
    type: 'enforcer',
    x: 5,
    y: 0,
    hp: 50,
    maxHp: 50,
    scoreReward: 120
  }];
  state.player.x = 2;
  state.player.facing = 1;

  step(state, 'slash');
  assert.equal(state.player.combo, 1);
  assert.ok(state.enemies.some(e => e.id === 11 && e.hp < 50));
});

test('throw_shuriken expends 1 shuriken and pierces enemy at range', () => {
  const state = createState(12345);
  state.enemies = [{
    id: 22,
    type: 'drone',
    x: 16,
    y: 0,
    hp: 25,
    maxHp: 25,
    scoreReward: 80
  }];
  state.player.x = 2;
  state.player.facing = 1;

  const shurikensBefore = state.player.shurikens;
  step(state, 'throw_shuriken');
  assert.equal(state.player.shurikens, shurikensBefore - 1);
  // 25 HP drone destroyed by 30 damage shuriken
  assert.ok(!state.enemies.some(e => e.id === 22));
});

test('phase_dash surges forward 8 units safely', () => {
  const state = createState(12345);
  state.player.x = 10;
  state.player.facing = 1;
  const initialStamina = state.player.stamina;

  step(state, 'phase_dash');
  assert.equal(state.player.x, 18);
  assert.equal(state.player.stamina, initialStamina - 20); // -25 + 5
});

test('deflect parries enemy strike and ripostes', () => {
  const state = createState(12345);
  state.enemies = [{
    id: 33,
    type: 'enforcer',
    x: 3,
    y: 0,
    hp: 50,
    maxHp: 50,
    scoreReward: 120
  }];
  state.player.x = 2;
  const hpBefore = state.player.hp;

  step(state, 'deflect');
  assert.equal(state.player.hp, hpBefore);
  assert.ok(state.enemies.some(e => e.id === 33 && e.hp <= 35));
});

test('wall_kick rebounds off wall at x=90 in reverse direction', () => {
  const state = createState(12345);
  state.player.x = 89;
  state.player.y = 2;
  state.player.onGround = false;
  state.player.facing = 1;

  step(state, 'wall_kick');
  assert.equal(state.player.facing, -1);
  assert.ok(state.player.x < 89);
  assert.ok(state.player.y >= 5);
});

test('stepping onto spikes without dash causes damage', () => {
  const state = createState(12345);
  state.player.x = 40;
  state.player.y = 0;
  const hpBefore = state.player.hp;

  // Move right into spikes at x=43
  step(state, 'move_right');
  assert.ok(state.player.hp < hpBefore);
});

test('defeating Goliath Mech and crossing extraction gate triggers victory', () => {
  const state = createState(12345);
  // Remove boss
  state.enemies = state.enemies.filter(e => e.type !== 'boss');
  state.player.x = 194;

  const { reward, done } = step(state, 'move_right'); // crosses to 197
  assert.equal(done, true);
  assert.equal(state.won, true);
  assert.equal(state.lost, false);
  assert.ok(reward > 800);
});

test('depleting HP triggers defeat', () => {
  const state = createState(12345);
  state.player.hp = 10;
  state.enemies = [{
    id: 999,
    type: 'boss',
    x: 3,
    y: 0,
    hp: 150,
    maxHp: 150,
    scoreReward: 800
  }];
  state.player.x = 2;

  const { done } = step(state, 'rest'); // boss strikes for 25 damage
  assert.equal(done, true);
  assert.equal(state.lost, true);
  assert.equal(state.won, false);
});

test('illegal action throws without mutating state', () => {
  const state = createState(12345);
  const snapshot = JSON.stringify(state);

  assert.throws(() => step(state, 'orbital_strike_cannon'));
  assert.equal(JSON.stringify(state), snapshot);

  // Illegal shuriken when out of ammo
  state.player.shurikens = 0;
  const noShurikens = JSON.stringify(state);
  assert.throws(() => step(state, 'throw_shuriken'));
  assert.equal(JSON.stringify(state), noShurikens);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(7777);
  const s2 = createState(7777);

  const actions = ['move_right', 'move_right', 'slash', 'phase_dash', 'move_right', 'rest'];
  for (const a of actions) {
    step(s1, a);
    step(s2, a);
  }

  assert.deepEqual(s1, s2);
});
