const test = require('node:test');
const assert = require('node:assert');
const { createState, legalActions, step, isOver, score } = require('./www/logic.js');

test('createState initializes 7x6 grid, 3 operatives with 2 AP each and 3 hostiles', () => {
  const s = createState(42);
  assert.strictEqual(s.coverGrid.length, 6);
  assert.strictEqual(s.coverGrid[0].length, 7);
  assert.strictEqual(s.players.length, 3);
  assert.strictEqual(s.enemies.length, 3);
  assert.strictEqual(s.players.every(p => p.ap === 2), true);
  assert.strictEqual(s.round, 1);
  assert.strictEqual(s.done, false);
  assert.strictEqual(isOver(s), false);
  assert.strictEqual(score(s), 0);
});

test('move consumes 1 AP and shifts agent coordinates', () => {
  const s = createState(101);
  const p1 = s.players.find(p => p.id === 'p1');
  const startX = p1.x;
  const startY = p1.y;

  const res = step(s, `move:${startX},${startY - 1}`);
  assert.strictEqual(res.done, false);
  assert.strictEqual(p1.ap, 1);
  assert.strictEqual(p1.x, startX);
  assert.strictEqual(p1.y, startY - 1);
});

test('shoot consumes 1 AP and 1 ammo, inflicts damage and increases score', () => {
  const s = createState(102);
  const p1 = s.players.find(p => p.id === 'p1');
  const e1 = s.enemies.find(e => e.id === 'e1');

  // Place enemy in firing range
  e1.x = p1.x;
  e1.y = p1.y - 2;
  const initialHp = e1.hp;
  const initialAmmo = p1.ammo;

  step(s, `shoot:${e1.id}`);
  assert.strictEqual(p1.ap, 1);
  assert.strictEqual(p1.ammo, initialAmmo - 1);
  assert.ok(e1.hp < initialHp);
  assert.ok(score(s) > 0);
});

test('reload restores magazine to maxAmmo and consumes 1 AP', () => {
  const s = createState(103);
  const p1 = s.players.find(p => p.id === 'p1');
  p1.ammo = 0; // Empty magazine

  step(s, 'reload');
  assert.strictEqual(p1.ammo, p1.maxAmmo);
  assert.strictEqual(p1.ap, 1);
});

test('overwatch enters reaction posture and triggers reaction fire on advancing enemy', () => {
  const s = createState(104);
  const p1 = s.players.find(p => p.id === 'p1');
  const e1 = s.enemies.find(e => e.id === 'e1');

  // Place enemy 3 tiles away
  e1.x = p1.x;
  e1.y = p1.y - 4;

  step(s, 'overwatch');
  assert.strictEqual(p1.overwatch, true);
  assert.strictEqual(p1.ap, 0);

  // End turns for p2 and p3 to trigger enemy phase
  step(s, 'end_turn'); // p2
  step(s, 'end_turn'); // p3 -> Enemy moves and triggers overwatch!

  assert.strictEqual(s.round, 2);
  assert.ok(s.combatLog.some(log => log.includes('OVERWATCH TRIGGERED!')));
});

test('special skills deliver high damage (Pointman breach shot)', () => {
  const s = createState(105);
  const p1 = s.players.find(p => p.id === 'p1');
  const e1 = s.enemies.find(e => e.id === 'e1');
  e1.x = p1.x;
  e1.y = p1.y - 1; // Point blank range

  const initialHp = e1.hp;
  step(s, `skill:${e1.id}`);
  assert.ok(e1.hp < initialHp);
  assert.strictEqual(p1.cooldown, 2);
});

test('support heal restores wounded squadmate HP', () => {
  const s = createState(106);
  // Select support
  s.activeUnitId = 'p3';
  const p3 = s.players.find(p => p.id === 'p3');
  const p1 = s.players.find(p => p.id === 'p1');

  p1.hp = 40; // Wounded
  p1.x = p3.x;
  p1.y = p3.y - 1; // Adjacent

  step(s, `heal:${p1.id}`);
  assert.strictEqual(p1.hp, 70);
  assert.strictEqual(p3.medkits, 1);
});

test('eliminating all syndicate enemies awards victory and 1.0 reward', () => {
  const s = createState(201);
  const p1 = s.players.find(p => p.id === 'p1');
  p1.atk = 300;

  s.enemies.forEach((e, idx) => {
    e.hp = 1;
    e.x = p1.x;
    e.y = p1.y - 1;
  });

  step(s, `shoot:e1`); // Kill e1
  s.enemies[1].hp = 0;
  s.enemies[2].hp = 0;

  const res = step(s, 'end_turn');
  assert.strictEqual(res.done, true);
  assert.strictEqual(res.reward, 1.0);
  assert.strictEqual(s.victory, true);
  assert.strictEqual(isOver(s), true);
});

test('defeat occurs when all squad operatives fall in battle', () => {
  const s = createState(301);
  s.players.forEach(p => p.hp = 0);
  // Restore 1 point on active unit to allow final action check
  s.players[0].hp = 1;

  // Active unit takes a shot or ends turn and dies in enemy phase
  s.enemies[0].x = s.players[0].x;
  s.enemies[0].y = s.players[0].y - 1;
  s.enemies[0].atk = 500;

  step(s, 'end_turn'); // p1
  // If others dead, runs enemy phase and eliminates remaining player
  assert.strictEqual(isOver(s), true);
  assert.strictEqual(s.victory, false);
});

test('illegal action throws error without mutating state', () => {
  const s = createState(401);
  const serializedBefore = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'shoot:invalid_target');
  }, /Illegal action/);

  assert.strictEqual(JSON.stringify(s), serializedBefore);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  const script = ['move:1,4', 'overwatch', 'end_turn', 'end_turn'];

  for (const act of script) {
    if (s1.done) break;
    step(s1, act);
    step(s2, act);
  }

  assert.strictEqual(JSON.stringify(s1), JSON.stringify(s2));
});
