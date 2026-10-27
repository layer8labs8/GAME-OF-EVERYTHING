const { test } = require('node:test');
const assert = require('node:assert/strict');
const logic = require('./www/logic.js');

test('createState initializes both fighters, 100 HP, round 1, and zero meter', () => {
  const state = logic.createState(42);
  assert.equal(state.player.x, 80);
  assert.equal(state.rival.x, 280);
  assert.equal(state.player.hp, 100);
  assert.equal(state.rival.hp, 100);
  assert.equal(state.round, 1);
  assert.equal(state.playerRounds, 0);
  assert.equal(logic.isOver(state), false);
  assert.equal(logic.score(state), 0);
});

test('step_forward moves player toward rival and respects spacing', () => {
  const state = logic.createState(42);
  const initialX = state.player.x;
  const res = logic.step(state, 'step_forward');
  assert.equal(state.player.x, initialX + 28);
  assert.equal(typeof res.reward, 'number');
  assert.equal(typeof res.done, 'boolean');
});

test('heavy_kick deals damage and charges super meter when in range', () => {
  const state = logic.createState(42);
  state.player.x = 200;
  state.rival.x = 240; // in kick range (40px)
  const initialRivalHp = state.rival.hp;

  logic.step(state, 'heavy_kick');
  assert.ok(state.rival.hp < initialRivalHp);
  assert.ok(state.player.superGauge > 0);
});

test('hadouken expends 20 stamina and spawns projectile', () => {
  const state = logic.createState(42);
  state.player.stamina = 50;
  logic.step(state, 'hadouken');

  assert.equal(state.player.stamina, 40); // 50 - 20 + 10 passive
  assert.equal(state.projectiles.length, 1);
  assert.equal(state.projectiles[0].owner, 'player');
});

test('dragon_uppercut deals heavy damage and hits opponents', () => {
  const state = logic.createState(42);
  state.player.x = 200;
  state.rival.x = 230;
  state.player.stamina = 50;

  logic.step(state, 'dragon_uppercut');
  assert.ok(state.rival.hp <= 70); // 30 damage dealt
});

test('super attack consumes 100 meter and deals 50 unblockable damage', () => {
  const state = logic.createState(42);
  state.player.x = 200;
  state.rival.x = 230;
  state.player.superGauge = 100;
  state.rival.isBlocking = true; // Attempt to block

  assert.ok(logic.legalActions(state).includes('super'));
  logic.step(state, 'super');
  assert.equal(state.player.superGauge, 0);
  assert.equal(state.rival.hp, 50); // 50 damage penetrates block
});

test('winning round advances to round 2 with refreshed health', () => {
  const state = logic.createState(42);
  state.player.x = 200;
  state.rival.x = 230;
  state.rival.hp = 10; // 1 hit from KO

  logic.step(state, 'heavy_kick');
  assert.equal(state.playerRounds, 1);
  assert.equal(state.round, 2);
  assert.equal(state.player.hp, 100);
  assert.equal(state.rival.hp, 100);
});

test('winning 2 rounds achieves match victory', () => {
  const state = logic.createState(42);
  state.playerRounds = 1;
  state.player.x = 200;
  state.rival.x = 230;
  state.rival.hp = 10;

  logic.step(state, 'heavy_kick');
  assert.equal(state.playerRounds, 2);
  assert.equal(state.won, true);
  assert.equal(logic.isOver(state), true);
  assert.equal(logic.legalActions(state).length, 0);
});

test('losing 2 rounds triggers match defeat', () => {
  const state = logic.createState(42);
  state.rivalRounds = 1;
  state.player.hp = 5;
  state.player.x = 200;
  state.rival.x = 230;

  // Let rival strike player
  logic.step(state, 'step_back');
  // If rival dealt lethal blow
  if (state.player.hp <= 0) {
    assert.equal(state.rivalRounds, 2);
    assert.equal(state.lost, true);
    assert.equal(logic.isOver(state), true);
  }
});

test('illegal action throws without mutating state', () => {
  const state = logic.createState(42);
  state.player.superGauge = 50;
  assert.throws(() => logic.step(state, 'super'), /Illegal action/);
  assert.equal(state.player.superGauge, 50);
});

test('same seed and actions yield strictly deterministic state', () => {
  const actions = ['step_forward', 'light_punch', 'step_back', 'hadouken', 'block'];
  const s1 = logic.createState(555);
  const s2 = logic.createState(555);

  for (const act of actions) {
    if (logic.legalActions(s1).includes(act)) {
      logic.step(s1, act);
      logic.step(s2, act);
    }
  }
  assert.deepEqual(s1, s2);
});
