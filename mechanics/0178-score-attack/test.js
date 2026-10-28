const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  PLATINUM_THRESHOLD,
  GOLD_THRESHOLD
} = require('./www/logic.js');

test('0178-score-attack: initial state contracts', () => {
  const state = createState(42);
  assert.equal(state.points, 0);
  assert.equal(state.combo, 0);
  assert.equal(state.comboMultiplier, 1);
  assert.equal(state.shield, 3);
  assert.equal(state.slots.length, 4);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(isOver(state), false);

  const actions = legalActions(state);
  assert.ok(actions.includes('action:blast_target:0'));
  assert.ok(actions.includes('action:blast_target:1'));
  assert.ok(actions.includes('action:blast_target:2'));
  assert.ok(actions.includes('action:blast_target:3'));
  assert.ok(actions.includes('action:refresh_targets'));
});

test('0178-score-attack: blasting gems increases points and combo', () => {
  const state = createState(101);
  state.slots[0] = { type: 'ruby', name: 'Ruby Gem', baseScore: 150 };

  step(state, 'action:blast_target:0');
  assert.ok(state.points >= 150);
  assert.equal(state.combo, 1);
  assert.equal(state.gemsCleared, 1);
});

test('0178-score-attack: combo multiplier scales with consecutive gem hits', () => {
  const state = createState(102);
  state.combo = 6;
  state.slots[1] = { type: 'emerald', name: 'Emerald Star', baseScore: 600 };

  step(state, 'action:blast_target:1');
  assert.equal(state.combo, 7);
  assert.ok(state.comboMultiplier >= 3);
});

test('0178-score-attack: blasting hazard skull damages shield and resets combo', () => {
  const state = createState(103);
  state.combo = 8;
  state.comboMultiplier = 3;
  state.points = 1000;
  state.slots[2] = { type: 'skull', name: 'Hazard Skull', baseScore: -400 };

  step(state, 'action:blast_target:2');
  assert.equal(state.shield, 2);
  assert.equal(state.combo, 0);
  assert.equal(state.comboMultiplier, 1);
  assert.equal(state.points, 600);
});

test('0178-score-attack: overdrive laser expends frenzy meter and sweeps matrix', () => {
  const state = createState(104);
  state.frenzyMeter = 60;
  const actions = legalActions(state);
  assert.ok(actions.includes('action:charge_overdrive_laser'));

  step(state, 'action:charge_overdrive_laser');
  assert.equal(state.frenzyMeter, 20);
  assert.ok(state.points > 0);
});

test('0178-score-attack: frenzy burst maxes multiplier and triggers frenzy mode', () => {
  const state = createState(105);
  state.frenzyMeter = 100;
  const actions = legalActions(state);
  assert.ok(actions.includes('action:trigger_frenzy_burst'));

  step(state, 'action:trigger_frenzy_burst');
  assert.equal(state.frenzyActive, 4); // 5 minus 1 step
  assert.equal(state.comboMultiplier, 10);
  assert.ok(state.points > 1000);
});

test('0178-score-attack: refresh targets scrambles slots', () => {
  const state = createState(106);
  step(state, 'action:refresh_targets');
  assert.equal(state.slots.length, 4);
});

test('0178-score-attack: shield collapse causes defeat', () => {
  const state = createState(107);
  state.shield = 1;
  state.slots[0] = { type: 'skull', name: 'Hazard Skull', baseScore: -400 };

  step(state, 'action:blast_target:0');
  assert.equal(state.shield, 0);
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
});

test('0178-score-attack: platinum threshold triggers victory', () => {
  const state = createState(108);
  state.points = PLATINUM_THRESHOLD - 50;
  state.slots[0] = { type: 'diamond', name: 'Diamond Crown', baseScore: 1200 };

  step(state, 'action:blast_target:0');
  assert.ok(state.points >= PLATINUM_THRESHOLD);
  assert.equal(state.victory, true);
  assert.equal(isOver(state), true);
  assert.ok(score(state) > PLATINUM_THRESHOLD);
});

test('0178-score-attack: determinism across identical seeds and actions', () => {
  const s1 = createState(999);
  const s2 = createState(999);

  const actions = ['action:blast_target:0', 'action:blast_target:1', 'action:refresh_targets'];
  for (const a of actions) {
    step(s1, a);
    step(s2, a);
  }

  assert.equal(s1.points, s2.points);
  assert.equal(s1.combo, s2.combo);
  assert.equal(s1.shield, s2.shield);
  assert.equal(score(s1), score(s2));
});

test('0178-score-attack: legalActions fuzzing does not crash', () => {
  const state = createState(444);
  let steps = 0;
  while (!isOver(state) && steps < 50) {
    const actions = legalActions(state);
    assert.ok(actions.length > 0);
    const act = actions[steps % actions.length];
    const res = step(state, act);
    assert.equal(typeof res.reward, 'number');
    assert.equal(typeof res.done, 'boolean');
    steps++;
  }
});
