const test = require('node:test');
const assert = require('node:assert/strict');
const { scanText, blockedName } = require('./check_no_secrets.js');

test('detects an NVIDIA key without the key being written in this file', () => {
  const fake = 'nvapi-' + 'a'.repeat(40);
  const hits = scanText(`const key = "${fake}";`);
  assert.equal(hits[0].name, 'NVIDIA API key');
  assert.equal(hits[0].line, 1);
});

test('detects a GitHub token', () => {
  const fake = 'ghp_' + 'B'.repeat(36);
  assert.equal(scanText(fake)[0].name, 'GitHub token');
});

test('ignores ordinary code and short strings', () => {
  assert.deepEqual(scanText('const total = ms.length;\nconst name = "block-puzzle";'), []);
  assert.deepEqual(scanText('token: "short"'), []);
});

test('blocks key files by name but allows .env.example', () => {
  assert.equal(blockedName('nvidia.txt'), true);
  assert.equal(blockedName('sub/dir/nvidia.txt'), true);
  assert.equal(blockedName('.env'), true);
  assert.equal(blockedName('.env.local'), true);
  assert.equal(blockedName('release.keystore'), true);
  assert.equal(blockedName('.env.example'), false);
  assert.equal(blockedName('tools/nvidia/client.py'), false);
});
