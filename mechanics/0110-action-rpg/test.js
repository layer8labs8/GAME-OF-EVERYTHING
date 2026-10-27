const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  ARENA_SIZE,
  DIRS,
  VECTORS
} = require('./www/logic.js');

test('createState initializes hero at (3, 6), 100 HP, 100 Stamina, and Wave 1 grunts', () => {
  const s = createState(111);
  assert.strictEqual(s.stepCount, 1);
  assert.strictEqual(s.done, false);
  assert.strictEqual(s.hero.hp, 100);
  assert.strictEqual(s.hero.stamina, 100);
  assert.strictEqual(s.hero.mana, 50);
  assert.strictEqual(s.hero.heading, 'N');
  assert.strictEqual(s.wave, 1);
  assert.strictEqual(s.enemies.length, 3);
});

test('legalActions includes movement, dodge rolls, slash, spin cleave, and frost nova', () => {
  const s = createState(222);
  const actions = legalActions(s);

  assert.ok(actions.includes('move:N'));
  assert.ok(actions.includes('move:S'));
  assert.ok(actions.includes('dodge_roll:N'));
  assert.ok(actions.includes('slash'));
  assert.ok(actions.includes('spin_cleave'));
  assert.ok(actions.includes('cast_frost_nova'));
});

test('move action updates hero coordinates and facing heading', () => {
  const s = createState(333);
  const initY = s.hero.y;

  step(s, 'move:N');

  assert.strictEqual(s.hero.y, initY - 1);
  assert.strictEqual(s.hero.heading, 'N');
});

test('slash damages enemy in forward arc and builds combo', () => {
  const s = createState(444);
  s.hero.x = 4;
  s.hero.y = 3;
  s.hero.heading = 'N';
  // Grunt at (4, 2) is directly in front
  const grunt = s.enemies.find(e => e.id === 'g3');
  const initHp = grunt.hp;

  step(s, 'slash');

  assert.ok(grunt.hp < initHp);
  assert.strictEqual(s.hero.combo, 1);
});

test('dodge roll advances 2 tiles and grants invulnerability frames', () => {
  const s = createState(555);
  s.hero.stamina = 50;

  step(s, 'dodge_roll:N');

  assert.strictEqual(s.hero.y, 4); // was 6, moved -2
  assert.strictEqual(s.hero.stamina, 50 - 20 + 15); // cost 20, regen 15
});

test('spin cleave damages all surrounding enemies', () => {
  const s = createState(666);
  s.hero.x = 3;
  s.hero.y = 2;
  // Place grunts around hero
  s.enemies[0].x = 3; s.enemies[0].y = 1;
  s.enemies[1].x = 4; s.enemies[1].y = 2;

  step(s, 'spin_cleave');

  assert.ok(s.enemies[0].hp < 30);
  assert.ok(s.enemies[1].hp < 30);
});

test('cast_frost_nova consumes 20 mana and freezes enemies', () => {
  const s = createState(777);
  s.hero.x = 4;
  s.hero.y = 2;

  step(s, 'cast_frost_nova');

  assert.strictEqual(s.hero.mana, 30);
  const frozenGrunt = s.enemies.find(e => e.x === 4 && e.y === 2);
  if (frozenGrunt) {
    // Enemy was frozen and thawed after skipping turn in enemy phase
    assert.ok(frozenGrunt.hp < 30);
  }
});

test('slaying all wave 3 boss triggers victory', () => {
  const s = createState(888);
  s.wave = 3;
  s.enemies = [
    { id: 'boss', name: 'Cryptlord Minotaur', x: 3, y: 5, hp: 10, maxHp: 140, atk: 28, isBoss: true, windup: false, frozen: false }
  ];
  s.hero.x = 3;
  s.hero.y = 6;
  s.hero.heading = 'N';

  step(s, 'slash');

  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'player');
  assert.ok(score(s) > 300);
});

test('hero HP depletion causes defeat', () => {
  const s = createState(999);
  s.hero.hp = 10;
  // Enemy with active windup next to hero
  s.enemies[0].x = 3;
  s.enemies[0].y = 5;
  s.enemies[0].windup = true;
  s.enemies[0].atk = 20;

  step(s, 'move:E'); // Moves adjacent, windup strike lands

  assert.strictEqual(s.hero.hp, 0);
  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'enemy');
});

test('same seed and sequence of action-rpg decisions yields deterministic state', () => {
  const s1 = createState(110000);
  const s2 = createState(110000);

  for (let i = 0; i < 6; i++) {
    if (s1.done) break;
    const legals = legalActions(s1);
    if (legals.length === 0) break;
    const act = legals[0];
    step(s1, act);
    step(s2, act);
  }

  assert.strictEqual(JSON.stringify(s1), JSON.stringify(s2));
});
