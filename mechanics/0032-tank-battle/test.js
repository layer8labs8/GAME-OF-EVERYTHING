const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState initializes player, HQ, initial enemies and 3 lives', () => {
  const s = L.createState(1);
  assert.equal(s.player.x, 3);
  assert.equal(s.player.y, 8);
  assert.equal(s.player.lives, 3);
  assert.equal(s.player.dir, 'N');
  assert.equal(s.hq.alive, true);
  assert.equal(s.enemies.length, 2);
  assert.equal(s.won, false);
  assert.equal(s.lost, false);
});

test('turning changes tank facing direction without moving position', () => {
  const s = L.createState(1);
  L.step(s, 'turn_e');
  assert.equal(s.player.dir, 'E');
  assert.equal(s.player.x, 3);
  assert.equal(s.player.y, 8);
});

test('moving shifts player position and respects solid barriers', () => {
  const s = L.createState(1);
  assert.ok(L.legalActions(s).includes('move_n'));
  L.step(s, 'move_n');
  assert.equal(s.player.x, 3);
  assert.equal(s.player.y, 7);
  assert.equal(s.player.dir, 'N');
});

test('firing spawns forward projectile and applies reload cooldown', () => {
  const s = L.createState(1);
  assert.equal(s.player.reload, 0);
  assert.ok(L.legalActions(s).includes('fire'));
  L.step(s, 'fire');
  assert.ok(s.player.reload > 0);
  assert.ok(!L.legalActions(s).includes('fire'));
  assert.ok(s.bullets.length >= 1);
  assert.equal(s.bullets[0].fromPlayer, true);
});

test('bullet demolishes brick wall and scores +5 points', () => {
  const s = L.createState(1);
  s.player.x = 4;
  s.player.y = 8;
  s.player.dir = 'N';
  // (4, 7) is 'B'
  s.grid[7][4] = 'B';
  const res = L.step(s, 'fire');
  assert.equal(s.grid[7][4], '.');
  assert.ok(s.score >= 5);
});

test('destroying enemy awards +50 points and tracks kill count', () => {
  const s = L.createState(1);
  s.enemiesToSpawn = 0;
  s.enemies = [{ id: 99, x: 3, y: 7, dir: 'S', reload: 2, hp: 1 }];
  s.player.x = 3;
  s.player.y = 8;
  s.player.dir = 'N';
  const res = L.step(s, 'fire');
  assert.equal(s.enemies.length, 0);
  assert.equal(s.enemiesDestroyed, 1);
  assert.ok(s.score >= 50);
});

test('bullet hitting HQ destroys command base and triggers defeat', () => {
  const s = L.createState(1);
  s.grid[8][5] = '.'; // clear protective brick
  s.bullets.push({ x: 5, y: 8, vx: 0, vy: 1, fromPlayer: false });
  const res = L.step(s, 'wait');
  assert.equal(s.hq.alive, false);
  assert.equal(s.lost, true);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
});

test('depleting player lives ends game', () => {
  const s = L.createState(1);
  s.player.lives = 1;
  s.bullets.push({ x: 3, y: 8, vx: 0, vy: 1, fromPlayer: false });
  const res = L.step(s, 'wait');
  assert.equal(s.player.lives, 0);
  assert.equal(s.lost, true);
  assert.equal(res.done, true);
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
  s.player.reload = 2;
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'fire'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield strictly deterministic state', () => {
  const a = L.createState(42);
  const b = L.createState(42);
  for (let i = 0; i < 10; i++) {
    const act = L.legalActions(a)[0];
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
