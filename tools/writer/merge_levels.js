#!/usr/bin/env node
// Adds proposed levels to a mechanic's levels.json, keeping only the ones its solver verifies.
//   node tools/writer/merge_levels.js <mechanic id> <proposed.json> [maxNew] [minPar]
// proposed.json is an array of { name, difficulty, data }. Prints one JSON line with the result.
const fs = require('fs');
const path = require('path');
const { checkLevelsDoc, updateDoc } = require('../check_levels.js');

const ROOT = path.join(__dirname, '..', '..');
const [idArg, file, maxArg, minParArg] = process.argv.slice(2);
const maxNew = Number(maxArg || 12);
const minPar = Number(minParArg || 4);

const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'mechanics.json'), 'utf8'));
const m = registry.mechanics.find((x) => x.id === String(idArg).padStart(4, '0'));
if (!m || m.levels !== 'data') {
  console.log(JSON.stringify({ error: `mechanic ${idArg} does not have data levels` }));
  process.exit(1);
}
const dir = path.join(ROOT, 'mechanics', `${m.id}-${m.slug}`);
const solver = require(path.join(dir, 'solver.js'));
const doc = JSON.parse(fs.readFileSync(path.join(dir, 'levels.json'), 'utf8'));
const proposed = JSON.parse(fs.readFileSync(file, 'utf8'));

const known = new Set(doc.levels.map((l) => JSON.stringify(l.data)));
let nextId = Number(doc.levels[doc.levels.length - 1].id);
const accepted = [];
const rejected = [];

for (const p of Array.isArray(proposed) ? proposed : []) {
  const name = p && p.name;
  if (accepted.length >= maxNew) break;
  if (!p || typeof p.name !== 'string' || !p.name.trim() || !p.data || typeof p.data !== 'object') {
    rejected.push({ name, reason: 'wrong shape' });
    continue;
  }
  const problems = solver.validateLevel(p.data);
  if (problems.length) {
    rejected.push({ name, reason: problems[0] });
    continue;
  }
  if (known.has(JSON.stringify(p.data))) {
    rejected.push({ name, reason: 'duplicate' });
    continue;
  }
  const result = solver.solve(p.data);
  if (result.solvable !== true) {
    rejected.push({ name, reason: result.solvable === false ? 'unsolvable' : 'too large for the solver' });
    continue;
  }
  if (result.moves.length < minPar) {
    rejected.push({ name, reason: `too short (${result.moves.length} moves)` });
    continue;
  }
  known.add(JSON.stringify(p.data));
  nextId += 1;
  const difficulty = Number.isInteger(p.difficulty) && p.difficulty >= 1 && p.difficulty <= 5 ? p.difficulty : Math.min(5, 1 + Math.floor(result.moves.length / 12));
  accepted.push({ id: String(nextId).padStart(3, '0'), name: p.name.trim(), difficulty, data: p.data });
}

doc.levels.push(...accepted);
updateDoc(doc, solver);
const errors = checkLevelsDoc(doc, solver, m.slug);
if (errors.length) {
  console.log(JSON.stringify({ error: 'merged file failed the level check', errors: errors.slice(0, 5) }));
  process.exit(1);
}
fs.writeFileSync(path.join(dir, 'levels.json'), JSON.stringify(doc, null, 2) + '\n');
console.log(JSON.stringify({ accepted: accepted.length, rejected, total: doc.levels.length }));
