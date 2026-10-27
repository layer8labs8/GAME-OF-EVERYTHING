const test = require('node:test');
const assert = require('node:assert');
const { createState, legalActions, step, isOver, score } = require('./www/logic.js');

test('createState initializes novice hero, level 1, trial 1 enemy', () => {
  const s = createState(42);
  assert.strictEqual(s.hero.currentClass, 'novice');
  assert.strictEqual(s.hero.tier, 0);
  assert.strictEqual(s.hero.level, 1);
  assert.strictEqual(s.trial, 1);
  assert.strictEqual(s.enemy.name, 'Training Automaton');
  assert.strictEqual(s.done, false);
  assert.strictEqual(isOver(s), false);
  assert.strictEqual(score(s), 0);
});

test('attack damages enemy and triggers enemy retaliation', () => {
  const s = createState(101);
  const initialEnemyHp = s.enemy.hp;
  const initialHeroHp = s.hero.hp;

  step(s, 'attack');
  assert.ok(s.enemy.hp < initialEnemyHp);
  assert.ok(s.hero.hp < initialHeroHp);
  assert.ok(score(s) > 0);
});

test('defend restores MP and mitigates incoming attack', () => {
  const s = createState(102);
  s.hero.mp = 10;
  step(s, 'defend');
  assert.strictEqual(s.hero.mp, 18);
});

test('slaying trial 1 advances to trial 2, increases level, and awards JP', () => {
  const s = createState(103);
  s.enemy.hp = 1;

  step(s, 'attack');
  assert.strictEqual(s.trial, 2);
  assert.strictEqual(s.hero.level, 2);
  assert.ok(s.hero.jp >= 2);
  assert.strictEqual(s.enemy.name, 'Orc Marauder');
});

test('level 2 unlocks tier 1 class evolutions', () => {
  const s = createState(104);
  s.hero.level = 2;

  const actions = legalActions(s);
  assert.ok(actions.includes('evolve:warrior'));
  assert.ok(actions.includes('evolve:rogue'));
  assert.ok(actions.includes('evolve:mage'));
});

test('evolving to warrior boosts stats, increases tier, and unlocks warrior skills', () => {
  const s = createState(105);
  s.hero.level = 2;
  const initialAtk = s.hero.atk;

  step(s, 'evolve:warrior');
  assert.strictEqual(s.hero.currentClass, 'warrior');
  assert.strictEqual(s.hero.tier, 1);
  assert.ok(s.hero.atk > initialAtk);

  const actions = legalActions(s);
  assert.ok(actions.includes('learn:cleave'));
  assert.ok(actions.includes('learn:shield_wall'));
});

test('learning cleave consumes JP and allows casting skill:cleave', () => {
  const s = createState(106);
  s.hero.currentClass = 'warrior';
  s.hero.jp = 1;

  step(s, 'learn:cleave');
  assert.strictEqual(s.hero.skills.includes('cleave'), true);
  assert.strictEqual(s.hero.jp, 0);

  const actions = legalActions(s);
  assert.ok(actions.includes('skill:cleave'));

  const initialEhp = s.enemy.hp;
  step(s, 'skill:cleave');
  assert.ok(s.enemy.hp < initialEhp);
});

test('tier 2 evolution (Paladin) available at level 4 for warrior', () => {
  const s = createState(107);
  s.hero.currentClass = 'warrior';
  s.hero.tier = 1;
  s.hero.level = 4;

  const actions = legalActions(s);
  assert.ok(actions.includes('evolve:paladin'));

  step(s, 'evolve:paladin');
  assert.strictEqual(s.hero.currentClass, 'paladin');
  assert.strictEqual(s.hero.tier, 2);
});

test('slaying final trial 5 Grand Champion Ignis triggers victory', () => {
  const s = createState(201);
  s.trial = 5;
  s.enemy = { id: 5, name: 'Grand Champion Ignis', hp: 1, maxHp: 240, atk: 30, def: 0 };

  const res = step(s, 'attack');
  assert.strictEqual(res.done, true);
  assert.strictEqual(res.reward, 1.0);
  assert.strictEqual(s.victory, true);
  assert.strictEqual(isOver(s), true);
});

test('depleting HP triggers defeat', () => {
  const s = createState(301);
  s.hero.hp = 1;
  s.enemy.atk = 500;

  const res = step(s, 'attack');
  assert.strictEqual(res.done, true);
  assert.strictEqual(res.reward, 0.0);
  assert.strictEqual(s.victory, false);
  assert.strictEqual(isOver(s), true);
});

test('illegal action throws error without mutating state', () => {
  const s = createState(401);
  const serializedBefore = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'skill:meteor'); // Not learned yet
  }, /Illegal action/);

  assert.strictEqual(JSON.stringify(s), serializedBefore);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  const script = ['attack', 'defend', 'attack'];

  for (const act of script) {
    if (s1.done) break;
    step(s1, act);
    step(s2, act);
  }

  assert.strictEqual(JSON.stringify(s1), JSON.stringify(s2));
});
