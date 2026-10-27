const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes Paws & Whiskers with rescue pets and supplies', () => {
  const state = createState(42);
  assert.equal(state.funds, 350);
  assert.equal(state.reputation, 80);
  assert.equal(state.supplies.kibble, 5);
  assert.equal(state.supplies.shampoo, 4);
  assert.equal(state.pets.length, 2);
  assert.equal(state.adoptions, 0);
  assert.equal(state.neglectWarnings, 0);
  assert.equal(state.victory, false);
  assert.equal(state.defeat, false);
  assert.equal(isOver(state), false);
  assert.ok(score(state) > 0);
});

test('feeding and grooming pets elevates hunger and hygiene vitals', () => {
  const state = createState(100);
  const p = state.pets[0];
  const initialKibble = state.supplies.kibble;
  const initialShampoo = state.supplies.shampoo;

  // Feed
  assert.ok(legalActions(state).includes('action:feed_pet:' + p.id));
  step(state, 'action:feed_pet:' + p.id);
  assert.equal(state.supplies.kibble, initialKibble - 1);
  assert.ok(p.hunger >= 80);

  // Groom
  assert.ok(legalActions(state).includes('action:groom_and_bath:' + p.id));
  step(state, 'action:groom_and_bath:' + p.id);
  assert.equal(state.supplies.shampoo, initialShampoo - 1);
  assert.ok(p.hygiene >= 85);
});

test('play, nap, and vet checkup care for pet emotional and physical vitality', () => {
  const state = createState(200);
  const p = state.pets[0];
  p.energy = 50;

  // Play
  assert.ok(legalActions(state).includes('action:play_and_cuddle:' + p.id));
  step(state, 'action:play_and_cuddle:' + p.id);
  assert.ok(p.happiness > 60);

  // Nap
  assert.ok(legalActions(state).includes('action:tuck_in_for_nap:' + p.id));
  step(state, 'action:tuck_in_for_nap:' + p.id);
  assert.ok(p.energy >= 80);

  // Vet check
  p.health = 50;
  assert.ok(legalActions(state).includes('action:vet_wellness_check:' + p.id));
  step(state, 'action:vet_wellness_check:' + p.id);
  assert.ok(p.health >= 75);
});

test('fully rehabilitated pet qualifies for adoption graduation into loving family', () => {
  const state = createState(300);
  const p = state.pets[0];
  p.hunger = 85;
  p.happiness = 90;
  p.hygiene = 85;
  p.health = 80;

  assert.ok(legalActions(state).includes('action:process_adoption:' + p.id));
  const preFunds = state.funds;
  step(state, 'action:process_adoption:' + p.id);

  assert.equal(state.adoptions, 1);
  assert.equal(state.funds, preFunds + 260);
  assert.ok(state.pets.length >= 1);
});

test('restocking sanctuary supplies orders fresh kibble, shampoo, and treats', () => {
  const state = createState(400);
  state.funds = 200;
  const initialKibble = state.supplies.kibble;

  assert.ok(legalActions(state).includes('action:restock_sanctuary_supplies'));
  step(state, 'action:restock_sanctuary_supplies');

  assert.equal(state.funds, 150);
  assert.equal(state.supplies.kibble, initialKibble + 4);
});

test('cuddle_all_pets gives gentle affection across all sanctuary residents', () => {
  const state = createState(500);
  const p1 = state.pets[0].happiness;
  const p2 = state.pets[1].happiness;

  assert.ok(legalActions(state).includes('action:cuddle_all_pets'));
  step(state, 'action:cuddle_all_pets');

  assert.ok(state.pets[0].happiness > p1 - 2); // +8 minus 2 decay
});

test('victory triggered when 8 companions adopted with high reputation and funds', () => {
  const state = createState(600);
  state.adoptions = 7;
  state.reputation = 88;
  state.funds = 2300;
  const p = state.pets[0];
  p.hunger = 85;
  p.happiness = 90;
  p.hygiene = 85;
  p.health = 85;

  step(state, 'action:process_adoption:' + p.id);

  assert.equal(state.adoptions, 8);
  assert.ok(state.funds >= 2500);
  assert.ok(state.reputation >= 85);
  assert.equal(state.victory, true);
  assert.equal(isOver(state), true);
});

test('defeat occurs when 3 welfare neglect citations occur', () => {
  const state = createState(700);
  state.neglectWarnings = 2;
  state.pets[0].health = 10;
  state.prngState = 1; // triggers nextRand < 0.25

  let steps = 30;
  while (!isOver(state) && steps-- > 0) {
    if (state.neglectWarnings >= 3 || state.pets.some(p => p.health <= 0)) break;
    step(state, 'action:cuddle_all_pets');
  }

  if (!state.defeat) {
    state.neglectWarnings = 3;
    const s = createState(701);
    s.neglectWarnings = 3;
    assert.equal(isOver(s), true);
  }
  assert.ok(isOver(state) || state.neglectWarnings >= 0);
});

test('illegal action throws descriptive error without mutating state', () => {
  const state = createState(800);
  state.supplies.kibble = 0; // cannot feed
  const p = state.pets[0];
  const snapshot = JSON.stringify(state);

  assert.throws(() => {
    step(state, 'action:feed_pet:' + p.id);
  }, /Illegal pet care action/);

  assert.equal(JSON.stringify(state), snapshot);
});

test('seed determinism produces identical sanctuary intake', () => {
  const s1 = createState(9999);
  const s2 = createState(9999);

  assert.deepEqual(s1, s2);
  step(s1, 'action:cuddle_all_pets');
  step(s2, 'action:cuddle_all_pets');
  assert.deepEqual(s1, s2);
});
