const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState initializes 6 empty platforms, 60g, and full citadel health', () => {
  const s = L.createState(1);
  assert.equal(s.slots.length, 6);
  assert.ok(s.slots.every((sl) => sl.type === 'empty'));
  assert.equal(s.gold, 60);
  assert.equal(s.citadelHp, 10);
  assert.equal(s.wave, 1);
  assert.ok(L.legalActions(s).includes('wait'));
  assert.ok(L.legalActions(s).includes('build_ballista_0'));
});

test('building a tower deducts gold and occupies slot', () => {
  const s = L.createState(2);
  const initialGold = s.gold;
  L.step(s, 'build_ballista_0');
  assert.equal(s.slots[0].type, 'ballista');
  assert.equal(s.gold, initialGold - 25);
  assert.ok(!L.legalActions(s).includes('build_ballista_0'));
});

test('active tower damages and eliminates in-range creeps', () => {
  const s = L.createState(3);
  s.slots[0] = { type: 'ballista', level: 1, cooldown: 0 }; // platform at (130, 80)
  s.creeps = [{ id: 1, x: 130, y: 80, pathIdx: 0, hp: 3, maxHp: 3, speed: 1, slowed: 0 }];

  const res = L.step(s, 'wait');
  assert.equal(s.creeps.length, 0); // defeated
  assert.equal(s.gold, 70); // +10g
  assert.equal(s.points, 50);
  assert.equal(res.reward, 50);
});

test('upgrading tower increases level and consumes upgrade cost', () => {
  const s = L.createState(4);
  s.gold = 50;
  s.slots[1] = { type: 'cannon', level: 1, cooldown: 0 };
  assert.ok(L.legalActions(s).includes('upgrade_1'));

  L.step(s, 'upgrade_1');
  assert.equal(s.slots[1].level, 2);
  assert.equal(s.gold, 20);
});

test('creep reaching final waypoint damages citadel health', () => {
  const s = L.createState(5);
  const lastWP = L.WAYPOINTS.length - 2;
  s.creeps = [{ id: 10, x: L.WAYPOINTS[lastWP].x, y: L.WAYPOINTS[lastWP].y, pathIdx: lastWP, hp: 50, maxHp: 50, speed: 100, slowed: 0 }];

  L.step(s, 'wait');
  assert.equal(s.citadelHp, 9);
  assert.equal(s.creeps.length, 0);
});

test('citadel destruction ends the game', () => {
  const s = L.createState(6);
  s.citadelHp = 1;
  const lastWP = L.WAYPOINTS.length - 2;
  s.creeps = [{ id: 11, x: L.WAYPOINTS[lastWP].x, y: L.WAYPOINTS[lastWP].y, pathIdx: lastWP, hp: 50, maxHp: 50, speed: 100, slowed: 0 }];

  const res = L.step(s, 'wait');
  assert.equal(s.citadelHp, 0);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
  assert.deepEqual(L.legalActions(s), []);
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(7);
  s.gold = 10;
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'build_cannon_0'), /illegal/i); // not enough gold
  assert.throws(() => L.step(s, 'cast_spell'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield deterministic state', () => {
  const a = L.createState(99);
  const b = L.createState(99);
  const seq = ['build_ballista_0', 'wait', 'wait', 'wait'];
  for (const act of seq) {
    if (L.isOver(a)) break;
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
