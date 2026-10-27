const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MIRACLE_COSTS
} = require('./www/logic.js');

test('createState initializes world grid, holy temple, shadow shrine, and mana reserve', () => {
  const s = createState(42);
  assert.strictEqual(s.turn, 1);
  assert.strictEqual(s.done, false);
  assert.strictEqual(s.mana, 60);
  assert.strictEqual(s.grid.length, 5);
  assert.strictEqual(s.grid[0].length, 5);

  const temple = s.settlements.find(st => st.id === 'holy_temple');
  assert.ok(temple);
  assert.strictEqual(temple.owner, 'player');
  assert.strictEqual(temple.level, 1);

  const shrine = s.settlements.find(st => st.id === 'shadow_shrine');
  assert.ok(shrine);
  assert.strictEqual(shrine.owner, 'rival');
  assert.strictEqual(shrine.hp, 100);
});

test('legalActions lists rain, lightning, terraforming, and wait', () => {
  const s = createState(101);
  const actions = legalActions(s);

  assert.ok(actions.includes('wait'));
  assert.ok(actions.some(a => a.startsWith('miracle_rain:')));
  assert.ok(actions.some(a => a.startsWith('miracle_lightning:')));
  assert.ok(actions.some(a => a.startsWith('miracle_raise_land:')));
});

test('miracle_rain fertilizes soil and feeds player settlement', () => {
  const s = createState(202);
  const temple = s.settlements.find(st => st.id === 'holy_temple');
  const initialFood = temple.food;
  const initialMana = s.mana;

  // Rain on desert (0, 2)
  step(s, 'miracle_rain:0,2');

  assert.strictEqual(s.grid[0][2].type, 'fertile');
  assert.ok(temple.food > initialFood);
});

test('miracle_lightning smites rival shrine and damages structure', () => {
  const s = createState(303);
  const shrine = s.settlements.find(st => st.id === 'shadow_shrine');
  const initialHp = shrine.hp;

  step(s, `miracle_lightning:${shrine.r},${shrine.c}`);
  assert.ok(shrine.hp < initialHp);
});

test('miracle_lightning on neutral village converts inhabitants to player faith', () => {
  const s = createState(404);
  const village = s.settlements.find(st => st.id === 'village_east');
  assert.strictEqual(village.owner, 'neutral');

  step(s, `miracle_lightning:${village.r},${village.c}`);
  assert.strictEqual(village.owner, 'player');
});

test('miracle_raise_land uplifts seabed into plains', () => {
  const s = createState(505);
  // (2, 0) is water
  assert.strictEqual(s.grid[2][0].type, 'water');

  step(s, 'miracle_raise_land:2,0');
  assert.strictEqual(s.grid[2][0].type, 'plains');
});

test('miracle_inspire upgrades temple level and unlocks capacity', () => {
  const s = createState(606);
  const temple = s.settlements.find(st => st.id === 'holy_temple');
  assert.strictEqual(temple.level, 1);

  step(s, 'miracle_inspire:holy_temple');
  assert.strictEqual(temple.level, 2);
  assert.ok(temple.maxPop > 60);
});

test('holy crusade marches against shadow shrine to eliminate darkness', () => {
  const s = createState(707);
  const shrine = s.settlements.find(st => st.id === 'shadow_shrine');
  shrine.hp = 30; // Vulnerable to crusade

  step(s, 'miracle_crusade:holy_temple');

  // Crusade resolves during life cycle and destroys shrine
  assert.strictEqual(shrine.hp, 0);
  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'player');
  assert.strictEqual(s.result, 'shadow_destroyed');
  assert.ok(score(s) > 150);
});

test('illegal action throws error without state mutation', () => {
  const s = createState(808);
  s.mana = 5; // Insufficient mana for rain (15)
  const jsonBefore = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'miracle_rain:0,2');
  }, /Illegal action/);

  assert.strictEqual(JSON.stringify(s), jsonBefore);
});

test('same seed and sequence of miracles yields strictly deterministic simulation', () => {
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
