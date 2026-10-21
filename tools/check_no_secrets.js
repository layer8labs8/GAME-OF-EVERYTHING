#!/usr/bin/env node
// Refuses to let API keys and key files into the repository.
//   --staged        scan what is about to be committed (used by the pre-commit hook)
//   --all           scan every tracked file (used by CI)
//   --file <path>   scan a single file on disk
// Matches are reported by file and line only, never printed.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PATTERNS = [
  ['NVIDIA API key', /nvapi-[A-Za-z0-9_-]{20,}/],
  ['GitHub token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/],
  ['GitHub fine-grained token', /github_pat_[A-Za-z0-9_]{30,}/],
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/],
  ['OpenAI-style key', /\bsk-[A-Za-z0-9_-]{32,}/],
  ['Kaggle key', /"key"\s*:\s*"[0-9a-f]{32}"/],
  ['Private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['Key assignment', /\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*['"][A-Za-z0-9_-]{24,}['"]/i],
];
const BLOCKED_NAMES = [
  /(^|\/)nvidia\.txt$/i,
  /(^|\/)\.env$/,
  /(^|\/)\.env\.(?!example$).+$/,
  /(^|\/)kaggle\.json$/i,
  /\.(pem|key|keystore|jks)$/i,
  /(^|\/)secrets?\//i,
];

function scanText(text) {
  const hits = [];
  text.split(/\r?\n/).forEach((line, i) => {
    for (const [name, re] of PATTERNS) if (re.test(line)) hits.push({ name, line: i + 1 });
  });
  return hits;
}

function blockedName(file) {
  const f = file.replace(/\\/g, '/');
  return BLOCKED_NAMES.some((re) => re.test(f));
}

function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
}

function isText(buf) {
  return !buf.subarray(0, 8000).includes(0);
}

function main() {
  const args = process.argv.slice(2);
  const problems = [];
  const check = (file, buf) => {
    if (blockedName(file)) problems.push(`${file}: file name is blocked`);
    if (buf.length > 2 * 1024 * 1024 || !isText(buf)) return;
    for (const h of scanText(buf.toString('utf8'))) problems.push(`${file}:${h.line}: looks like a ${h.name}`);
  };

  if (args[0] === '--file') {
    const f = path.resolve(args[1]);
    check(path.basename(f) === 'nvidia.txt' ? 'nvidia.txt' : f, fs.readFileSync(f));
  } else if (args[0] === '--staged') {
    const files = git(['diff', '--cached', '--name-only', '--diff-filter=ACM']).split('\n').filter(Boolean);
    for (const f of files) check(f, execFileSync('git', ['show', ':' + f], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }));
  } else if (args[0] === '--all') {
    for (const f of git(['ls-files']).split('\n').filter(Boolean)) {
      if (fs.existsSync(path.join(ROOT, f))) check(f, fs.readFileSync(path.join(ROOT, f)));
    }
  } else {
    console.error('usage: check_no_secrets.js --staged | --all | --file <path>');
    process.exit(2);
  }

  if (problems.length) {
    console.error(problems.map((p) => '  - ' + p).join('\n'));
    console.error('secret check failed. Keys belong in NVIDIA_API_KEY or a file outside the repository.');
    process.exit(1);
  }
  console.log('secret check ok');
}

module.exports = { scanText, blockedName };
if (require.main === module) main();
