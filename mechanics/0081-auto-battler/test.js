const test = require('node:test');
const assert = require('node:assert/strict');
const autobattler = require('./www/logic.js');

test('createState initializes 50 HP, 5 gold, level 2, starter champion, and 3-card shop', () => {
  const s = autobattler.createState(42);
  assert.equal(s.playerHp, 50);
  assert.equal(s.enemyHp, 50);
  assert.equal(s.gold, 5);
  assert.equal(s.level, 2);
  assert.equal(s.round, 1);
  assert.equal(s.board.length, 1);
  assert.equal(s.bench.length, 0);
  assert.equal(s.shop.length, 3);
  assert.equal(s.gameOver, false);
});

test('buy purchases champion, deducts gold, and places unit on bench', () => {
  const s = autobattler.createState(101);
  s.shop[0] = 'swordsman'; // cost 1
  const initGold = s.gold;

  const legal = autobattler.legalActions(s);
  assert.ok(legal.includes('buy:0'));

  autobattler.step(s, 'buy:0');
  assert.equal(s.gold, initGold - 1);
  assert.equal(s.bench.length, 1);
  assert.equal(s.bench[0].champId, 'swordsman');
  assert.equal(s.shop[0], null);
});

test('deploy moves unit from bench to board within level capacity', () => {
  const s = autobattler.createState(202);
  s.shop[0] = 'archer';
  autobattler.step(s, 'buy:0');
  assert.equal(s.bench.length, 1);
  assert.equal(s.board.length, 1);

  const legal = autobattler.legalActions(s);
  assert.ok(legal.includes('deploy:0'));

  autobattler.step(s, 'deploy:0');
  assert.equal(s.bench.length, 0);
  assert.equal(s.board.length, 2);
  assert.equal(s.board[1].champId, 'archer');
});

test('bench returns unit from board back to bench', () => {
  const s = autobattler.createState(303);
  assert.equal(s.board.length, 1);

  const legal = autobattler.legalActions(s);
  assert.ok(legal.includes('bench:0'));

  autobattler.step(s, 'bench:0');
  assert.equal(s.board.length, 0);
  assert.equal(s.bench.length, 1);
});

test('triple merge combines three 1-star copies into a 2-star unit', () => {
  const s = autobattler.createState(404);
  s.gold = 10;
  // Board already has 1 starter swordsman (star 1)
  assert.equal(s.board[0].champId, 'swordsman');

  // Buy 2 more swordsmen
  s.shop = ['swordsman', 'swordsman', 'archer'];
  autobattler.step(s, 'buy:0');
  autobattler.step(s, 'buy:1');

  // Check triple merge triggered
  const mergedUnit = s.board.find(u => u.champId === 'swordsman') || s.bench.find(u => u.champId === 'swordsman');
  assert.ok(mergedUnit);
  assert.equal(mergedUnit.star, 2);
  assert.ok(mergedUnit.hp > autobattler.CHAMPIONS.swordsman.hp);
});

test('level_up consumes 4 gold, adds XP, and unlocks capacity', () => {
  const s = autobattler.createState(505);
  s.gold = 10;
  s.level = 2;
  s.xp = 0;

  const legal = autobattler.legalActions(s);
  assert.ok(legal.includes('level_up'));

  // Level 2 requires 8 XP (2 * 4)
  autobattler.step(s, 'level_up');
  assert.equal(s.gold, 6);
  assert.equal(s.xp, 4);

  autobattler.step(s, 'level_up');
  assert.equal(s.level, 3);
  assert.equal(s.xp, 0);
});

test('fight simulates round auto-battle and advances to next round with income', () => {
  const s = autobattler.createState(606);
  const initRound = s.round;

  const res = autobattler.step(s, 'fight');
  assert.equal(s.round, initRound + 1);
  assert.ok(s.gold >= 5); // Base round income
  assert.equal(typeof res.reward, 'number');
});

test('illegal action throws error without mutating state', () => {
  const s = autobattler.createState(707);
  s.gold = 0;
  const snap = JSON.stringify(s);

  assert.throws(() => {
    autobattler.step(s, 'reroll'); // Cannot reroll with 0 gold
  });

  assert.equal(JSON.stringify(s), snap);
});

test('same seed and action sequence produces strictly deterministic state', () => {
  const s1 = autobattler.createState(808);
  const s2 = autobattler.createState(808);

  autobattler.step(s1, 'fight');
  autobattler.step(s2, 'fight');

  assert.deepEqual(s1, s2);
});
