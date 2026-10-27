const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  ZONES
} = require('./www/logic.js');

test('createState initializes hero stats, inventory, and zone 1 encounter', () => {
  const s = createState(111);
  assert.strictEqual(s.turn, 1);
  assert.strictEqual(s.done, false);
  assert.strictEqual(s.hero.hp, 80);
  assert.strictEqual(s.hero.mp, 40);
  assert.strictEqual(s.hero.level, 1);
  assert.strictEqual(s.hero.str, 12);
  assert.strictEqual(s.enemy.name, 'Dire Wolf');
  assert.strictEqual(s.statePhase, 'combat');
});

test('legalActions provides attack, fireball, defend and potion options in combat', () => {
  const s = createState(222);
  s.hero.hp = 50; // Damaged so healing potion is legal
  const actions = legalActions(s);

  assert.ok(actions.includes('attack'));
  assert.ok(actions.includes('cast_fireball'));
  assert.ok(actions.includes('defend'));
  assert.ok(actions.includes('use_potion:hp'));
});

test('attack deals damage to enemy and triggers enemy retaliation', () => {
  const s = createState(333);
  const initEnemyHp = s.enemy.hp;
  const initHeroHp = s.hero.hp;

  step(s, 'attack');

  assert.ok(s.enemy.hp < initEnemyHp);
  assert.ok(s.hero.hp < initHeroHp);
});

test('cast_fireball expends 12 MP and deals powerful magical damage', () => {
  const s = createState(444);
  const initMp = s.hero.mp;
  const initHp = s.enemy.hp;

  step(s, 'cast_fireball');

  assert.strictEqual(s.hero.mp, initMp - 12);
  assert.ok(initHp - s.enemy.hp >= 20);
});

test('defend halves enemy counter-attack damage and recovers MP', () => {
  const s1 = createState(555);
  const s2 = createState(555);

  step(s1, 'defend');
  step(s2, 'attack');

  // Hero taking defended hit should have higher remaining HP than attacking
  assert.ok(s1.hero.hp > s2.hero.hp);
});

test('slaying monster awards XP, Gold and transitions to levelup or camp phase', () => {
  const s = createState(666);
  s.enemy.hp = 5;

  step(s, 'attack');

  assert.strictEqual(s.enemy.hp, 0);
  assert.ok(s.hero.gold > 30);
  // Dire Wolf gives 50 XP, which triggers Level 2
  assert.strictEqual(s.hero.level, 2);
  assert.strictEqual(s.hero.statPoints, 2);

  const legals = legalActions(s);
  assert.ok(legals.includes('stat_boost:str'));
});

test('allocating stat points enhances attributes and Max HP/MP', () => {
  const s = createState(777);
  s.hero.statPoints = 1;
  const initStr = s.hero.str;
  const initMaxHp = s.hero.maxHp;

  step(s, 'stat_boost:str');

  assert.strictEqual(s.hero.str, initStr + 3);
  assert.strictEqual(s.hero.maxHp, initMaxHp + 10);
  assert.strictEqual(s.hero.statPoints, 0);
});

test('slaying final boss Abyssal Dragon achieves epic victory', () => {
  const s = createState(888);
  s.zoneIndex = 4; // Final zone (Throne of Chaos)
  s.hero.str = 40; // High level endgame hero
  s.enemy = { name: 'Abyssal Dragon', hp: 20, maxHp: 200, atk: 35, def: 10, xp: 300, gold: 150 };

  step(s, 'attack');

  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'player');
  assert.ok(score(s) > 400);
});

test('hero HP depletion causes defeat', () => {
  const s = createState(999);
  s.hero.hp = 2;

  step(s, 'defend'); // Enemy strikes for >= 2 dmg, killing hero

  assert.strictEqual(s.hero.hp, 0);
  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'enemy');
});

test('same seed and sequence of roleplaying decisions yields deterministic state', () => {
  const s1 = createState(109000);
  const s2 = createState(109000);

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
