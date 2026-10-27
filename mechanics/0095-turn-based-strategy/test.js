const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TURNS,
  RUSH_GOLD_COST
} = require('./www/logic.js');

test('createState initializes hex empire map, cities, and starting swordsmen', () => {
  const s = createState(42);
  assert.equal(s.turn, 1);
  assert.equal(s.cities.length, 3);
  assert.equal(s.cities[0].owner, 'player');
  assert.equal(s.cities[1].owner, 'enemy');
  assert.equal(s.cities[2].owner, 'neutral');
  assert.equal(s.units.length, 2);
  assert.equal(s.done, false);
});

test('legalActions provides movement, attack, city production, and end_turn', () => {
  const s = createState(101);
  const actions = legalActions(s);

  assert.ok(actions.includes('end_turn'));
  assert.ok(actions.some(a => a.startsWith('move:1:')));
  assert.ok(actions.some(a => a.startsWith('produce:0:')));
});

test('movement consumes unit MP and changes grid location', () => {
  const s = createState(202);
  const u = s.units.find(un => un.id === 1);
  assert.equal(u.r, 1);
  assert.equal(u.c, 1);
  assert.equal(u.mp, 2);

  step(s, 'move:1:1,2');
  assert.equal(u.r, 1);
  assert.equal(u.c, 2);
  assert.equal(u.mp, 1); // Cost 1 on plains
});

test('melee attack damages enemy and triggers retaliation counter-attack', () => {
  const s = createState(303);
  const playerUnit = s.units.find(u => u.id === 1);
  const enemyUnit = s.units.find(u => u.id === 2);
  playerUnit.r = 3;
  playerUnit.c = 4;
  enemyUnit.r = 4;
  enemyUnit.c = 4; // Adjacent (dist = 1)

  const initialPlayerHp = playerUnit.hp;
  const initialEnemyHp = enemyUnit.hp;

  step(s, 'attack:1:2');
  assert.ok(enemyUnit.hp < initialEnemyHp);
  assert.ok(playerUnit.hp < initialPlayerHp); // Retaliation
});

test('rush_unit expends gold and spawns requested battalion instantly', () => {
  const s = createState(404);
  s.gold = 60;
  const initialUnitsCount = s.units.length;

  step(s, 'rush_unit:0:archer');
  assert.equal(s.gold, 60 - RUSH_GOLD_COST);
  assert.equal(s.units.length, initialUnitsCount + 1);
  const newArcher = s.units.find(u => u.type === 'archer');
  assert.ok(newArcher);
  assert.equal(newArcher.team, 'player');
});

test('end_turn collects revenues, advances production, and executes AI', () => {
  const s = createState(505);
  const initialGold = s.gold;
  const initialTurn = s.turn;

  step(s, 'end_turn');
  assert.equal(s.turn, initialTurn + 1);
  assert.ok(s.gold > initialGold);
});

test('capturing enemy capital triggers Total Conquest Victory', () => {
  const s = createState(606);
  const u = s.units.find(un => un.id === 1);
  u.r = 4;
  u.c = 3; // Adjacent to Khorad (4, 4)

  // Empty enemy unit from capital
  s.units = s.units.filter(un => un.id === 1);

  step(s, 'move:1:4,4');
  assert.equal(s.cities[1].owner, 'player');
  assert.equal(s.done, true);
  assert.equal(s.winner, 'player');
  assert.equal(s.result, 'victory');
  assert.equal(isOver(s), true);
  assert.ok(score(s) > 500);
});

test('losing player capital city triggers defeat', () => {
  const s = createState(707);
  s.cities[0].owner = 'enemy';

  step(s, 'end_turn');
  assert.equal(s.done, true);
  assert.equal(s.winner, 'enemy');
  assert.equal(s.result, 'defeat');
});

test('illegal action throws error without state mutation', () => {
  const s = createState(808);
  const snapshot = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'rush_unit:0:knight'); // Only 30 gold, rush requires 50
  }, /Illegal action/);

  assert.equal(JSON.stringify(s), snapshot);
});

test('same seed and orders produce strictly deterministic Turn-Based Strategy campaign', () => {
  const s1 = createState(1616);
  const s2 = createState(1616);

  const orders = ['move:1:1,2', 'produce:0:archer', 'end_turn'];
  for (const act of orders) {
    if (legalActions(s1).includes(act) && legalActions(s2).includes(act)) {
      step(s1, act);
      step(s2, act);
    }
  }

  assert.deepEqual(s1, s2);
});
