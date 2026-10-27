const test = require('node:test');
const assert = require('node:assert');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAP_ROWS,
  MAP_COLS,
  VICTORY_SECTORS
} = require('./www/logic.js');

test('createState initializes 5x5 grid, reserves, player and enemy strongholds', () => {
  const s = createState(111);
  assert.strictEqual(s.turn, 1);
  assert.strictEqual(s.done, false);
  assert.ok(s.playerReserves >= 3);

  let pCount = 0;
  let eCount = 0;
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (s.grid[r][c].owner === 'player') pCount++;
      if (s.grid[r][c].owner === 'enemy') eCount++;
    }
  }
  assert.strictEqual(pCount, 4);
  assert.strictEqual(eCount, 4);
});

test('legalActions lists deployments, attacks, and end_turn', () => {
  const s = createState(222);
  const actions = legalActions(s);

  assert.ok(actions.includes('end_turn'));
  assert.ok(actions.some(a => a.startsWith('deploy:4,')));
  assert.ok(actions.some(a => a.startsWith('attack:')));
});

test('deploying reinforcements boosts sector garrison and reduces reserves', () => {
  const s = createState(333);
  const initRes = s.playerReserves;
  const initTroops = s.grid[4][4].troops;

  step(s, 'deploy:4,4');

  assert.strictEqual(s.grid[4][4].troops, initTroops + 2);
  assert.strictEqual(s.playerReserves, initRes - 2);
});

test('successful assault captures sector and transfers surviving forces', () => {
  const s = createState(444);
  s.grid[4][3].troops = 12; // Massive attacking garrison
  s.grid[3][3].owner = 'neutral';
  s.grid[3][3].troops = 2; // Weak defender
  s.grid[3][3].fort = 0;

  step(s, 'attack:4,3->3,3');

  assert.strictEqual(s.grid[3][3].owner, 'player');
  assert.ok(s.grid[3][3].troops >= 1);
  assert.strictEqual(s.grid[4][3].troops, 1); // 1 troop remains behind
});

test('fortify upgrades bastion tier at garrison troop cost', () => {
  const s = createState(555);
  s.grid[4][4].troops = 8;
  const initFort = s.grid[4][4].fort;

  step(s, 'fortify:4,4');

  assert.strictEqual(s.grid[4][4].fort, initFort + 1);
  assert.strictEqual(s.grid[4][4].troops, 6);
});

test('end_turn advances turn, mobilizes reinforcements and resets attack flags', () => {
  const s = createState(666);
  s.grid[4][4].hasAttacked = true;

  step(s, 'end_turn');

  assert.strictEqual(s.turn, 2);
  assert.strictEqual(s.grid[4][4].hasAttacked, false);
  assert.ok(s.playerReserves >= 3);
});

test('controlling 18 or more sectors triggers territorial victory', () => {
  const s = createState(777);
  let count = 0;
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (count < 18) {
        s.grid[r][c].owner = 'player';
        count++;
      } else {
        s.grid[r][c].owner = 'enemy';
      }
    }
  }

  step(s, 'end_turn');

  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'player');
  assert.ok(score(s) > 300);
});

test('losing all sectors triggers defeat', () => {
  const s = createState(888);
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      s.grid[r][c].owner = 'enemy';
    }
  }

  step(s, 'end_turn');

  assert.strictEqual(s.done, true);
  assert.strictEqual(s.winner, 'enemy');
});

test('illegal action throws error without state mutation', () => {
  const s = createState(999);
  const snap = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'attack:0,0->4,4'); // Cannot attack non-adjacent sector
  }, /Illegal action/);

  assert.strictEqual(JSON.stringify(s), snap);
});

test('same seed and sequence of strategic orders yields deterministic state', () => {
  const s1 = createState(123456);
  const s2 = createState(123456);

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
