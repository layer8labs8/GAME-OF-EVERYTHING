const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  totalFish
} = require('./www/logic.js');

test('createState initializes commercial trawler at Port Haven estuary', () => {
  const state = createState(42);
  assert.equal(state.currentZone, 0);
  assert.equal(state.hull, 100);
  assert.equal(state.fuel, 80);
  assert.equal(state.bait, 6);
  assert.equal(state.sonarCharge, 100);
  assert.equal(state.money, 240);
  assert.equal(state.cargoCapacity, 6);
  assert.equal(state.hasFreezer, false);
  assert.equal(totalFish(state), 0);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(isOver(state), false);
  assert.ok(score(state) > 0);
});

test('cast_fishing_line catches mackerel in port estuary and consumes bait', () => {
  const state = createState(100);
  assert.ok(legalActions(state).includes('action:cast_fishing_line'));
  step(state, 'action:cast_fishing_line');

  assert.equal(state.bait, 5);
  assert.equal(state.cargo.mackerel, 1);
  assert.equal(totalFish(state), 1);
});

test('deploy_trawl_net sweeps pelagic schools into livewell', () => {
  const state = createState(200);
  assert.ok(legalActions(state).includes('action:deploy_trawl_net'));
  step(state, 'action:deploy_trawl_net');

  assert.equal(totalFish(state), 2);
});

test('sailing across ocean zones navigates between reef, shelf, and trench', () => {
  const state = createState(300);
  // Sail from Zone 0 to Zone 1
  assert.ok(legalActions(state).includes('action:sail_to_zone:1'));
  step(state, 'action:sail_to_zone:1');
  assert.equal(state.currentZone, 1);

  // Sail from Zone 1 to Zone 2
  assert.ok(legalActions(state).includes('action:sail_to_zone:2'));
  step(state, 'action:sail_to_zone:2');
  assert.equal(state.currentZone, 2);

  // Sail from Zone 2 to Zone 3 (Abyssal Trench)
  assert.ok(legalActions(state).includes('action:sail_to_zone:3'));
  step(state, 'action:sail_to_zone:3');
  assert.equal(state.currentZone, 3);
});

test('dock_and_auction_catch sells catch at port market and rewards freezer bonus', () => {
  const state = createState(400);
  state.hasFreezer = true;
  state.cargo.mackerel = 2; // 2 * 30 = 60 * 1.25 = 75
  const initialMoney = state.money;

  assert.ok(legalActions(state).includes('action:dock_and_auction_catch'));
  step(state, 'action:dock_and_auction_catch');

  assert.equal(totalFish(state), 0);
  assert.equal(state.portDeliveries, 1);
  assert.equal(state.money, initialMoney + 75);
});

test('refuel_and_repair restores marine diesel, hull, and sonar charge', () => {
  const state = createState(500);
  state.fuel = 20;
  state.hull = 60;
  state.money = 150;

  assert.ok(legalActions(state).includes('action:refuel_and_repair'));
  step(state, 'action:refuel_and_repair');

  assert.equal(state.money, 90);
  assert.equal(state.fuel, 65);
  assert.equal(state.hull, 95);
});

test('sonar ping guarantees capture of legendary coelacanth in abyssal trench', () => {
  const state = createState(600);
  state.currentZone = 3;
  state.sonarCharge = 50;
  state.bait = 2;

  // Ping sonar
  assert.ok(legalActions(state).includes('action:ping_sonar_scanner'));
  step(state, 'action:ping_sonar_scanner');
  assert.equal(state.sonarBonusActive, true);

  // Cast line
  step(state, 'action:cast_fishing_line');
  assert.equal(state.cargo.coelacanth, 1);
  assert.equal(state.legendaryCaught, true);
  assert.equal(state.sonarBonusActive, false);
});

test('victory triggered when legendary caught with 6 deliveries and $3500 money', () => {
  const state = createState(700);
  state.legendaryCaught = true;
  state.portDeliveries = 5;
  state.money = 3450;
  state.cargo.mackerel = 2; // will sell for 60 -> money = 3510 >= 3500, deliveries = 6

  step(state, 'action:dock_and_auction_catch');
  assert.equal(state.portDeliveries, 6);
  assert.ok(state.money >= 3500);
  assert.equal(state.victory, true);
  assert.equal(isOver(state), true);
});

test('defeat occurs when hull integrity drops to zero', () => {
  const state = createState(800);
  state.currentZone = 2;
  state.hull = 1;
  // Sailing between deep zones triggers squall hazard until hull hits 0
  let steps = 30;
  while (!isOver(state) && steps-- > 0) {
    if (state.currentZone === 2) {
      step(state, 'action:sail_to_zone:3');
    } else {
      step(state, 'action:sail_to_zone:2');
    }
  }
  assert.ok(isOver(state));
});

test('illegal action throws descriptive error without mutating state', () => {
  const state = createState(900);
  state.bait = 0; // cannot cast line
  const snapshot = JSON.stringify(state);

  assert.throws(() => {
    step(state, 'action:cast_fishing_line');
  }, /Illegal fishing action/);

  assert.equal(JSON.stringify(state), snapshot);
});

test('seed determinism produces identical fishing expeditions', () => {
  const s1 = createState(9999);
  const s2 = createState(9999);

  assert.deepEqual(s1, s2);
  step(s1, 'action:cast_fishing_line');
  step(s2, 'action:cast_fishing_line');
  assert.deepEqual(s1, s2);
});
