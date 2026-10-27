const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TURNS
} = require('./www/logic.js');

test('createState initializes hero at start passage with initial stats and provisions', () => {
  const state = createState(42);
  assert.equal(state.passageId, 'start');
  assert.equal(state.stamina, 24);
  assert.equal(state.maxStamina, 24);
  assert.equal(state.skill, 10);
  assert.equal(state.luck, 10);
  assert.equal(state.provisions, 3);
  assert.equal(state.inventory.length, 0);
  assert.equal(state.enemy, null);
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
});

test('choice:search_watchtower and choice:loot_chest awards brass_key', () => {
  const state = createState(10);
  step(state, 'choice:search_watchtower');
  assert.equal(state.passageId, 'watchtower');

  step(state, 'choice:loot_chest');
  assert.equal(state.chestLooted, true);
  assert.equal(state.inventory.includes('brass_key'), true);
});

test('choice:scale_battlement and choice:leap_courtyard moves to courtyard', () => {
  const state = createState(10);
  step(state, 'choice:scale_battlement');
  assert.equal(state.passageId, 'battlement');

  const initialStamina = state.stamina;
  step(state, 'choice:leap_courtyard');
  assert.equal(state.passageId, 'courtyard');
  assert.equal(state.stamina, initialStamina - 3);
});

test('action:eat_ration restores stamina and expends a provision', () => {
  const state = createState(10);
  state.stamina = 12;
  const initialProvs = state.provisions;

  step(state, 'action:eat_ration');
  assert.equal(state.stamina, 18);
  assert.equal(state.provisions, initialProvs - 1);
});

test('choice:enter_portcullis and choice:fight_imps initiates combat', () => {
  const state = createState(77);
  step(state, 'choice:enter_portcullis');
  assert.equal(state.passageId, 'portcullis');

  step(state, 'choice:fight_imps');
  assert.notEqual(state.enemy, null);
  assert.equal(state.enemy.name, 'Shadow Imps');
  assert.equal(legalActions(state).includes('fight:strike'), true);
});

test('fight:strike executes dice-driven combat rounds', () => {
  const state = createState(77);
  step(state, 'choice:enter_portcullis');
  step(state, 'choice:fight_imps');
  const enemyInitHp = state.enemy.hp;
  const playerInitStamina = state.stamina;

  step(state, 'fight:strike');
  assert.equal(
    state.enemy === null || state.enemy.hp < enemyInitHp || state.stamina < playerInitStamina,
    true
  );
});

test('fight:test_luck consumes 1 luck point and applies test of fortune', () => {
  const state = createState(100);
  step(state, 'choice:enter_portcullis');
  step(state, 'choice:fight_imps');
  const initialLuck = state.luck;

  step(state, 'fight:test_luck');
  assert.equal(state.luck, initialLuck - 1);
});

test('choice:enter_garden and choice:drink_fountain restores stamina and luck', () => {
  const state = createState(10);
  state.passageId = 'courtyard';
  state.stamina = 10;
  state.luck = 8;

  step(state, 'choice:enter_garden');
  step(state, 'choice:drink_fountain');
  assert.equal(state.stamina, 18);
  assert.equal(state.luck, 9);
  assert.equal(state.fountainDrunk, true);
});

test('harvesting moon_orchid enables instant banishment of spectral wraith', () => {
  const state = createState(10);
  state.passageId = 'garden';
  step(state, 'choice:harvest_orchid');
  assert.equal(state.inventory.includes('moon_orchid'), true);

  state.passageId = 'crypt';
  assert.equal(legalActions(state).includes('choice:banish_wraith'), true);

  step(state, 'choice:banish_wraith');
  assert.equal(state.passageId, 'crypt_cleared');
  assert.equal(state.inventory.includes('silver_runestone'), true);
});

test('possessing brass_key and silver_runestone unlocks the Great Hall portal', () => {
  const state = createState(10);
  state.passageId = 'great_hall';
  state.inventory = ['brass_key', 'silver_runestone'];

  assert.equal(legalActions(state).includes('choice:unlock_doors'), true);
  step(state, 'choice:unlock_doors');
  assert.equal(state.passageId, 'sanctuary');
});

test('slaying the Iron Colossus achieves victory and concludes the adventure', () => {
  const state = createState(1);
  state.passageId = 'sanctuary';
  state.enemy = {
    id: 'iron_colossus',
    name: 'Iron Colossus',
    hp: 2,
    maxHp: 38,
    skill: 1,
    dmg: 1,
    isBoss: true
  };
  state.skill = 20;

  const res = step(state, 'fight:strike');
  assert.equal(state.victory, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.equal(res.done, true);
  assert.equal(res.reward > 100, true);
});

test('depleting hero stamina triggers defeat', () => {
  const state = createState(1);
  state.passageId = 'portcullis';
  state.stamina = 2;
  state.enemy = {
    id: 'shadow_imps',
    name: 'Shadow Imps',
    hp: 50,
    skill: 20,
    dmg: 10,
    isBoss: false
  };

  const res = step(state, 'fight:strike');
  assert.equal(state.stamina, 0);
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
  assert.equal(state.passageId, 'defeat_fallen');
  assert.equal(res.reward < 0, true);
});

test('illegal action throws without mutating state', () => {
  const state = createState(1);
  const snap = JSON.stringify(state);
  assert.throws(() => {
    step(state, 'invalid:action:xyz');
  });
  assert.equal(JSON.stringify(state), snap);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  step(s1, 'choice:scale_battlement');
  step(s2, 'choice:scale_battlement');
  step(s1, 'choice:leap_courtyard');
  step(s2, 'choice:leap_courtyard');

  assert.deepEqual(s1, s2);
});
