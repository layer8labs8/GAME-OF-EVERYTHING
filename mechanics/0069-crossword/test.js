const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_STAGES,
  MAX_MOVES_PER_STAGE,
  HINTS_PER_STAGE,
  STAGE_CONFIGS,
  createState,
  legalActions,
  step,
  isOver,
  score
} = require('./www/logic.js');

test('createState initializes stage 1 with 4x4 grid and letter bank', () => {
  const s = createState(42);
  assert.equal(s.stage, 1);
  assert.equal(s.size, 4);
  assert.equal(s.grid.length, 4);
  assert.equal(s.grid[0].length, 4);
  assert.equal(s.title, 'Harbor Haven');
  assert.equal(s.hintsRemaining, HINTS_PER_STAGE);
  assert.equal(s.done, false);
  assert.equal(s.won, false);
  assert.ok(s.letterBank.length >= 9);
});

test('across and down clues describe 4 target words', () => {
  const s = createState(100);
  assert.equal(s.acrossClues.length, 4);
  assert.equal(s.downClues.length, 4);
  assert.ok(s.acrossClues[0].includes('vessel'));
});

test('legalActions contains set actions for empty cells and check', () => {
  const s = createState(42);
  const actions = legalActions(s);
  assert.ok(actions.includes('check'));
  assert.ok(actions.includes(`set:0,0,${s.letterBank[0]}`));
  assert.ok(actions.includes('reveal:0,0'));
});

test('setting a character updates cell and scores reward', () => {
  const s = createState(42);
  const res = step(s, 'set:0,0,S');
  assert.equal(s.grid[0][0], 'S');
  assert.equal(s.stageMoves, 1);
  assert.ok(res.reward > 0);
});

test('illegal action throws an error', () => {
  const s = createState(42);
  assert.throws(() => {
    step(s, 'set:99,99,Z');
  }, /Illegal action/);
});

test('delete clears a previously placed cell', () => {
  const s = createState(42);
  step(s, 'set:0,0,S');
  assert.equal(s.grid[0][0], 'S');

  assert.ok(legalActions(s).includes('delete:0,0'));
  step(s, 'delete:0,0');
  assert.equal(s.grid[0][0], '');
});

test('reveal uses hint to place correct character', () => {
  const s = createState(42);
  const initialHints = s.hintsRemaining;
  step(s, 'reveal:0,1'); // Should be 'H' in SHIP
  assert.equal(s.grid[0][1], 'H');
  assert.equal(s.hintsRemaining, initialHints - 1);
  assert.equal(s.hintsUsed, 1);
});

test('completing stage 1 automatically advances to stage 2', () => {
  const s = createState(42);
  // Stage 1 solution: SHIP, HERO, IRON, POND
  const words = ['SHIP', 'HERO', 'IRON', 'POND'];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      step(s, `set:${r},${c},${words[r][c]}`);
    }
  }

  assert.equal(s.stage, 2);
  assert.equal(s.title, 'Winter Stroll');
  assert.equal(s.size, 4);
  assert.equal(s.done, false);
});

test('completing all 3 stages achieves victory', () => {
  const s = createState(777);

  // Solve Stage 1 (SHIP, HERO, IRON, POND)
  const s1 = ['SHIP', 'HERO', 'IRON', 'POND'];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      step(s, `set:${r},${c},${s1[r][c]}`);
    }
  }

  // Solve Stage 2 (SNOW, NOVA, OVAL, WALK)
  const s2 = ['SNOW', 'NOVA', 'OVAL', 'WALK'];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      step(s, `set:${r},${c},${s2[r][c]}`);
    }
  }

  // Solve Stage 3 (HEART, EMBER, ABUSE, RESIN, TREND)
  const s3 = ['HEART', 'EMBER', 'ABUSE', 'RESIN', 'TREND'];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      step(s, `set:${r},${c},${s3[r][c]}`);
    }
  }

  assert.equal(s.done, true);
  assert.equal(s.won, true);
  assert.ok(score(s) > 1500);
  assert.equal(legalActions(s).length, 0);
});

test('exceeding move limit leads to defeat', () => {
  const s = createState(123);
  for (let i = 0; i < MAX_MOVES_PER_STAGE; i++) {
    step(s, 'check');
    if (s.done) break;
  }

  assert.equal(s.done, true);
  assert.equal(s.won, false);
  assert.ok(isOver(s));
});

test('state simulation is deterministic across identical seed', () => {
  const s1 = createState(999);
  const s2 = createState(999);
  assert.deepEqual(s1, s2);

  step(s1, 'set:0,0,S');
  step(s2, 'set:0,0,S');
  assert.deepEqual(s1, s2);
});
