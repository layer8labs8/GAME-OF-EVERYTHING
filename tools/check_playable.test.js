const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkPlayableDir } = require('./check_playable.js');

test('checkPlayableDir passes on existing playable mechanics', () => {
  const root = path.join(__dirname, '..', 'mechanics');
  assert.deepEqual(checkPlayableDir(path.join(root, '0001-dodge-arcade')), []);
  assert.deepEqual(checkPlayableDir(path.join(root, '0002-block-placement-puzzle')), []);
});

test('checkPlayableDir catches runtime exceptions and missing PWA files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'goe-playable-'));
  const www = path.join(dir, 'www');
  fs.mkdirSync(www, { recursive: true });
  fs.writeFileSync(path.join(www, 'logic.js'), 'globalThis.GameLogic = {};');
  fs.writeFileSync(path.join(www, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  fs.writeFileSync(
    path.join(www, 'manifest.json'),
    JSON.stringify({ name: 'Demo', short_name: 'Demo', orientation: 'portrait', icons: [{ src: 'icon.svg' }] })
  );
  fs.writeFileSync(
    path.join(www, 'sw.js'),
    `const FILES = ['index.html', 'missing.png']; self.addEventListener('install', (e) => e.waitUntil(caches.open('v1').then((c) => c.addAll(FILES))));`
  );
  fs.writeFileSync(
    path.join(www, 'index.html'),
    `<canvas id="c"></canvas><script src="logic.js"></script><script>undefinedFn();</script>`
  );
  try {
    const errors = checkPlayableDir(dir);
    assert.ok(errors.some((e) => e.includes('missing.png')));
    assert.ok(errors.some((e) => e.includes('runtime error')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('checkPlayableDir catches WebIDL Canvas 2D argument count errors such as 4-arg arcTo', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'goe-playable-idl-'));
  const www = path.join(dir, 'www');
  fs.mkdirSync(www, { recursive: true });
  fs.writeFileSync(path.join(www, 'logic.js'), 'globalThis.GameLogic = {};');
  fs.writeFileSync(path.join(www, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  fs.writeFileSync(
    path.join(www, 'manifest.json'),
    JSON.stringify({ name: 'Demo', short_name: 'Demo', orientation: 'portrait', icons: [{ src: 'icon.svg' }] })
  );
  fs.writeFileSync(path.join(www, 'sw.js'), `self.addEventListener('install', () => {});`);
  fs.writeFileSync(
    path.join(www, 'index.html'),
    `<canvas id="c"></canvas><script src="logic.js"></script><script>
      const ctx = document.getElementById('c').getContext('2d');
      ctx.fillRect(0, 0, 100, 100);
      ctx.arcTo(10, 20, 30, 5);
    </script>`
  );
  try {
    const errors = checkPlayableDir(dir);
    assert.ok(errors.some((e) => e.includes('ctx.arcTo requires at least 5 arguments')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
