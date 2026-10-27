const test = require('node:test');
const assert = require('node:assert');
const { createState, legalActions, step, isOver, score } = require('./www/logic.js');

test('createState initializes hero with statPoints, default trait/weapon, and trial 1', () => {
  const s = createState(42);
  assert.strictEqual(s.trial, 1);
  assert.strictEqual(s.hero.statPoints, 8);
  assert.strictEqual(s.hero.str, 5);
  assert.strictEqual(s.hero.trait, 'ironborn');
  assert.strictEqual(s.enemy.name, 'Stone Sentinel');
  assert.strictEqual(s.done, false);
  assert.strictEqual(isOver(s), false);
  assert.strictEqual(score(s), 0);
});

test('allocating STR increases attack and defense while consuming 1 statPoint', () => {
  const s = createState(101);
  const initialAtk = s.hero.atk;
  const initialDef = s.hero.def;

  step(s, 'allocate:str');
  assert.strictEqual(s.hero.str, 6);
  assert.strictEqual(s.hero.statPoints, 7);
  assert.ok(s.hero.atk > initialAtk);
  assert.ok(s.hero.def >= initialDef);
});

test('switching trait to shadowblade increases critChance', () => {
  const s = createState(102);
  const initialCrit = s.hero.critChance;

  step(s, 'choose_trait:shadowblade');
  assert.strictEqual(s.hero.trait, 'shadowblade');
  assert.ok(s.hero.critChance > initialCrit);
});

test('switching weapon to staff increases spellAtk', () => {
  const s = createState(103);
  const initialSpellAtk = s.hero.spellAtk;

  step(s, 'choose_weapon:staff');
  assert.strictEqual(s.hero.weapon, 'staff');
  assert.ok(s.hero.spellAtk > initialSpellAtk);
});

test('attack damages enemy and triggers retaliation', () => {
  const s = createState(104);
  const initialEhp = s.enemy.hp;
  const initialHhp = s.hero.hp;

  step(s, 'attack');
  assert.ok(s.enemy.hp < initialEhp);
  assert.ok(s.hero.hp <= initialHhp);
  assert.ok(score(s) > 0);
});

test('spell consumes 15 MP and deals high magic damage', () => {
  const s = createState(105);
  const initialEhp = s.enemy.hp;
  const initialMp = s.hero.mp;

  step(s, 'spell');
  assert.ok(s.enemy.hp < initialEhp);
  assert.strictEqual(s.hero.mp, initialMp - 15);
});

test('slaying trial 1 advances to trial 2, heals to full, and awards +3 stat points', () => {
  const s = createState(106);
  s.enemy.hp = 1;

  step(s, 'attack');
  assert.strictEqual(s.trial, 2);
  assert.strictEqual(s.enemy.name, 'Phantom Skirmisher');
  assert.strictEqual(s.hero.hp, s.hero.maxHp);
  assert.strictEqual(s.hero.statPoints, 11); // 8 + 3
});

test('slaying final trial 4 Mirror Doppelgänger awards victory and 1.0 reward', () => {
  const s = createState(201);
  s.trial = 4;
  s.enemy = { id: 4, name: 'Mirror Doppelgänger', hp: 1, maxHp: 180, atk: 35, def: 0 };

  const res = step(s, 'attack');
  assert.strictEqual(res.done, true);
  assert.strictEqual(res.reward, 1.0);
  assert.strictEqual(s.victory, true);
  assert.strictEqual(isOver(s), true);
});

test('depleting HP triggers defeat and 0.0 reward', () => {
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
    step(s, 'allocate:invalid_stat');
  }, /Illegal action/);

  assert.strictEqual(JSON.stringify(s), serializedBefore);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  const script = ['allocate:str', 'choose_trait:shadowblade', 'attack'];

  for (const act of script) {
    if (s1.done) break;
    step(s1, act);
    step(s2, act);
  }

  assert.strictEqual(JSON.stringify(s1), JSON.stringify(s2));
});
