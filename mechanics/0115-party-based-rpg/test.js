const test = require('node:test');
const assert = require('node:assert');
const { createState, legalActions, step, isOver, score } = require('./www/logic.js');

test('createState initializes 4 heroes, room 1, enemies and starting stats', () => {
  const s = createState(42);
  assert.strictEqual(s.heroes.length, 4);
  assert.strictEqual(s.enemies.length, 2);
  assert.strictEqual(s.room, 1);
  assert.strictEqual(s.maxRooms, 4);
  assert.strictEqual(s.round, 1);
  assert.strictEqual(s.done, false);
  assert.strictEqual(isOver(s), false);
  assert.strictEqual(score(s), 0);
});

test('legalActions returns rank-specific actions for active hero', () => {
  const s = createState(101);
  const actions = legalActions(s);
  assert.ok(actions.includes('pass'));
  assert.ok(actions.some(a => a.startsWith('skill:smite:')));
  assert.ok(actions.some(a => a.startsWith('guard:')));
});

test('crusader smite damages front enemy and builds score', () => {
  const s = createState(102);
  const target = s.enemies[0];
  const initialHp = target.hp;

  step(s, 'skill:smite:0');
  assert.ok(target.hp < initialHp);
  assert.ok(score(s) > 0);
  assert.strictEqual(s.heroes[0].acted, true);
});

test('highwayman pistol shot targets backline enemy', () => {
  const s = createState(103);
  step(s, 'pass'); // Crusader passes -> Highwayman is active
  assert.strictEqual(s.activeHeroIndex, 1);

  const backEnemy = s.enemies[1];
  const initialHp = backEnemy.hp;
  step(s, 'skill:pistol_shot:1');
  assert.ok(backEnemy.hp < initialHp);
});

test('vestal divine grace heals wounded ally and clears deaths door', () => {
  const s = createState(104);
  s.heroes[1].hp = 10;
  s.heroes[1].deathsDoor = true;

  step(s, 'pass'); // Crusader (hp 100)
  step(s, 'pass'); // Highwayman (hp 10) -> Vestal active

  assert.strictEqual(s.activeHeroIndex, 2);
  step(s, 'heal:divine_grace:1');
  assert.strictEqual(s.heroes[1].hp, 38);
  assert.strictEqual(s.heroes[1].deathsDoor, false);
});

test('sanctuary reduces party stress', () => {
  const s = createState(105);
  s.heroes.forEach(h => h.stress = 30);

  step(s, 'pass'); // Crusader
  step(s, 'pass'); // Highwayman
  step(s, 'skill:sanctuary'); // Vestal

  assert.strictEqual(s.heroes[0].stress, 15);
  assert.strictEqual(s.heroes[1].stress, 15);
});

test('clearing room advances expedition to room 2 with camp ration healing', () => {
  const s = createState(106);
  s.heroes[0].hp = 50;
  s.heroes[0].stress = 40;

  // Kill room 1 enemies
  s.enemies[0].hp = 1;
  s.enemies[1].hp = 0;

  step(s, 'skill:smite:0'); // Kills last enemy
  assert.strictEqual(s.room, 2);
  assert.strictEqual(s.heroes[0].hp, 70); // +20 HP
  assert.strictEqual(s.heroes[0].stress, 20); // -20 Stress
});

test('slaying the Lich King in room 4 awards victory and 1.0 reward', () => {
  const s = createState(201);
  s.room = 4;
  s.enemies = [
    { id: 'e1', name: 'Dread Wraith', hp: 0, maxHp: 60, atk: 10, def: 0 },
    { id: 'e2', name: 'Ancient Lich King', hp: 1, maxHp: 150, atk: 10, def: 0 }
  ];

  const res = step(s, 'skill:smite:1');
  assert.strictEqual(res.done, true);
  assert.strictEqual(res.reward, 1.0);
  assert.strictEqual(s.victory, true);
  assert.strictEqual(isOver(s), true);
});

test('party wipeout triggers defeat and 0.0 reward', () => {
  const s = createState(301);
  s.heroes.forEach(h => {
    h.hp = 0;
    h.deathsDoor = false;
  });
  // Keep one alive to execute pass
  s.heroes[0].hp = 1;
  s.enemies[0].atk = 500;

  step(s, 'pass'); // all others dead, runs enemy phase and wipes out
  assert.strictEqual(isOver(s), true);
  assert.strictEqual(s.victory, false);
});

test('illegal action throws error without mutating state', () => {
  const s = createState(401);
  const serializedBefore = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'skill:nonexistent:0');
  }, /Illegal action/);

  assert.strictEqual(JSON.stringify(s), serializedBefore);
});

test('same seed and actions produce strictly deterministic state', () => {
  const s1 = createState(999);
  const s2 = createState(999);

  const script = ['skill:smite:0', 'pass', 'skill:sanctuary', 'pass'];

  for (const act of script) {
    if (s1.done) break;
    step(s1, act);
    step(s2, act);
  }

  assert.strictEqual(JSON.stringify(s1), JSON.stringify(s2));
});
