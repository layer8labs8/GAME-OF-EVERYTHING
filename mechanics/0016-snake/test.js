const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState sets initial 3-segment snake and valid food off body', () => {
  const s = L.createState(7);
  assert.equal(s.w, 12);
  assert.equal(s.h, 16);
  assert.equal(s.snake.length, 3);
  assert.equal(s.dir, 'R');
  assert.ok(s.food);
  assert.ok(!s.snake.some((seg) => seg.x === s.food.x && seg.y === s.food.y));
});

test('legalActions excludes 180-degree reverse direction', () => {
  const s = L.createState(1);
  assert.deepEqual(L.legalActions(s), ['U', 'D', 'R']);
  L.step(s, 'U');
  assert.deepEqual(L.legalActions(s), ['U', 'L', 'R']);
});

test('moving into empty space shifts snake without growing', () => {
  const s = L.createState(1);
  s.food = { x: 0, y: 0 };
  const res = L.step(s, 'R');
  assert.equal(res.reward, 0);
  assert.equal(res.done, false);
  assert.deepEqual(s.snake, [{ x: 6, y: 8 }, { x: 5, y: 8 }, { x: 4, y: 8 }]);
  assert.equal(s.hunger, 1);
});

test('eating food grows snake, increments score, resets hunger and respawns food', () => {
  const s = L.createState(2);
  s.hunger = 15;
  s.food = { x: 6, y: 8 };
  const res = L.step(s, 'R');
  assert.equal(res.reward, 10);
  assert.equal(s.snake.length, 4);
  assert.equal(s.eaten, 1);
  assert.equal(s.hunger, 0);
  assert.equal(L.score(s), 10);
  assert.ok(!s.snake.some((seg) => seg.x === s.food.x && seg.y === s.food.y));
});

test('stepping onto vacating tail is allowed when not eating', () => {
  const s = L.createState(1);
  s.snake = [
    { x: 5, y: 5 },
    { x: 6, y: 5 },
    { x: 6, y: 6 },
    { x: 5, y: 6 },
  ];
  s.dir = 'L';
  s.food = { x: 0, y: 0 };
  const res = L.step(s, 'D'); // (5,6) is the tail, which vacates
  assert.equal(res.done, false);
  assert.equal(s.alive, true);
  assert.deepEqual(s.snake[0], { x: 5, y: 6 });
});

test('hitting wall or body ends the game with -10 reward', () => {
  const s = L.createState(1);
  s.snake = [{ x: 11, y: 4 }, { x: 10, y: 4 }, { x: 9, y: 4 }];
  s.dir = 'R';
  const wallRes = L.step(s, 'R');
  assert.deepEqual(wallRes, { reward: -10, done: true });
  assert.equal(s.alive, false);
  assert.deepEqual(L.legalActions(s), []);

  const b = L.createState(1);
  b.snake = [
    { x: 5, y: 5 },
    { x: 6, y: 5 },
    { x: 6, y: 6 },
    { x: 5, y: 6 },
    { x: 4, y: 6 },
  ];
  b.dir = 'L';
  b.food = { x: 0, y: 0 };
  const bodyRes = L.step(b, 'D');
  assert.deepEqual(bodyRes, { reward: -10, done: true });
  assert.equal(b.alive, false);
});

test('hunger limit terminates looping snake', () => {
  const s = L.createState(1);
  s.food = { x: 0, y: 0 };
  s.hunger = L.MAX_HUNGER - 1;
  const res = L.step(s, 'R');
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(3);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'L'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions produce identical state', () => {
  const a = L.createState(99);
  const b = L.createState(99);
  for (const act of ['R', 'U', 'U', 'L', 'D']) {
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
