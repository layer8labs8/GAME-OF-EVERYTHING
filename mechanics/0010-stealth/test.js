const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState initializes player, 2 guards, pebbles, intel and exit', () => {
  const s = L.createState(1);
  assert.equal(s.player.x, 1);
  assert.equal(s.player.y, 1);
  assert.equal(s.pebbles, 2);
  assert.equal(s.guards.length, 2);
  assert.equal(s.intelCollected, false);
  assert.equal(s.won, false);
  assert.equal(s.captured, false);
});

test('moving shifts player position and respects solid walls', () => {
  const s = L.createState(1);
  assert.ok(L.legalActions(s).includes('down'));
  assert.ok(!L.legalActions(s).includes('up')); // wall above (1, 1) is (1, 0) '#'
  assert.ok(!L.legalActions(s).includes('left')); // wall to left (0, 1) '#'
  L.step(s, 'down');
  assert.equal(s.player.x, 1);
  assert.equal(s.player.y, 2);
});

test('collecting intel marks intelCollected and awards bonus', () => {
  const s = L.createState(1);
  s.player = { x: 7, y: 1 };
  s.guards[0].x = 1; s.guards[0].y = 5; // move guards away
  s.guards[1].x = 1; s.guards[1].y = 6;
  const res = L.step(s, 'down');
  assert.equal(s.intelCollected, true);
  assert.ok(res.reward >= 50);
});

test('reaching exit with intel wins the game', () => {
  const s = L.createState(1);
  s.intelCollected = true;
  s.player = { x: 7, y: 6 };
  s.guards[0].x = 1; s.guards[0].y = 5;
  s.guards[1].x = 1; s.guards[1].y = 6;
  const res = L.step(s, 'right');
  assert.equal(s.won, true);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
  assert.deepEqual(L.legalActions(s), []);
});

test('stepping into guard vision cone gets player captured', () => {
  const s = L.createState(1);
  s.player = { x: 2, y: 4 };
  s.guards[0].x = 2; s.guards[0].y = 2; s.guards[0].dir = 'S'; // guard looks south
  const res = L.step(s, 'wait');
  assert.equal(s.captured, true);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
});

test('throwing pebble distracts guard towards noise location', () => {
  const s = L.createState(1);
  s.player = { x: 1, y: 1 };
  assert.equal(s.pebbles, 2);
  L.step(s, 'pebble_down');
  assert.equal(s.pebbles, 1);
  assert.ok(s.lastNoise !== null);
});

test('exceeding MAX_STEPS terminates game cleanly', () => {
  const s = L.createState(1);
  s.stepCount = L.MAX_STEPS - 1;
  const res = L.step(s, 'wait');
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(1);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'up'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield strictly deterministic state', () => {
  const a = L.createState(100);
  const b = L.createState(100);
  for (let i = 0; i < 8; i++) {
    const act = L.legalActions(a)[0];
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
