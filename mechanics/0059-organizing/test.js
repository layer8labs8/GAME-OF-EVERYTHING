const test = require('node:test');
const assert = require('node:assert/strict');
const {
  GRID_SIZE,
  MAX_STAGES,
  STAGE_RECIPES,
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes stage 1 with empty 4x4 grid and pantry tray', () => {
  const s = createState(42);
  assert.equal(s.stage, 1);
  assert.equal(s.grid.length, GRID_SIZE);
  assert.equal(s.grid[0].length, GRID_SIZE);
  assert.ok(s.tray.length > 0);
  assert.equal(s.done, false);
});

test('placing a piece occupies grid cells and marks piece placed', () => {
  const s = createState(42);
  // Place slot 0 (Onigiri 2x2) at (0,0)
  step(s, 'place:0,0,0');
  assert.equal(s.tray[0].placed, true);
  assert.equal(s.grid[0][0].name, 'Onigiri');
  assert.equal(s.grid[1][1].name, 'Onigiri');
  assert.ok(!legalActions(s).includes('place:0,0,0'), 'Cannot place already placed piece');
});

test('legalActions forbids overlapping placements', () => {
  const s = createState(42);
  step(s, 'place:0,0,0'); // Occupies (0,0), (1,0), (0,1), (1,1)
  const actions = legalActions(s);
  assert.ok(!actions.includes('place:1,0,0'), 'Cannot place on occupied cell (0,0)');
  assert.ok(!actions.includes('place:1,1,1'), 'Cannot place on occupied cell (1,1)');
});

test('rotate updates relative coordinates and normalizes bounds', () => {
  const s = createState(42);
  // Slot 1 (Tamago 2x1 horizontal: [{dx:0, dy:0}, {dx:1, dy:0}])
  const initialCells = JSON.stringify(s.tray[1].cells);
  step(s, 'rotate:1');
  const rotatedCells = JSON.stringify(s.tray[1].cells);
  assert.notEqual(initialCells, rotatedCells);
  // Rotating 90 deg turns horizontal into vertical [{dx:0, dy:0}, {dx:0, dy:1}]
  assert.deepEqual(s.tray[1].cells, [{ dx: 0, dy: 0 }, { dx: 0, dy: 1 }]);
});

test('remove frees grid cells back to tray', () => {
  const s = createState(42);
  step(s, 'place:0,0,0');
  assert.equal(s.tray[0].placed, true);
  step(s, 'remove:0');
  assert.equal(s.tray[0].placed, false);
  assert.equal(s.grid[0][0], null);
  assert.equal(s.grid[1][1], null);
});

test('clear returns all placed pieces back to tray', () => {
  const s = createState(42);
  step(s, 'place:0,0,0');
  step(s, 'clear');
  assert.equal(s.tray[0].placed, false);
  assert.equal(s.grid[0][0], null);
});

test('packing all tray ingredients advances to next stage', () => {
  const s = createState(42);
  // In Stage 1:
  // Onigiri (2x2) at (0,0) -> occupies (0,0)..(1,1)
  step(s, 'place:0,0,0');
  // Tamago 1 (2x1) at (2,0)
  step(s, 'place:1,2,0');
  // Tamago 2 (2x1) at (2,1)
  step(s, 'place:2,2,1');
  // Salmon 1 (2x1) at (0,2)
  step(s, 'place:3,0,2');
  // Salmon 2 (2x1) at (2,2)
  step(s, 'place:4,2,2');
  // Edamame 1 at (0,3)
  step(s, 'place:5,0,3');
  // Edamame 2 at (1,3)
  step(s, 'place:6,1,3');
  // Umeboshi 1 at (2,3)
  step(s, 'place:7,2,3');
  // Umeboshi 2 at (3,3)
  const res = step(s, 'place:8,3,3');

  assert.equal(s.stage, 2, 'Should advance to Stage 2');
  assert.ok(res.reward > 0);
});

test('packing all bento boxes finishes game with victory', () => {
  const s = createState(42);
  s.stage = 3;
  // Mark all tray pieces placed
  for (const item of s.tray) {
    item.placed = true;
  }
  // The last placement triggers check
  s.tray[s.tray.length - 1].placed = false;
  // Find a free spot or clear grid cell
  s.grid[0][0] = null;
  s.tray[s.tray.length - 1].cells = [{ dx: 0, dy: 0 }];
  const res = step(s, `place:${s.tray.length - 1},0,0`);

  assert.equal(s.won, true);
  assert.equal(s.done, true);
  assert.equal(isOver(s), true);
  assert.ok(res.reward >= 500);
});

test('exceeding stage moves triggers defeat', () => {
  const s = createState(42);
  s.stageMoves = s.maxMoves - 1;
  const res = step(s, 'rotate:0');
  assert.equal(s.done, true);
  assert.equal(s.won, false);
  assert.ok(res.reward < 0);
});

test('illegal action throws without mutating state', () => {
  const s = createState(42);
  const snap = JSON.stringify(s);
  assert.throws(() => {
    step(s, 'place:0,3,3'); // 2x2 at (3,3) extends outside 4x4 grid!
  }, /Illegal action/);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(555);
  const s2 = createState(555);
  assert.deepEqual(s1, s2);

  const actions = ['rotate:1', 'place:0,0,0', 'rotate:2', 'place:1,2,0'];
  for (const act of actions) {
    step(s1, act);
    step(s2, act);
  }

  assert.deepEqual(s1, s2);
  assert.equal(score(s1), score(s2));
});
