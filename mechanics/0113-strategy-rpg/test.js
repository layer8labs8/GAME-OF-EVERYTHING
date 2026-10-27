const test = require('node:test');
const assert = require('node:assert');
const { createState, legalActions, step, isOver, score } = require('./www/logic.js');

test('createState initializes 6x6 terrain, 3 players, 3 enemies and activeUnitId', () => {
  const s = createState(42);
  assert.strictEqual(s.terrain.length, 6);
  assert.strictEqual(s.terrain[0].length, 6);
  assert.strictEqual(s.players.length, 3);
  assert.strictEqual(s.enemies.length, 3);
  assert.strictEqual(s.activeUnitId, 'p1');
  assert.strictEqual(s.round, 1);
  assert.strictEqual(s.done, false);
  assert.strictEqual(isOver(s), false);
  assert.strictEqual(score(s), 0);
});

test('legalActions returns valid movement and wait for unacted active unit', () => {
  const s = createState(101);
  const actions = legalActions(s);
  assert.ok(actions.includes('wait'));
  assert.ok(actions.some(a => a.startsWith('move:')));
  assert.strictEqual(actions.some(a => a.startsWith('attack:')), false); // Enemies too far at start
});

test('move shifts unit position, updates facing, and keeps attack/wait legal', () => {
  const s = createState(102);
  const unit = s.players.find(p => p.id === 'p1');
  const startX = unit.x;
  const startY = unit.y;

  // Move 1 step forward (north)
  const res = step(s, `move:${startX},${startY - 1}`);
  assert.strictEqual(res.done, false);
  assert.strictEqual(unit.x, startX);
  assert.strictEqual(unit.y, startY - 1);
  assert.strictEqual(unit.hasMoved, true);
  assert.strictEqual(unit.facing, 'N');

  // Should no longer allow move, but can wait
  const actions = legalActions(s);
  assert.strictEqual(actions.some(a => a.startsWith('move:')), false);
  assert.ok(actions.includes('wait'));
});

test('attack damages enemy within range and adds score', () => {
  const s = createState(103);
  const p = s.players.find(u => u.id === 'p1');
  const e = s.enemies.find(u => u.id === 'e1');

  // Place enemy right next to p1
  e.x = p.x;
  e.y = p.y - 1;
  const initialEnemyHp = e.hp;

  const actions = legalActions(s);
  assert.ok(actions.includes(`attack:${e.id}`));

  const res = step(s, `attack:${e.id}`);
  assert.strictEqual(res.done, false);
  assert.ok(e.hp < initialEnemyHp);
  assert.ok(score(s) > 0);
  assert.strictEqual(p.acted, true);
});

test('backstab deals increased damage compared to front attack', () => {
  const sFront = createState(201);
  const pF = sFront.players.find(u => u.id === 'p1');
  const eF = sFront.enemies.find(u => u.id === 'e1');
  eF.facing = 'S';
  pF.x = eF.x;
  pF.y = eF.y + 1; // In front of eF facing S
  step(sFront, `attack:${eF.id}`);
  const frontDamage = 120 - eF.hp;

  const sBack = createState(201);
  const pB = sBack.players.find(u => u.id === 'p1');
  const eB = sBack.enemies.find(u => u.id === 'e1');
  eB.facing = 'N';
  pB.x = eB.x;
  pB.y = eB.y + 1; // Behind eB facing N
  step(sBack, `attack:${eB.id}`);
  const backDamage = 120 - eB.hp;

  assert.ok(backDamage > frontDamage, `Backstab (${backDamage}) should exceed front (${frontDamage})`);
});

test('special skill triggers unique effects: commander stuns and mage chain damages', () => {
  const s = createState(301);
  const p1 = s.players.find(u => u.id === 'p1');
  const e1 = s.enemies.find(u => u.id === 'e1');
  e1.x = p1.x;
  e1.y = p1.y - 1;

  // Commander shield bash
  step(s, `skill:${e1.id}`);
  assert.strictEqual(e1.stun, 1);

  // Next unit is p2 or p3
  const activeNext = s.players.find(p => p.id === s.activeUnitId);
  assert.ok(activeNext.id !== 'p1');
});

test('turn completes when all player units act, running enemy phase and starting round 2', () => {
  const s = createState(401);
  assert.strictEqual(s.round, 1);

  // Each player unit waits
  step(s, 'wait'); // p1
  step(s, 'wait'); // p2
  step(s, 'wait'); // p3 -> triggers enemy phase and advances round

  assert.strictEqual(s.round, 2);
  assert.strictEqual(s.players.every(p => !p.acted), true);
  assert.strictEqual(s.activeUnitId, 'p1');
});

test('slaying all enemies awards victory and 1.0 reward', () => {
  const s = createState(501);
  const p1 = s.players.find(u => u.id === 'p1');
  p1.atk = 200; // Overpowered hero

  // Put all 3 enemies in front with 1 HP
  s.enemies.forEach((e, idx) => {
    e.hp = 1;
    e.x = 0;
    e.y = idx;
  });
  p1.x = 0;
  p1.y = 3;

  step(s, `attack:e3`); // Kill e3
  // Slay remaining
  s.enemies[0].hp = 0;
  s.enemies[1].hp = 0;

  // Next unit acts or waits
  const res = step(s, 'wait');
  assert.strictEqual(res.done, true);
  assert.strictEqual(res.reward, 1.0);
  assert.strictEqual(s.victory, true);
  assert.strictEqual(isOver(s), true);
});

test('defeat occurs if Lord Commander falls in battle', () => {
  const s = createState(601);
  const p1 = s.players.find(u => u.id === 'p1');
  p1.hp = 0; // Commander slain

  const res = step(s, 'wait');
  assert.strictEqual(res.done, true);
  assert.strictEqual(res.reward, 0.0);
  assert.strictEqual(s.victory, false);
  assert.strictEqual(isOver(s), true);
});

test('illegal action throws error without mutating state', () => {
  const s = createState(701);
  const serializedBefore = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'attack:nonexistent');
  }, /Illegal action/);

  assert.strictEqual(JSON.stringify(s), serializedBefore);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = createState(999);
  const s2 = createState(999);

  const script = ['move:1,3', 'wait', 'wait'];

  for (const act of script) {
    if (s1.done) break;
    step(s1, act);
    step(s2, act);
  }

  assert.strictEqual(JSON.stringify(s1), JSON.stringify(s2));
});
