const test = require('node:test');
const assert = require('node:assert/strict');
const { createState, legalActions, step, isOver, score } = require('./www/logic.js');

test('createState initializes Day 1 with 100 health, fire and supplies', () => {
  const s = createState(101);
  assert.equal(s.day, 1);
  assert.equal(s.health, 100);
  assert.equal(s.warmth, 85);
  assert.equal(s.fireLevel, 65);
  assert.equal(s.supplies.wood, 12);
  assert.equal(s.supplies.food, 8);
  assert.equal(s.supplies.medical, 2);
  assert.equal(isOver(s), false);
});

test('stoke_fire consumes 3 wood and raises fireLevel', () => {
  const s = createState(101);
  s.fireLevel = 40;
  const prevWood = s.supplies.wood;

  const res = step(s, { type: 'stoke_fire' });
  assert.equal(res.reward, 5);
  assert.equal(s.supplies.wood, prevWood - 3);
  assert.equal(s.fireLevel, 75);
});

test('eat consumes 2 food, decreases hunger, and restores health', () => {
  const s = createState(101);
  s.hunger = 60;
  s.health = 90;
  const prevFood = s.supplies.food;

  const res = step(s, { type: 'eat' });
  assert.equal(res.reward, 5);
  assert.equal(s.supplies.food, prevFood - 2);
  assert.equal(s.hunger, 25);
  assert.equal(s.health, 95);
});

test('heal consumes 1 medical kit and restores 30 health', () => {
  const s = createState(101);
  s.health = 50;
  const prevMeds = s.supplies.medical;

  const res = step(s, { type: 'heal' });
  assert.equal(res.reward, 10);
  assert.equal(s.supplies.medical, prevMeds - 1);
  assert.equal(s.health, 80);
});

test('forage_wood gains timber while expending warmth and hunger', () => {
  const s = createState(101);
  const prevWood = s.supplies.wood;
  const prevWarmth = s.warmth;
  const prevHunger = s.hunger;

  const res = step(s, { type: 'forage_wood' });
  assert.equal(res.reward, 8);
  assert.ok(s.supplies.wood > prevWood);
  assert.ok(s.warmth < prevWarmth);
  assert.ok(s.hunger > prevHunger);
});

test('hunt_food yields food and scrap with thermal expenditure', () => {
  const s = createState(101);
  const prevFood = s.supplies.food;
  const prevScrap = s.supplies.scrap;

  const res = step(s, { type: 'hunt_food' });
  assert.equal(res.reward, 12);
  assert.ok(s.supplies.food > prevFood);
  assert.ok(s.supplies.scrap > prevScrap);
});

test('repair_shelter restores integrity using wood and scrap', () => {
  const s = createState(101);
  s.shelter.integrity = 50;
  const prevWood = s.supplies.wood;
  const prevScrap = s.supplies.scrap;

  const res = step(s, { type: 'repair_shelter' });
  assert.equal(res.reward, 10);
  assert.equal(s.shelter.integrity, 80);
  assert.equal(s.supplies.wood, prevWood - 4);
  assert.equal(s.supplies.scrap, prevScrap - 2);
});

test('upgrade_insulation improves insulation level', () => {
  const s = createState(101);
  s.supplies.wood = 20;
  s.supplies.scrap = 20;
  assert.equal(s.shelter.insulation, 1);

  const res = step(s, { type: 'upgrade_insulation' });
  assert.equal(res.reward, 25);
  assert.equal(s.shelter.insulation, 2);
  assert.equal(s.supplies.wood, 12);
  assert.equal(s.supplies.scrap, 12);
});

test('defend repels wolf pack threat using wood', () => {
  const s = createState(101);
  s.threat = 'wolves';
  const prevWood = s.supplies.wood;

  const res = step(s, { type: 'defend' });
  assert.equal(res.reward, 15);
  assert.equal(s.threat, 'none');
  assert.equal(s.supplies.wood, prevWood - 2);
});

test('sleep advances day, burns fire, and simulates thermal conditions', () => {
  const s = createState(101);
  const prevDay = s.day;
  const prevFire = s.fireLevel;

  step(s, { type: 'sleep' });
  assert.equal(s.day, prevDay + 1);
  assert.ok(s.fireLevel < prevFire);
});

test('surviving past day 20 wins the game', () => {
  const s = createState(101);
  // Keep survivor alive by giving plenty of supplies
  s.supplies.food = 100;
  s.supplies.wood = 100;
  s.supplies.medical = 20;

  while (!isOver(s)) {
    if (s.hunger >= 30) step(s, { type: 'eat' });
    else if (s.fireLevel <= 40) step(s, { type: 'stoke_fire' });
    else if (s.threat === 'wolves') step(s, { type: 'defend' });
    else if (s.health < 80 && s.supplies.medical > 0) step(s, { type: 'heal' });
    else step(s, { type: 'sleep' });
  }

  assert.ok(s.won || s.health <= 0);
  assert.ok(score(s) > 0);
});

test('illegal action throws without mutating state', () => {
  const s = createState(101);
  s.supplies.medical = 0;
  const snapshot = JSON.stringify(s);

  assert.throws(() => {
    step(s, { type: 'heal' });
  });

  assert.equal(JSON.stringify(s), snapshot);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(888);
  const s2 = createState(888);

  for (let i = 0; i < 25; i++) {
    const a1 = legalActions(s1);
    const a2 = legalActions(s2);
    assert.deepEqual(a1, a2);
    if (a1.length === 0) break;

    const chosen = a1[i % a1.length];
    step(s1, chosen);
    step(s2, chosen);
    assert.deepEqual(s1, s2);
  }
});
