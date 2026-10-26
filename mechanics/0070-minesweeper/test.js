const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState places 7 mines on 49 cells with accurate neighbor counts', () => {
  const s = L.createState(11);
  assert.equal(s.mines.length, 49);
  assert.equal(s.mines.filter(Boolean).length, 7);
  assert.deepEqual(s.counts, L.computeCounts(s.mines));
  assert.equal(L.legalActions(s).length, 49);
});

test('first move is always safe even if targeting an initial mine', () => {
  const s = L.createState(19);
  const mineIdx = s.mines.indexOf(true);
  assert.ok(mineIdx >= 0);
  const res = L.step(s, mineIdx);
  assert.equal(s.outcome !== 'lost', true);
  assert.equal(s.mines[mineIdx], false);
  assert.equal(s.mines.filter(Boolean).length, 7);
  assert.ok(res.reward >= 10);
});

test('flood-fill opens connected zero-adjacent region and boundary numbers', () => {
  const s = L.createState(1);
  s.mines.fill(false);
  s.mines[48] = true;
  for (let i = 42; i < 48; i++) s.mines[i] = true; // 7 mines along bottom row
  s.counts = L.computeCounts(s.mines);
  const res = L.step(s, 0);
  assert.equal(s.outcome, 'won');
  assert.equal(s.revealedCount, 42);
  assert.equal(res.done, true);
  assert.equal(L.score(s), 42 * 10 + 100);
});

test('revealing a mine after first move loses the game', () => {
  const s = L.createState(8);
  const safeIdx = s.mines.indexOf(false);
  L.step(s, safeIdx);
  if (!L.isOver(s)) {
    const mineIdx = s.mines.indexOf(true);
    const res = L.step(s, mineIdx);
    assert.equal(res.done, true);
    assert.equal(res.reward, -25);
    assert.equal(s.outcome, 'lost');
    assert.equal(s.explodedCell, mineIdx);
  }
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(5);
  L.step(s, 0);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 0), /illegal/i);
  assert.throws(() => L.step(s, -1), /illegal/i);
  assert.throws(() => L.step(s, 49), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions produce identical state', () => {
  const a = L.createState(77);
  const b = L.createState(77);
  for (let i = 0; i < 6 && !L.isOver(a); i++) {
    const acts = L.legalActions(a);
    const act = acts[0];
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
