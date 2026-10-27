const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TOTAL_TILES,
  MAX_STAGES,
  HEX_COORDS,
  createState,
  legalActions,
  step,
  isOver,
  score,
  initStage
} = require('./www/logic.js');

test('createState initializes stage 1 with 19 tiles and locked core', () => {
  const s = createState(42);
  assert.equal(s.stage, 1);
  assert.equal(s.tiles.length, TOTAL_TILES);
  assert.equal(s.tiles[0].type, 'core');
  assert.equal(s.tiles[0].isLocked, true);
  assert.equal(s.tiles[0].isPowered, true);
  assert.equal(s.done, false);
});

test('legalActions includes rotate for all 18 non-core tiles plus wait', () => {
  const s = createState(42);
  const actions = legalActions(s);
  assert.equal(actions.length, 19);
  assert.ok(actions.includes('wait'));
  assert.ok(!actions.includes('rotate:0'), 'Core cannot be rotated');
  assert.ok(actions.includes('rotate:1'));
  assert.ok(actions.includes('rotate:18'));
});

test('rotating conduit shifts rotation modulo 6 and increments step counts', () => {
  const s = createState(100);
  const initialRot = s.tiles[1].rotation;
  step(s, 'rotate:1');
  assert.equal(s.tiles[1].rotation, (initialRot + 1) % 6);
  assert.equal(s.totalRotations, 1);
  assert.equal(s.stageRotations, 1);
});

test('correctly aligned conduits propagate power from core', () => {
  const s = createState(100);
  // Tile 0 is core with wires [0, 2, 4]. Direction 0 points at Tile 1 (q: 1, r: 0).
  // Return direction from 1 to 0 is (0 + 3) % 6 = 3.
  // Tile 1 has base wires [0, 3]. When rotation is 0, effective wires are [0, 3].
  s.tiles[1].rotation = 0;
  // Step wait to trigger power evaluation
  step(s, 'wait');
  assert.equal(s.tiles[1].isPowered, true, 'Tile 1 should be powered when aligned with Core');
});

test('connecting path to relay illuminates the relay and increments count', () => {
  const s = createState(100);
  // In Stage 1, Relay 7 receives from Tile 1.
  // Tile 0 -> Tile 1 -> Relay 7.
  s.tiles[1].rotation = 0; // Wire [0, 3] connects 0 and 7
  s.tiles[7].rotation = 0; // Relay 7 has base wire [3] which receives from 1
  step(s, 'wait');
  assert.equal(s.tiles[7].isPowered, true, 'Relay 7 should be illuminated');
  assert.ok(s.poweredRelays >= 1);
});

test('synchronizing all relays advances to the next stage', () => {
  const s = createState(100);
  // In stage 1, relays are 7, 11, 15
  // Set all conduit rotations to 0 to align the entire network
  for (let i = 0; i < TOTAL_TILES; i++) {
    s.tiles[i].rotation = 0;
  }
  // Step wait to trigger evaluation
  const res = step(s, 'wait');
  assert.equal(s.stage, 2, 'Should advance to Stage 2');
  assert.ok(res.reward > 0);
});

test('synchronizing all relays on stage 3 triggers victory', () => {
  const s = createState(100);
  s.stage = 3;
  initStage(s, 3);
  for (let i = 0; i < TOTAL_TILES; i++) {
    s.tiles[i].rotation = 0;
  }
  const res = step(s, 'wait');
  assert.equal(s.won, true);
  assert.equal(s.done, true);
  assert.equal(isOver(s), true);
  assert.ok(res.reward >= 400);
});

test('exceeding stage rotation limit triggers defeat', () => {
  const s = createState(100);
  s.stageRotations = s.maxRotationsPerStage - 1;
  const res = step(s, 'wait');
  assert.equal(s.done, true);
  assert.equal(s.won, false);
  assert.ok(res.reward < 0);
});

test('illegal action throws without mutating state', () => {
  const s = createState(100);
  const snap = JSON.stringify(s);
  assert.throws(() => {
    step(s, 'rotate:0'); // Core rotation is illegal
  }, /Illegal action/);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(888);
  const s2 = createState(888);
  assert.deepEqual(s1, s2);

  const moves = ['rotate:1', 'rotate:2', 'wait', 'rotate:3', 'rotate:1'];
  for (const m of moves) {
    step(s1, m);
    step(s2, m);
  }

  assert.deepEqual(s1, s2);
  assert.equal(score(s1), score(s2));
});
