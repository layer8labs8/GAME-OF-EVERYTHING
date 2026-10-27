const test = require('node:test');
const assert = require('node:assert/strict');
const party = require('./www/logic.js');

test('createState initializes 4 contenders, round 1, and trivia mini-game', () => {
  const s = party.createState(42);
  assert.equal(s.players.length, 4);
  assert.equal(s.round, 1);
  assert.equal(s.players[0].name, 'You');
  assert.equal(s.players[0].stars, 0);
  assert.equal(s.players[0].coins, 0);
  assert.equal(s.gameOver, false);
  assert.ok(s.miniGame);
  assert.equal(s.miniGame.type, 'trivia');
});

test('answering trivia advances round and awards coins/stars', () => {
  const s = party.createState(101);
  assert.equal(s.round, 1);

  const legal = party.legalActions(s);
  assert.ok(legal.includes('answer:0'));

  const res = party.step(s, 'answer:0');
  assert.equal(s.round, 2);
  assert.ok(s.players[0].coins > 0);
  assert.equal(typeof res.reward, 'number');
});

test('balloon blitz round pops target balloon and scores points', () => {
  const s = party.createState(202);
  // Advance to round 2
  party.step(s, party.legalActions(s)[0]);
  assert.equal(s.round, 2);
  assert.equal(s.miniGame.type, 'balloons');

  const legal = party.legalActions(s);
  assert.ok(legal.includes('pop:1')); // Gold balloon

  party.step(s, 'pop:1');
  assert.equal(s.round, 3);
});

test('pattern memory accepts color inputs and completes sequence', () => {
  const s = party.createState(303);
  // Advance to round 3
  party.step(s, party.legalActions(s)[0]);
  party.step(s, party.legalActions(s)[0]);
  assert.equal(s.round, 3);
  assert.equal(s.miniGame.type, 'pattern');

  const seq = s.miniGame.sequence;
  assert.equal(seq.length, 3);

  // Press first color
  party.step(s, `press:${seq[0]}`);
  assert.equal(s.round, 3); // Still on round 3 awaiting rest of sequence

  // Press second and third color
  party.step(s, `press:${seq[1]}`);
  party.step(s, `press:${seq[2]}`);
  assert.equal(s.round, 4); // Completed and advanced to round 4
});

test('completing 5 rounds concludes tournament and declares winner', () => {
  const s = party.createState(404);

  // Run through all 5 rounds
  while (!party.isOver(s)) {
    const act = party.legalActions(s)[0];
    party.step(s, act);
  }

  assert.equal(s.gameOver, true);
  assert.ok(s.winner);
  assert.ok(party.score(s) > 0);
});

test('illegal action throws error without mutating state', () => {
  const s = party.createState(505);
  const snap = JSON.stringify(s);

  assert.throws(() => {
    party.step(s, 'pop:99'); // Nonexistent balloon
  });

  assert.equal(JSON.stringify(s), snap);
});

test('same seed and action sequence produces strictly deterministic state', () => {
  const s1 = party.createState(606);
  const s2 = party.createState(606);

  const act = party.legalActions(s1)[0];
  party.step(s1, act);
  party.step(s2, act);

  assert.deepEqual(s1, s2);
});
