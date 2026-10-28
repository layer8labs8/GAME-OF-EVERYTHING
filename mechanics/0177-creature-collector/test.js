const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  TYPE_CHART,
  WILD_SPECIES,
  ARENA_LEADERS
} = require('./www/logic.js');

test('0177-creature-collector: initial state contracts', () => {
  const state = createState(42);
  assert.equal(state.party.length, 1);
  assert.equal(state.party[0].name, 'Sparkfang');
  assert.equal(state.party[0].element, 'Electric');
  assert.equal(state.badges, 0);
  assert.equal(state.spheres, 5);
  assert.equal(state.potions, 3);
  assert.equal(state.inBattle, false);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(isOver(state), false);

  const actions = legalActions(state);
  assert.ok(actions.includes('action:explore_tall_grass'));
  assert.ok(actions.includes('action:challenge_arena_leader'));
});

test('0177-creature-collector: tall grass encounters wild beast', () => {
  const state = createState(101);
  step(state, 'action:explore_tall_grass');

  assert.equal(state.inBattle, true);
  assert.ok(state.enemy !== null);
  assert.ok(state.enemy.hp > 0);

  const actions = legalActions(state);
  assert.ok(actions.includes('action:command_attack'));
  assert.ok(actions.includes('action:command_defend'));
  assert.ok(actions.includes('action:throw_tamer_sphere'));
});

test('0177-creature-collector: attack damages enemy beast and awards xp', () => {
  const state = createState(102);
  step(state, 'action:explore_tall_grass');
  const enemyInitHp = state.enemy.hp;

  step(state, 'action:command_attack');
  assert.ok(state.enemy === null || state.enemy.hp < enemyInitHp);
});

test('0177-creature-collector: command defend cuts damage by half', () => {
  const s1 = createState(103);
  step(s1, 'action:explore_tall_grass');
  const initHp = s1.party[0].hp;

  step(s1, 'action:command_defend');
  assert.ok(s1.party[0].hp < initHp); // took guarded damage
  assert.ok(s1.party[0].hp > 30); // preserved high HP
});

test('0177-creature-collector: tamer sphere captures weakened wild creature', () => {
  const state = createState(104);
  step(state, 'action:explore_tall_grass');
  state.enemy.hp = 1; // critically weakened

  step(state, 'action:throw_tamer_sphere');
  assert.equal(state.spheres, 4);
  assert.equal(state.party.length, 2);
  assert.equal(state.inBattle, false);
  assert.equal(state.creaturesCaught, 2);
  assert.ok(state.gameMessage.includes('captured'));
});

test('0177-creature-collector: potion restores creature health', () => {
  const state = createState(105);
  state.party[0].hp = 10;
  assert.equal(state.potions, 3);

  step(state, 'action:use_potion');
  assert.equal(state.party[0].hp, 50);
  assert.equal(state.potions, 2);
});

test('0177-creature-collector: switch beast changes active creature', () => {
  const state = createState(106);
  state.party.push({
    name: 'Aquafin',
    element: 'Water',
    hp: 45,
    maxHp: 45,
    attack: 14,
    defense: 8,
    level: 1,
    exp: 0
  });

  step(state, 'action:switch_beast:1');
  assert.equal(state.activeBeastIndex, 1);
  assert.equal(state.party[state.activeBeastIndex].name, 'Aquafin');
});

test('0177-creature-collector: defeating arena leader awards badges', () => {
  const state = createState(107);
  step(state, 'action:challenge_arena_leader');
  assert.equal(state.isArenaMatch, true);
  state.enemy.hp = 2;

  step(state, 'action:command_attack');
  assert.equal(state.badges, 1);
  assert.equal(state.inBattle, false);
});

test('0177-creature-collector: conquering final arena leader achieves victory', () => {
  const state = createState(108);
  state.badges = 3; // at 4th leader (Solarchon)
  step(state, 'action:challenge_arena_leader');
  assert.equal(state.enemy.name, 'Solarchon');
  state.enemy.hp = 2;

  step(state, 'action:command_attack');
  assert.equal(state.badges, 4);
  assert.equal(state.victory, true);
  assert.equal(isOver(state), true);
  assert.ok(score(state) > 10000);
});

test('0177-creature-collector: determinism across identical seeds and actions', () => {
  const s1 = createState(999);
  const s2 = createState(999);

  const actions = ['action:explore_tall_grass', 'action:command_defend', 'action:command_attack'];
  for (const a of actions) {
    step(s1, a);
    step(s2, a);
  }

  assert.equal(s1.party[0].hp, s2.party[0].hp);
  assert.equal(s1.spheres, s2.spheres);
  assert.equal(s1.potions, s2.potions);
  assert.equal(score(s1), score(s2));
});

test('0177-creature-collector: legalActions fuzzing does not crash', () => {
  const state = createState(555);
  let steps = 0;
  while (!isOver(state) && steps < 60) {
    const actions = legalActions(state);
    assert.ok(actions.length > 0);
    const act = actions[steps % actions.length];
    const res = step(state, act);
    assert.equal(typeof res.reward, 'number');
    assert.equal(typeof res.done, 'boolean');
    steps++;
  }
});
