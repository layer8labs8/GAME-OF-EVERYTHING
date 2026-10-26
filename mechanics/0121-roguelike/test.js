const test = require('node:test');
const assert = require('node:assert/strict');
const { createState, legalActions, step, isOver, score } = require('./www/logic.js');

test('createState initializes hero at (1,1) on Floor 1 with 35 HP', () => {
  const s = createState(777);
  assert.equal(s.floor, 1);
  assert.equal(s.hero.x, 1);
  assert.equal(s.hero.y, 1);
  assert.equal(s.hero.hp, 35);
  assert.equal(s.hero.potions, 1);
  assert.ok(s.enemies.length >= 2);
  assert.equal(isOver(s), false);
});

test('moving hero to open tile updates position and reveals fog', () => {
  const s = createState(777);
  // Guarantee (1,2) is open
  s.map[2][1] = '.';
  s.enemies = s.enemies.filter((e) => !(e.x === 1 && e.y === 2));

  const res = step(s, 'move_down');
  assert.equal(res.reward, 1);
  assert.equal(s.hero.x, 1);
  assert.equal(s.hero.y, 2);
  assert.equal(s.fog[2][1], true);
});

test('bump attacking an enemy inflicts damage', () => {
  const s = createState(777);
  s.enemies = [{ id: 1, type: 'goblin', x: 2, y: 1, hp: 10, maxHp: 10, atk: 3, def: 0 }];

  const prevHp = s.hero.hp;
  const res = step(s, 'move_right');
  assert.ok(res.reward >= 5);
  assert.ok(s.enemies[0].hp < 10);
  assert.equal(s.stats.damageDealt > 0, true);
});

test('slaying an enemy removes it from floor and awards reward', () => {
  const s = createState(777);
  s.enemies = [{ id: 1, type: 'goblin', x: 2, y: 1, hp: 2, maxHp: 10, atk: 3, def: 0 }];

  const res = step(s, 'move_right');
  assert.ok(res.reward >= 20);
  assert.equal(s.enemies.length, 0);
  assert.equal(s.stats.kills, 1);
});

test('firebrand relic adds bonus damage and vampiric fang heals on kill', () => {
  const s = createState(777);
  s.hero.relics = ['firebrand', 'vampiric_fang'];
  s.hero.hp = 20;
  s.enemies = [{ id: 1, type: 'goblin', x: 2, y: 1, hp: 3, maxHp: 10, atk: 0, def: 0 }];

  step(s, 'move_right');
  assert.equal(s.enemies.length, 0);
  assert.equal(s.hero.hp, 23); // +3 from vampiric fang
});

test('use_potion restores 20 HP and deducts a potion', () => {
  const s = createState(777);
  s.hero.hp = 10;
  s.hero.potions = 1;

  const res = step(s, 'use_potion');
  assert.equal(res.reward, 10);
  assert.equal(s.hero.hp, 30);
  assert.equal(s.hero.potions, 0);
});

test('altar prayer sacrifices 6 HP for stat boost', () => {
  const s = createState(777);
  s.map[1][2] = 'A';
  s.hero.hp = 25;
  const prevAtk = s.hero.atk;
  const prevDef = s.hero.def;

  const res = step(s, 'pray_altar');
  assert.equal(res.reward, 15);
  assert.equal(s.hero.hp, 19);
  assert.ok(s.hero.atk > prevAtk || s.hero.def > prevDef);
});

test('descending stairs on floor 5 triggers victory', () => {
  const s = createState(777);
  s.floor = 5;
  s.map[1][1] = '>';

  const res = step(s, 'descend');
  assert.equal(res.done, true);
  assert.equal(s.won, true);
  assert.ok(score(s) >= 1000);
});

test('depleting hero HP ends run', () => {
  const s = createState(777);
  s.hero.hp = 2;
  s.hero.def = 0;
  s.enemies = [{ id: 1, type: 'orc', x: 1, y: 2, hp: 20, maxHp: 20, atk: 10, def: 0 }];

  step(s, 'wait');
  assert.equal(s.hero.hp, 0);
  assert.equal(isOver(s), true);
});

test('illegal action throws without mutating state', () => {
  const s = createState(777);
  s.map[0][1] = '#';
  const snapshot = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'move_up');
  });

  assert.equal(JSON.stringify(s), snapshot);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(54321);
  const s2 = createState(54321);

  for (let i = 0; i < 20; i++) {
    const a1 = legalActions(s1);
    const a2 = legalActions(s2);
    assert.deepEqual(a1, a2);
    if (a1.length === 0) break;

    const chosen = a1[i % a1.length];
    step(s1, chosen);
    step(s2, chosen);
    assert.deepEqual(s1, s2);
  }
});
