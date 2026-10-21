#!/usr/bin/env node
// Prepares a Capacitor project for one mechanic.
//   node tools/prepare_apk.js <id> [outDir]          copies www/, writes capacitor.config.json (default outDir: build/apk)
//   node tools/prepare_apk.js --patch-manifest <dir> locks the generated Android app to portrait
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function findMechanic(idArg) {
  const id = String(idArg).padStart(4, '0');
  if (!/^\d{4}$/.test(id)) throw new Error(`bad mechanic id "${idArg}"`);
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry', 'mechanics.json'), 'utf8'));
  const m = registry.mechanics.find((x) => x.id === id);
  if (!m) throw new Error(`mechanic ${id} is not in the registry`);
  return m;
}

function prepare(idArg, outArg) {
  const m = findMechanic(idArg);
  const www = path.join(ROOT, 'mechanics', `${m.id}-${m.slug}`, 'www');
  if (!fs.existsSync(path.join(www, 'index.html'))) throw new Error(`${m.id}-${m.slug} has no www/index.html (status: ${m.status})`);

  const out = path.resolve(ROOT, outArg || path.join('build', 'apk'));
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const f of ['package.json', 'package-lock.json']) fs.copyFileSync(path.join(ROOT, 'platform', 'android', f), path.join(out, f));
  fs.cpSync(www, path.join(out, 'www'), { recursive: true });
  const config = { appId: `com.layer8labs.goe.m${m.id}`, appName: m.title || m.name, webDir: 'www' };
  fs.writeFileSync(path.join(out, 'capacitor.config.json'), JSON.stringify(config, null, 2) + '\n');

  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `slug=${m.slug}\nid=${m.id}\n`);
  console.log(`prepared ${m.id}-${m.slug} -> ${out}`);
}

function patchManifest(dir) {
  const file = path.join(path.resolve(dir), 'app', 'src', 'main', 'AndroidManifest.xml');
  let xml = fs.readFileSync(file, 'utf8');
  if (xml.includes('android:screenOrientation')) return console.log('manifest already patched');
  const marker = 'android:launchMode="singleTask"';
  if (!xml.includes(marker)) throw new Error('launchMode marker not found in AndroidManifest.xml');
  xml = xml.replace(marker, `${marker}\n            android:screenOrientation="portrait"`);
  fs.writeFileSync(file, xml);
  console.log('manifest patched: portrait');
}

const [a, b, c] = process.argv.slice(2);
if (a === '--patch-manifest') patchManifest(b);
else if (a) prepare(a, b);
else {
  console.error('usage: prepare_apk.js <id> [outDir] | --patch-manifest <androidDir>');
  process.exit(2);
}
void c;
