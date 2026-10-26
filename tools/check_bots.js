#!/usr/bin/env node
// Runs the bot contract check across every mechanic whose registry entry has bot = true.
const fs = require('fs');
const path = require('path');
const { checkLogicFile } = require('./writer/contract_check.js');

const ROOT = path.join(__dirname, '..');
const WITH_LOGIC = ['logic', 'playable', 'polished', 'shipped'];

function main() {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'mechanics.json'), 'utf8'));
  const errors = [];
  let checked = 0;

  for (const m of registry.mechanics.filter((x) => x.bot && WITH_LOGIC.includes(x.status))) {
    const label = `${m.id}-${m.slug}`;
    const file = path.join(ROOT, 'mechanics', label, 'www', 'logic.js');
    const failures = checkLogicFile(file);
    for (const f of failures) {
      errors.push(`${label} [${f.check}]: ${f.message}`);
    }
    checked += 1;
  }

  if (errors.length) {
    console.error(errors.map((e) => '  - ' + e).join('\n'));
    console.error(`bot contract check failed: ${errors.length} problem(s)`);
    process.exit(1);
  }
  console.log(`bots ok: ${checked} mechanic(s)`);
}

if (require.main === module) main();
