const test = require('node:test');
const assert = require('node:assert/strict');
const backgammon = require('./www/logic.js');

test('createState initializes standard 15-checker layout and starting dice', () => {
  const s = backgammon.createState(42);
  assert.equal(s.whiteBar, 0);
  assert.equal(s.blackBar, 0);
  assert.equal(s.whiteOff, 0);
  assert.equal(s.blackOff, 0);
  assert.equal(s.board[24].count, 2);
  assert.equal(s.board[24].color, 'w');
  assert.equal(s.board[1].count, 2);
  assert.equal(s.board[1].color, 'b');
  assert.ok(s.currentDice.length >= 2);
  assert.equal(s.gameOver, false);
});

test('moving checker consumes die and updates point counts', () => {
  const s = backgammon.createState(101);
  s.currentDice = [3, 6];
  s.board[24] = { count: 2, color: 'w' };
  s.board[21] = { count: 0, color: null };

  const legal = backgammon.legalActions(s);
  assert.ok(legal.includes('move:24:3'));

  backgammon.step(s, 'move:24:3');
  assert.equal(s.board[24].count, 1);
  assert.equal(s.board[21].count, 1);
  assert.equal(s.board[21].color, 'w');
});

test('landing on opponent blot sends it to the bar', () => {
  const s = backgammon.createState(202);
  s.currentDice = [2, 6];
  s.board[8] = { count: 1, color: 'w' };
  s.board[6] = { count: 1, color: 'b' }; // Black blot!
  s.blackBar = 0;

  const legal = backgammon.legalActions(s);
  assert.ok(legal.includes('move:8:2'));

  backgammon.step(s, 'move:8:2');
  assert.equal(s.board[6].color, 'w');
  assert.equal(s.board[6].count, 1);
  assert.equal(s.blackBar, 1);
});

test('checker on bar must re-enter before normal moves are permitted', () => {
  const s = backgammon.createState(303);
  s.whiteBar = 1;
  s.currentDice = [4, 6];
  s.board[21] = { count: 0, color: null }; // 25 - 4 = 21

  const legal = backgammon.legalActions(s);
  assert.ok(legal.includes('enter:4'));

  backgammon.step(s, 'enter:4');
  assert.equal(s.whiteBar, 0);
  assert.equal(s.board[21].count, 1);
  assert.equal(s.board[21].color, 'w');
});

test('bearing off is legal only when all remaining checkers are in home board', () => {
  const s = backgammon.createState(404);
  for (let i = 1; i <= 24; i++) s.board[i] = { count: 0, color: null };
  s.whiteBar = 0;
  s.board[3] = { count: 2, color: 'w' };
  s.board[1] = { count: 1, color: 'w' };
  s.currentDice = [3, 6];

  assert.equal(backgammon.canWhiteBearOff(s), true);

  const legal = backgammon.legalActions(s);
  assert.ok(legal.includes('bear_off:3:3'));

  backgammon.step(s, 'bear_off:3:3');
  assert.equal(s.whiteOff, 1);
  assert.equal(s.board[3].count, 1);
});

test('bearing off 15 checkers wins the match', () => {
  const s = backgammon.createState(505);
  for (let i = 1; i <= 24; i++) s.board[i] = { count: 0, color: null };
  s.whiteBar = 0;
  s.whiteOff = 14;
  s.board[1] = { count: 1, color: 'w' };
  s.currentDice = [1];

  const res = backgammon.step(s, 'bear_off:1:1');
  assert.equal(res.done, true);
  assert.equal(s.gameOver, true);
  assert.equal(s.winner, 'w');
  assert.equal(s.whiteOff, 15);
  assert.ok(res.reward >= 50);
});

test('illegal action throws error without mutating state', () => {
  const s = backgammon.createState(606);
  s.currentDice = [2];
  const snap = JSON.stringify(s);

  assert.throws(() => {
    backgammon.step(s, 'move:24:6'); // No 6 die
  });

  assert.equal(JSON.stringify(s), snap);
});

test('same seed and action sequence produces strictly deterministic state', () => {
  const s1 = backgammon.createState(707);
  const s2 = backgammon.createState(707);

  const act = backgammon.legalActions(s1)[0];
  backgammon.step(s1, act);
  backgammon.step(s2, act);

  assert.deepEqual(s1, s2);
});
