const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  PROVINCES,
  canUnitOccupy
} = require('./www/logic.js');

test('createState initializes provinces, supply centers, units, and peace treaties', () => {
  const s = createState(42);
  assert.strictEqual(s.seasonIndex, 0);
  assert.strictEqual(s.done, false);
  assert.strictEqual(s.supplyCenters.paris, 'france');
  assert.strictEqual(s.supplyCenters.london, 'britain');
  assert.strictEqual(s.supplyCenters.berlin, 'prussia');
  assert.strictEqual(s.supplyCenters.belgium, 'neutral');
  assert.strictEqual(s.units.length, 6);
});

test('canUnitOccupy validates terrain compatibility for armies and fleets', () => {
  // Army can occupy inland (Paris) and coastal (Belgium), but NOT sea (Channel)
  assert.strictEqual(canUnitOccupy('army', 'paris'), true);
  assert.strictEqual(canUnitOccupy('army', 'belgium'), true);
  assert.strictEqual(canUnitOccupy('army', 'channel'), false);

  // Fleet can occupy sea (Channel) and coastal (Brest), but NOT inland (Paris)
  assert.strictEqual(canUnitOccupy('fleet', 'channel'), true);
  assert.strictEqual(canUnitOccupy('fleet', 'brest'), true);
  assert.strictEqual(canUnitOccupy('fleet', 'paris'), false);
});

test('legalActions contains unit orders, pact proposals, and seasonal resolve', () => {
  const s = createState(101);
  const actions = legalActions(s);

  assert.ok(actions.includes('resolve_season'));
  assert.ok(actions.includes('pact:britain'));
  assert.ok(actions.includes('pact:prussia'));
  assert.ok(actions.some(a => a.startsWith('order_move:u_f_army:')));
  assert.ok(actions.some(a => a.startsWith('order_hold:')));
});

test('signing non-aggression pact updates diplomatic state and records treaty', () => {
  const s = createState(202);
  assert.strictEqual(s.pacts.britain, false);

  const res = step(s, 'pact:britain');
  assert.strictEqual(s.pacts.britain, true);
  assert.ok(res.reward > 0);
  assert.ok(!legalActions(s).includes('pact:britain'));
});

test('order_move assigns intended province destination for simultaneous turn', () => {
  const s = createState(303);
  const army = s.units.find(u => u.id === 'u_f_army');

  step(s, 'order_move:u_f_army:belgium');
  assert.strictEqual(army.order.type, 'move');
  assert.strictEqual(army.order.target, 'belgium');
});

test('order_support_move lends coordinated breakthrough strength', () => {
  const s = createState(404);
  const fleet = s.units.find(u => u.id === 'u_f_fleet');
  // Position fleet in channel so it can support attack on Belgium
  fleet.prov = 'channel';

  const act = 'order_support_move:u_f_fleet:u_f_army:belgium';
  const legals = legalActions(s);
  assert.ok(legals.includes(act));

  step(s, act);
  assert.strictEqual(fleet.order.type, 'support_move');
  assert.strictEqual(fleet.order.targetUnitId, 'u_f_army');
  assert.strictEqual(fleet.order.targetProv, 'belgium');
});

test('resolve_season advances season and processes movement and Supply Centers', () => {
  const s = createState(505);
  // French army moves into Belgium uncontested
  s.units.find(u => u.id === 'u_f_army').order = { type: 'move', target: 'belgium' };
  // Keep rival units holding
  s.units.filter(u => u.power !== 'france').forEach(u => { u.order = { type: 'hold' }; });

  step(s, 'resolve_season'); // Spring 1901
  assert.strictEqual(s.seasonIndex, 1);
  assert.strictEqual(s.units.find(u => u.id === 'u_f_army').prov, 'belgium');

  // Next season is Fall 1901, where SC ownership updates
  step(s, 'resolve_season'); // Fall 1901
  assert.strictEqual(s.seasonIndex, 2);
  assert.strictEqual(s.supplyCenters.belgium, 'france');
});

test('capturing 3 Supply Centers triggers Continental Dominance victory', () => {
  const s = createState(606);
  // Grant France Belgium
  s.supplyCenters.belgium = 'france';
  // Paris and Brest are already France = 3 SCs
  step(s, 'resolve_season');

  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'france');
  assert.strictEqual(s.result, 'continental_dominance');
  assert.ok(score(s) > 200);
});

test('illegal action throws error without state mutation', () => {
  const s = createState(707);
  const jsonBefore = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'order_move:u_f_army:london'); // Cannot reach London directly across sea
  }, /Illegal action/);

  assert.strictEqual(JSON.stringify(s), jsonBefore);
});

test('same seed and sequence of orders yields deterministic simulation', () => {
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
