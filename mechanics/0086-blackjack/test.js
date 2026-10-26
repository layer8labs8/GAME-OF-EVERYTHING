const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

test('handInfo evaluates soft and hard aces accurately', () => {
  // 0 = Ace, 5 = Six, 9 = Ten, 12 = King
  assert.deepEqual(L.handInfo([0, 5]), { total: 17, soft: true });
  assert.deepEqual(L.handInfo([0, 5, 9]), { total: 17, soft: false });
  assert.deepEqual(L.handInfo([0, 12]), { total: 21, soft: true });
  assert.deepEqual(L.handInfo([0, 0, 8]), { total: 21, soft: true }); // A + A + 9 = 21
});

test('createState deals 2 cards each from a 52-card shoe', () => {
  const s = L.createState(14);
  assert.equal(s.player.length, 2);
  assert.equal(s.dealer.length, 2);
  assert.equal(s.shoe.length, 48);
  assert.equal(s.round, 1);
});

test('hitting over 21 busts player and deducts bet', () => {
  const s = L.createState(3);
  s.phase = 'player';
  s.chips = 100;
  s.currentBet = 20;
  s.round = 1;
  s.player = [9, 10]; // 10 + J = 20
  s.dealer = [5, 6];
  s.shoe.push(4); // popped next -> 5 -> total 25 bust
  const res = L.step(s, 'hit');
  assert.equal(s.handResult, 'bust');
  assert.equal(res.reward, -20);
  assert.equal(s.chips, 80);
  assert.equal(s.phase, 'between');
  assert.deepEqual(L.legalActions(s), ['deal']);
});

test('standing triggers dealer draw to >= 17 and pays winner', () => {
  const s = L.createState(7);
  s.phase = 'player';
  s.chips = 100;
  s.currentBet = 20;
  s.round = 1;
  s.player = [9, 8]; // 10 + 9 = 19
  s.dealer = [9, 5]; // 10 + 6 = 16
  s.shoe.push(1); // popped next -> 2 -> dealer 18
  const res = L.step(s, 'stand');
  assert.equal(L.handTotal(s.dealer), 18);
  assert.equal(s.handResult, 'win');
  assert.equal(res.reward, 20);
  assert.equal(s.chips, 120);
});

test('double doubles wager, draws exactly one card and settles', () => {
  const s = L.createState(11);
  s.phase = 'player';
  s.chips = 100;
  s.currentBet = 20;
  s.round = 5; // final round
  s.player = [4, 5]; // 5 + 6 = 11
  s.dealer = [9, 6]; // 10 + 7 = 17
  s.shoe.push(9); // popped next -> 10 -> player 21
  const res = L.step(s, 'double');
  assert.equal(s.handResult, 'win');
  assert.equal(res.reward, 40);
  assert.equal(s.chips, 140);
  assert.equal(res.done, true);
  assert.equal(L.isOver(s), true);
});

test('illegal action throws without mutating state', () => {
  const s = L.createState(21);
  const snap = JSON.stringify(s);
  assert.throws(() => L.step(s, 'split'), /illegal/i);
  assert.equal(JSON.stringify(s), snap);
});

test('same seed and actions produce identical state', () => {
  const a = L.createState(88);
  const b = L.createState(88);
  for (let i = 0; i < 10 && !L.isOver(a); i++) {
    const act = L.legalActions(a)[0];
    L.step(a, act);
    L.step(b, act);
  }
  assert.deepEqual(a, b);
});
