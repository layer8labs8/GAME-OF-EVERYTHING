const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildSite, escapeHtml, loadEntries, renderIndex, summaryFromSpec } = require('./build_site.js');

test('summaryFromSpec skips headings and lists and removes markdown', () => {
  const spec = '# Title\n\n## Rules\n- A rule\n\nA *fast* game with `three` lanes.\n';
  assert.equal(summaryFromSpec(spec), 'A fast game with three lanes.');
});

test('summaryFromSpec shortens long text at a word boundary', () => {
  const summary = summaryFromSpec(`${'word '.repeat(60)}\n`);
  assert.ok(summary.length <= 143);
  assert.ok(summary.endsWith('word...'));
});

test('summaryFromSpec returns an empty string when no paragraph exists', () => {
  assert.equal(summaryFromSpec('# Only a heading\n\n- A list\n'), '');
});

test('escapeHtml neutralises markup', () => {
  assert.equal(escapeHtml('<a href="x">&'), '&lt;a href=&quot;x&quot;&gt;&amp;');
});

test('every registry entry gets a title, summary and links', () => {
  for (const entry of loadEntries()) {
    assert.ok(entry.title, entry.id);
    assert.ok(entry.summary, entry.id);
    assert.ok(entry.spec.includes(entry.dir), entry.id);
  }
});

test('renderIndex escapes registry text', () => {
  const html = renderIndex([{
    id: '9999',
    dir: '9999-test',
    title: '<b>Title</b>',
    mechanic: 'Test',
    family: 'Puzzle',
    summary: 'Safe',
    spec: 'spec',
    code: 'code',
  }]);
  assert.ok(html.includes('&lt;b&gt;Title&lt;/b&gt;'));
  assert.ok(!html.includes('<b>Title</b>'));
});

test('renderIndex lists every support address with a copy button', () => {
  const html = renderIndex(loadEntries());
  for (const address of [
    '0x7C524d172F2bf750e3f7b4Df0339B3fFb09F9ADb',
    'bc1qcvdafsre6tlfpsdnv2s4ltwvy9tlgkjj6ag4gu',
    'Fv9k74qakg1L7ehMaJ3SBXxVbTKg2WuM5AjW2KLM3nVH',
    'TJVfPm5wJnKjD5ZzBRhMXtzB1aF17Kbyuz',
    'GDMW2AZQYRCAG3B6GRG7JVRSPZO7SBGV24PNZ76DNQLEDZOM6S6O7RH2',
  ]) {
    assert.ok(html.includes(`data-copy="${address}"`), address);
  }
});

test('renderIndex keeps closing script tags out of embedded data', () => {
  const html = renderIndex([{
    id: '9999',
    dir: '9999-test',
    title: 'Test',
    mechanic: 'Test',
    family: 'Puzzle',
    summary: '</script><script>alert(1)</script>',
    spec: 'spec',
    code: 'code',
  }]);
  assert.ok(!html.includes('</script><script>alert(1)'));
});

test('buildSite copies every playable mechanic and links to it', () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'goe-site-')), 'site');
  const entries = buildSite(out);
  const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  assert.equal(entries.length, fs.readdirSync(path.join(out, 'play')).length);
  for (const entry of entries) {
    assert.ok(fs.existsSync(path.join(out, 'play', entry.dir, 'index.html')), entry.dir);
    assert.ok(html.includes(`href="play/${entry.dir}/"`), entry.dir);
  }
});
