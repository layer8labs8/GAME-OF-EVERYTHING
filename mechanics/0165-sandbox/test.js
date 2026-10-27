const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  ROWS,
  COLS,
  ELEMENT_TYPES,
  TARGET_COLS
} = require('./www/logic.js');

test('0165-sandbox: initial state contracts', () => {
  const state = createState(42);
  assert.equal(state.grid.length, ROWS);
  assert.equal(state.grid[0].length, COLS);
  assert.equal(state.turns, 0);
  assert.equal(state.elementsPlaced, 0);
  assert.equal(state.glassCreated, 0);
  assert.equal(state.plantsGrown, 0);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(isOver(state), false);

  // Bottom row should be stone bedrock
  for (let c = 0; c < COLS; c++) {
    assert.equal(state.grid[ROWS - 1][c], 'stone');
  }

  const actions = legalActions(state);
  assert.ok(actions.includes('action:place_element:sand:2'));
  assert.ok(actions.includes('action:place_element:water:5'));
  assert.ok(actions.includes('action:step_simulation'));
  assert.ok(actions.includes('action:trigger_lightning_strike'));
});

test('0165-sandbox: sand placement and gravity fall', () => {
  const state = createState(101);
  step(state, 'action:place_element:sand:2');
  assert.equal(state.elementsPlaced, 2);

  // Step simulation multiple times to allow sand to settle near bottom
  for (let i = 0; i < 10; i++) {
    step(state, 'action:step_simulation');
  }

  assert.equal(state.grid[ROWS - 2][2], 'sand');
});

test('0165-sandbox: silica kiln reaction - sand transformed to glass by fire', () => {
  const state = createState(202);
  // Put sand at row 10, col 2
  state.grid[ROWS - 2][2] = 'sand';
  // Put fire directly above it
  state.grid[ROWS - 3][2] = 'fire';

  step(state, 'action:step_simulation');
  assert.equal(state.grid[ROWS - 2][2], 'glass');
  assert.ok(state.glassCreated >= 1);
});

test('0165-sandbox: plant irrigation and growth', () => {
  const state = createState(303);
  state.grid[ROWS - 2][5] = 'plant';
  state.grid[ROWS - 2][6] = 'water';

  step(state, 'action:step_simulation');
  assert.ok(state.plantsGrown >= 1);
});

test('0165-sandbox: dynamite detonation via lightning or fire', () => {
  const state = createState(404);
  const midC = Math.floor(COLS / 2);
  state.grid[ROWS - 2][midC] = 'dynamite';

  step(state, 'action:trigger_lightning_strike');
  assert.ok(state.explosionsDetonated >= 1);
});

test('0165-sandbox: electrical arcs and lightning strikes', () => {
  const state = createState(505);
  for (let i = 0; i < 5; i++) {
    step(state, 'action:trigger_lightning_strike');
  }
  assert.equal(state.electricalArcs, 5);
  assert.equal(state.milestones.arcConduction, true);
});

test('0165-sandbox: masterwork victory upon 4 milestones achieved', () => {
  const state = createState(606);
  state.plantsGrown = 8;
  state.glassCreated = 4;
  state.explosionsDetonated = 2;
  state.electricalArcs = 5;

  step(state, 'action:step_simulation');
  assert.equal(state.milestones.verdantOasis, true);
  assert.equal(state.milestones.silicaKiln, true);
  assert.equal(state.milestones.kineticDemolition, true);
  assert.equal(state.milestones.arcConduction, true);

  const actions = legalActions(state);
  assert.ok(actions.includes('action:finalize_masterwork'));

  const res = step(state, 'action:finalize_masterwork');
  assert.equal(state.victory, true);
  assert.equal(res.done, true);
  assert.ok(score(state) >= 3000);
});

test('0165-sandbox: defeat on max turns without masterwork', () => {
  const state = createState(707);
  state.turns = state.maxTurns - 1;

  step(state, 'action:step_simulation');
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
});

test('0165-sandbox: determinism with same seed and action script', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  const script = [
    'action:place_element:sand:2',
    'action:place_element:water:5',
    'action:step_simulation',
    'action:trigger_lightning_strike'
  ];

  for (const act of script) {
    if (!isOver(s1) && legalActions(s1).includes(act)) step(s1, act);
    if (!isOver(s2) && legalActions(s2).includes(act)) step(s2, act);
  }

  assert.equal(s1.prngState, s2.prngState);
  assert.equal(s1.glassCreated, s2.glassCreated);
  assert.equal(s1.elementsPlaced, s2.elementsPlaced);
  assert.equal(score(s1), score(s2));
});

test('0165-sandbox: bot contract fuzzing to completion', () => {
  const state = createState(999);
  let steps = 0;

  while (!isOver(state) && steps < 200) {
    const actions = legalActions(state);
    assert.ok(actions.length > 0, 'Legal actions must not be empty');
    const act = actions[steps % actions.length];
    step(state, act);
    steps++;
  }

  assert.ok(isOver(state));
  assert.ok(score(state) >= 0);
});
