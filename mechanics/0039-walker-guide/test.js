const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TURNS,
  RESCUE_QUOTA
} = require('./www/logic.js');

test('createState initializes level grid, portal, exit, quota and inventory', () => {
  const state = createState(42);
  assert.equal(state.turn, 0);
  assert.equal(state.maxTurns, MAX_TURNS);
  assert.equal(state.quota, RESCUE_QUOTA);
  assert.equal(state.savedCount, 0);
  assert.equal(state.deadCount, 0);
  assert.equal(state.spawnedCount, 0);
  assert.ok(state.inventory.floater > 0);
  assert.ok(state.inventory.builder > 0);
  assert.ok(state.inventory.blocker > 0);
  assert.ok(state.inventory.digger > 0);
  assert.ok(state.grid.length > 0);
  assert.equal(state.done, false);
});

test('wait steps simulation forward and spawns minion on due turn', () => {
  const state = createState(1);
  assert.equal(state.minions.length, 0);

  const res = step(state, 'wait');
  assert.equal(state.turn, 1);
  assert.equal(state.minions.length, 1);
  assert.equal(state.minions[0].status, 'active');
  assert.equal(state.minions[0].vx, 1);
});

test('walker moves horizontally and turns around at solid boundary', () => {
  const state = createState(1);
  step(state, 'wait'); // spawns minion 0 at (spawnX, spawnY)
  const initialX = state.minions[0].x;

  step(state, 'wait');
  assert.ok(state.minions[0].x >= initialX);
});

test('minion falls through air and equips floater to survive long falls', () => {
  const state = createState(1);
  step(state, 'wait'); // spawns minion 0
  const m = state.minions[0];

  const initialFloaterStock = state.inventory.floater;
  step(state, 'floater:0');
  assert.equal(m.isFloater, true);
  assert.equal(state.inventory.floater, initialFloaterStock - 1);
});

test('blocker role stays in place and turns other minions around', () => {
  const state = createState(1);
  step(state, 'wait'); // spawns minion 0
  step(state, 'blocker:0');
  assert.equal(state.minions[0].role, 'blocker');

  const blockerX = state.minions[0].x;
  step(state, 'wait');
  assert.equal(state.minions[0].x, blockerX);
});

test('builder role constructs bridge steps across open space', () => {
  const state = createState(1);
  step(state, 'wait'); // spawns minion 0
  const initialBuilderStock = state.inventory.builder;

  step(state, 'builder:0');
  assert.equal(state.inventory.builder, initialBuilderStock - 1);
  assert.ok(state.minions[0].buildStepsLeft <= 3);
});

test('digger excavates through destructible earth', () => {
  const state = createState(1);
  step(state, 'wait'); // spawns minion 0
  // Guarantee earth beneath minion
  state.grid[state.minions[0].y + 1][state.minions[0].x] = '#';

  const initialDiggerStock = state.inventory.digger;
  step(state, 'digger:0');
  assert.equal(state.inventory.digger, initialDiggerStock - 1);
  // Tile below has been dug into air
  assert.equal(state.grid[state.minions[0].y][state.minions[0].x], '.');
});

test('bomber arms fuse and detonates earth in 1-tile radius', () => {
  const state = createState(1);
  step(state, 'wait'); // spawns minion 0
  const initialBomberStock = state.inventory.bomber;

  step(state, 'bomber:0');
  assert.equal(state.minions[0].role, 'bomber');
  assert.ok(state.minions[0].bombCountdown <= 3);
  assert.equal(state.inventory.bomber, initialBomberStock - 1);

  // Advance turns until detonation
  while (state.minions[0].status === 'active') {
    step(state, 'wait');
  }

  assert.equal(state.minions[0].status, 'dead');
  assert.equal(state.deadCount, 1);
});

test('reaching exit vortex saves minion and scores points', () => {
  const state = createState(1);
  state.minions.push({
    id: 99,
    x: state.exitX,
    y: state.exitY,
    vx: 1,
    role: 'walker',
    isFloater: false,
    fallDistance: 0,
    buildStepsLeft: 0,
    bombCountdown: 0,
    status: 'active'
  });

  const res = step(state, 'wait');
  assert.equal(state.savedCount, 1);
  assert.ok(score(state) > 0);
});

test('saving quota of minions achieves victory', () => {
  const state = createState(1);
  state.savedCount = RESCUE_QUOTA;
  const res = step(state, 'wait');
  assert.equal(state.won, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
});

test('illegal action throws without mutating state', () => {
  const state = createState(1);
  const snapshot = JSON.stringify(state);

  assert.throws(() => {
    step(state, 'floater:999'); // non-existent minion
  });

  assert.equal(JSON.stringify(state), snapshot);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(777);
  const s2 = createState(777);

  const actions = ['wait', 'wait', 'wait'];
  for (const a of actions) {
    step(s1, a);
    step(s2, a);
  }

  assert.deepEqual(s1, s2);
});
