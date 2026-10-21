import json
import re
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from client import make_client

OUT = Path(__file__).resolve().parents[2] / "docs" / "benchmarks"
client = make_client()

MODELS = [
    "moonshotai/kimi-k2.6",
    "z-ai/glm-5.3",
    "z-ai/glm-5.3-flash",
    "deepseek-ai/deepseek-v4.1-flash",
    "nvidia/nemotron-3-ultra-550b-a55b",
    "nvidia/nemotron-3-super-120b-a12b",
    "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    "nvidia/nemotron-3.5-lightning-30b-a3b",
    "google/gemma-4-31b-it",
    "openai/gpt-oss-20b",
    "poolside/laguna-xs-2.1",
    "stepfun-ai/step-5-preview",
    "mistralai/codestral-22b-instruct-v0.1",
]

RETRY = len(sys.argv) > 1
if RETRY:
    MODELS = sys.argv[1:]
    client = make_client(timeout=420)

TASKS = {
    "validateLevel": {
        "prompt": (
            "Write a JavaScript (CommonJS) function validateLevel(rows) where rows is an array of strings "
            "describing a tile level. Characters: '#' wall, '.' floor, 'S' start, 'E' exit. "
            "Return {valid: boolean, reason: string}. A level is valid only if: it is non-empty and all rows "
            "have the same length; it contains only the characters # . S E; it has exactly one S and exactly "
            "one E; E is reachable from S moving up/down/left/right through non-wall tiles. "
            "Reason strings: 'empty', 'ragged', 'bad-char', 'start-count', 'exit-count', 'unreachable', or 'ok' "
            "for a valid level. Check in exactly that order. "
            "Export with module.exports = { validateLevel }. Reply with only the code in a single js code block."
        ),
        "tests": r"""
const { validateLevel: v } = require('./cand.js');
const big = Array.from({ length: 200 }, (_, i) => '.'.repeat(200));
big[0] = 'S' + big[0].slice(1);
big[199] = big[199].slice(0, 199) + 'E';
const cases = [
  ['ok-simple', () => { const r = v(['S.E']); return r.valid === true && r.reason === 'ok'; }],
  ['empty', () => { const r = v([]); return r.valid === false && r.reason === 'empty'; }],
  ['ragged', () => v(['S.E', '..']).reason === 'ragged'],
  ['bad-char', () => v(['S.x']).reason === 'bad-char'],
  ['no-start', () => v(['..E']).reason === 'start-count'],
  ['two-start', () => v(['SSE']).reason === 'start-count'],
  ['no-exit', () => v(['S..']).reason === 'exit-count'],
  ['two-exit', () => v(['SEE']).reason === 'exit-count'],
  ['wall-block', () => { const r = v(['S#E']); return r.valid === false && r.reason === 'unreachable'; }],
  ['maze', () => { const r = v(['S.#E', '#.#.', '#...']); return r.valid === true && r.reason === 'ok'; }],
  ['diagonal', () => v(['S#', '#E']).reason === 'unreachable'],
  ['big-grid', () => { const r = v(big); return r.valid === true && r.reason === 'ok'; }],
];
""",
    },
    "sokobanMove": {
        "prompt": (
            "Write a JavaScript (CommonJS) function move(grid, dir) for a Sokoban-like game. grid is an array of "
            "strings: '#' wall, ' ' empty floor, '@' player, '$' crate, '.' target (empty), '*' crate on target, "
            "'+' player on target. dir is one of 'U','D','L','R'. Return a NEW grid (array of strings; never mutate "
            "the input) after the player tries to move one step. Rules: moving into floor or target just moves; "
            "moving into a crate pushes it one tile if the tile behind it is floor or target (not a wall, not "
            "another crate, not out of bounds); otherwise nothing changes (return an equal grid). Targets stay "
            "targets when objects leave them. Moves out of bounds do nothing. Also export isSolved(grid): true when "
            "there are no '$' left and at least one '*'. "
            "Export with module.exports = { move, isSolved }. Reply with only the code in a single js code block."
        ),
        "tests": r"""
const { move: m, isSolved: s } = require('./cand.js');
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const cases = [
  ['walk', () => eq(m(['@ '], 'R'), [' @'])],
  ['push-floor', () => eq(m(['@$ '], 'R'), [' @$'])],
  ['push-target', () => eq(m(['@$.'], 'R'), [' @*'])],
  ['crate-wall', () => eq(m(['@$#'], 'R'), ['@$#'])],
  ['crate-crate', () => eq(m(['@$$'], 'R'), ['@$$'])],
  ['leave-target', () => eq(m(['+ '], 'R'), ['.@'])],
  ['enter-target', () => eq(m(['@.'], 'R'), [' +'])],
  ['push-off-target', () => eq(m(['@* '], 'R'), [' +$'])],
  ['out-of-bounds', () => eq(m(['@'], 'L'), ['@']) && eq(m(['@'], 'U'), ['@']) && eq(m(['@'], 'D'), ['@'])],
  ['no-mutate', () => { const g = ['@$ ']; const c = JSON.stringify(g); m(g, 'R'); return JSON.stringify(g) === c; }],
  ['vertical', () => eq(m(['@', '$', ' '], 'D'), [' ', '@', '$'])],
  ['crate-edge', () => eq(m(['@$'], 'R'), ['@$'])],
  ['wall-up', () => eq(m(['#', '@'], 'U'), ['#', '@'])],
  ['target-to-target', () => eq(m(['@*.'], 'R'), [' +*'])],
  ['solved', () => s(['@*']) === true && s(['+*']) === true],
  ['not-solved', () => s(['@$.']) === false && s(['@ ']) === false],
];
""",
    },
}

RUNNER = """
let passed = 0; const failed = [];
for (const [name, fn] of cases) {
  try { if (fn()) passed++; else failed.push(name); } catch (e) { failed.push(name + ':' + e.message.slice(0, 40)); }
}
console.log(JSON.stringify({ passed, total: cases.length, failed }));
"""


def extract_code(text):
    if not text:
        return None
    blocks = re.findall(r"```(?:js|javascript)?\s*\n(.*?)```", text, re.S)
    if blocks:
        return max(blocks, key=len)
    return text if "module.exports" in text else None


def run_tests(code, tests):
    with tempfile.TemporaryDirectory() as d:
        Path(d, "cand.js").write_text(code, encoding="utf-8")
        Path(d, "t.js").write_text(tests + RUNNER, encoding="utf-8")
        try:
            out = subprocess.run(["node", "t.js"], cwd=d, capture_output=True, text=True, timeout=20)
        except subprocess.TimeoutExpired:
            return {"passed": 0, "total": 0, "failed": ["timeout"]}
        try:
            return json.loads(out.stdout.strip().splitlines()[-1])
        except Exception:
            return {"passed": 0, "total": 0, "failed": ["crash:" + (out.stderr or "")[:60]]}


def one(job):
    model, tname = job
    task = TASKS[tname]
    t0 = time.time()
    for attempt in range(2):
        try:
            r = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": task["prompt"]}],
                temperature=0.2,
                max_tokens=8000,
            )
            break
        except Exception as e:
            msg = str(e)
            if "429" in msg and attempt == 0:
                time.sleep(15)
                continue
            return {"model": model, "task": tname, "error": msg[:90], "secs": round(time.time() - t0, 1)}
    secs = round(time.time() - t0, 1)
    text = r.choices[0].message.content
    toks = r.usage.completion_tokens if r.usage else None
    code = extract_code(text)
    if code is None:
        return {"model": model, "task": tname, "passed": 0, "total": 0, "failed": ["no-code"], "secs": secs, "tokens": toks}
    res = run_tests(code, task["tests"])
    return {"model": model, "task": tname, "secs": secs, "tokens": toks, **res}


jobs = [(m, t) for m in MODELS for t in TASKS]
with ThreadPoolExecutor(max_workers=len(MODELS) if RETRY else 4) as ex:
    results = list(ex.map(one, jobs))

OUT.mkdir(parents=True, exist_ok=True)
(OUT / ("run-retry.json" if RETRY else "run.json")).write_text(json.dumps(results, indent=1), encoding="utf-8")

summary = {}
for r in results:
    s = summary.setdefault(r["model"], {"passed": 0, "total": 0, "secs": 0, "tokens": 0, "errors": []})
    s["passed"] += r.get("passed", 0)
    s["total"] += r.get("total", 0) or 0
    s["secs"] += r.get("secs", 0)
    s["tokens"] += r.get("tokens") or 0
    if "error" in r:
        s["errors"].append(r["error"])
    elif r.get("failed"):
        s["errors"].append(r["task"] + ": " + ", ".join(r["failed"])[:80])

TOTAL = sum(len(re.findall(r"^\s*\['", t["tests"], re.M)) for t in TASKS.values())
print(f"{'model':45} {'pass':>8} {'secs':>7} {'tokens':>7}")
for m, s in sorted(summary.items(), key=lambda kv: (-kv[1]["passed"], kv[1]["secs"])):
    print(f"{m:45} {s['passed']:>3}/{TOTAL:<4} {s['secs']:>7.0f} {s['tokens']:>7}")
    for e in s["errors"]:
        print("     -", e)
