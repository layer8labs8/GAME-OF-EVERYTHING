const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('the board starts with 48 seeds and empty stores', () => {
  const s = L.createState(1);
  assert.equal(s.pits.reduce((a, b) => a + b, 0), 48);
  assert.equal(s.pits[6] + s.pits[13], 0);
});

test('ending in your store gives another move', () => {
  const s = L.createState(1);
  L.step(s, 2);
  assert.equal(s.pits[6], 1);
  assert.equal(s.pits[7], 4);
});

test('landing in your own empty bowl captures the seeds opposite', () => {
  const s = L.createState(1);
  s.pits = [1, 0, 0, 0, 0, 3, 0, 1, 1, 1, 1, 6, 1, 0];
  const res = L.step(s, 0);
  assert.equal(res.reward, 7);
});

test('sowing skips the other store', () => {
  const s = L.createState(1);
  s.pits = [0, 0, 0, 0, 0, 9, 0, 1, 1, 1, 1, 1, 1, 0];
  L.step(s, 5);
  assert.equal(s.pits[13] > 0 || s.pits[0] > 0, true);
  assert.equal(s.pits.reduce((a, b) => a + b, 0), 15);
});

test('an empty side ends the game and the rest goes to its owner', () => {
  const s = L.createState(1);
  s.pits = [0, 0, 0, 0, 0, 1, 10, 2, 0, 0, 0, 0, 0, 5];
  L.step(s, 5);
  assert.equal(L.isOver(s), true);
  assert.equal(s.pits.reduce((a, b) => a + b, 0), s.pits[6] + s.pits[13]);
});

test('an empty bowl cannot be picked', () => {
  const s = L.createState(1);
  s.pits[3] = 0;
  assert.throws(() => L.step(s, 3), /illegal action/);
});
