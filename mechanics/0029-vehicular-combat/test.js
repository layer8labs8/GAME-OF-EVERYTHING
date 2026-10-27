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

test('createState initializes battle-rig with 100 armor, 100 hull, nitro, weapons and wave 1', () => {
  const state = createState(12345);
  assert.equal(state.player.x, 200);
  assert.equal(state.player.y, 300);
  assert.equal(state.player.heading, 6);
  assert.equal(state.player.armor, 100);
  assert.equal(state.player.hull, 100);
  assert.equal(state.player.nitro, 100);
  assert.equal(state.player.ammo, 60);
  assert.equal(state.player.rockets, 4);
  assert.equal(state.player.mines, 3);
  assert.equal(state.player.scrap, 0);
  assert.equal(state.wave, 1);
  assert.equal(state.enemies.length, 2);
  assert.equal(state.won, false);
  assert.equal(state.lost, false);
  assert.equal(isOver(state), false);
});

test('accelerate increases speed and drives along heading', () => {
  const state = createState(12345);
  const initialY = state.player.y;
  step(state, 'accelerate'); // heading is 6 (North, dy = -1)
  assert.ok(state.player.speed > 0);
  assert.ok(state.player.y < initialY);
});

test('steer_left rotates heading counter-clockwise by 45 degrees', () => {
  const state = createState(12345);
  const initialHeading = state.player.heading; // 6 (North)
  step(state, 'steer_left');
  // (6 + 7) % 8 = 5 (North-West)
  assert.equal(state.player.heading, 5);
});

test('fire_cannons consumes 4 ammo and damages enemy in line of sight', () => {
  const state = createState(12345);
  // Put an enemy right ahead at (200, 220) while player is at (200, 300) facing North
  state.enemies = [{
    id: 99,
    type: 'buggy',
    x: 200,
    y: 220,
    heading: 2,
    speed: 0,
    hp: 40,
    maxHp: 40,
    ramPower: 15,
    scoreReward: 100
  }];

  const initialScore = score(state);
  step(state, 'fire_cannons');
  assert.equal(state.player.ammo, 56);
  assert.ok(score(state) > initialScore);
  assert.ok(state.enemies.some(e => e.id === 99 && e.hp < 40));
});

test('fire_rocket consumes 1 rocket and deals high explosive damage', () => {
  const state = createState(12345);
  state.enemies = [{
    id: 88,
    type: 'crusher',
    x: 200,
    y: 150,
    heading: 2,
    speed: 0,
    hp: 80,
    maxHp: 80,
    ramPower: 30,
    scoreReward: 200
  }];

  const rocketsBefore = state.player.rockets;
  step(state, 'fire_rocket');
  assert.equal(state.player.rockets, rocketsBefore - 1);
  // 80 HP - 65 = 15 HP remaining
  assert.ok(state.enemies.some(e => e.id === 88 && e.hp <= 15));
});

test('deploy_mine places proximity mine that explodes on contact', () => {
  const state = createState(12345);
  // Remove grunts so wave doesn't finish unexpectedly
  state.enemies = [{
    id: 77,
    type: 'buggy',
    x: 200,
    y: 330, // right behind player at (200, 300)
    heading: 6,
    speed: 1,
    hp: 40,
    maxHp: 40,
    ramPower: 15,
    scoreReward: 100
  }];

  step(state, 'deploy_mine');
  assert.equal(state.player.mines, 2);
  // Enemy drove onto the mine and exploded!
  assert.ok(!state.enemies.some(e => e.id === 77));
});

test('nitro_boost consumes 25 nitro and surges vehicle at top speed', () => {
  const state = createState(12345);
  const nitroBefore = state.player.nitro;
  step(state, 'nitro_boost');
  // Consumes 25, gains 5 passive recovery = net -20
  assert.equal(state.player.nitro, nitroBefore - 20);
  assert.equal(state.player.speed, 8);
});

test('handbrake_turn executes 90 degree pivot slide', () => {
  const state = createState(12345);
  state.player.heading = 0; // East
  step(state, 'handbrake_turn');
  // (0 + 2) % 8 = 2 (South)
  assert.equal(state.player.heading, 2);
});

test('repair_armor uses 20 salvage scrap to restore +35 armor', () => {
  const state = createState(12345);
  state.player.scrap = 30;
  state.player.armor = 40;

  step(state, 'repair_armor');
  assert.equal(state.player.scrap, 10);
  assert.equal(state.player.armor, 75);
});

test('slaying all enemies in wave advances to next wave with rewards', () => {
  const state = createState(12345);
  state.wave = 1;
  // Put single weak enemy
  state.enemies = [{
    id: 10,
    type: 'buggy',
    x: 200,
    y: 200,
    heading: 2,
    speed: 0,
    hp: 10,
    maxHp: 40,
    ramPower: 15,
    scoreReward: 100
  }];

  step(state, 'fire_rocket');
  assert.equal(state.wave, 2);
  assert.ok(state.enemies.length >= 2);
});

test('slaying War Rig boss in wave 3 achieves victory', () => {
  const state = createState(12345);
  state.wave = 3;
  state.enemies = [{
    id: 999,
    type: 'warrig',
    x: 200,
    y: 200,
    heading: 2,
    speed: 0,
    hp: 20,
    maxHp: 200,
    ramPower: 45,
    scoreReward: 600
  }];

  const { reward, done } = step(state, 'fire_rocket');
  assert.equal(done, true);
  assert.equal(state.won, true);
  assert.equal(state.lost, false);
  assert.ok(reward > 800);
});

test('depleting hull to 0 triggers defeat', () => {
  const state = createState(12345);
  state.player.armor = 0;
  state.player.hull = 10;
  state.enemies = [{
    id: 1,
    type: 'warrig',
    x: 200,
    y: 300,
    heading: 2,
    speed: 2,
    hp: 200,
    maxHp: 200,
    ramPower: 45,
    scoreReward: 600
  }];

  const { done } = step(state, 'accelerate');
  assert.equal(done, true);
  assert.equal(state.lost, true);
  assert.equal(state.won, false);
});

test('illegal action throws without mutating state', () => {
  const state = createState(12345);
  const snapshot = JSON.stringify(state);

  assert.throws(() => step(state, 'orbital_cannon_nuke'));
  assert.equal(JSON.stringify(state), snapshot);

  // Illegal rocket when empty
  state.player.rockets = 0;
  const noRockets = JSON.stringify(state);
  assert.throws(() => step(state, 'fire_rocket'));
  assert.equal(JSON.stringify(state), noRockets);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(54321);
  const s2 = createState(54321);

  const actions = ['accelerate', 'steer_right', 'fire_cannons', 'steer_left', 'accelerate'];
  for (const a of actions) {
    step(s1, a);
    step(s2, a);
  }

  assert.deepEqual(s1, s2);
});
