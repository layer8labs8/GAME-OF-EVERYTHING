const test = require('node:test');
const assert = require('node:assert/strict');
const { createState, legalActions, step, isOver, score, CROPS } = require('./www/logic.js');

test('createState initializes 9 plots, energy, coins and initial seeds', () => {
  const s = createState(42);
  assert.equal(s.grid.length, 9);
  assert.equal(s.energy, 100);
  assert.equal(s.coins, 35);
  assert.equal(s.seeds.wheat, 3);
  assert.equal(s.seeds.carrot, 1);
  assert.equal(s.day, 1);
  assert.equal(isOver(s), false);
});

test('clearing a wild plot consumes 5 energy and converts it to tilled', () => {
  const s = createState(42);
  const wildIdx = s.grid.findIndex((p) => p.status === 'wild');
  assert.ok(wildIdx !== -1);

  const prevEnergy = s.energy;
  const res = step(s, { type: 'clear', plot: wildIdx });
  assert.equal(res.reward, 2);
  assert.equal(s.grid[wildIdx].status, 'tilled');
  assert.equal(s.energy, prevEnergy - 5);
});

test('planting a seed consumes seed and places crop on tilled plot', () => {
  const s = createState(42);
  let tilledIdx = s.grid.findIndex((p) => p.status === 'tilled');
  if (tilledIdx === -1) {
    step(s, { type: 'clear', plot: 0 });
    tilledIdx = 0;
  }

  const prevSeeds = s.seeds.wheat;
  const prevEnergy = s.energy;
  step(s, { type: 'plant', plot: tilledIdx, crop: 'wheat' });

  assert.equal(s.seeds.wheat, prevSeeds - 1);
  assert.equal(s.energy, prevEnergy - 2);
  assert.equal(s.grid[tilledIdx].status, 'planted');
  assert.equal(s.grid[tilledIdx].crop, 'wheat');
});

test('watering a planted plot marks it watered and consumes 3 energy', () => {
  const s = createState(42);
  let tilledIdx = s.grid.findIndex((p) => p.status === 'tilled');
  if (tilledIdx === -1) {
    step(s, { type: 'clear', plot: 0 });
    tilledIdx = 0;
  }
  step(s, { type: 'plant', plot: tilledIdx, crop: 'wheat' });

  const prevEnergy = s.energy;
  const res = step(s, { type: 'water', plot: tilledIdx });
  assert.equal(res.reward, 1);
  assert.equal(s.grid[tilledIdx].watered, true);
  assert.equal(s.energy, prevEnergy - 3);
});

test('resting advances day, restores energy, and matures crops', () => {
  const s = createState(42);
  let tilledIdx = s.grid.findIndex((p) => p.status === 'tilled');
  if (tilledIdx === -1) {
    step(s, { type: 'clear', plot: 0 });
    tilledIdx = 0;
  }
  step(s, { type: 'plant', plot: tilledIdx, crop: 'wheat' });
  step(s, { type: 'water', plot: tilledIdx });

  s.energy = 20;
  step(s, { type: 'rest' });
  assert.equal(s.day, 2);
  assert.equal(s.energy, 70);
  assert.equal(s.grid[tilledIdx].growth, 1);

  // Second rest should mature wheat (growthNeeded = 2)
  if (!s.grid[tilledIdx].watered) {
    step(s, { type: 'water', plot: tilledIdx });
  }
  step(s, { type: 'rest' });
  assert.equal(s.grid[tilledIdx].status, 'ripe');
});

test('harvesting ripe crop adds to inventory and resets plot to tilled', () => {
  const s = createState(42);
  let tilledIdx = s.grid.findIndex((p) => p.status === 'tilled');
  if (tilledIdx === -1) {
    step(s, { type: 'clear', plot: 0 });
    tilledIdx = 0;
  }
  step(s, { type: 'plant', plot: tilledIdx, crop: 'wheat' });
  if (!s.grid[tilledIdx].watered) step(s, { type: 'water', plot: tilledIdx });
  step(s, { type: 'rest' });
  if (!s.grid[tilledIdx].watered) step(s, { type: 'water', plot: tilledIdx });
  step(s, { type: 'rest' });

  assert.equal(s.grid[tilledIdx].status, 'ripe');
  const prevInventory = s.inventory.wheat;
  const res = step(s, { type: 'harvest', plot: tilledIdx });
  assert.equal(res.reward, 15);
  assert.equal(s.inventory.wheat, prevInventory + 1);
  assert.equal(s.grid[tilledIdx].status, 'tilled');
  assert.equal(s.grid[tilledIdx].crop, null);
});

test('selling harvested crop adds coins and updates score', () => {
  const s = createState(42);
  s.inventory.wheat = 2;
  const prevCoins = s.coins;
  const prevScore = score(s);

  const res = step(s, { type: 'sell', crop: 'wheat' });
  const expectedGain = 2 * CROPS.wheat.sellPrice;
  assert.equal(res.reward, expectedGain);
  assert.equal(s.inventory.wheat, 0);
  assert.equal(s.coins, prevCoins + expectedGain);
  assert.ok(score(s) > prevScore);
});

test('buying seed deducts coins and increases seed inventory', () => {
  const s = createState(42);
  const prevCoins = s.coins;
  const prevSeeds = s.seeds.carrot;

  step(s, { type: 'buy_seed', crop: 'carrot' });
  assert.equal(s.coins, prevCoins - CROPS.carrot.seedCost);
  assert.equal(s.seeds.carrot, prevSeeds + 1);
});

test('exceeding MAX_DAYS ends the game', () => {
  const s = createState(42);
  while (!isOver(s)) {
    step(s, { type: 'rest' });
  }
  assert.ok(s.day > 20 || s.stepCount >= 200);
  assert.equal(legalActions(s).length, 0);
});

test('illegal action throws without mutating state', () => {
  const s = createState(42);
  s.coins = 2;
  const snapshot = JSON.stringify(s);

  assert.throws(() => {
    step(s, { type: 'buy_seed', crop: 'berry' });
  });

  assert.equal(JSON.stringify(s), snapshot);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(999);
  const s2 = createState(999);

  for (let i = 0; i < 20; i++) {
    const actions1 = legalActions(s1);
    const actions2 = legalActions(s2);
    assert.deepEqual(actions1, actions2);
    if (actions1.length === 0) break;

    const chosen = actions1[i % actions1.length];
    step(s1, chosen);
    step(s2, chosen);
    assert.deepEqual(s1, s2);
  }
});
