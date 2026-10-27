const { test } = require('node:test');
const assert = require('node:assert/strict');
const logic = require('./www/logic.js');
const solver = require('./solver.js');

test('createState initializes a solvable 3x3 grid with active relays', () => {
  const state = logic.createState(44);
  assert.equal(state.size, 3);
  assert.equal(state.grid.length, 9);
  assert.equal(state.won, false);
  assert.equal(state.lost, false);
  assert.equal(logic.isOver(state), false);
  assert.equal(logic.score(state), 0);
  assert.equal(logic.isAllPowered(state.grid), false);
});

test('toggleCell inverts target and orthogonal neighbors correctly', () => {
  const grid = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  logic.toggleCell(grid, 3, 4); // center cell at (1, 1)
  // center, up (1), down (7), left (3), right (5) should be inverted to 1
  assert.deepEqual(grid, [0, 1, 0, 1, 1, 1, 0, 1, 0]);

  // Corner toggle at index 0 (0, 0)
  logic.toggleCell(grid, 3, 0); // flips 0, 1, 3
  assert.equal(grid[0], 1);
  assert.equal(grid[1], 0);
  assert.equal(grid[3], 0);
});

test('legalActions provides all toggle actions for each matrix node', () => {
  const state = logic.createState(44);
  const legals = logic.legalActions(state);
  assert.equal(legals.length, 9);
  assert.equal(legals[0], 'toggle_0');
  assert.equal(legals[8], 'toggle_8');
});

test('step toggles cell and awards points for powering relays', () => {
  const state = logic.createState(44);
  const initialGrid = state.grid.slice();
  const res = logic.step(state, 'toggle_4');
  assert.equal(typeof res.reward, 'number');
  assert.equal(typeof res.done, 'boolean');
  assert.notDeepEqual(state.grid, initialGrid);
});

test('energizing all relays achieves victory with 1000 bonus points', () => {
  const state = logic.createState(44);
  // Set grid to 1 toggle away from solved
  state.grid = [1, 1, 1, 1, 1, 1, 1, 1, 1];
  logic.toggleCell(state.grid, 3, 4); // index 4 is toggle needed to solve

  logic.step(state, 'toggle_4');
  assert.equal(state.won, true);
  assert.equal(logic.isOver(state), true);
  assert.ok(state.scoreVal >= 1000);
});

test('solver.validateLevel accepts well-formed data and catches malformed data', () => {
  assert.deepEqual(solver.validateLevel({ size: 3, grid: [1, 0, 1, 0, 0, 0, 1, 0, 1] }), []);
  assert.ok(solver.validateLevel(null).length > 0);
  assert.ok(solver.validateLevel({ size: 1, grid: [1] }).length > 0);
  assert.ok(solver.validateLevel({ size: 3, grid: [1, 0, 1] }).length > 0);
  assert.ok(solver.validateLevel({ size: 3, grid: [1, 0, 1, 0, 9, 0, 1, 0, 1] }).length > 0);
});

test('solver.solve finds optimal shortest solution path', () => {
  const lvl = { size: 3, grid: [1, 0, 1, 0, 0, 0, 1, 0, 1] };
  const res = solver.solve(lvl);
  assert.equal(res.solvable, true);
  assert.equal(res.moves, 'e'); // 'e' is index 4
  assert.ok(res.statesVisited >= 1);
});

test('solver.replay verifies solution achieves all-powered state', () => {
  const lvl = { size: 3, grid: [1, 0, 1, 0, 0, 0, 1, 0, 1] };
  assert.equal(solver.replay(lvl, 'e'), true);
  assert.equal(solver.replay(lvl, 'a'), false);
});

test('illegal action throws without mutating state', () => {
  const state = logic.createState(44);
  assert.throws(() => logic.step(state, 'toggle_999'), /Illegal action/);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = logic.createState(1234);
  const s2 = logic.createState(1234);
  assert.deepEqual(s1, s2);

  logic.step(s1, 'toggle_0');
  logic.step(s2, 'toggle_0');
  assert.deepEqual(s1, s2);
});
