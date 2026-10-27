const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes Miniature Workshop with cutting mat and first kit', () => {
  const state = createState(42);
  assert.equal(state.focus, 90);
  assert.equal(state.inspiration, 70);
  assert.equal(state.coins, 140);
  assert.equal(state.completedModels, 0);
  assert.equal(state.ruinedModels, 0);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.ok(state.currentModel !== null);
  assert.equal(state.currentModel.stage, 0);
  assert.equal(isOver(state), false);
  assert.ok(score(state) > 0);
});

test('artisan completes full 5-stage model kit building pipeline and wins gold medal', () => {
  const state = createState(100);
  const m = state.currentModel;
  m.partsRemaining = 1; // single part for quick snip

  // Stage 0: Snip
  assert.ok(legalActions(state).includes('action:snip_runner_parts'));
  step(state, 'action:snip_runner_parts');
  assert.equal(m.stage, 1);

  // Stage 1: Sand
  assert.ok(legalActions(state).includes('action:sand_nub_marks'));
  step(state, 'action:sand_nub_marks');
  assert.equal(m.stage, 2);
  assert.equal(m.craftsmanship, 65);

  // Stage 2: Cement
  assert.ok(legalActions(state).includes('action:cement_subassembly'));
  step(state, 'action:cement_subassembly');
  assert.equal(m.stage, 3);
  assert.equal(m.craftsmanship, 75);

  // Stage 3: Basecoat & Shade
  assert.ok(legalActions(state).includes('action:apply_base_and_shade'));
  step(state, 'action:apply_base_and_shade');
  assert.equal(m.stage, 4);
  assert.equal(m.craftsmanship, 90);

  // Stage 4: Edge Highlight
  assert.ok(legalActions(state).includes('action:edge_highlight_details'));
  step(state, 'action:edge_highlight_details');
  assert.equal(m.craftsmanship, 100);

  // Submit to Exhibition
  assert.ok(legalActions(state).includes('action:enter_exhibition'));
  const preAcclaim = state.acclaim;
  step(state, 'action:enter_exhibition');

  assert.equal(state.completedModels, 1);
  assert.equal(state.medals.gold, 1);
  assert.ok(state.acclaim > preAcclaim);
  assert.equal(state.currentModel, null);
  assert.ok(legalActions(state).includes('action:unbox_next_kit'));
});

test('unboxing next kit spawns fresh model onto cutting mat', () => {
  const state = createState(200);
  state.currentModel = null;
  assert.ok(legalActions(state).includes('action:unbox_next_kit'));
  step(state, 'action:unbox_next_kit');
  assert.ok(state.currentModel !== null);
  assert.equal(state.currentModel.stage, 0);
});

test('restocking supplies deducts coins and refills cement, sanding pads, and paints', () => {
  const state = createState(300);
  state.coins = 100;
  const initialCement = state.supplies.plasticCement;
  assert.ok(legalActions(state).includes('action:restock_hobby_supplies'));
  step(state, 'action:restock_hobby_supplies');

  assert.equal(state.coins, 60);
  assert.equal(state.supplies.plasticCement, initialCement + 3);
});

test('sipping herbal tea restores focus and inspiration', () => {
  const state = createState(400);
  state.focus = 30;
  state.inspiration = 40;
  assert.ok(legalActions(state).includes('action:sip_herbal_tea'));
  step(state, 'action:sip_herbal_tea');

  assert.equal(state.focus, 65);
  assert.equal(state.inspiration, 60);
});

test('skip_to_assembly bypasses sanding stage cleanly', () => {
  const state = createState(500);
  state.currentModel.stage = 1;
  assert.ok(legalActions(state).includes('action:skip_to_assembly'));
  step(state, 'action:skip_to_assembly');
  assert.equal(state.currentModel.stage, 2);
});

test('victory triggered when completing 5 models with 3 gold medals and 1500 acclaim', () => {
  const state = createState(600);
  state.completedModels = 4;
  state.medals.gold = 2;
  state.acclaim = 1300;
  state.currentModel = {
    id: 'final_kit',
    name: 'Masterpiece Titan',
    genre: 'Mecha',
    stage: 4,
    craftsmanship: 95,
    partsRemaining: 0,
    targetParts: 4,
    baseReward: 200
  };

  step(state, 'action:enter_exhibition');
  assert.equal(state.completedModels, 5);
  assert.equal(state.medals.gold, 3);
  assert.ok(state.acclaim >= 1500);
  assert.equal(state.victory, true);
  assert.equal(isOver(state), true);
});

test('illegal action throws without mutating state', () => {
  const state = createState(700);
  state.focus = 5; // cannot snip requiring 10 focus
  const snapshot = JSON.stringify(state);

  assert.throws(() => {
    step(state, 'action:snip_runner_parts');
  }, /Illegal action/);

  assert.equal(JSON.stringify(state), snapshot);
});

test('seed determinism produces identical kit models', () => {
  const s1 = createState(8888);
  const s2 = createState(8888);

  assert.deepEqual(s1, s2);
  step(s1, 'action:sip_herbal_tea');
  step(s2, 'action:sip_herbal_tea');
  assert.deepEqual(s1, s2);
});
