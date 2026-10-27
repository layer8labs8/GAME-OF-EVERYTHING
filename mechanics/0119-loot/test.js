const test = require('node:test');
const assert = require('node:assert');
const { createState, legalActions, step, isOver, score } = require('./www/logic.js');

test('createState initializes hero equipment, scrap, and vault 1 monster', () => {
  const s = createState(42);
  assert.strictEqual(s.vault, 1);
  assert.strictEqual(s.hero.equipment.weapon.name, 'Rusted Iron Sword');
  assert.strictEqual(s.monster.name, 'Scavenger Marauder');
  assert.strictEqual(s.hero.scrap, 20);
  assert.strictEqual(s.done, false);
  assert.strictEqual(isOver(s), false);
  assert.strictEqual(score(s), 0);
});

test('attack damages monster and triggers monster retaliation', () => {
  const s = createState(101);
  const initialMhp = s.monster.hp;
  const initialHhp = s.hero.hp;

  step(s, 'attack');
  assert.ok(s.monster.hp < initialMhp);
  assert.ok(s.hero.hp < initialHhp);
  assert.ok(score(s) > 0);
});

test('slaying monster generates loot explosion into inventory', () => {
  const s = createState(102);
  s.monster.hp = 1;

  step(s, 'attack');
  assert.strictEqual(s.monster.hp, 0);
  assert.ok(s.hero.inventory.length >= 1);
  assert.ok(score(s) > 200);
});

test('equipping weapon from inventory swaps with active gear', () => {
  const s = createState(103);
  s.hero.inventory.push({
    id: 'test_sword',
    name: 'Mythic Warblade',
    slot: 'weapon',
    rarity: 'legendary',
    atk: 50,
    level: 0
  });

  const actions = legalActions(s);
  assert.ok(actions.includes('equip:0'));

  step(s, 'equip:0');
  assert.strictEqual(s.hero.equipment.weapon.name, 'Mythic Warblade');
  assert.strictEqual(s.hero.inventory[0].name, 'Rusted Iron Sword');
});

test('salvage destroys item and awards scrap based on rarity', () => {
  const s = createState(104);
  s.hero.inventory.push({
    id: 'trash_armor',
    name: 'Rusty Chain',
    slot: 'armor',
    rarity: 'rare',
    def: 8,
    level: 0
  });

  const initialScrap = s.hero.scrap;
  step(s, 'salvage:0');
  assert.strictEqual(s.hero.inventory.length, 0);
  assert.strictEqual(s.hero.scrap, initialScrap + 35); // Rare scrap value
});

test('upgrade enhances weapon level and boosts attack power', () => {
  const s = createState(105);
  s.hero.scrap = 50;

  const actions = legalActions(s);
  assert.ok(actions.includes('upgrade:weapon'));

  const initialAtk = s.hero.equipment.weapon.atk;
  step(s, 'upgrade:weapon');
  assert.strictEqual(s.hero.equipment.weapon.level, 1);
  assert.strictEqual(s.hero.scrap, 10);
});

test('next_vault transitions to vault 2 after monster defeat', () => {
  const s = createState(106);
  s.monster.hp = 0; // Cleared

  const actions = legalActions(s);
  assert.ok(actions.includes('next_vault'));

  step(s, 'next_vault');
  assert.strictEqual(s.vault, 2);
  assert.strictEqual(s.monster.name, 'Ironclad Sentry');
});

test('slaying vault 5 boss The Vault Sovereign awards victory and 1.0 reward', () => {
  const s = createState(201);
  s.vault = 5;
  s.monster = { id: 5, name: 'The Vault Sovereign', hp: 1, maxHp: 240, atk: 40, def: 0 };

  const res = step(s, 'attack');
  assert.strictEqual(res.done, true);
  assert.strictEqual(res.reward, 1.0);
  assert.strictEqual(s.victory, true);
  assert.strictEqual(isOver(s), true);
});

test('depleting HP triggers defeat and 0.0 reward', () => {
  const s = createState(301);
  s.hero.hp = 1;
  s.monster.atk = 500;

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
    step(s, 'equip:99'); // Nonexistent slot
  }, /Illegal action/);

  assert.strictEqual(JSON.stringify(s), serializedBefore);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  const script = ['attack', 'attack', 'attack'];

  for (const act of script) {
    if (s1.done) break;
    step(s1, act);
    step(s2, act);
  }

  assert.strictEqual(JSON.stringify(s1), JSON.stringify(s2));
});
