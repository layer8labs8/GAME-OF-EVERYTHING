const test = require('node:test');
const assert = require('node:assert/strict');
const tabletop = require('./www/logic.js');

test('createState initializes 7x7 grid, units, shrines, and 3 AP', () => {
  const s = tabletop.createState(42);
  assert.equal(s.grid.length, 7);
  assert.equal(s.grid[0].length, 7);
  assert.equal(s.ap, 3);
  assert.equal(s.round, 1);
  assert.equal(s.gameOver, false);
  assert.equal(s.units.p_paladin.hp, 35);
  assert.equal(s.units.e_knight.hp, 35);
  assert.ok(s.shrines['3,1']);
  assert.ok(s.shrines['3,5']);
});

test('move shifts unit position and consumes 1 AP', () => {
  const s = tabletop.createState(101);
  // Paladin starts at (6, 2)
  assert.equal(s.units.p_paladin.r, 6);
  assert.equal(s.units.p_paladin.c, 2);

  const legal = tabletop.legalActions(s);
  assert.ok(legal.includes('move:p_paladin:5,2'));

  tabletop.step(s, 'move:p_paladin:5,2');
  assert.equal(s.units.p_paladin.r, 5);
  assert.equal(s.units.p_paladin.c, 2);
  assert.equal(s.ap, 2);
});

test('attack deals damage to enemy in range and records combat log', () => {
  const s = tabletop.createState(202);
  // Place Mage at (1, 3), adjacent to enemy Necromancer at (0, 3)
  s.units.p_mage.r = 1;
  s.units.p_mage.c = 3;

  const initHp = s.units.e_necro.hp;
  const legal = tabletop.legalActions(s);
  assert.ok(legal.includes('attack:p_mage:e_necro'));

  tabletop.step(s, 'attack:p_mage:e_necro');
  assert.ok(s.units.e_necro.hp < initHp);
  assert.ok(s.combatLog.length > 0);
});

test('slaying enemy unit eliminates it and awards 5 VP', () => {
  const s = tabletop.createState(303);
  s.units.p_paladin.r = 1;
  s.units.p_paladin.c = 2;
  s.units.e_knight.hp = 2; // Low HP

  tabletop.step(s, 'attack:p_paladin:e_knight');
  assert.equal(s.units.e_knight.alive, false);
  assert.ok(s.playerVp >= 5);
});

test('claiming shrine establishes ownership and awards VP', () => {
  const s = tabletop.createState(404);
  // Place Paladin on West Shrine at (3, 1)
  s.units.p_paladin.r = 3;
  s.units.p_paladin.c = 1;

  const legal = tabletop.legalActions(s);
  assert.ok(legal.includes('claim:p_paladin'));

  tabletop.step(s, 'claim:p_paladin');
  assert.equal(s.shrines['3,1'].owner, 'p');
  assert.ok(s.playerVp >= 2);
});

test('end_turn executes enemy warband actions and increments round', () => {
  const s = tabletop.createState(505);
  const initRound = s.round;

  tabletop.step(s, 'end_turn');
  assert.equal(s.round, initRound + 1);
  assert.equal(s.ap, 3); // AP refreshed for new round
});

test('annihilating enemy squad wins match for player', () => {
  const s = tabletop.createState(606);
  s.units.e_knight.alive = false;
  s.units.e_archer.alive = false;
  s.units.e_necro.hp = 1;
  s.units.p_mage.r = 1;
  s.units.p_mage.c = 3;

  const res = tabletop.step(s, 'attack:p_mage:e_necro');
  assert.equal(res.done, true);
  assert.equal(s.gameOver, true);
  assert.equal(s.winner, 'p');
  assert.ok(res.reward >= 25);
});

test('illegal action throws error without mutating state', () => {
  const s = tabletop.createState(707);
  const snap = JSON.stringify(s);

  assert.throws(() => {
    tabletop.step(s, 'move:p_paladin:0,0'); // Impassable distance
  });

  assert.equal(JSON.stringify(s), snap);
});

test('same seed and action sequence produces strictly deterministic state', () => {
  const s1 = tabletop.createState(808);
  const s2 = tabletop.createState(808);

  tabletop.step(s1, 'move:p_paladin:5,2');
  tabletop.step(s2, 'move:p_paladin:5,2');

  assert.deepEqual(s1, s2);
});
