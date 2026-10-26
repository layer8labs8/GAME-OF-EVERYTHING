const test = require('node:test');
const assert = require('node:assert/strict');
const { createState, legalActions, step, isOver, score, CARDS } = require('./www/logic.js');

test('createState initializes hero with 45 HP, 3 energy, 4 hand cards, and enemy', () => {
  const s = createState(333);
  assert.equal(s.hero.hp, 45);
  assert.equal(s.hero.energy, 3);
  assert.equal(s.hero.hand.length, 4);
  assert.equal(s.encounter, 1);
  assert.ok(s.enemy.hp > 0);
  assert.equal(isOver(s), false);
});

test('playing Strike damages enemy and consumes 1 energy', () => {
  const s = createState(333);
  s.hero.hand = ['strike'];
  s.hero.energy = 3;
  const prevEnemyHp = s.enemy.hp;

  const res = step(s, { type: 'play', cardIndex: 0 });
  assert.equal(res.reward, 12);
  assert.equal(s.hero.energy, 2);
  assert.equal(s.enemy.hp, prevEnemyHp - 6);
  assert.equal(s.hero.hand.length, 0);
});

test('playing Defend adds block to hero', () => {
  const s = createState(333);
  s.hero.hand = ['defend'];
  s.hero.energy = 2;

  const res = step(s, { type: 'play', cardIndex: 0 });
  assert.equal(res.reward, 5);
  assert.equal(s.hero.block, 5);
  assert.equal(s.hero.energy, 1);
});

test('playing Heal restores HP capped at maxHp', () => {
  const s = createState(333);
  s.hero.hp = 30;
  s.hero.hand = ['heal'];
  s.hero.energy = 1;

  const res = step(s, { type: 'play', cardIndex: 0 });
  assert.equal(res.reward, 14);
  assert.equal(s.hero.hp, 37);
});

test('block absorbs enemy attack damage', () => {
  const s = createState(333);
  s.hero.hp = 40;
  s.hero.block = 6;
  s.enemy.intent = { type: 'attack', value: 8 };

  step(s, { type: 'end_turn' });
  // Attack 8 vs Block 6 -> Block absorbs 6, 2 damage to HP -> HP = 38
  assert.equal(s.hero.hp, 38);
});

test('end_turn discards hand, triggers enemy action, and draws new hand', () => {
  const s = createState(333);
  s.hero.energy = 0;

  step(s, { type: 'end_turn' });
  assert.equal(s.hero.energy, 3);
  assert.equal(s.hero.hand.length, 4);
});

test('defeating enemy advances encounter and adds drafted reward card', () => {
  const s = createState(333);
  s.enemy.hp = 4;
  s.hero.hand = ['strike'];
  s.hero.energy = 2;
  const prevDeckCount = s.hero.drawPile.length + s.hero.discardPile.length + s.hero.hand.length;

  step(s, { type: 'play', cardIndex: 0 });
  assert.equal(s.encounter, 2);
  assert.equal(s.enemy.name, 'Dark Cultist');
  const newDeckCount = s.hero.drawPile.length + s.hero.discardPile.length + s.hero.hand.length;
  assert.ok(newDeckCount > prevDeckCount); // Drafted reward card added
});

test('defeating boss in encounter 3 wins the run', () => {
  const s = createState(333);
  s.encounter = 3;
  s.enemy.hp = 4;
  s.hero.hand = ['strike'];
  s.hero.energy = 1;

  const res = step(s, { type: 'play', cardIndex: 0 });
  assert.equal(res.done, true);
  assert.equal(s.won, true);
  assert.ok(score(s) >= 1000);
});

test('playing card with insufficient energy throws without mutating state', () => {
  const s = createState(333);
  s.hero.energy = 0;
  s.hero.hand = ['strike'];
  const snapshot = JSON.stringify(s);

  assert.throws(() => {
    step(s, { type: 'play', cardIndex: 0 });
  });

  assert.equal(JSON.stringify(s), snapshot);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(9911);
  const s2 = createState(9911);

  for (let i = 0; i < 20; i++) {
    const a1 = legalActions(s1);
    const a2 = legalActions(s2);
    assert.deepEqual(a1, a2);
    if (a1.length === 0) break;

    const chosen = a1[i % a1.length];
    step(s1, chosen);
    step(s2, chosen);
    assert.deepEqual(s1, s2);
  }
});
