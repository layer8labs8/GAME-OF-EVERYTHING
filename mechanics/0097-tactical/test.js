const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TURNS
} = require('./www/logic.js');

test('createState initializes floorplan, SWAT operators, tangos, and bomb timer', () => {
  const s = createState(42);
  assert.equal(s.turn, 1);
  assert.equal(s.bombTimer, 18);
  assert.equal(s.bombDefused, false);
  assert.equal(s.rooms.length, 4);
  assert.equal(s.doors.length, 4);
  assert.equal(s.operators.length, 3);
  assert.equal(s.tangos.length, 6);
  assert.equal(s.done, false);
});

test('legalActions contains door breaching options and wait', () => {
  const s = createState(101);
  const actions = legalActions(s);

  assert.ok(actions.includes('wait'));
  assert.ok(actions.includes('breach_door:0:pick'));
  assert.ok(actions.includes('breach_door:0:flashbang'));
  assert.ok(actions.includes('breach_door:0:charge'));
});

test('flashbang breach opens door and applies stun to room tangos', () => {
  const s = createState(202);
  const shield = s.operators.find(o => o.id === 'shield');
  const initialFlashes = shield.flashbangs;

  step(s, 'breach_door:0:flashbang');
  assert.equal(s.doors[0].open, true);
  assert.equal(s.rooms[1].breached, true);
  assert.equal(shield.flashbangs, initialFlashes - 1);

  const tangosInRoom1 = s.tangos.filter(t => t.room === 1);
  tangosInRoom1.forEach(t => {
    assert.ok(t.stunned > 0);
  });
});

test('advancing into breached room establishes firing angles', () => {
  const s = createState(303);
  step(s, 'breach_door:0:pick');

  step(s, 'advance_room:shield:1');
  const shield = s.operators.find(o => o.id === 'shield');
  assert.equal(shield.room, 1);

  const actions = legalActions(s);
  assert.ok(actions.includes('engage_target:shield:t1'));
});

test('engaging tango deals ballistic damage and eliminates threat', () => {
  const s = createState(404);
  step(s, 'breach_door:0:charge');
  step(s, 'advance_room:scout:1');

  const scout = s.operators.find(o => o.id === 'scout');
  const target = s.tangos.find(t => t.id === 't1');
  assert.ok(target);

  step(s, 'engage_target:scout:t1');
  // Scout deals 40 dmg, tango had 35 - 15 (charge) = 20 HP, so eliminated!
  assert.ok(!s.tangos.some(t => t.id === 't1'));
});

test('defuse_device disarms explosive device in vault', () => {
  const s = createState(505);
  // Put shield in Room 3
  s.operators[0].room = 3;

  step(s, 'defuse_device:shield');
  assert.equal(s.defuseProgress, 50);

  step(s, 'defuse_device:shield');
  assert.equal(s.defuseProgress, 100);
  assert.equal(s.bombDefused, true);
});

test('clearing all tangos and defusing bomb achieves Tactical Triumph', () => {
  const s = createState(606);
  s.bombDefused = true;
  s.tangos = [{ id: 't1', room: 1, hp: 5, maxHp: 35, dmg: 15, stunned: 1 }];
  s.operators[0].room = 1;

  step(s, 'engage_target:shield:t1');
  assert.equal(s.done, true);
  assert.equal(s.winner, 'player');
  assert.equal(s.result, 'victory');
  assert.equal(isOver(s), true);
  assert.ok(score(s) > 500);
});

test('bomb detonation causes mission defeat', () => {
  const s = createState(707);
  s.bombTimer = 1;

  step(s, 'wait');
  assert.equal(s.done, true);
  assert.equal(s.winner, 'enemy');
  assert.equal(s.result, 'bomb_detonated');
});

test('illegal action throws error without state mutation', () => {
  const s = createState(808);
  const snapshot = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'defuse_device:shield'); // Not in Room 3
  }, /Illegal action/);

  assert.equal(JSON.stringify(s), snapshot);
});

test('same seed and orders produce strictly deterministic Tactical Breach mission', () => {
  const s1 = createState(1818);
  const s2 = createState(1818);

  const orders = ['breach_door:0:flashbang', 'advance_room:shield:1', 'wait'];
  for (const act of orders) {
    if (legalActions(s1).includes(act) && legalActions(s2).includes(act)) {
      step(s1, act);
      step(s2, act);
    }
  }

  assert.deepEqual(s1, s2);
});
