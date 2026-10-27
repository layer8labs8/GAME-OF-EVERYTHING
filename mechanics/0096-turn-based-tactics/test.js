const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_ROUNDS
} = require('./www/logic.js');

test('createState initializes squad with 2 AP, alien hostiles, and cover layout', () => {
  const s = createState(42);
  assert.equal(s.round, 1);
  assert.equal(s.squad.length, 3);
  assert.equal(s.enemies.length, 3);
  assert.equal(s.squad[0].ap, 2);
  assert.equal(s.squad[1].ap, 2);
  assert.equal(s.done, false);
});

test('legalActions contains tactical movement, shooting, overwatch, and abilities', () => {
  const s = createState(101);
  s.enemies[0].r = 2;
  s.enemies[0].c = 1; // within range of assault
  const actions = legalActions(s);

  assert.ok(actions.includes('end_turn'));
  assert.ok(actions.some(a => a.startsWith('move:assault:')));
  assert.ok(actions.some(a => a.startsWith('overwatch:')));
  assert.ok(actions.some(a => a.startsWith('frag_grenade:assault:')));
});

test('moving consumes 1 AP and updates operative position', () => {
  const s = createState(202);
  const assault = s.squad.find(u => u.id === 'assault');
  assert.equal(assault.r, 0);
  assert.equal(assault.c, 1);
  assert.equal(assault.ap, 2);

  step(s, 'move:assault:1,1');
  assert.equal(assault.r, 1);
  assert.equal(assault.c, 1);
  assert.equal(assault.ap, 1);
});

test('frag_grenade deals guaranteed area damage and consumes grenade charge', () => {
  const s = createState(303);
  const assault = s.squad.find(u => u.id === 'assault');
  const enemy = s.enemies[0];
  assault.r = 4;
  assault.c = 2;
  enemy.r = 5;
  enemy.c = 3;

  const initialHp = enemy.hp;
  step(s, `frag_grenade:assault:${enemy.r},${enemy.c}`);
  assert.equal(assault.grenades, 0);
  assert.equal(enemy.hp, initialHp - 35);
});

test('overwatch enables reactive shot when alien advances', () => {
  const s = createState(404);
  const sniper = s.squad.find(u => u.id === 'sniper');
  sniper.r = 3;
  sniper.c = 2;

  step(s, 'overwatch:sniper');
  assert.equal(sniper.overwatch, true);
  assert.equal(sniper.ap, 0);

  // When end_turn runs, alien advances and triggers overwatch
  step(s, 'end_turn');
  assert.equal(sniper.ap, 2); // Refreshed
  assert.equal(sniper.overwatch, false); // Expended/cleared
});

test('field_medkit restores 35 HP to adjacent wounded operative', () => {
  const s = createState(505);
  const doc = s.squad.find(u => u.id === 'support');
  const striker = s.squad.find(u => u.id === 'assault');
  striker.hp = 30; // Wounded
  doc.r = 0;
  doc.c = 2; // Adjacent to striker at (0, 1)

  const initialKits = doc.medkits;
  step(s, 'field_medkit:support:assault');
  assert.equal(doc.medkits, initialKits - 1);
  assert.equal(striker.hp, 65);
});

test('neutralizing all alien hostiles achieves victory', () => {
  const s = createState(606);
  // Clear enemies down to 1 low-HP enemy
  s.enemies = [{ id: 'trooper1', name: 'Sectoid A', r: 1, c: 3, hp: 5, maxHp: 40, range: 3, dmg: 20 }];
  const sniper = s.squad.find(u => u.id === 'sniper');
  sniper.r = 0;
  sniper.c = 3;

  step(s, 'shoot:sniper:trooper1');
  assert.equal(s.done, true);
  assert.equal(s.winner, 'player');
  assert.equal(s.result, 'victory');
  assert.equal(isOver(s), true);
  assert.ok(score(s) > 500);
});

test('neutralizing all squad operatives triggers defeat', () => {
  const s = createState(707);
  s.squad.forEach(u => { u.hp = 0; });

  step(s, 'end_turn');
  assert.equal(s.done, true);
  assert.equal(s.winner, 'enemy');
  assert.equal(s.result, 'defeat');
});

test('illegal action throws error without state mutation', () => {
  const s = createState(808);
  const snapshot = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'frag_grenade:sniper:1,1'); // Sniper has no grenades
  }, /Illegal action/);

  assert.equal(JSON.stringify(s), snapshot);
});

test('same seed and orders produce strictly deterministic Turn-Based Tactics skirmish', () => {
  const s1 = createState(1717);
  const s2 = createState(1717);

  const orders = ['move:assault:1,1', 'overwatch:sniper', 'end_turn'];
  for (const act of orders) {
    if (legalActions(s1).includes(act) && legalActions(s2).includes(act)) {
      step(s1, act);
      step(s2, act);
    }
  }

  assert.deepEqual(s1, s2);
});
