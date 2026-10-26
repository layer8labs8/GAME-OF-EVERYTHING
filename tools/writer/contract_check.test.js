const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkLogicFile } = require('./contract_check.js');

function writeTemp(code) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'goe-contract-'));
  const file = path.join(dir, 'logic.js');
  fs.writeFileSync(file, code, 'utf8');
  return { dir, file };
}

test('contract_check accepts a pure, deterministic, terminating module', () => {
  const { dir, file } = writeTemp(`
(function (root) {
  function createState(seed) { return { count: 0, rng: seed >>> 0 }; }
  function isOver(s) { return s.count >= 5; }
  function legalActions(s) { return isOver(s) ? [] : ['inc', 'inc2']; }
  function step(s, a) {
    if (!legalActions(s).includes(a)) throw new Error('illegal');
    s.count += a === 'inc2' ? 2 : 1;
    return { reward: 1, done: isOver(s) };
  }
  function score(s) { return s.count; }
  const api = { createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);
`);
  try {
    assert.deepEqual(checkLogicFile(file), []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('contract_check flags Math.random and missing exports', () => {
  const { dir, file } = writeTemp(`module.exports = { x: () => Math.random() };`);
  try {
    const failures = checkLogicFile(file);
    assert.ok(failures.some((f) => f.check === 'purity'));
    assert.ok(failures.some((f) => f.check === 'exports'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
