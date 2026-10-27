const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  GRID_SIZE
} = require('./www/logic.js');

test('createState initializes 6x6 grid, oil and water hazards, party and enemies', () => {
  const s = createState(111);
  assert.strictEqual(s.turn, 1);
  assert.strictEqual(s.done, false);
  assert.strictEqual(s.party.length, 2);
  assert.strictEqual(s.party[0].id, 'kael');
  assert.strictEqual(s.party[1].id, 'valeria');
  assert.strictEqual(s.enemies.length, 3);
  assert.strictEqual(s.surfaces[3][2].surface, 'oil');
  assert.strictEqual(s.surfaces[2][4].surface, 'water');
});

test('legalActions lists movements, attacks, spells, and end_turn', () => {
  const s = createState(222);
  const actions = legalActions(s);

  assert.ok(actions.includes('end_turn'));
  assert.ok(actions.includes('move:kael:4,2'));
  assert.ok(actions.includes('ignite:valeria:3,2'));
  assert.ok(actions.includes('lightning:valeria:2,4'));
});

test('moving deducts AP and updates hero location', () => {
  const s = createState(333);
  assert.strictEqual(s.party[0].ap, 4);

  step(s, 'move:kael:4,2');

  assert.strictEqual(s.party[0].r, 4);
  assert.strictEqual(s.party[0].c, 2);
  assert.strictEqual(s.party[0].ap, 3);
});

test('ignite converts oil surface into flaming fire surface', () => {
  const s = createState(444);
  assert.strictEqual(s.surfaces[3][2].surface, 'oil');

  step(s, 'ignite:valeria:3,2');

  assert.strictEqual(s.surfaces[3][2].surface, 'fire');
  assert.strictEqual(s.surfaces[3][2].duration, 3);
  assert.strictEqual(s.party[1].ap, 1); // 4 - 3 AP
});

test('chain lightning electrifies water puddle into shock pool', () => {
  const s = createState(555);
  assert.strictEqual(s.surfaces[2][4].surface, 'water');

  step(s, 'lightning:valeria:2,4');

  assert.strictEqual(s.surfaces[2][4].surface, 'electrified');
  assert.strictEqual(s.surfaces[2][4].duration, 3);
});

test('shield bash damages and shoves enemy backward', () => {
  const s = createState(666);
  // Move Kael adjacent to enemy
  s.party[0].r = 2;
  s.party[0].c = 1;
  // Marksman is at (1, 1)
  const initHp = s.enemies[0].hp;

  step(s, 'bash:kael:0');

  assert.ok(s.enemies[0].hp < initHp);
  assert.strictEqual(s.enemies[0].r, 0); // Shoved from (1, 1) to (0, 1)
});

test('flanking strike triggers when allies are on opposite sides of target', () => {
  const s = createState(777);
  // Target at (3, 3)
  s.enemies[0].r = 3; s.enemies[0].c = 3;
  // Kael at (4, 3) (south of target), Valeria at (2, 3) (north of target)
  s.party[0].r = 4; s.party[0].c = 3;
  s.party[1].r = 2; s.party[1].c = 3;
  const initHp = s.enemies[0].hp;

  step(s, 'slash:kael:0');

  // Normal slash is 20, flanking is 26 (floor(20 * 1.3))
  assert.strictEqual(initHp - s.enemies[0].hp, 26);
});

test('end_turn runs enemy phase, simulates burns and resets party AP', () => {
  const s = createState(888);
  s.party[0].ap = 1;
  s.party[1].ap = 0;

  step(s, 'end_turn');

  assert.strictEqual(s.turn, 2);
  assert.strictEqual(s.party[0].ap, 4);
  assert.strictEqual(s.party[1].ap, 4);
});

test('eliminating all enemies achieves tactical victory', () => {
  const s = createState(999);
  s.enemies[0].alive = false;
  s.enemies[1].alive = false;
  s.enemies[2].alive = true;
  s.enemies[2].hp = 5;
  s.enemies[2].r = 4;
  s.enemies[2].c = 2;
  s.party[0].r = 5;
  s.party[0].c = 2;

  step(s, 'slash:kael:2');

  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'player');
  assert.ok(score(s) > 300);
});

test('both party members falling triggers defeat', () => {
  const s = createState(1010);
  s.party[0].alive = false; s.party[0].hp = 0;
  s.party[1].hp = 5;
  // Place enemy right in front of Valeria
  s.enemies[2].r = 5; s.enemies[2].c = 4;

  step(s, 'end_turn'); // Enemy attacks Valeria for 22 dmg

  assert.strictEqual(s.party[1].alive, false);
  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'enemy');
});

test('same seed and sequence of crpg decisions yields deterministic simulation', () => {
  const s1 = createState(112000);
  const s2 = createState(112000);

  for (let i = 0; i < 6; i++) {
    if (s1.done) break;
    const legals = legalActions(s1);
    if (legals.length === 0) break;
    const act = legals[0];
    step(s1, act);
    step(s2, act);
  }

  assert.strictEqual(JSON.stringify(s1), JSON.stringify(s2));
});
