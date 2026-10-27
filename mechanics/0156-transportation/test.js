const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes regional transit network with fleet and initial corridors', () => {
  const state = createState(42);
  assert.equal(state.capital, 500);
  assert.equal(state.reputation, 75);
  assert.equal(state.congestion, 15);
  assert.equal(state.fuel, 70);
  assert.equal(state.fleet.trains, 1);
  assert.equal(state.fleet.trucks, 2);
  assert.equal(state.fleet.capacity, 8);
  assert.equal(state.contractsCompleted, 0);
  assert.equal(state.contractsFailed, 0);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(state.contracts.length, 2);
  assert.equal(isOver(state), false);
  assert.ok(score(state) > 0);
});

test('routine_dispatch earns revenue and consumes small fuel', () => {
  const state = createState(100);
  const initialCap = state.capital;
  const initialFuel = state.fuel;
  assert.ok(legalActions(state).includes('action:routine_dispatch'));
  step(state, 'action:routine_dispatch');

  assert.equal(state.capital, initialCap + 45);
  assert.equal(state.fuel, initialFuel - 5);
});

test('fleet acquisitions expand network cargo capacity', () => {
  const state = createState(200);
  state.capital = 400;

  // Train
  assert.ok(legalActions(state).includes('action:purchase_freight_train'));
  step(state, 'action:purchase_freight_train');
  assert.equal(state.fleet.trains, 2);
  assert.equal(state.fleet.capacity, 12);

  // Truck
  assert.ok(legalActions(state).includes('action:purchase_cargo_truck'));
  step(state, 'action:purchase_cargo_truck');
  assert.equal(state.fleet.trucks, 3);
  assert.equal(state.fleet.capacity, 14);
});

test('infrastructure construction enables fulfillment of contracts', () => {
  const state = createState(300);
  state.capital = 600;
  state.contracts = [{
    id: 'test_ct_harbor',
    from: 'Industrial',
    to: 'Harbor',
    cargo: 'Structural Steel',
    amount: 4,
    deadlineTurns: 20,
    reward: 280
  }];

  // Corridor not connected yet
  assert.equal(legalActions(state).includes('action:fulfill_contract:test_ct_harbor'), false);

  // Build rail corridor
  assert.ok(legalActions(state).includes('action:build_rail:Industrial-Harbor'));
  step(state, 'action:build_rail:Industrial-Harbor');

  // Now connected, contract is legal!
  assert.ok(legalActions(state).includes('action:fulfill_contract:test_ct_harbor'));
  const preCap = state.capital;
  step(state, 'action:fulfill_contract:test_ct_harbor');

  assert.equal(state.capital, preCap + 280);
  assert.equal(state.contractsCompleted, 1);
});

test('signal optimization clears network congestion bottlenecks', () => {
  const state = createState(400);
  state.congestion = 60;
  state.capital = 200;

  assert.ok(legalActions(state).includes('action:optimize_traffic_signals'));
  step(state, 'action:optimize_traffic_signals');

  assert.equal(state.congestion, 35);
});

test('refuel_fleet replenishes vehicle fuel reserves', () => {
  const state = createState(500);
  state.fuel = 20;
  state.capital = 200;

  assert.ok(legalActions(state).includes('action:refuel_fleet'));
  step(state, 'action:refuel_fleet');

  assert.equal(state.fuel, 65);
});

test('victory triggered when completing 12 contracts with high reputation and capital', () => {
  const state = createState(600);
  state.contractsCompleted = 11;
  state.reputation = 82;
  state.capital = 2800;
  state.connections.rail.push('Valley-Metro');
  state.contracts = [{
    id: 'final_delivery',
    from: 'Valley',
    to: 'Metro',
    cargo: 'Grain',
    amount: 3,
    deadlineTurns: 10,
    reward: 250
  }];

  step(state, 'action:fulfill_contract:final_delivery');

  assert.equal(state.contractsCompleted, 12);
  assert.ok(state.reputation >= 85);
  assert.ok(state.capital >= 3000);
  assert.equal(state.victory, true);
  assert.equal(isOver(state), true);
});

test('defeat triggered when 5 contract deadlines lapse', () => {
  const state = createState(700);
  state.contractsFailed = 4;
  state.contracts = [{
    id: 'expiring_run',
    from: 'Valley',
    to: 'Metro',
    cargo: 'Perishable Produce',
    amount: 2,
    deadlineTurns: 1,
    reward: 100
  }];

  step(state, 'action:routine_dispatch');

  assert.equal(state.contractsFailed, 5);
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
});

test('illegal action throws descriptive error without mutating state', () => {
  const state = createState(800);
  state.capital = 10; // cannot purchase train
  const snapshot = JSON.stringify(state);

  assert.throws(() => {
    step(state, 'action:purchase_freight_train');
  }, /Illegal transport action/);

  assert.equal(JSON.stringify(state), snapshot);
});

test('seed determinism produces identical network contracts', () => {
  const s1 = createState(9999);
  const s2 = createState(9999);

  assert.deepEqual(s1, s2);
  step(s1, 'action:routine_dispatch');
  step(s2, 'action:routine_dispatch');
  assert.deepEqual(s1, s2);
});
