const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  SECTOR_NAMES,
  SECTOR_KEYS
} = require('./www/logic.js');

test('0163-survival-horror: initial state contracts', () => {
  const state = createState(42);
  assert.equal(state.sector, 0);
  assert.equal(state.health, 100);
  assert.equal(state.sanity, 90);
  assert.equal(state.battery, 80);
  assert.equal(state.handgunRounds, 10);
  assert.equal(state.shotgunShells, 4);
  assert.equal(state.greenHerbs, 1);
  assert.equal(state.spareBatteries, 1);
  assert.equal(state.currentMonster, null);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(isOver(state), false);

  const actions = legalActions(state);
  assert.ok(actions.includes('action:rest_in_safe_room'));
  assert.ok(actions.includes('action:explore_chamber'));
});

test('0163-survival-horror: safe room rest restores sanity', () => {
  const state = createState(101);
  state.sanity = 40;
  const oldSanity = state.sanity;
  const res = step(state, 'action:rest_in_safe_room');
  assert.equal(state.sanity, oldSanity + 35);
  assert.equal(res.done, false);
  assert.ok(res.reward > 0);
});

test('0163-survival-horror: medical herbs and battery replacement', () => {
  const state = createState(202);
  state.health = 50;
  state.battery = 30;

  const actions1 = legalActions(state);
  assert.ok(actions1.includes('action:use_green_herb'));
  assert.ok(actions1.includes('action:recharge_flashlight'));

  step(state, 'action:use_green_herb');
  assert.equal(state.health, 85);
  assert.equal(state.greenHerbs, 0);

  step(state, 'action:recharge_flashlight');
  assert.equal(state.battery, 80);
  assert.equal(state.spareBatteries, 0);
});

test('0163-survival-horror: room exploration and combat encounters', () => {
  const state = createState(303);
  // First explore in sector 0 discovers Ward Keycard
  step(state, 'action:explore_chamber');
  assert.ok(state.keyItems.includes(SECTOR_KEYS[0]));

  // Now puzzle solving should be available if no monster
  if (state.currentMonster === null) {
    const actions = legalActions(state);
    assert.ok(actions.includes('action:solve_sector_puzzle'));
  }
});

test('0163-survival-horror: combat execution with shotgun and handgun', () => {
  const state = createState(404);
  state.currentMonster = {
    name: 'Acid Spitter Lurker',
    hp: 40,
    maxHp: 40,
    damage: 15
  };

  const actions = legalActions(state);
  assert.ok(actions.includes('action:shotgun_blast'));
  assert.ok(actions.includes('action:precision_handgun_shot'));
  assert.ok(actions.includes('action:dodge_evasion'));
  assert.ok(actions.includes('action:flee_combat'));

  // Shotgun deals 45 dmg, should defeat 40hp monster
  step(state, 'action:shotgun_blast');
  assert.equal(state.currentMonster, null);
  assert.equal(state.monstersSlain, 1);
});

test('0163-survival-horror: progression through all sectors to victory flare', () => {
  const state = createState(505);

  for (let sec = 0; sec <= 3; sec++) {
    state.sector = sec;
    state.currentMonster = null;
    const key = SECTOR_KEYS[sec];
    if (!state.keyItems.includes(key)) {
      state.keyItems.push(key);
    }
    step(state, 'action:solve_sector_puzzle');
    assert.equal(state.sectorPuzzlesSolved[sec], true);

    if (sec < 3) {
      step(state, `action:advance_to_sector:${sec + 1}`);
      assert.equal(state.sector, sec + 1);
    } else {
      const actions = legalActions(state);
      assert.ok(actions.includes('action:trigger_extraction_flare'));
      const res = step(state, 'action:trigger_extraction_flare');
      assert.equal(state.victory, true);
      assert.equal(res.done, true);
      assert.ok(score(state) >= 3000);
    }
  }
});

test('0163-survival-horror: defeat on health depletion', () => {
  const state = createState(606);
  state.health = 10;
  state.currentMonster = {
    name: 'Bio Abomination',
    hp: 100,
    maxHp: 100,
    damage: 25
  };

  step(state, 'action:precision_handgun_shot');
  assert.equal(state.health, 0);
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
});

test('0163-survival-horror: determinism on identical seed and actions', () => {
  const s1 = createState(777);
  const s2 = createState(777);

  const trace = [
    'action:explore_chamber',
    'action:rest_in_safe_room',
    'action:explore_chamber'
  ];

  for (const act of trace) {
    if (!isOver(s1) && legalActions(s1).includes(act)) {
      step(s1, act);
    }
    if (!isOver(s2) && legalActions(s2).includes(act)) {
      step(s2, act);
    }
  }

  assert.equal(s1.prngState, s2.prngState);
  assert.equal(s1.health, s2.health);
  assert.equal(s1.sanity, s2.sanity);
  assert.equal(s1.battery, s2.battery);
  assert.equal(score(s1), score(s2));
});

test('0163-survival-horror: bot contract fuzzing run to completion', () => {
  const state = createState(999);
  let stepCount = 0;

  while (!isOver(state) && stepCount < 200) {
    const actions = legalActions(state);
    assert.ok(actions.length > 0, 'Must have at least one legal action while game is active');
    // Choose first action deterministically
    const act = actions[stepCount % actions.length];
    step(state, act);
    stepCount++;
  }

  assert.ok(isOver(state));
  assert.ok(score(state) >= 0);
});
