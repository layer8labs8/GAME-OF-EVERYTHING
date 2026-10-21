#!/usr/bin/env node
// Verifies levels.json for every mechanic whose registry entry has levels = "data".
//   node tools/check_levels.js             verify
//   node tools/check_levels.js --update    write par and solution from the solver, then verify
// The contract is described in docs/LEVELS.md.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WITH_LOGIC = ['logic', 'playable', 'polished', 'shipped'];

function checkLevelsDoc(doc, solver, slug) {
  const errors = [];
  if (!doc || doc.schema !== 1) errors.push('schema must be 1');
  if (!doc || doc.mechanic !== slug) errors.push(`mechanic must be "${slug}"`);
  if (!doc || !Array.isArray(doc.levels) || doc.levels.length === 0) {
    errors.push('levels must be a non-empty array');
    return errors;
  }

  const seen = new Set();
  let last = 0;
  for (const level of doc.levels) {
    const where = `level ${level && level.id}`;
    if (!level || !/^\d{3,}$/.test(level.id || '')) {
      errors.push(`${where}: id must be three or more digits`);
      continue;
    }
    if (seen.has(level.id)) errors.push(`${where}: duplicate id`);
    seen.add(level.id);
    if (Number(level.id) <= last) errors.push(`${where}: ids must increase`);
    last = Number(level.id);
    if (typeof level.name !== 'string' || !level.name.trim()) errors.push(`${where}: name is required`);
    if (!Number.isInteger(level.difficulty) || level.difficulty < 1 || level.difficulty > 5) {
      errors.push(`${where}: difficulty must be an integer from 1 to 5`);
    }
    if (!level.data || typeof level.data !== 'object') {
      errors.push(`${where}: data is required`);
      continue;
    }

    const problems = solver.validateLevel(level.data);
    if (problems.length) {
      errors.push(...problems.map((p) => `${where}: ${p}`));
      continue;
    }
    const result = solver.solve(level.data);
    if (result.solvable === false) {
      errors.push(`${where}: unsolvable`);
      continue;
    }
    if (result.solvable === null) {
      errors.push(`${where}: solver stopped at its state limit, so the level cannot be verified`);
      continue;
    }
    if (level.par !== result.moves.length) errors.push(`${where}: par is ${level.par}, shortest solution is ${result.moves.length}`);
    if (typeof level.solution !== 'string') errors.push(`${where}: solution is required`);
    else if (level.solution.length !== level.par) errors.push(`${where}: solution length ${level.solution.length} does not match par ${level.par}`);
    else if (!solver.replay(level.data, level.solution)) errors.push(`${where}: stored solution does not solve the level`);
  }
  return errors;
}

function updateDoc(doc, solver) {
  for (const level of doc.levels) {
    if (!level.data || solver.validateLevel(level.data).length) continue;
    const result = solver.solve(level.data);
    if (result.solvable === true) {
      level.par = result.moves.length;
      level.solution = result.moves;
    }
  }
}

function main() {
  const update = process.argv.includes('--update');
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'mechanics.json'), 'utf8'));
  const errors = [];
  let mechanics = 0;
  let levels = 0;

  for (const m of registry.mechanics.filter((x) => x.levels === 'data' && WITH_LOGIC.includes(x.status))) {
    const label = `${m.id}-${m.slug}`;
    const dir = path.join(ROOT, 'mechanics', label);
    const levelsFile = path.join(dir, 'levels.json');
    if (!fs.existsSync(levelsFile) || !fs.existsSync(path.join(dir, 'solver.js'))) {
      errors.push(`${label}: levels.json or solver.js is missing`);
      continue;
    }
    const solver = require(path.join(dir, 'solver.js'));
    const doc = JSON.parse(fs.readFileSync(levelsFile, 'utf8'));
    if (update) {
      updateDoc(doc, solver);
      fs.writeFileSync(levelsFile, JSON.stringify(doc, null, 2) + '\n');
    }
    errors.push(...checkLevelsDoc(doc, solver, m.slug).map((e) => `${label}: ${e}`));
    mechanics += 1;
    levels += doc.levels.length;
  }

  if (errors.length) {
    console.error(errors.map((e) => '  - ' + e).join('\n'));
    console.error(`levels check failed: ${errors.length} problem(s)`);
    process.exit(1);
  }
  console.log(`levels ok: ${levels} level(s) in ${mechanics} mechanic(s)`);
}

module.exports = { checkLevelsDoc, updateDoc };
if (require.main === module) main();
