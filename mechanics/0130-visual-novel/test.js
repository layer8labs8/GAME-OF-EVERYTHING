const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  getCurrentScene
} = require('./www/logic.js');

test('createState initializes narrative at start node with 0 affinity', () => {
  const s = createState(42);
  assert.strictEqual(s.currentNodeId, 'start');
  assert.strictEqual(s.stepCount, 0);
  assert.strictEqual(s.affinity.lyra, 0);
  assert.strictEqual(s.affinity.vance, 0);
  assert.strictEqual(s.affinity.aria, 0);
  assert.strictEqual(isOver(s), false);
  const sc = getCurrentScene(s);
  assert.strictEqual(sc.speaker, 'Narrator');
});

test('advance moves along linear dialogue sequence', () => {
  const s = createState(42);
  const legals = legalActions(s);
  assert.deepStrictEqual(legals, ['advance']);

  step(s, 'advance');
  assert.strictEqual(s.currentNodeId, 'intro_1');
  const sc = getCurrentScene(s);
  assert.strictEqual(sc.speaker, 'Lyra');
});

test('choice node offers multiple distinct decisions', () => {
  const s = createState(42);
  step(s, 'advance'); // intro_1
  step(s, 'advance'); // intro_2
  step(s, 'advance'); // intro_3 (decision point)

  const legals = legalActions(s);
  assert.strictEqual(legals.length, 3);
  assert.ok(legals.includes('choose:0'));
  assert.ok(legals.includes('choose:1'));
  assert.ok(legals.includes('choose:2'));
});

test('choosing Lyra branch awards affinity and advances story', () => {
  const s = createState(42);
  step(s, 'advance');
  step(s, 'advance');
  step(s, 'advance');

  step(s, 'choose:0'); // Lyra choice
  assert.strictEqual(s.affinity.lyra, 2);
  assert.strictEqual(s.currentNodeId, 'c1_lyra');
});

test('Chapter 2 decision unlocks character CG', () => {
  const s = createState(42);
  // Navigate to chapter 2 choice
  step(s, 'advance');
  step(s, 'advance');
  step(s, 'advance');
  step(s, 'choose:0'); // c1_lyra
  step(s, 'advance'); // ch2_gate
  step(s, 'advance'); // ch2_choice

  step(s, 'choose:0'); // c2_lyra CG choice
  assert.ok(s.cgsUnlocked.includes('starlight_cartography'));
  assert.strictEqual(s.affinity.lyra, 5); // 2 + 3
});

test('completing Lyra route triggers Ending A with 1.0 reward', () => {
  const s = createState(42);
  step(s, 'advance');
  step(s, 'advance');
  step(s, 'advance');
  step(s, 'choose:0'); // c1_lyra
  step(s, 'advance'); // ch2_gate
  step(s, 'advance'); // ch2_choice
  step(s, 'choose:0'); // c2_lyra
  step(s, 'advance'); // ch3_crisis
  step(s, 'advance'); // ch3_decision
  step(s, 'choose:0'); // eval_lyra
  const res = step(s, 'advance'); // end_lyra

  assert.strictEqual(s.done, true);
  assert.strictEqual(s.victory, true);
  assert.strictEqual(res.reward, 1.0);
  assert.strictEqual(s.ending, 'A: Transcendent Horizons');
  assert.ok(score(s) > 3000);
});

test('completing Vance route triggers Ending B with 1.0 reward', () => {
  const s = createState(42);
  step(s, 'advance');
  step(s, 'advance');
  step(s, 'advance');
  step(s, 'choose:1'); // c1_vance
  step(s, 'advance');
  step(s, 'advance');
  step(s, 'choose:1'); // c2_vance
  step(s, 'advance');
  step(s, 'advance');
  step(s, 'choose:1'); // eval_vance
  const res = step(s, 'advance'); // end_vance

  assert.strictEqual(s.done, true);
  assert.strictEqual(s.victory, true);
  assert.strictEqual(res.reward, 1.0);
  assert.strictEqual(s.ending, 'B: Defenders of the Rim');
});

test('completing Aria route triggers Ending C with 1.0 reward', () => {
  const s = createState(42);
  step(s, 'advance');
  step(s, 'advance');
  step(s, 'advance');
  step(s, 'choose:2'); // c1_aria
  step(s, 'advance');
  step(s, 'advance');
  step(s, 'choose:2'); // c2_aria
  step(s, 'advance');
  step(s, 'advance');
  step(s, 'choose:2'); // eval_aria
  const res = step(s, 'advance'); // end_aria

  assert.strictEqual(s.done, true);
  assert.strictEqual(s.victory, true);
  assert.strictEqual(res.reward, 1.0);
  assert.strictEqual(s.ending, 'C: Synthetic Awakening');
});

test('hesitation in crisis triggers Ending D with 0.0 reward', () => {
  const s = createState(42);
  step(s, 'advance');
  step(s, 'advance');
  step(s, 'advance');
  step(s, 'choose:0');
  step(s, 'advance');
  step(s, 'advance');
  step(s, 'choose:0');
  step(s, 'advance');
  step(s, 'advance');
  const res = step(s, 'choose:3'); // end_lost

  assert.strictEqual(s.done, true);
  assert.strictEqual(s.victory, false);
  assert.strictEqual(res.reward, 0.0);
  assert.strictEqual(s.ending, 'D: Lost to the Void');
});

test('illegal action throws error without mutating state', () => {
  const s = createState(42);
  const cloned = JSON.parse(JSON.stringify(s));

  assert.throws(() => {
    step(s, 'choose:99'); // not a choice node
  });

  assert.deepStrictEqual(s.affinity, cloned.affinity);
  assert.strictEqual(s.currentNodeId, cloned.currentNodeId);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  const actions = ['advance', 'advance', 'advance', 'choose:1'];
  for (const act of actions) {
    step(s1, act);
    step(s2, act);
  }

  assert.deepStrictEqual(s1, s2);
});
