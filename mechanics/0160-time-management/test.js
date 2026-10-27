const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes Grand Hotel with 4 suites, lobby queue, and operating capital', () => {
  const state = createState(42);
  assert.equal(state.energy, 90);
  assert.equal(state.capital, 350);
  assert.equal(state.reputation, 80);
  assert.equal(state.rooms.length, 4);
  assert.equal(state.rooms[0].status, 'clean');
  assert.equal(state.guests.length, 2);
  assert.equal(state.servedGuests, 0);
  assert.equal(state.walkouts, 0);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(isOver(state), false);
  assert.ok(score(state) > 0);
});

test('guest service lifecycle progresses through check-in, luggage, dining, and checkout', () => {
  const state = createState(100);
  state.guests = [{
    id: 'test_guest_1',
    name: 'Lord Sterling',
    stage: 0,
    roomId: null,
    patience: 15,
    reward: 180
  }];

  // 1. Check in
  assert.ok(legalActions(state).includes('action:check_in_guest:test_guest_1'));
  step(state, 'action:check_in_guest:test_guest_1');
  assert.equal(state.guests[0].stage, 1);
  assert.equal(state.guests[0].roomId, 1);
  assert.equal(state.rooms[0].status, 'occupied');

  // 2. Bellhop
  assert.ok(legalActions(state).includes('action:dispatch_bellhop:test_guest_1'));
  step(state, 'action:dispatch_bellhop:test_guest_1');
  assert.equal(state.guests[0].stage, 2);

  // 3. Room service
  assert.ok(legalActions(state).includes('action:deliver_room_service:test_guest_1'));
  step(state, 'action:deliver_room_service:test_guest_1');
  assert.equal(state.guests[0].stage, 3);

  // 4. Checkout
  assert.ok(legalActions(state).includes('action:checkout_guest:test_guest_1'));
  const preCap = state.capital;
  step(state, 'action:checkout_guest:test_guest_1');

  assert.equal(state.servedGuests, 1);
  assert.ok(state.capital > preCap);
  assert.equal(state.rooms[0].status, 'dirty');

  // 5. Clean room
  assert.ok(legalActions(state).includes('action:clean_vacant_room:1'));
  step(state, 'action:clean_vacant_room:1');
  assert.equal(state.rooms[0].status, 'clean');
});

test('welcome cocktails boost patience for all active guests in the lobby', () => {
  const state = createState(200);
  state.capital = 100;
  state.guests = [{ id: 'g1', name: 'G1', stage: 0, roomId: null, patience: 8, reward: 100 }];

  assert.ok(legalActions(state).includes('action:serve_welcome_cocktails'));
  step(state, 'action:serve_welcome_cocktails');

  assert.equal(state.capital, 70);
  assert.ok(state.guests[0].patience > 8 - 1); // +5 minus 1 turn decay
});

test('staff hiring upgrades enhance operations and reduce energy drain', () => {
  const state = createState(300);
  state.capital = 500;

  // Hire Bellhop
  assert.ok(legalActions(state).includes('action:hire_assistant_bellhop'));
  step(state, 'action:hire_assistant_bellhop');
  assert.equal(state.upgrades.hasAssistantBellhop, true);

  // Hire Maid
  assert.ok(legalActions(state).includes('action:hire_express_maid'));
  step(state, 'action:hire_express_maid');
  assert.equal(state.upgrades.hasExpressMaid, true);
});

test('manager espresso break replenishes energy', () => {
  const state = createState(400);
  state.energy = 40;
  assert.ok(legalActions(state).includes('action:manager_espresso_break'));
  step(state, 'action:manager_espresso_break');
  assert.equal(state.energy, 75);
});

test('victory triggered when 15 guests served with high reputation and capital', () => {
  const state = createState(500);
  state.servedGuests = 14;
  state.reputation = 88;
  state.capital = 2900;
  state.guests = [{
    id: 'final_guest',
    name: 'Baron Von Klaus',
    stage: 3,
    roomId: 1,
    patience: 10,
    reward: 200
  }];
  state.rooms[0].status = 'occupied';
  state.rooms[0].guestId = 'final_guest';

  step(state, 'action:checkout_guest:final_guest');

  assert.equal(state.servedGuests, 15);
  assert.ok(state.reputation >= 85);
  assert.ok(state.capital >= 3000);
  assert.equal(state.victory, true);
  assert.equal(isOver(state), true);
});

test('defeat triggered when 5 guests walk out in frustration', () => {
  const state = createState(600);
  state.walkouts = 4;
  state.guests = [{
    id: 'angry_guest',
    name: 'Duchess Eleanor',
    stage: 0,
    roomId: null,
    patience: 1, // will drop to 0 on turn end
    reward: 100
  }];

  step(state, 'action:manager_espresso_break');

  assert.equal(state.walkouts, 5);
  assert.equal(state.defeat, true);
  assert.equal(isOver(state), true);
});

test('illegal action throws descriptive error without mutating state', () => {
  const state = createState(700);
  state.capital = 10; // cannot hire bellhop
  const snapshot = JSON.stringify(state);

  assert.throws(() => {
    step(state, 'action:hire_assistant_bellhop');
  }, /Illegal hospitality action/);

  assert.equal(JSON.stringify(state), snapshot);
});

test('seed determinism produces identical hotel queues', () => {
  const s1 = createState(9999);
  const s2 = createState(9999);

  assert.deepEqual(s1, s2);
  step(s1, 'action:manager_espresso_break');
  step(s2, 'action:manager_espresso_break');
  assert.deepEqual(s1, s2);
});
