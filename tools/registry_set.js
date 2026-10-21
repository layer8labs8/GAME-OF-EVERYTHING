#!/usr/bin/env node
// Edits one registry entry and keeps the file format stable.
//   node tools/registry_set.js 0043 status=logic levels=data
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'registry', 'mechanics.json');
const ORDER = ['id', 'slug', 'name', 'title', 'family', 'status', 'levels', 'bot', 'source'];
const SETTABLE = ['name', 'title', 'family', 'status', 'levels', 'bot', 'source'];

const [idArg, ...pairs] = process.argv.slice(2);
if (!idArg || pairs.length === 0) {
  console.error('usage: registry_set.js <id> key=value [key=value ...]');
  process.exit(2);
}

const registry = JSON.parse(fs.readFileSync(file, 'utf8'));
const index = registry.mechanics.findIndex((m) => m.id === String(idArg).padStart(4, '0'));
if (index < 0) {
  console.error(`no mechanic with id ${idArg}`);
  process.exit(1);
}

const entry = { ...registry.mechanics[index] };
for (const pair of pairs) {
  const eq = pair.indexOf('=');
  const key = pair.slice(0, eq);
  let value = pair.slice(eq + 1);
  if (!SETTABLE.includes(key)) {
    console.error(`cannot set "${key}" (settable: ${SETTABLE.join(', ')})`);
    process.exit(1);
  }
  if (key === 'bot') value = value === 'true';
  entry[key] = value;
}

const ordered = {};
for (const key of ORDER) if (key in entry) ordered[key] = entry[key];
for (const key of Object.keys(entry)) if (!(key in ordered)) ordered[key] = entry[key];
registry.mechanics[index] = ordered;
fs.writeFileSync(file, JSON.stringify(registry, null, 1) + '\n');
console.log(`updated ${ordered.id}-${ordered.slug}`);
