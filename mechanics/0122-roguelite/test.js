const test = require('node:test');
const assert = require('node:assert');
const { createState, legalActions, step, isOver, score } = require('./www/logic.js');

test('createState initializes in sanctuary with essence and upgrades', () => {
  const s = createState(42);
  assert.strictEqual(s.location, 'sanctuary');
  assert.strictEqual(s.essence, 30);
  assert.strictEqual(s.upgrades.vitality, 0);
  assert.strictEqual(s.done, false);
  assert.strictEqual(isOver(s), false);
  assert.strictEqual(score(s), 0);
});

test('upgrading vitality permanently increases hero maxHp', () => {
  const s = createState(101);
  const actions = legalActions(s);
  assert.ok(actions.includes('upgrade:vitality'));

  step(s, 'upgrade:vitality');
  assert.strictEqual(s.upgrades.vitality, 1);
  assert.strictEqual(s.essence, 5); // 30 - 25

  step(s, 'start_run');
  assert.strictEqual(s.location, 'run');
  assert.strictEqual(s.hero.maxHp, 100); // 80 + 20
  assert.strictEqual(s.hero.hp, 100);
});

test('attack damages monster and triggers counter-attack', () => {
  const s = createState(102);
  step(s, 'start_run');

  const initialMhp = s.monster.hp;
  const initialHhp = s.hero.hp;

  step(s, 'attack');
  assert.ok(s.monster.hp < initialMhp);
  assert.ok(s.hero.hp < initialHhp);
  assert.ok(score(s) > 0);
});

test('slaying monster awards essence and triggers boon selection', () => {
  const s = createState(103);
  step(s, 'start_run');
  s.monster.hp = 1;

  const initialEssence = s.essence;
  step(s, 'attack');

  assert.strictEqual(s.monster.hp, 0);
  assert.ok(s.essence > initialEssence);
  assert.strictEqual(s.boonPending, true);

  const actions = legalActions(s);
  assert.ok(actions.includes('choose_boon:flame'));
  assert.ok(actions.includes('choose_boon:lightning'));
  assert.ok(actions.includes('choose_boon:frost'));
});

test('choosing boon adds buff and unlocks next_chamber', () => {
  const s = createState(104);
  step(s, 'start_run');
  s.monster.hp = 0;
  s.boonPending = true;

  step(s, 'choose_boon:flame');
  assert.strictEqual(s.hero.boons.includes('flame'), true);
  assert.strictEqual(s.boonPending, false);

  const actions = legalActions(s);
  assert.ok(actions.includes('next_chamber'));

  step(s, 'next_chamber');
  assert.strictEqual(s.chamber, 2);
  assert.strictEqual(s.monster.name, 'Tartarus Phalanx');
});

test('death defiance revives hero at 50% HP upon fatal blow', () => {
  const s = createState(105);
  s.essence = 100;
  step(s, 'upgrade:defiance'); // +1 death defiance
  step(s, 'start_run');

  assert.strictEqual(s.hero.defianceCharges, 1);
  s.hero.hp = 1;
  s.monster.atk = 500; // Lethal blow

  step(s, 'attack');
  assert.strictEqual(s.hero.defianceCharges, 0);
  assert.strictEqual(s.hero.hp, 40); // 50% of 80
  assert.strictEqual(s.location, 'run'); // Stay in run
});

test('perishing without defiance returns to sanctuary retaining essence', () => {
  const s = createState(106);
  step(s, 'start_run');
  s.essence = 55;
  s.hero.hp = 1;
  s.monster.atk = 500;

  step(s, 'attack');
  assert.strictEqual(s.location, 'sanctuary'); // Back to hub
  assert.strictEqual(s.essence, 55); // Essence preserved!
});

test('defeating Underworld Warden in chamber 4 triggers victory', () => {
  const s = createState(201);
  step(s, 'start_run');
  s.chamber = 4;
  s.monster = { id: 4, name: 'The Underworld Warden', hp: 1, maxHp: 175, atk: 34, def: 0, essence: 100 };

  const res = step(s, 'attack');
  assert.strictEqual(res.done, true);
  assert.strictEqual(res.reward, 1.0);
  assert.strictEqual(s.victory, true);
  assert.strictEqual(isOver(s), true);
});

test('illegal action throws error without mutating state', () => {
  const s = createState(401);
  const serializedBefore = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'attack'); // Illegal in sanctuary before start_run
  }, /Illegal action/);

  assert.strictEqual(JSON.stringify(s), serializedBefore);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(999);
  const s2 = createState(999);

  const script = ['upgrade:vitality', 'start_run', 'attack'];

  for (const act of script) {
    if (s1.done) break;
    step(s1, act);
    step(s2, act);
  }

  assert.strictEqual(JSON.stringify(s1), JSON.stringify(s2));
});
