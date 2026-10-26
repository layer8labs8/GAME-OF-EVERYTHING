const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { LEVELS, move, isSolved, play, createState, legalActions, step, isOver, score } = require('./www/logic.js');
const { validateLevel, solve, replay } = require('./solver.js');

test('walking onto floor and onto a target', () => {
  assert.deepEqual(move(['@ '], 'R'), [' @']);
  assert.deepEqual(move(['@.'], 'R'), [' +']);
});

test('leaving a target keeps the target', () => {
  assert.deepEqual(move(['+ '], 'R'), ['.@']);
});

test('pushing a crate onto floor and onto a target', () => {
  assert.deepEqual(move(['@$ '], 'R'), [' @$']);
  assert.deepEqual(move(['@$.'], 'R'), [' @*']);
});

test('pushing a crate off a target and between targets', () => {
  assert.deepEqual(move(['@* '], 'R'), [' +$']);
  assert.deepEqual(move(['@*.'], 'R'), [' +*']);
});

test('a crate cannot be pushed into a wall, another crate or the edge', () => {
  assert.deepEqual(move(['@$#'], 'R'), ['@$#']);
  assert.deepEqual(move(['@$$'], 'R'), ['@$$']);
  assert.deepEqual(move(['@$'], 'R'), ['@$']);
});

test('moves out of bounds and into walls do nothing', () => {
  assert.deepEqual(move(['@'], 'L'), ['@']);
  assert.deepEqual(move(['@'], 'U'), ['@']);
  assert.deepEqual(move(['@'], 'D'), ['@']);
  assert.deepEqual(move(['#', '@'], 'U'), ['#', '@']);
});

test('vertical pushes work', () => {
  assert.deepEqual(move(['@', '$', ' '], 'D'), [' ', '@', '$']);
});

test('the input grid is never changed', () => {
  const grid = ['@$ '];
  const before = JSON.stringify(grid);
  move(grid, 'R');
  assert.equal(JSON.stringify(grid), before);
});

test('bad input throws', () => {
  assert.throws(() => move(['@ '], 'X'), /bad direction/);
  assert.throws(() => move(['  '], 'R'), /no player/);
});

test('isSolved needs no loose crate and at least one crate on a target', () => {
  assert.equal(isSolved(['@*']), true);
  assert.equal(isSolved(['+*']), true);
  assert.equal(isSolved(['@$.']), false);
  assert.equal(isSolved(['@ ']), false);
});

test('play applies a move string in order', () => {
  assert.deepEqual(play(['@$.'], 'R'), [' @*']);
  assert.equal(isSolved(play(['@$.'], 'R')), true);
});

test('validateLevel accepts a well formed level', () => {
  assert.deepEqual(validateLevel({ grid: ['#####', '#@$.#', '#####'] }), []);
});

test('validateLevel reports each kind of problem', () => {
  const has = (grid, text) => assert.ok(validateLevel({ grid }).some((e) => e.includes(text)), text);
  has(['#####', '#$ .#', '#####'], 'exactly one player');
  has(['#####', '#@@.#', '#####'], 'exactly one player');
  has(['#####', '#@$ #', '#####'], 'must match');
  has(['#####', '#@ .#', '#####'], 'at least one crate');
  has(['#####', '#@x.#', '#####'], 'unknown characters');
  has(['#####', '#@$.#', '####'], 'equal length');
  has(['#@$. ', '#####'], 'not enclosed');
  assert.ok(validateLevel({}).length > 0);
});

test('solve returns a shortest solution that replays', () => {
  const level = { grid: ['#####', '#@$.#', '#####'] };
  const result = solve(level);
  assert.equal(result.solvable, true);
  assert.equal(result.moves, 'R');
  assert.equal(replay(level, result.moves), true);
  assert.equal(replay(level, 'L'), false);
});

test('an already solved level needs no moves', () => {
  const result = solve({ grid: ['#####', '#@ *#', '#####'] });
  assert.deepEqual([result.solvable, result.moves], [true, '']);
});

test('a crate stuck in a corner is reported as unsolvable', () => {
  const result = solve({ grid: ['#####', '#$  #', '# @ #', '#  .#', '#####'] });
  assert.equal(result.solvable, false);
});

test('the solver stops at its state limit and says so', () => {
  const level = { grid: ['######', '#@   #', '# $  #', '#  . #', '######'] };
  assert.equal(solve(level, { maxStates: 3 }).solvable, null);
});

test('every shipped level is well formed and solvable', () => {
  const doc = JSON.parse(fs.readFileSync(path.join(__dirname, 'levels.json'), 'utf8'));
  assert.ok(doc.levels.length >= 8);
  for (const level of doc.levels) {
    assert.deepEqual(validateLevel(level.data), [], `level ${level.id}`);
    const result = solve(level.data);
    assert.equal(result.solvable, true, `level ${level.id}`);
    assert.equal(level.par, result.moves.length, `par of level ${level.id}`);
  }
  assert.deepEqual(
    LEVELS,
    doc.levels.map((l) => ({ id: l.id, name: l.name, difficulty: l.difficulty, par: l.par, grid: l.data.grid }))
  );
});

test('bot interface plays through level 001 and enforces illegal-action check', () => {
  const s = createState(1, 0);
  assert.equal(isOver(s), false);
  assert.deepEqual(legalActions(s), ['R']);
  assert.throws(() => step(s, 'U'), /illegal/i);
  step(s, 'R');
  step(s, 'R');
  const fin = step(s, 'R');
  assert.equal(fin.done, true);
  assert.equal(isOver(s), true);
  assert.equal(score(s), 125);
});
