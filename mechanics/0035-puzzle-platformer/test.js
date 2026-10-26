const { test } = require('node:test');
const assert = require('node:assert/strict');
const logic = require('./www/logic.js');
const solver = require('./solver.js');
const levelsDoc = require('./levels.json');

test('createState initializes level 1 with player, walls, and goal', () => {
  const state = logic.createState(1, { levelIndex: 0 });
  assert.equal(state.player.x, 1);
  assert.equal(state.player.y, 1);
  assert.equal(state.exit.x, 5);
  assert.equal(state.exit.y, 1);
  assert.equal(logic.isOver(state), false);
  assert.equal(logic.score(state), 0);
});

test('moving right steps player across open tiles', () => {
  const state = logic.createState(1, { levelIndex: 0 });
  const res = logic.step(state, 'R');
  assert.equal(state.player.x, 2);
  assert.equal(typeof res.reward, 'number');
  assert.equal(typeof res.done, 'boolean');
});

test('pushing crate moves crate forward into target tile', () => {
  const state = logic.createState(1, { levelIndex: 2 }); // Level 003: Box Push
  // Player at (1, 2), crate at (3, 2)
  logic.step(state, 'R'); // Player to (2, 2)
  logic.step(state, 'R'); // Pushes crate from (3, 2) to (4, 2)
  assert.equal(state.crates[0].x, 4);
  assert.equal(state.player.x, 3);
});

test('replaying optimal solution solves level 1', () => {
  const state = logic.createState(1, { levelIndex: 0 });
  const solution = 'RRRR';
  for (const move of solution) {
    logic.step(state, move);
  }
  assert.equal(state.won, true);
  assert.equal(logic.isOver(state), true);
  assert.ok(logic.score(state) >= 500);
});

test('solver solves and verifies all levels in levels.json', () => {
  for (const lvl of levelsDoc.levels) {
    const problems = solver.validateLevel(lvl.data);
    assert.equal(problems.length, 0, `Level ${lvl.id} validation failed: ${problems.join(', ')}`);

    const result = solver.solve(lvl.data);
    assert.equal(result.solvable, true, `Level ${lvl.id} is unsolvable`);
    assert.equal(result.moves.length, lvl.par, `Level ${lvl.id} par mismatch`);
    assert.equal(result.moves, lvl.solution, `Level ${lvl.id} solution mismatch`);
    assert.equal(solver.replay(lvl.data, lvl.solution), true, `Level ${lvl.id} replay failed`);
  }
});

test('illegal action throws without mutating state', () => {
  const state = logic.createState(1, { levelIndex: 0 });
  // Cannot jump left into wall
  assert.throws(() => logic.step(state, 'J'), /Illegal action/);
  assert.equal(state.player.x, 1);
});

test('same seed and actions yield strictly deterministic state', () => {
  const s1 = logic.createState(444, { levelIndex: 3 });
  const s2 = logic.createState(444, { levelIndex: 3 });
  const actions = ['R', 'R', 'R', 'R', 'K', 'R'];

  for (const act of actions) {
    if (logic.legalActions(s1).includes(act)) {
      logic.step(s1, act);
      logic.step(s2, act);
    }
  }
  assert.deepEqual(s1, s2);
});
