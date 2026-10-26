#!/usr/bin/env node
// Generic checks for a mechanic that implements the bot API in www/logic.js.
//   node tools/writer/contract_check.js <path to logic.js>
// Prints one JSON line: { "failures": [ { "check": "...", "message": "..." } ] }
//
// The bot API is: createState(seed), legalActions(state), step(state, action) -> { reward, done },
// isOver(state), score(state). These checks are written once, by hand, so they stay independent
// of whichever model wrote the module.
const fs = require('fs');
const path = require('path');

const SEEDS = 20;
const MAX_STEPS = 3000;

function rngFor(seed) {
  let a = (seed * 2654435761) >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BANNED = [
  [/Math\.random/, 'Math.random'],
  [/Date\.now|new Date|performance\.now/, 'the clock'],
  [/\bdocument\b|\bwindow\b|localStorage/, 'the browser DOM or storage'],
  [/require\(\s*['"](fs|child_process|net|http|https)['"]\s*\)/, 'node I/O modules'],
];

function checkLogicFile(filePath) {
  const file = path.resolve(filePath || '');
  const failures = [];
  const fail = (check, message) => {
    if (!failures.some((f) => f.check === check)) failures.push({ check, message });
  };
  const json = (x) => JSON.stringify(x);

  let src;
  try {
    src = fs.readFileSync(file, 'utf8');
  } catch (e) {
    fail('load', `cannot read ${file}`);
    return failures;
  }

  for (const [re, label] of BANNED) if (re.test(src)) fail('purity', `logic.js must not use ${label}`);

  let L;
  try {
    const resolved = require.resolve(file);
    delete require.cache[resolved];
    L = require(resolved);
  } catch (e) {
    fail('load', `logic.js failed to load: ${e.message}`);
    return failures;
  }
  for (const name of ['createState', 'legalActions', 'step', 'isOver', 'score']) {
    if (typeof L[name] !== 'function') fail('exports', `${name} must be exported as a function`);
  }
  if (failures.length) return failures;

  function checkSeed(seed) {
    const first = L.createState(seed);
    if (json(first) !== json(L.createState(seed))) fail('determinism', 'createState(seed) gives different states on two calls');
    if (json(JSON.parse(json(first))) !== json(first)) fail('serializable', 'the state is not plain JSON (check for NaN, undefined, Sets, Maps)');

    const probe = L.createState(seed);
    const probeBefore = json(probe);
    let accepted = true;
    try {
      L.step(probe, { illegal: 'action' });
    } catch (e) {
      accepted = false;
    }
    if (accepted) fail('step', 'step must throw an Error for an action that is not in legalActions');
    if (json(probe) !== probeBefore) fail('step', 'a rejected action must not change the state');

    const state = L.createState(seed);
    const pick = rngFor(seed);
    const trail = [];
    let finished = false;
    for (let i = 0; i < MAX_STEPS; i++) {
      const before = json(state);
      const actions = L.legalActions(state);
      if (json(state) !== before) {
        fail('purity', 'legalActions must not change the state');
        return { finished: false };
      }
      if (!Array.isArray(actions)) {
        fail('legalActions', 'legalActions must return an array');
        return { finished: false };
      }
      const over = L.isOver(state);
      if (typeof over !== 'boolean') {
        fail('isOver', 'isOver must return a boolean');
        return { finished: false };
      }
      if (over && actions.length) fail('consistency', 'isOver is true but legalActions is not empty');
      if (!over && actions.length === 0) {
        fail('consistency', 'the game is not over but there are no legal actions');
        return { finished: false };
      }
      if (over) {
        finished = true;
        break;
      }
      if (new Set(actions.map(json)).size !== actions.length) fail('legalActions', 'legalActions contains duplicates');

      const action = actions[Math.floor(pick() * actions.length)];
      trail.push(action);
      let result;
      try {
        result = L.step(state, action);
      } catch (e) {
        fail('step', `step threw on a legal action ${json(action)}: ${e.message}`);
        return { finished: false };
      }
      if (!result || typeof result.reward !== 'number' || !Number.isFinite(result.reward) || typeof result.done !== 'boolean') {
        fail('step', 'step must return { reward: finite number, done: boolean }');
        return { finished: false };
      }
      if (result.done !== L.isOver(state)) fail('consistency', 'done returned by step differs from isOver(state)');
      const score = L.score(state);
      if (typeof score !== 'number' || !Number.isFinite(score)) fail('score', 'score must return a finite number');
      if (i % 25 === 0 && json(JSON.parse(json(state))) !== json(state)) fail('serializable', 'the state stopped being plain JSON during play');
    }

    const replay = L.createState(seed);
    try {
      for (const action of trail) L.step(replay, action);
    } catch (e) {
      fail('determinism', `replaying the same actions threw: ${e.message}`);
      return { finished };
    }
    if (json(replay) !== json(state)) fail('determinism', 'the same seed and actions gave a different final state');
    return { finished };
  }

  let finishedCount = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    try {
      if (checkSeed(seed).finished) finishedCount += 1;
    } catch (e) {
      fail('crash', `unexpected error on seed ${seed}: ${e.message}`);
    }
  }
  if (!failures.length && finishedCount < SEEDS * 0.7) {
    fail('termination', `only ${finishedCount} of ${SEEDS} random games ended within ${MAX_STEPS} steps; the game needs a step limit`);
  }
  return failures;
}

module.exports = { checkLogicFile };

if (require.main === module) {
  const failures = checkLogicFile(process.argv[2] || '');
  console.log(JSON.stringify({ failures }));
  process.exit(0);
}
