const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState prepares centered foundation and active mover', () => {
  const s = L.createState(10);
  assert.equal(s.tower.length, 1);
  assert.equal(s.tower[0].x, 80);
  assert.equal(s.tower[0].w, 120);
  assert.equal(s.mover.w, 120);
  assert.deepEqual(L.legalActions(s), ['wait', 'drop']);
});

test('wait sweeps mover horizontally and bounces off track walls', () => {
  const s = L.createState(2);
  s.mover.x = 2;
  s.mover.dir = -1;
  s.mover.speed = 5;
  L.step(s, 'wait');
  assert.equal(s.mover.dir, 1);
  assert.ok(s.mover.x >= 0 && s.mover.x <= L.TRACK_W - s.mover.w);
});

test('perfect alignment snaps width, increments streak and awards bonus', () => {
  const s = L.createState(4);
  s.mover.x = 82.5; // within PERFECT_TOL = 4 of top.x = 80
  const res = L.step(s, 'drop');
  assert.equal(s.lastDrop, 'perfect');
  assert.equal(s.streak, 1);
  assert.equal(s.height, 1);
  assert.equal(s.tower[1].x, 80);
  assert.equal(s.tower[1].w, 120);
  assert.equal(res.reward, 25);
});

test('partial overlap trims overhang and resets streak', () => {
  const s = L.createState(6);
  s.streak = 2;
  s.mover.x = 120; // overlaps [80, 200] on [120, 200] -> width 80
  const res = L.step(s, 'drop');
  assert.equal(s.lastDrop, 'trimmed');
  assert.equal(s.streak, 0);
  assert.equal(s.tower[1].x, 120);
  assert.equal(s.tower[1].w, 80);
  assert.equal(s.mover.w, 80);
  assert.equal(res.reward, 10);
});

test('missing the tower ends the game', () => {
  const s = L.createState(9);
  s.tower = [{ x: 120, w: 40, colorIdx: 0 }];
  s.mover = { x: 0, w: 40, dir: 1, speed: 3, idleTicks: 0 };
  const res = L.step(s, 'drop');
  assert.equal(res.done, true);
  assert.equal(res.reward, -15);
  assert.equal(L.isOver(s), true);
  assert.deepEqual(L.legalActions(s), []);
});

test('auto-drop triggers after MAX_IDLE wait ticks', () => {
  const s = L.createState(12);
  for (let i = 0; i < L.MAX_IDLE; i++) {
    L.step(s, 'wait');
  }
  assert.notEqual(s.lastDrop, 'none');
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(15);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'left'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions produce identical state', () => {
  const a = L.createState(99);
  const b = L.createState(99);
  const seq = ['wait', 'wait', 'wait', 'wait', 'wait', 'drop', 'wait', 'wait'];
  for (const act of seq) {
    if (L.isOver(a)) break;
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
