const test = require('node:test');
const assert = require('node:assert/strict');
const { checkLevelsDoc, updateDoc } = require('./check_levels.js');

const solver = {
  validateLevel: (d) => (d.bad ? ['bad data'] : []),
  solve: (d) => {
    if (d.unsolvable) return { solvable: false, moves: null, states: 1 };
    if (d.giveUp) return { solvable: null, moves: null, states: 1 };
    return { solvable: true, moves: 'RR', states: 3 };
  },
  replay: (d, moves) => moves === 'RR',
};

const level = (over = {}) => ({ id: '001', name: 'One', difficulty: 1, data: {}, par: 2, solution: 'RR', ...over });
const doc = (levels = [level()], over = {}) => ({ schema: 1, mechanic: 'demo', levels, ...over });
const check = (d) => checkLevelsDoc(d, solver, 'demo');

test('a correct file has no problems', () => {
  assert.deepEqual(check(doc()), []);
});

test('wrong schema, wrong mechanic and empty list are reported', () => {
  assert.ok(check(doc([level()], { schema: 2 })).some((e) => e.includes('schema')));
  assert.ok(check(doc([level()], { mechanic: 'other' })).some((e) => e.includes('mechanic')));
  assert.ok(check(doc([])).some((e) => e.includes('non-empty')));
});

test('ids must be unique and increasing', () => {
  assert.ok(check(doc([level(), level()])).some((e) => e.includes('duplicate')));
  assert.ok(check(doc([level({ id: '002' }), level({ id: '001' })])).some((e) => e.includes('increase')));
  assert.ok(check(doc([level({ id: '1' })])).some((e) => e.includes('digits')));
});

test('difficulty and name are checked', () => {
  assert.ok(check(doc([level({ difficulty: 6 })])).some((e) => e.includes('difficulty')));
  assert.ok(check(doc([level({ difficulty: 1.5 })])).some((e) => e.includes('difficulty')));
  assert.ok(check(doc([level({ name: ' ' })])).some((e) => e.includes('name')));
});

test('invalid data is reported by the mechanic solver', () => {
  assert.ok(check(doc([level({ data: { bad: true } })])).some((e) => e.includes('bad data')));
});

test('unsolvable levels and solver limits are reported', () => {
  assert.ok(check(doc([level({ data: { unsolvable: true } })])).some((e) => e.includes('unsolvable')));
  assert.ok(check(doc([level({ data: { giveUp: true } })])).some((e) => e.includes('state limit')));
});

test('par must equal the shortest solution', () => {
  assert.ok(check(doc([level({ par: 5 })])).some((e) => e.includes('par is 5')));
});

test('the stored solution must match par and must solve the level', () => {
  assert.ok(check(doc([level({ solution: undefined })])).some((e) => e.includes('solution is required')));
  assert.ok(check(doc([level({ solution: 'R' })])).some((e) => e.includes('does not match par')));
  assert.ok(check(doc([level({ solution: 'LL' })])).some((e) => e.includes('does not solve')));
});

test('updateDoc fills par and solution from the solver', () => {
  const d = doc([level({ par: undefined, solution: undefined })]);
  updateDoc(d, solver);
  assert.equal(d.levels[0].par, 2);
  assert.equal(d.levels[0].solution, 'RR');
  assert.deepEqual(check(d), []);
});
