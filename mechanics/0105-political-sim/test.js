const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  getApproval,
  POLICIES,
  CRISES
} = require('./www/logic.js');

test('createState initializes treasury, approval, stability, and education policy', () => {
  const s = createState(42);
  assert.strictEqual(s.quarter, 1);
  assert.strictEqual(s.done, false);
  assert.strictEqual(s.treasury, 420);
  assert.strictEqual(s.stability, 65);
  assert.strictEqual(getApproval(s), 55);
  assert.ok(s.activePolicies.includes('education'));
  assert.strictEqual(s.activeCrisis, null);
});

test('legalActions lists enactable policies, campaign speeches, and quarterly advance', () => {
  const s = createState(101);
  const actions = legalActions(s);

  assert.ok(actions.includes('advance_quarter'));
  assert.ok(actions.includes('enact:healthcare'));
  assert.ok(actions.includes('repeal:education'));
  assert.ok(actions.includes('campaign:labor'));
});

test('enacting healthcare boosts labor satisfaction and stability', () => {
  const s = createState(202);
  const initLabor = s.factions.labor;
  const initStab = s.stability;

  step(s, 'enact:healthcare');

  assert.ok(s.activePolicies.includes('healthcare'));
  assert.ok(s.factions.labor > initLabor);
  assert.ok(s.stability > initStab);
});

test('campaign speech boosts targeted faction satisfaction at treasury cost', () => {
  const s = createState(303);
  const initPatriots = s.factions.patriots;
  const initTreasury = s.treasury;

  step(s, 'campaign:patriots');

  assert.ok(s.factions.patriots > initPatriots);
  assert.strictEqual(s.treasury, initTreasury - 50);
});

test('national crisis requires executive resolution before advancing', () => {
  const s = createState(404);
  s.quarter = 2;

  step(s, 'advance_quarter'); // Quarter becomes 3 -> triggers strike crisis

  assert.strictEqual(s.activeCrisis, 'strike');
  const legals = legalActions(s);
  assert.deepStrictEqual(legals, ['resolve_crisis:A', 'resolve_crisis:B']);

  step(s, 'resolve_crisis:A');
  assert.strictEqual(s.activeCrisis, null);
});

test('general election verifies democratic approval threshold and records term', () => {
  const s = createState(505);
  s.quarter = 4;
  s.factions.labor = 70;
  s.factions.capitalists = 70;
  s.factions.patriots = 70;
  s.factions.reformists = 70;

  step(s, 'advance_quarter');

  assert.strictEqual(s.electionsWon, 1);
  assert.strictEqual(s.done, false);
});

test('election loss occurs if approval falls below 50% on election day', () => {
  const s = createState(606);
  s.quarter = 4;
  s.factions.labor = 35;
  s.factions.capitalists = 35;
  s.factions.patriots = 35;
  s.factions.reformists = 35;

  step(s, 'advance_quarter');

  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'opposition');
  assert.strictEqual(s.result, 'election_defeat');
});

test('impeachment triggers defeat if approval plunges below 25%', () => {
  const s = createState(707);
  s.factions.labor = 20;
  s.factions.capitalists = 20;
  s.factions.patriots = 20;
  s.factions.reformists = 20;

  step(s, 'advance_quarter');

  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'parliament');
  assert.strictEqual(s.result, 'impeached');
});

test('illegal action throws error without state mutation', () => {
  const s = createState(808);
  const jsonBefore = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'enact:nonexistent_policy');
  }, /Illegal action/);

  assert.strictEqual(JSON.stringify(s), jsonBefore);
});

test('same seed and sequence of governance produces deterministic simulation', () => {
  const s1 = createState(9999);
  const s2 = createState(9999);

  for (let i = 0; i < 5; i++) {
    const legals = legalActions(s1);
    const act = legals[0];
    step(s1, act);
    step(s2, act);
  }

  assert.strictEqual(JSON.stringify(s1), JSON.stringify(s2));
});
