const { test } = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');

// Advance the duel for `seconds` with the same held input, in 1/60 s frames.
function run(state, seconds, input) {
  const frames = Math.round(seconds * 60);
  for (let i = 0; i < frames; i++) L.tick(state, 1 / 60, i === 0 ? input : Object.assign({}, input, { action: null }));
  return state;
}

function quietBoss(state) {
  state.boss.mode = 'idle';
  state.boss.cooldown = 99;
}

test('createState places the knight and the Ember Lord in the arena', () => {
  const s = L.createState(42);
  assert.equal(s.player.hp, 100);
  assert.equal(s.player.flasks, 3);
  assert.equal(s.boss.hp, 420);
  assert.ok(s.player.x < s.boss.x);
  assert.equal(L.isOver(s), false);
  assert.equal(L.score(s), 0);
});

test('time flows without input: the boss telegraphs and attacks on its own', () => {
  const s = L.createState(7);
  let telegraphed = false;
  for (let i = 0; i < 60 * 6 && !telegraphed; i++) {
    L.tick(s, 1 / 60, {});
    if (s.events.some((e) => e.type === 'telegraph')) telegraphed = true;
  }
  assert.ok(telegraphed, 'boss should start an attack by itself');
  run(s, 10, {});
  assert.ok(s.player.hp < 100, 'an idle knight gets hit');
});

test('holding move walks the knight continuously and respects the arena', () => {
  const s = L.createState(1);
  quietBoss(s);
  const x0 = s.player.x;
  run(s, 0.5, { move: -1 });
  assert.ok(s.player.x < x0 - 50);
  run(s, 5, { move: -1 });
  assert.ok(s.player.x >= 30);
});

test('light attack lands after its windup only when the boss is in range', () => {
  const s = L.createState(3);
  quietBoss(s);
  s.player.x = s.boss.x - 60;
  L.tick(s, 1 / 60, { action: 'light' });
  assert.equal(s.boss.hp, 420, 'no damage on the first frame');
  run(s, 0.3, {});
  assert.equal(s.boss.hp, 420 - L.MOVES.light.dmg);

  const far = L.createState(3);
  quietBoss(far);
  far.player.x = far.boss.x - 200;
  L.tick(far, 1 / 60, { action: 'light' });
  run(far, 0.5, {});
  assert.equal(far.boss.hp, 420);
});

test('attacks spend stamina, which regenerates over time', () => {
  const s = L.createState(5);
  quietBoss(s);
  s.player.x = s.boss.x - 60;
  L.tick(s, 1 / 60, { action: 'heavy' });
  assert.ok(s.player.stamina <= 70.5);
  run(s, 3, {});
  assert.equal(Math.round(s.player.stamina), 100);
});

test('rolling through a cleave gives invulnerability frames', () => {
  const s = L.createState(9);
  const b = s.boss;
  s.player.x = b.x - 60;
  b.mode = 'windup';
  b.attack = 'cleave';
  b.modeT = L.ATTACKS.cleave.windup - 0.05;
  b.facing = -1;
  b.struck = false;
  L.tick(s, 1 / 60, { action: 'roll', move: -1 });
  run(s, 0.3, {});
  assert.equal(s.player.hp, 100);
});

test('a timed parry deflects the blow and breaks boss poise', () => {
  const s = L.createState(11);
  const b = s.boss;
  s.player.x = b.x - 60;
  b.mode = 'windup';
  b.attack = 'cleave';
  b.modeT = L.ATTACKS.cleave.windup - 0.05;
  b.facing = -1;
  b.poise = 40;
  L.tick(s, 1 / 60, { action: 'parry' });
  run(s, 0.15, {});
  assert.equal(s.player.hp, 100);
  assert.equal(b.mode, 'stagger');
});

test('blocking cuts damage and drains stamina', () => {
  const s = L.createState(13);
  const b = s.boss;
  s.player.x = b.x - 60;
  b.mode = 'windup';
  b.attack = 'cleave';
  b.modeT = L.ATTACKS.cleave.windup - 0.02;
  b.facing = -1;
  run(s, 0.2, { block: true });
  assert.equal(s.player.hp, 100 - Math.ceil(L.ATTACKS.cleave.dmg * 0.25));
  assert.ok(s.player.stamina < 90);
});

test('a staggered boss takes a triple critical hit', () => {
  const s = L.createState(15);
  quietBoss(s);
  s.boss.mode = 'stagger';
  s.boss.modeT = 0;
  s.player.x = s.boss.x - 60;
  L.tick(s, 1 / 60, { action: 'light' });
  run(s, 0.3, {});
  assert.equal(s.boss.hp, 420 - L.MOVES.light.dmg * 3);
});

test('heal drinks a flask after a short animation', () => {
  const s = L.createState(17);
  quietBoss(s);
  s.player.hp = 30;
  L.tick(s, 1 / 60, { action: 'heal' });
  assert.equal(s.player.hp, 30);
  run(s, 1, {});
  assert.equal(s.player.hp, 70);
  assert.equal(s.player.flasks, 2);
});

test('half health starts phase two; zero health wins the duel', () => {
  const s = L.createState(19);
  quietBoss(s);
  s.player.x = s.boss.x - 60;
  s.boss.hp = 220;
  L.tick(s, 1 / 60, { action: 'light' });
  run(s, 0.3, {});
  assert.equal(s.boss.phase, 2);
  s.boss.hp = 5;
  s.boss.cooldown = 99;
  L.tick(s, 1 / 60, { action: 'light' });
  run(s, 0.4, {});
  assert.equal(s.won, true);
  assert.equal(L.isOver(s), true);
});

test('bot interface: illegal actions throw without changing state, games terminate', () => {
  const s = L.createState(21);
  const before = JSON.stringify(s);
  assert.throws(() => L.step(s, 'fly'));
  assert.equal(JSON.stringify(s), before);
  let guard = 0;
  while (!L.isOver(s) && guard++ < 5000) L.step(s, 'wait');
  assert.equal(L.isOver(s), true);
  assert.equal(s.lost, true);
});

test('same seed and same inputs give the same duel', () => {
  const a = L.createState(99);
  const b = L.createState(99);
  const seq = ['right', 'light', 'wait', 'block', 'roll', 'heavy', 'wait', 'parry'];
  for (let i = 0; i < 300; i++) {
    const act = seq[i % seq.length];
    if (L.isOver(a)) break;
    const pick = L.legalActions(a).includes(act) ? act : 'wait';
    L.step(a, pick);
    L.step(b, pick);
  }
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});
