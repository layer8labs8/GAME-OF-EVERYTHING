const test = require('node:test');
const assert = require('node:assert/strict');
const dominoes = require('./www/logic.js');

test('createState deals 7 tiles to player, 7 to AI, and 14 to boneyard', () => {
  const s = dominoes.createState(42);
  assert.equal(s.playerHand.length, 7);
  assert.equal(s.aiHand.length, 7);
  assert.equal(s.boneyard.length, 14);
  assert.equal(s.chain.length, 0);
  assert.equal(s.leftEnd, null);
  assert.equal(s.rightEnd, null);
  assert.equal(s.gameOver, false);
});

test('first tile played initiates chain and sets leftEnd and rightEnd', () => {
  const s = dominoes.createState(101);
  const firstTile = s.playerHand[0].slice();

  const legal = dominoes.legalActions(s);
  assert.ok(legal.includes('play:0:left'));

  dominoes.step(s, 'play:0:left');
  assert.ok(s.chain.length >= 1);
  assert.equal(s.leftEnd !== null, true);
  assert.equal(s.rightEnd !== null, true);
});

test('connecting tile to matching end correctly updates chain', () => {
  const s = dominoes.createState(202);
  // Set up controlled board: chain [3, 5]
  s.chain = [[3, 5]];
  s.leftEnd = 3;
  s.rightEnd = 5;
  // Give player tile [5, 2]
  s.playerHand = [[5, 2]];

  const legal = dominoes.legalActions(s);
  assert.ok(legal.includes('play:0:right'));

  dominoes.step(s, 'play:0:right');
  // Player played [5, 2] on right end (5), new rightEnd should be 2!
  assert.equal(s.rightEnd, 2);
  assert.equal(s.playerHand.length, 0);
});

test('drawing from boneyard adds tile to hand when no plays available', () => {
  const s = dominoes.createState(303);
  s.chain = [[6, 6]];
  s.leftEnd = 6;
  s.rightEnd = 6;
  s.playerHand = [[1, 1]]; // No matching 6
  s.boneyard = [[6, 2], [3, 4]];

  const legal = dominoes.legalActions(s);
  assert.deepEqual(legal, ['draw']);

  const initHandLen = s.playerHand.length;
  dominoes.step(s, 'draw');
  assert.equal(s.playerHand.length, initHandLen + 1);
  assert.equal(s.boneyard.length, 1);
});

test('shedding all tiles calls Domino and awards opponent pips', () => {
  const s = dominoes.createState(404);
  s.chain = [[4, 4]];
  s.leftEnd = 4;
  s.rightEnd = 4;
  s.playerHand = [[4, 1]]; // 1 tile left
  s.aiHand = [[6, 6], [5, 5]]; // 22 pips

  const res = dominoes.step(s, 'play:0:left');
  assert.equal(res.done, true);
  assert.equal(s.gameOver, true);
  assert.equal(s.winner, 'player');
  assert.equal(s.playerScore, 22);
  assert.ok(res.reward >= 30);
});

test('blocked game awards win to player with fewer pips', () => {
  const s = dominoes.createState(505);
  s.chain = [[6, 6]];
  s.leftEnd = 6;
  s.rightEnd = 6;
  s.boneyard = [];
  s.playerHand = [[0, 1]]; // 1 pip
  s.aiHand = [[5, 5]]; // 10 pips

  // Player must pass
  const legal = dominoes.legalActions(s);
  assert.deepEqual(legal, ['pass']);

  // Player passes -> AI also cannot play and passes -> Blocked!
  const res = dominoes.step(s, 'pass');
  assert.equal(res.done, true);
  assert.equal(s.gameOver, true);
  assert.equal(s.winner, 'player');
  assert.equal(s.playerScore, 9); // 10 - 1
});

test('illegal action throws error without mutating state', () => {
  const s = dominoes.createState(606);
  s.chain = [[1, 2]];
  s.leftEnd = 1;
  s.rightEnd = 2;
  s.playerHand = [[5, 5]]; // Cannot connect to 1 or 2
  const snap = JSON.stringify(s);

  assert.throws(() => {
    dominoes.step(s, 'play:0:left');
  });

  assert.equal(JSON.stringify(s), snap);
});

test('same seed and action sequence produces strictly deterministic state', () => {
  const s1 = dominoes.createState(707);
  const s2 = dominoes.createState(707);

  const act = dominoes.legalActions(s1)[0];
  dominoes.step(s1, act);
  dominoes.step(s2, act);

  assert.deepEqual(s1, s2);
});
