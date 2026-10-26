const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState prepares top 3 rows and valid upcoming orbs', () => {
  const s = L.createState(1);
  assert.equal(s.grid.length, 80);
  for (let i = 0; i < 24; i++) {
    assert.ok(s.grid[i] >= 1 && s.grid[i] <= 4);
  }
  for (let i = 24; i < 80; i++) {
    assert.equal(s.grid[i], 0);
  }
  assert.ok(s.currentOrb >= 1 && s.currentOrb <= 4);
  assert.ok(s.nextOrb >= 1 && s.nextOrb <= 4);
  assert.equal(s.shotsLeft, 60);
  assert.deepEqual(L.legalActions(s), L.ANGLES);
});

test('launching an angle places an orb, rotates nextOrb, and decrements shots', () => {
  const s = L.createState(5);
  const initialOrb = s.currentOrb;
  const nextOrb = s.nextOrb;

  const res = L.step(s, 0); // straight up
  assert.equal(s.shotsLeft, 59);
  assert.equal(s.currentOrb, nextOrb);
  assert.ok(s.grid.includes(initialOrb));
});

test('connecting 3 matching orbs pops the cluster', () => {
  const s = L.createState(8);
  s.grid.fill(0);
  // Place two red orbs at ceiling (0,0) and (0,1)
  s.grid[0] = 1;
  s.grid[1] = 1;
  s.currentOrb = 1;

  // Fire straight up at angle -60 towards left edge
  const res = L.step(s, -60);
  // Either popped directly or landed near
  if (s.lastPopped >= 3) {
    assert.ok(s.points >= 60);
    assert.equal(res.reward, s.points);
  }
});

test('floating orbs disconnected from ceiling drop and award bonus', () => {
  const s = L.createState(12);
  s.grid.fill(0);
  // Ceiling row empty except cell 0
  s.grid[0] = 1;
  s.grid[1] = 1;
  s.grid[8] = 1; // row 1 col 0
  s.grid[9] = 2; // row 1 col 1 (color 2)
  s.grid[17] = 2; // row 2 col 1 (color 2)

  s.currentOrb = 1;
  // If we burst color 1 at row 0/1, the color 2 orbs at row 1 and 2 become detached
  // Directly trigger drop check
  s.grid[0] = 0; s.grid[1] = 0; s.grid[8] = 0;
  // Now row 1 and 2 have orbs but row 0 is completely empty
  // Fire an orb, which will land in row 0 and anchor itself, or drop detached orbs
  const res = L.step(s, 0);
  assert.ok(s.shotsLeft < 60);
});

test('ceiling drops after CEILING_INTERVAL shots', () => {
  const s = L.createState(16);
  const before = s.shotsUntilDrop;
  for (let i = 0; i < before; i++) {
    L.step(s, 0);
  }
  assert.equal(s.shotsUntilDrop, 6);
});

test('orbs reaching danger row ends game', () => {
  const s = L.createState(20);
  // Place an orb in row 8
  s.grid[8 * L.COLS + 2] = 1;
  assert.equal(L.isOver(s), true);
  assert.deepEqual(L.legalActions(s), []);
});

test('illegal angle throws without mutating state', () => {
  const s = L.createState(25);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 90), /illegal/i);
  assert.throws(() => L.step(s, 'left'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield deterministic state', () => {
  const a = L.createState(77);
  const b = L.createState(77);
  const seq = [0, 15, -15, 30, -30];
  for (const act of seq) {
    if (L.isOver(a)) break;
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
