const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TURNS,
  REGIONS,
  REGIONAL_SHRINES,
  WEAPONS
} = require('./www/logic.js');

test('createState initializes champion on the plateau with starting stats', () => {
  const state = createState(42);
  assert.equal(state.region, 'plateau');
  assert.equal(state.hp, 100);
  assert.equal(state.maxHp, 100);
  assert.equal(state.stamina, 100);
  assert.equal(state.spiritOrbs, 0);
  assert.equal(state.boss, null);
  assert.equal(state.done, false);
  assert.equal(state.victory, false);
});

test('travel:canyon moves champion and enables canyon interactions', () => {
  const state = createState(10);
  step(state, 'travel:canyon');
  assert.equal(state.region, 'canyon');
  const acts = legalActions(state);
  assert.equal(acts.includes('explore_shrine:shrine_flame'), true);
  assert.equal(acts.includes('action:brew_cold_elixir'), true);
});

test('action:activate_tower unlocks regional tower and fast travel', () => {
  const state = createState(10);
  step(state, 'travel:canyon');
  step(state, 'action:activate_tower');
  assert.equal(state.towers.canyon, true);

  step(state, 'travel:plateau');
  const acts = legalActions(state);
  assert.equal(acts.includes('fast_travel:canyon'), true);
});

test('explore_shrine clears trial and awards Spirit Orb', () => {
  const state = createState(10);
  step(state, 'explore_shrine:shrine_magnesis');
  assert.equal(state.shrinesCleared.shrine_magnesis, true);
  assert.equal(state.spiritOrbs, 1);
});

test('upgrade:health consumes 2 Spirit Orbs and expands maximum HP', () => {
  const state = createState(10);
  state.spiritOrbs = 2;
  step(state, 'upgrade:health');
  assert.equal(state.maxHp, 120);
  assert.equal(state.spiritOrbs, 0);
});

test('forage and cooking prepares restorative meals', () => {
  const state = createState(10);
  step(state, 'action:forage_gather');
  assert.equal(state.food, 4);

  step(state, 'action:cook_meal');
  assert.equal(state.food, 2);
  assert.equal(state.meals, 2);
});

test('action:draw_sunforged_blade requires >= 140 HP to claim', () => {
  const state = createState(10);
  state.region = 'forest';

  // Attempt with 100 HP fails
  step(state, 'action:draw_sunforged_blade');
  assert.equal(state.weaponTier, 0);

  // Upgrade to 140 HP and pull succeeds
  state.maxHp = 140;
  state.hp = 140;
  step(state, 'action:draw_sunforged_blade');
  assert.equal(state.weaponTier, 2);
});

test('challenge_boss at Peaks initiates battle with Zephyros', () => {
  const state = createState(10);
  state.region = 'peaks';
  step(state, 'action:challenge_boss');
  assert.notEqual(state.boss, null);
  assert.equal(state.boss.name, 'Zephyros the Storm Sovereign');
  assert.equal(legalActions(state).includes('combat:strike'), true);
});

test('combat:parry stuns boss and prevents immediate damage', () => {
  const state = createState(10);
  state.region = 'peaks';
  step(state, 'action:challenge_boss');
  const initialHp = state.hp;

  step(state, 'combat:parry');
  assert.equal(state.bossStunned, true);
  assert.equal(state.hp, initialHp);
});

test('slaying Zephyros achieves victory and saves Eldoria', () => {
  const state = createState(1);
  state.region = 'peaks';
  state.weaponTier = 2; // Sunforged Blade
  step(state, 'action:challenge_boss');
  state.boss.hp = 20;

  const res = step(state, 'combat:strike');
  assert.equal(state.victory, true);
  assert.equal(state.done, true);
  assert.equal(isOver(state), true);
  assert.equal(res.done, true);
  assert.equal(res.reward > 100, true);
});

test('depleting champion HP triggers defeat', () => {
  const state = createState(1);
  state.region = 'peaks';
  step(state, 'action:challenge_boss');
  state.hp = 5;

  const res = step(state, 'combat:strike');
  assert.equal(state.hp, 0);
  assert.equal(state.done, true);
  assert.equal(state.victory, false);
  assert.equal(res.reward < 0, true);
});

test('illegal action throws without mutating state', () => {
  const state = createState(1);
  const snap = JSON.stringify(state);
  assert.throws(() => {
    step(state, 'invalid:openworld:action');
  });
  assert.equal(JSON.stringify(state), snap);
});

test('same seed and actions produce strictly deterministic state', () => {
  const s1 = createState(404);
  const s2 = createState(404);

  step(s1, 'travel:forest');
  step(s2, 'travel:forest');
  step(s1, 'explore_shrine:shrine_cryonis');
  step(s2, 'explore_shrine:shrine_cryonis');

  assert.deepEqual(s1, s2);
});
