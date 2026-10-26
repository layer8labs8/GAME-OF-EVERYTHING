const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState generates valid song track and full 100 health', () => {
  const s = L.createState(1);
  assert.equal(s.health, 100);
  assert.equal(s.streak, 0);
  assert.ok(s.songTrack.length > 20);
  assert.deepEqual(L.legalActions(s), L.ACTIONS);
});

test('stepping moves notes down toward target baseline', () => {
  const s = L.createState(2);
  s.songTrack = [{ id: 1, step: 1, lane: 0 }];
  L.step(s, 'wait');
  assert.equal(s.notes.length, 1);
  assert.equal(s.notes[0].lane, 0);
  assert.equal(s.notes[0].y, 6);

  L.step(s, 'wait');
  assert.equal(s.notes[0].y, 12);
});

test('tapping note within perfect window awards 100 points and raises streak', () => {
  const s = L.createState(3);
  s.notes = [{ id: 99, lane: 1, y: L.TARGET_Y - 5, hit: false }];

  const res = L.step(s, 'tap_1');
  assert.equal(s.lastRating, 'perfect');
  assert.equal(s.streak, 1);
  assert.equal(s.points, 100);
  assert.equal(res.reward, 100);
  assert.equal(s.notes.length, 0); // hit note removed
});

test('off-beat tap in empty lane resets streak and penalizes health', () => {
  const s = L.createState(4);
  s.streak = 5;
  s.notes = [];

  const res = L.step(s, 'tap_2');
  assert.equal(s.streak, 0);
  assert.equal(s.lastRating, 'miss');
  assert.equal(s.health, 98);
  assert.equal(res.reward, -5);
});

test('unhit note passing baseline registers as a miss', () => {
  const s = L.createState(5);
  s.notes = [{ id: 101, lane: 3, y: L.TARGET_Y + 28, hit: false }];

  L.step(s, 'wait');
  // Advances note beyond TARGET_Y + 30
  assert.equal(s.misses, 1);
  assert.equal(s.lastRating, 'miss');
  assert.equal(s.health, 95);
});

test('depleting health ends game', () => {
  const s = L.createState(6);
  s.health = 2;
  const res = L.step(s, 'tap_0'); // off-beat tap deducts 2 hp
  assert.equal(s.health, 0);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
  assert.deepEqual(L.legalActions(s), []);
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(7);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'tap_9'), /illegal/i);
  assert.throws(() => L.step(s, 123), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield deterministic state', () => {
  const a = L.createState(42);
  const b = L.createState(42);
  const seq = ['wait', 'wait', 'tap_0', 'wait', 'tap_1', 'wait'];
  for (const act of seq) {
    if (L.isOver(a)) break;
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
