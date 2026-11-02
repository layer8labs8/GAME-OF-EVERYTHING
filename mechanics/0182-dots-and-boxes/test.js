const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

function closeThreeSides(s) {
  s.h[0] = 1;
  s.h[4] = 1;
  s.v[0] = 1;
}

test('a board starts with 40 free lines', () => {
  assert.equal(L.legalActions(L.createState(1)).length, 40);
});

test('the fourth side claims the box and keeps your turn', () => {
  const s = L.createState(1);
  closeThreeSides(s);
  const lines = s.h.concat(s.v).filter(Boolean).length;
  const res = L.step(s, 'v:0:1');
  assert.equal(s.owner[0], 1);
  assert.equal(res.reward, 10);
  assert.equal(s.h.concat(s.v).filter(Boolean).length, lines + 1);
});

test('a line that closes nothing passes the turn', () => {
  const s = L.createState(1);
  L.step(s, 'h:0:0');
  assert.ok(s.h.concat(s.v).filter(Boolean).length >= 2);
});

test('the computer takes a free box', () => {
  const s = L.createState(1);
  closeThreeSides(s);
  L.step(s, 'h:4:3');
  assert.equal(s.owner[0], 2);
  assert.ok(s.computer >= 1);
});

test('a used line is refused', () => {
  const s = L.createState(1);
  L.step(s, 'h:0:0');
  assert.throws(() => L.step(s, 'h:0:0'), /illegal action/);
});

test('the game ends with all boxes claimed', () => {
  const s = L.createState(7);
  while (!L.isOver(s)) L.step(s, L.legalActions(s)[0]);
  assert.equal(s.player + s.computer, 16);
});
