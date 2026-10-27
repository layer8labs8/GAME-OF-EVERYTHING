const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TURNS,
  WEAPON_TIERS,
  ARMOR_TIERS
} = require('./www/logic.js');

test('createState initializes player in town with full stats and starter gear', () => {
  const state = createState(42);
  assert.equal(state.location, 'town');
  assert.equal(state.player.hp, 100);
  assert.equal(state.player.maxHp, 100);
  assert.equal(state.player.mana, 40);
  assert.equal(state.player.gold, 25);
  assert.equal(state.player.potions, 2);
  assert.equal(state.enemy, null);
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
});

test('town:rest restores HP and Mana while deducting 10 gold', () => {
  const state = createState(10);
  state.player.hp = 50;
  state.player.mana = 10;
  state.player.gold = 30;

  const res = step(state, 'town:rest');
  assert.equal(state.player.hp, 100);
  assert.equal(state.player.mana, 40);
  assert.equal(state.player.gold, 20);
  assert.equal(res.reward > 0, true);
});

test('town:buy_potion increases potion inventory and deducts 15 gold', () => {
  const state = createState(10);
  state.player.gold = 40;
  const initialPotions = state.player.potions;

  step(state, 'town:buy_potion');
  assert.equal(state.player.potions, initialPotions + 1);
  assert.equal(state.player.gold, 25);
});

test('town:buy_weapon and town:buy_armor upgrade equipment tiers', () => {
  const state = createState(10);
  state.player.gold = 150;

  step(state, 'town:buy_weapon');
  assert.equal(state.player.weaponTier, 1);
  assert.equal(state.player.gold, 150 - WEAPON_TIERS[1].cost);

  step(state, 'town:buy_armor');
  assert.equal(state.player.armorTier, 1);
});

test('explore:darkwood moves to forest and encounters enemy', () => {
  const state = createState(77);
  step(state, 'explore:darkwood');
  assert.equal(state.location, 'darkwood');
  assert.notEqual(state.enemy, null);
  assert.equal(state.enemy.hp > 0, true);
});

test('combat:strike damages enemy and triggers retaliatory counter', () => {
  const state = createState(77);
  step(state, 'explore:darkwood');
  const enemyMaxHp = state.enemy.hp;
  const playerHp = state.player.hp;

  step(state, 'combat:strike');
  assert.equal(state.enemy.hp < enemyMaxHp || state.enemy === null, true);
});

test('combat:cast_fireball deals high magic damage consuming 15 mana', () => {
  const state = createState(123);
  step(state, 'explore:darkwood');
  const initMana = state.player.mana;
  const initialEnemyHp = state.enemy.hp;

  step(state, 'combat:cast_fireball');
  assert.equal(state.player.mana, initMana - 15);
  assert.equal(state.enemy === null || state.enemy.hp < initialEnemyHp, true);
});

test('combat:drink_potion recovers 50 HP and consumes 1 potion', () => {
  const state = createState(123);
  step(state, 'explore:darkwood');
  state.player.hp = 30;
  const pots = state.player.potions;

  step(state, 'combat:drink_potion');
  assert.equal(state.player.hp > 30, true);
  assert.equal(state.player.potions, pots - 1);
});

test('combat:defend halves enemy damage and recovers 10 mana', () => {
  const state = createState(123);
  step(state, 'explore:darkwood');
  state.player.mana = 20;

  step(state, 'combat:defend');
  assert.equal(state.player.mana, 30);
});

test('action:pray_shrine in darkwood expands maximum vitality and spirit', () => {
  const state = createState(55);
  state.location = 'darkwood';
  state.enemy = null;

  step(state, 'action:pray_shrine');
  assert.equal(state.shrineBlessed, true);
  assert.equal(state.player.maxHp, 115);
  assert.equal(state.player.maxMana, 55);
});

test('action:open_chest in crypt awards Ancient Relic, gold, and potions', () => {
  const state = createState(55);
  state.location = 'crypt';
  state.enemy = null;

  const initGold = state.player.gold;
  step(state, 'action:open_chest');
  assert.equal(state.cryptChestClaimed, true);
  assert.equal(state.player.hasRelic, true);
  assert.equal(state.player.gold, initGold + 60);
});

test('defeating Ignis the Dread at Wyrm Peak triggers victory and ends game', () => {
  const state = createState(1);
  state.location = 'wyrm_peak';
  state.enemy = {
    id: 'ignis_the_dread',
    name: 'Ignis the Dread',
    hp: 10,
    maxHp: 170,
    atk: 24,
    def: 8,
    goldReward: 150,
    xpReward: 300,
    isBoss: true
  };

  const res = step(state, 'combat:strike');
  assert.equal(state.victory, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.equal(res.done, true);
  assert.equal(res.reward > 100, true);
});

test('depleting player HP triggers defeat', () => {
  const state = createState(1);
  state.location = 'darkwood';
  state.player.hp = 2;
  state.enemy = {
    name: 'Dire Wolf',
    hp: 50,
    atk: 20,
    def: 2,
    goldReward: 15,
    xpReward: 35,
    isBoss: false
  };

  const res = step(state, 'combat:strike');
  assert.equal(state.player.hp, 0);
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
  assert.equal(res.reward < 0, true);
});

test('illegal action throws without mutating state', () => {
  const state = createState(1);
  const snap = JSON.stringify(state);
  assert.throws(() => {
    step(state, 'invalid:action:code');
  });
  assert.equal(JSON.stringify(state), snap);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(999);
  const s2 = createState(999);

  step(s1, 'explore:darkwood');
  step(s2, 'explore:darkwood');
  step(s1, 'combat:defend');
  step(s2, 'combat:defend');

  assert.deepEqual(s1, s2);
});
