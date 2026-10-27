const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  getHexNeighbors,
  hexDist,
  getTerrain
} = require('./www/logic.js');

test('createState generates hex theater, units, HQs, and full supply lines', () => {
  const s = createState(42);
  assert.strictEqual(s.turn, 1);
  assert.strictEqual(s.done, false);
  assert.strictEqual(s.units.length, 8);
  assert.strictEqual(s.hqs.blue.r, 0);
  assert.strictEqual(s.hqs.blue.c, 2);
  assert.strictEqual(s.hqs.red.r, 4);
  assert.strictEqual(s.hqs.red.c, 2);

  // All blue units start connected to blue HQ
  const blueUnits = s.units.filter(u => u.side === 'blue');
  assert.ok(blueUnits.every(u => u.inSupply));
});

test('getHexNeighbors respects 5x5 boundaries and returns 6-direction offsets', () => {
  // Center hex (2, 2)
  const nbs = getHexNeighbors(2, 2);
  assert.strictEqual(nbs.length, 6);

  // Corner hex (0, 0)
  const cornerNbs = getHexNeighbors(0, 0);
  assert.ok(cornerNbs.length < 6);
  assert.ok(cornerNbs.every(nb => nb.r >= 0 && nb.r < 5 && nb.c >= 0 && nb.c < 5));
});

test('legalActions produces moves, bombardments, and operational pass', () => {
  const s = createState(101);
  const actions = legalActions(s);
  assert.ok(actions.includes('end_turn'));

  // Armored division has MP > 0 and adjacent vacant hexes
  assert.ok(actions.some(a => a.startsWith('move:u_b_armor:')));
  // Artillery has bombardment actions against enemy scout within range
  assert.ok(actions.some(a => a.startsWith('bombard:u_b_arty:')));
});

test('moving division updates coordinates, consumes MP, and clears entrenchment', () => {
  const s = createState(202);
  const inf = s.units.find(u => u.id === 'u_b_inf');
  inf.entrenched = 2;

  const validMove = legalActions(s).find(a => a.startsWith('move:u_b_inf:'));
  assert.ok(validMove);

  const coords = validMove.split(':')[2].split(',').map(Number);
  step(s, validMove);

  assert.strictEqual(inf.r, coords[0]);
  assert.strictEqual(inf.c, coords[1]);
  assert.strictEqual(inf.entrenched, 0);
  assert.strictEqual(inf.moved, true);
});

test('artillery bombardment inflicts suppression damage without counter-attack', () => {
  const s = createState(303);
  const redScout = s.units.find(u => u.id === 'u_r_recon');
  redScout.r = 1;
  redScout.c = 3;
  redScout.entrenched = 1;
  const initialStr = redScout.strength;

  const act = `bombard:u_b_arty:${redScout.r},${redScout.c}`;
  const res = step(s, act);

  assert.ok(redScout.strength < initialStr);
  assert.strictEqual(redScout.entrenched, 0);
  assert.ok(res.reward > 0);
});

test('combat between adjacent units resolves CRT and applies casualties', () => {
  const s = createState(404);
  const armor = s.units.find(u => u.id === 'u_b_armor');
  const enemy = s.units.find(u => u.id === 'u_r_recon');

  // Place adjacent
  armor.r = 2;
  armor.c = 2;
  enemy.r = 2;
  enemy.c = 3;

  const initialDefStr = enemy.strength;
  const act = `attack:u_b_armor:${enemy.r},${enemy.c}`;
  step(s, act);

  assert.ok(enemy.strength < initialDefStr || enemy.r !== 2 || enemy.c !== 3);
  assert.strictEqual(armor.attacked, true);
});

test('capturing enemy HQ triggers decisive operational victory', () => {
  const s = createState(505);
  const armor = s.units.find(u => u.id === 'u_b_armor');
  armor.r = 3;
  armor.c = 2;
  // Vacate red HQ
  const redHqUnit = s.units.find(u => u.r === 4 && u.c === 2);
  if (redHqUnit) {
    redHqUnit.r = 4;
    redHqUnit.c = 4;
  }

  const act = 'move:u_b_armor:4,2';
  const res = step(s, act);

  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'blue');
  assert.strictEqual(s.result, 'hq_captured');
  assert.ok(res.reward >= 100);
});

test('end_turn advances operational clock and runs enemy phase', () => {
  const s = createState(606);
  assert.strictEqual(s.turn, 1);

  step(s, 'end_turn');

  assert.strictEqual(s.turn, 2);
  // Units should have reset movement and attack allowance
  const armor = s.units.find(u => u.id === 'u_b_armor');
  assert.strictEqual(armor.moved, false);
  assert.strictEqual(armor.attacked, false);
  assert.strictEqual(armor.mp, armor.maxMp);
});

test('illegal action throws without mutating state', () => {
  const s = createState(707);
  const jsonBefore = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'move:u_b_armor:4,4'); // Out of range illegal move
  }, /Illegal action/);

  assert.strictEqual(JSON.stringify(s), jsonBefore);
});

test('same seed and sequence of operational orders produce identical simulation', () => {
  const s1 = createState(8888);
  const s2 = createState(8888);

  for (let i = 0; i < 5; i++) {
    const legals = legalActions(s1);
    const act = legals[0];
    step(s1, act);
    step(s2, act);
  }

  assert.strictEqual(JSON.stringify(s1), JSON.stringify(s2));
});
