const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TICKS,
  EXTRACTION_POINT
} = require('./www/logic.js');

test('createState initializes commando squad, syndicate enemies, and extraction point', () => {
  const s = createState(42);
  assert.equal(s.tick, 1);
  assert.equal(s.squad.length, 3);
  assert.equal(s.enemies.length, 4);
  assert.equal(s.squad[0].id, 'sniper');
  assert.equal(s.squad[1].id, 'heavy');
  assert.equal(s.squad[2].id, 'medic');
  assert.equal(s.done, false);
});

test('legalActions provides movements, attacks, and tactical abilities', () => {
  const s = createState(101);
  const actions = legalActions(s);

  assert.ok(actions.includes('wait'));
  assert.ok(actions.some(a => a.startsWith('move:sniper:')));
  assert.ok(actions.some(a => a.startsWith('move:heavy:')));
});

test('moving commando updates position and respects walls', () => {
  const s = createState(202);
  const sniper = s.squad.find(u => u.id === 'sniper');

  step(s, 'move:sniper:0,2');
  assert.equal(sniper.r, 0);
  assert.equal(sniper.c, 2);

  const actions = legalActions(s);
  // (2, 2) is a wall, so move to (2, 2) must not be legal
  assert.ok(!actions.includes('move:sniper:2,2'));
});

test('sandbag cover mitigates incoming ballistic damage by 50%', () => {
  const s = createState(303);
  // Sentry Bravo at (4, 2). Place cover at (4, 2) or attack sentry on cover
  s.enemies[1].r = 1; // Sentry 2 at (1, 2), which is COVER_TILES
  s.enemies[1].c = 2;
  s.squad[1].r = 1; // Heavy at (1, 1), dist = 1, in range
  s.squad[1].c = 1;

  const initialEnemyHp = s.enemies[1].hp;
  step(s, 'attack:heavy:sentry2');
  // Heavy base dmg is 30, with cover it is 15
  assert.equal(s.enemies[1].hp, initialEnemyHp - 15);
});

test('sniper headshot consumes charge and deals 75 critical damage', () => {
  const s = createState(404);
  const sniper = s.squad.find(u => u.id === 'sniper');
  const sentry = s.enemies[0]; // Sentry Alpha at (2, 5)
  sniper.r = 1;
  sniper.c = 4; // adjacent, clear line of sight

  const initialCharges = sniper.headshots;
  step(s, 'headshot:sentry1');
  assert.equal(sniper.headshots, initialCharges - 1);
  assert.equal(sentry.hp, 0); // 50 HP - 75 = 0 (eliminated)
});

test('medic field medkit restores health to adjacent wounded commando', () => {
  const s = createState(505);
  const medic = s.squad.find(u => u.id === 'medic');
  const heavy = s.squad.find(u => u.id === 'heavy');
  medic.r = 0;
  medic.c = 0;
  heavy.r = 0;
  heavy.c = 1;
  heavy.hp = 50; // Wounded

  const initialKits = medic.medkits;
  step(s, 'heal:heavy');
  assert.equal(medic.medkits, initialKits - 1);
  assert.equal(heavy.hp, 90);
});

test('neutralizing boss and securing extraction bunker triggers mission victory', () => {
  const s = createState(606);
  const boss = s.enemies.find(e => e.id === 'boss');
  boss.hp = 0; // Boss slain

  const heavy = s.squad.find(u => u.id === 'heavy');
  heavy.r = 7;
  heavy.c = 6;

  step(s, `move:heavy:${EXTRACTION_POINT.r},${EXTRACTION_POINT.c}`);
  assert.equal(s.done, true);
  assert.equal(s.winner, 'player');
  assert.equal(s.result, 'victory');
  assert.equal(isOver(s), true);
  assert.ok(score(s) > 500);
});

test('loss of all commandos triggers mission defeat', () => {
  const s = createState(707);
  s.squad.forEach(u => { u.hp = 0; });

  step(s, 'wait');
  assert.equal(s.done, true);
  assert.equal(s.winner, 'enemy');
  assert.equal(s.result, 'defeat');
});

test('illegal action throws error without state mutation', () => {
  const s = createState(808);
  const snapshot = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'heal:boss');
  }, /Illegal action/);

  assert.equal(JSON.stringify(s), snapshot);
});

test('same seed and orders produce strictly deterministic tactical RTT skirmish', () => {
  const s1 = createState(1515);
  const s2 = createState(1515);

  const orders = ['move:sniper:0,2', 'move:heavy:1,1', 'wait'];
  for (const act of orders) {
    if (legalActions(s1).includes(act) && legalActions(s2).includes(act)) {
      step(s1, act);
      step(s2, act);
    }
  }

  assert.deepEqual(s1, s2);
});
