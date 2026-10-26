const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState initializes grid, central road avenue, funds, and month 1', () => {
  const s = L.createState(1);
  assert.equal(s.funds, 300);
  assert.equal(s.month, 1);
  assert.equal(s.population, 0);
  assert.equal(s.grid.length, 8);
  assert.equal(s.grid[3][0].type, 'R');
  assert.equal(s.won, false);
  assert.equal(s.lost, false);
});

test('cursor movement shifts coordinates within grid boundary', () => {
  const s = L.createState(1);
  s.cursor = { x: 3, y: 2 };
  assert.ok(L.legalActions(s).includes('cursor_up'));
  L.step(s, 'cursor_up');
  assert.equal(s.cursor.y, 1);
});

test('zoning residential on open terrain deducts $25 funds and marks RES', () => {
  const s = L.createState(1);
  s.cursor = { x: 3, y: 2 };
  assert.ok(L.legalActions(s).includes('zone_residential'));
  L.step(s, 'zone_residential');
  assert.equal(s.grid[2][3].type, 'RES');
  assert.equal(s.funds, 275);
});

test('advancing month grows population on connected residential zones', () => {
  const s = L.createState(1);
  s.cursor = { x: 3, y: 2 }; // adjacent to row 3 road
  L.step(s, 'zone_residential');
  assert.equal(s.population, 0);
  L.step(s, 'next_month');
  assert.equal(s.population, 20);
  assert.equal(s.month, 2);
});

test('commercial zone generates revenue and provides jobs', () => {
  const s = L.createState(1);
  s.cursor = { x: 4, y: 2 };
  L.step(s, 'zone_commercial');
  assert.equal(s.grid[2][4].type, 'COM');
  L.step(s, 'next_month');
  assert.ok(s.monthlyRevenue >= 22);
});

test('botanical park boosts municipal happiness', () => {
  const s = L.createState(1);
  s.cursor = { x: 1, y: 2 };
  L.step(s, 'build_park');
  assert.equal(s.grid[2][1].type, 'PARK');
  L.step(s, 'next_month');
  assert.ok(s.happiness >= 75);
});

test('demolishing clears plot back to unzoned terrain', () => {
  const s = L.createState(1);
  s.cursor = { x: 3, y: 2 };
  L.step(s, 'zone_residential');
  assert.equal(s.grid[2][3].type, 'RES');
  L.step(s, 'demolish');
  assert.equal(s.grid[2][3].type, '.');
});

test('reaching target population with high happiness achieves victory', () => {
  const s = L.createState(1);
  // Place connected residential, commercial, and park zones
  for (let c = 0; c < 4; c++) {
    s.grid[2][c] = { type: 'RES', pop: 80 };
    s.grid[4][c] = { type: 'COM', pop: 0 };
    s.grid[5][c] = { type: 'PARK', pop: 0 };
  }
  L.step(s, 'next_month');
  assert.equal(s.won, true);
  assert.equal(L.isOver(s), true);
  assert.deepEqual(L.legalActions(s), []);
});

test('bankruptcy triggers defeat', () => {
  const s = L.createState(1);
  s.funds = -120;
  L.step(s, 'next_month');
  assert.equal(s.lost, true);
  assert.equal(L.isOver(s), true);
});

test('illegal construction without funds throws without mutating state', () => {
  const s = L.createState(1);
  s.funds = 10;
  s.cursor = { x: 0, y: 0 };
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'zone_industrial'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions produce strictly deterministic simulation', () => {
  const a = L.createState(88);
  const b = L.createState(88);
  for (let i = 0; i < 10; i++) {
    const act = L.legalActions(a)[0];
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
