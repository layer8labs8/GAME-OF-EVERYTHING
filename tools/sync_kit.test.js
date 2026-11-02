const test = require('node:test');
const assert = require('node:assert/strict');
const { summaryOf, wireHtml, wireWorker } = require('./sync_kit.js');

test('summaryOf takes the first plain line of a SPEC', () => {
  assert.equal(summaryOf('# Title\n\nDodge the `rocks`.\n\n## Rules\n- Move\n'), 'Dodge the rocks.');
  assert.equal(summaryOf('# Title\n\n## Rules\n- Move\n'), '');
});

test('wireHtml adds the script and description once', () => {
  const page = '<title>Game</title>\n<script src="logic.js"></script>\n';
  const wired = wireHtml(page, 'Say "hi"');
  assert.ok(wired.includes('<script src="logic.js"></script>\n<script src="kit.js"></script>'));
  assert.ok(wired.includes('content="Say &quot;hi&quot;"'));
  assert.equal(wireHtml(wired, 'Say "hi"'), wired);
});

test('wireWorker adds kit.js to the cached files once', () => {
  const sw = "const FILES = ['./', 'index.html', 'logic.js', 'icon.svg'];";
  const wired = wireWorker(sw);
  assert.ok(wired.includes("'logic.js', 'kit.js'"));
  assert.equal(wireWorker(wired), wired);
});

test('wireWorker raises the cache version so returning players get updates', () => {
  const sw = "const CACHE = 'goe-0017-pong-v1';\nconst FILES = ['logic.js'];";
  assert.ok(!wireWorker(sw).includes("'goe-0017-pong-v1'"));
});
