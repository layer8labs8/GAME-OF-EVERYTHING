const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('createState initializes hero at (1,1) with 30 HP, floor 1, and revealed tiles', () => {
  const s = L.createState(1);
  assert.equal(s.hero.x, 1);
  assert.equal(s.hero.y, 1);
  assert.equal(s.hero.hp, 30);
  assert.equal(s.floor, 1);
  assert.equal(s.revealed[1 * L.SIZE + 1], true);
  assert.ok(L.legalActions(s).length > 0);
});

test('moving across open floor updates hero position and vision', () => {
  const s = L.createState(2);
  s.grid[1 * L.SIZE + 2] = 0; // ensure right is floor

  L.step(s, 'right');
  assert.equal(s.hero.x, 2);
  assert.equal(s.hero.y, 1);
  assert.equal(s.revealed[1 * L.SIZE + 2], true);
});

test('attacking monster deals damage and takes counter-attack if alive', () => {
  const s = L.createState(3);
  s.grid[1 * L.SIZE + 2] = 2; // place monster to right
  s.monsters = [{ idx: 1 * L.SIZE + 2, hp: 20, maxHp: 20, atk: 4, type: 1 }];

  const res = L.step(s, 'right');
  assert.equal(s.monsters[0].hp, 14); // 20 - 6
  assert.equal(s.hero.hp, 26); // 30 - 4
  assert.equal(res.reward, -4);
  assert.equal(s.hero.x, 1); // did not move into cell yet
});

test('defeating monster clears cell, awards gold and advances hero', () => {
  const s = L.createState(4);
  s.grid[1 * L.SIZE + 2] = 2;
  s.monsters = [{ idx: 1 * L.SIZE + 2, hp: 5, maxHp: 5, atk: 2, type: 1 }];

  const res = L.step(s, 'right');
  assert.equal(s.monsters.length, 0);
  assert.equal(s.grid[1 * L.SIZE + 2], 0);
  assert.equal(s.hero.x, 2);
  assert.equal(s.hero.gold, 15);
  assert.equal(res.reward, 40);
});

test('drinking potion heals hero up to maxHp and consumes potion', () => {
  const s = L.createState(5);
  s.hero.hp = 18;
  s.hero.potions = 1;

  assert.ok(L.legalActions(s).includes('potion'));
  const res = L.step(s, 'potion');
  assert.equal(s.hero.hp, 30);
  assert.equal(s.hero.potions, 0);
  assert.equal(res.reward, 12);
});

test('stepping on stairs advances to next floor', () => {
  const s = L.createState(6);
  s.grid[1 * L.SIZE + 2] = 5; // stairs

  const res = L.step(s, 'right');
  assert.equal(s.floor, 2);
  assert.equal(s.hero.x, 1);
  assert.equal(s.hero.y, 1);
  assert.equal(res.reward, 100);
});

test('hero dying ends game', () => {
  const s = L.createState(7);
  s.hero.hp = 2;
  s.grid[1 * L.SIZE + 2] = 2;
  s.monsters = [{ idx: 1 * L.SIZE + 2, hp: 20, maxHp: 20, atk: 5, type: 1 }];

  const res = L.step(s, 'right');
  assert.ok(s.hero.hp <= 0);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
  assert.deepEqual(L.legalActions(s), []);
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(8);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'teleport'), /illegal/i);
  assert.throws(() => L.step(s, 'up'), /illegal/i); // outer wall
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions yield deterministic state', () => {
  const a = L.createState(55);
  const b = L.createState(55);
  for (let i = 0; i < 6 && !L.isOver(a); i++) {
    const act = L.legalActions(a)[0];
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
