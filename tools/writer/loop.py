#!/usr/bin/env python3
"""Writer-checker loop.

One model designs a spec and tests, a different model writes www/logic.js, and programs
(a generic contract check plus the designed tests) decide whether it is right. Failed checks
are fed back one at a time and fixed with small SEARCH/REPLACE patches.

  python tools/writer/loop.py --minutes 30 --workers 4
  python tools/writer/loop.py --only snake,pong --minutes 10
  python tools/writer/loop.py --only none --levels 0043 --count 12

The overseer reads only the final summary and the report in docs/benchmarks/.
"""
import argparse
import difflib
import json
import re
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
sys.path.insert(0, str(HERE.parent / "nvidia"))
from client import make_client  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")

WRITER = "nvidia/nemotron-3-ultra-550b-a55b"
# (model, timeout in seconds). The fallback designer is the writer itself, which is flagged in the report.
DESIGN_MODELS = [("stepfun-ai/step-5-preview", 150), (WRITER, 150)]
WRITER_TIMEOUT = 150
PATCH_LIMIT = 30
MAX_WRITER_CALLS = 5

PILOT = {
    "snake": "a snake on a small grid that grows when it eats food and loses by hitting a wall or itself",
    "pong": "a paddle, a ball and a simple computer paddle; first side to a score limit wins",
    "breakout": "a paddle, a ball and rows of bricks; the ball bounces and clears bricks; lose when the ball is missed three times",
    "whack-a-mole": "moles pop up in a grid of holes for a few steps; hitting one scores; a round has a fixed number of steps",
    "tap-timing": "a marker sweeps back and forth across a bar; tapping near the target zone scores more; fixed number of taps",
    "one-button-jumper": "a character that can only jump over gaps and obstacles scrolling by; one action: jump or wait",
    "memory-match": "a grid of face-down cards with pairs; flip two per turn; matched pairs stay up; limited number of turns",
    "minesweeper": "a small grid with hidden mines; reveal cells showing neighbour counts; flag is optional; lose on a mine",
    "sliding-puzzle": "a 3x3 sliding tile puzzle with one gap, started from a shuffle that is always solvable; move a tile into the gap",
    "merge-puzzle": "a 4x4 grid where equal tiles merge when all tiles slide in one direction, and a new tile appears after each move",
    "stack-tower": "blocks slide back and forth and are dropped onto a tower; overhang is cut off; the game ends when nothing is left",
    "falling-blocks": "tetromino-style pieces fall on a 10x20 board; move, rotate and drop; full rows clear",
    "blackjack": "one player against a dealer with a seeded deck; hit or stand; closest to 21 without going over wins; several rounds with chips",
    "sudoku": "a 4x4 sudoku (digits 1-4) with some given cells; place a digit in an empty cell; three mistakes end the game",
    "pipe-connect": "a grid of pipe pieces that can be rotated a quarter turn; connect the source to the drain; limited rotations",
    "clicker": "tap to earn coins, spend coins on upgrades that earn more per tap; the game ends after a fixed number of steps",
}

LEVEL_HINTS = {
    "0043": "Characters: # wall, space floor, @ player, $ crate, . target, * crate on target, + player on target. "
    "All rows have the same length, the room is closed by walls, and the number of crates equals the number of targets. "
    "Keep levels small (at most 9 columns and 8 rows) and make them require real planning.",
}

DESIGN_PROMPT = """You are designing the rules of a small 2D game as a pure, deterministic JavaScript module, plus tests for it.

Game: $NAME (family: $FAMILY). Idea: $HINT.
Use your own wording and your own rule details. Do not copy names, art or text from any commercial game.

Reply in exactly this layout and nothing else:

=====SPEC=====
(plain markdown text, with NO code fences anywhere in it) with these sections:
## Rules - short and clear.
## State - the exact JSON shape: every field, its type and meaning. Include a step counter and an integer field `rng` for a seeded random generator.
## Actions - the exact JSON value of every action (for example "left", or {"type":"place","x":2}).
## Step rules - what each action does, the reward, and when the game ends. The game MUST end after at most 400 steps even if the player does nothing useful.
## Score - how score(state) is computed.
## Examples - at least 6 concrete examples. Each one: the situation (which state fields are set), one action, and the exact expected fields, reward and done afterwards.
=====TESTS=====
(JavaScript for node:test, NO markdown fences) starting with:
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./www/logic.js');
Write at least 8 tests that check only behaviour stated in the spec, including every example. To build a situation, call L.createState(1) and then assign the state fields defined in the State section. Do not depend on specific random values.
=====END=====

The module API that the tests use:
- createState(seed) returns a plain JSON state.
- legalActions(state) returns an array of actions, empty when the game is over.
- step(state, action) changes the state in place, returns { reward: number, done: boolean }, and throws an Error if the action is not in legalActions.
- isOver(state) returns a boolean.
- score(state) returns a number.
"""

WRITE_PROMPT = """Implement logic.js for this game spec. Follow the spec exactly: field names, action formats, rules.

SPEC:
$SPEC

Requirements:
- Plain JavaScript, no dependencies, pure and deterministic. Never use Math.random, Date, performance, the DOM or any I/O.
- Randomness only from a seeded generator (mulberry32) whose integer state is stored in state.rng.
- Export: createState(seed), legalActions(state), step(state, action), isOver(state), score(state). step changes the state in place, returns { reward, done }, and throws an Error for an action that is not in legalActions. The game must end by the step limit in the spec.
- legalActions must not change the state and must return no duplicates.
- Use exactly this wrapper:

(function (root) {
  // implementation
  const api = { createState, legalActions, step, isOver, score };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameLogic = api;
})(typeof self !== 'undefined' ? self : globalThis);

Reply with ONE ```js block containing the whole file and nothing else.
"""

REPAIR_PROMPT = """logic.js fails a check. Fix it with SEARCH/REPLACE blocks only, changing at most $LIMIT lines in total.

SPEC:
$SPEC

CURRENT logic.js:
```js
$CODE
```

FAILING CHECK:
$FAILURE
$REJECTED
Format of one block (SEARCH must match the current file exactly and only once):
<<<<<<< SEARCH
exact existing lines
=======
replacement lines
>>>>>>> REPLACE

Reply with only the blocks.
"""

LEVELS_PROMPT = """Write $COUNT new, original levels for the puzzle game "$NAME", in exactly the JSON shape of these examples.

EXAMPLES:
$EXAMPLES

$HINT

Order them from easiest to hardest (difficulty 1 to 5). Every level must be solvable and need real planning, not just a few moves.
Reply with ONLY a JSON array of objects { "name", "difficulty", "data" }.
"""


def log(message):
    print(f"[{(time.time() - START) / 60:5.1f} min] {message}", flush=True)


def chat(models, prompt, max_tokens, deadline=None):
    """Try each (model, timeout) once, in order. One attempt each, so a slow endpoint cannot stall a job."""
    last = "no model answered"
    for model, timeout in models:
        if deadline and time.time() > deadline:
            raise RuntimeError("time box reached")
        # Thinking is switched off for Nemotron: in the first pilot it used up the whole token limit
        # before any code was written (replies of exactly 8000 or 9000 tokens with no code block).
        extra = {"chat_template_kwargs": {"enable_thinking": False}} if "nemotron" in model else None
        try:
            r = make_client(timeout=timeout).chat.completions.create(
                model=model, messages=[{"role": "user", "content": prompt}], temperature=0.2, max_tokens=max_tokens, extra_body=extra
            )
            return model, r.choices[0].message.content or "", (r.usage.completion_tokens if r.usage else 0)
        except Exception as e:  # noqa: BLE001
            last = f"{model.split('/')[-1]}: {str(e)[:100]}"
            log(f"model call failed, {last}")
    raise RuntimeError(last)


def fenced(text, lang="js"):
    blocks = re.findall(rf"```(?:{lang}|javascript)?\s*\n(.*?)```", text, re.S)
    if blocks:
        return max(blocks, key=len)
    return text if "module.exports" in text else None


def parse_design(text):
    m = re.search(r"=====SPEC=====\s*(.*?)\s*=====TESTS=====\s*(.*?)\s*(?:=====END=====|$)", text, re.S)
    if not m:
        return None, None
    tests = m.group(2).strip()
    f = re.search(r"```(?:js|javascript)?\s*\n(.*?)```", tests, re.S)
    return m.group(1).strip(), (f.group(1) if f else tests).strip() + "\n"


PATCH = re.compile(r"<<<<<<< SEARCH\n(.*?)\n=======\n(.*?)\n>>>>>>> REPLACE", re.S)


def find_block(code, old):
    """Locate `old` in `code`: exact match first, then a match that ignores indentation and trailing spaces."""
    if code.count(old) == 1:
        i = code.index(old)
        return i, i + len(old)
    lines = code.split("\n")
    want = [l.strip() for l in old.split("\n")]
    hits = [i for i in range(len(lines) - len(want) + 1) if all(lines[i + j].strip() == want[j] for j in range(len(want)))]
    if len(hits) != 1:
        return None
    start = sum(len(l) + 1 for l in lines[: hits[0]])
    end = start + sum(len(l) + 1 for l in lines[hits[0] : hits[0] + len(want)]) - 1
    return start, end


def apply_patch(code, reply):
    blocks = PATCH.findall(reply)
    if not blocks:
        return None, "the reply had no SEARCH/REPLACE block"
    changed = 0
    for old, new in blocks:
        span = find_block(code, old)
        if span is None:
            return None, "a SEARCH text was not found, or was found more than once; copy the lines exactly"
        diff = list(difflib.ndiff(old.split("\n"), new.split("\n")))
        changed += max(sum(d.startswith("- ") for d in diff), sum(d.startswith("+ ") for d in diff))
        code = code[: span[0]] + new + code[span[1] :]
    if changed > PATCH_LIMIT:
        return None, f"the patch changes {changed} lines; the limit is {PATCH_LIMIT}"
    return code, None


def node(args, cwd=None, timeout=120):
    return subprocess.run(["node", *args], cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout)


def check(work):
    try:
        c = node([str(HERE / "contract_check.js"), str(work / "www" / "logic.js")])
        failures = json.loads(c.stdout.strip().splitlines()[-1])["failures"]
    except Exception as e:  # noqa: BLE001
        return f"contract runner crashed: {str(e)[:200]}"
    if failures:
        return f"contract check [{failures[0]['check']}]: {failures[0]['message']}"
    try:
        t = node(["--test", "--test-reporter=tap", "test.js"], cwd=work)
    except subprocess.TimeoutExpired:
        return "tests timed out (an infinite loop?)"
    if t.returncode == 0:
        return None
    out = t.stdout + t.stderr
    i = out.find("not ok")
    return out[i : i + 1800] if i >= 0 else out[:1200]


def run_mechanic(m, hint, deadline, launch_cutoff):
    label = f"{m['id']}-{m['slug']}"
    res = {"id": m["id"], "slug": m["slug"], "status": "skipped", "calls": 0, "rejected": 0, "secs": 0, "design_tokens": 0, "writer_tokens": 0, "designer": "", "note": ""}
    if time.time() > launch_cutoff:
        res["note"] = "not started: time box"
        return res
    t0 = time.time()
    work = REPO / "build" / "writer" / label
    shutil.rmtree(work, ignore_errors=True)
    (work / "www").mkdir(parents=True)
    try:
        prompt = DESIGN_PROMPT.replace("$NAME", m["name"]).replace("$FAMILY", m["family"]).replace("$HINT", hint)
        model, text, toks = chat(DESIGN_MODELS, prompt, 9000, deadline)
        res["designer"], res["design_tokens"] = model.split("/")[-1], toks
        (work / "design-raw.txt").write_text(text, encoding="utf-8")
        spec, tests = parse_design(text)
        if not spec or not tests:
            res.update(status="design-failed", note="designer reply had no SPEC/TESTS layout")
            log(f"{label}: design failed ({res['designer']})")
            return res
        (work / "SPEC.md").write_text(spec + "\n", encoding="utf-8")
        (work / "test.js").write_text(tests, encoding="utf-8")
        syntax = node(["--check", "test.js"], cwd=work)
        if syntax.returncode != 0:
            # a broken test file cannot be fixed by the writer, so the designer gets one chance to repair it
            fix = f"This test file does not parse. Fix only the syntax and reply with the whole file in one ```js block.\n\nERROR:\n{syntax.stderr[:600]}\n\nFILE:\n```js\n{tests}\n```"
            _, text, toks = chat(DESIGN_MODELS, fix, 9000, deadline)
            res["design_tokens"] += toks
            tests = fenced(text) or ""
            (work / "test.js").write_text(tests, encoding="utf-8")
            if not tests or node(["--check", "test.js"], cwd=work).returncode != 0:
                res.update(status="design-failed", note="the designed test file does not parse")
                log(f"{label}: test file does not parse")
                return res
        log(f"{label}: designed by {res['designer']}")

        _, text, toks = chat([(WRITER, WRITER_TIMEOUT)], WRITE_PROMPT.replace("$SPEC", spec), 8000, deadline)
        res["calls"], res["writer_tokens"] = 1, toks
        code = fenced(text)
        if not code:
            res.update(status="failed", note="writer reply had no code block")
            return res
        (work / "www" / "logic.js").write_text(code, encoding="utf-8")

        rejected_note = ""
        while True:
            failure = check(work)
            if failure is None:
                res["status"] = "passed"
                break
            res["note"] = failure.splitlines()[0][:160]
            if res["calls"] >= MAX_WRITER_CALLS or time.time() > deadline:
                res["status"] = "failed" if res["calls"] >= MAX_WRITER_CALLS else "timeout"
                break
            prompt = (REPAIR_PROMPT.replace("$LIMIT", str(PATCH_LIMIT)).replace("$SPEC", spec).replace("$CODE", code)
                      .replace("$FAILURE", failure).replace("$REJECTED", rejected_note))
            _, text, toks = chat([(WRITER, WRITER_TIMEOUT)], prompt, 4000, deadline)
            res["calls"] += 1
            res["writer_tokens"] += toks
            new_code, err = apply_patch(code, text)
            if err:
                res["rejected"] += 1
                rejected_note = f"\nYour previous patch was rejected: {err}\n"
                continue
            rejected_note = ""
            code = new_code
            (work / "www" / "logic.js").write_text(code, encoding="utf-8")

        if res["status"] == "passed":
            dest = REPO / "mechanics" / label
            (dest / "www").mkdir(parents=True, exist_ok=True)
            shutil.copy(work / "SPEC.md", dest / "SPEC.md")
            shutil.copy(work / "test.js", dest / "test.js")
            shutil.copy(work / "www" / "logic.js", dest / "www" / "logic.js")
            res["note"] = ""
        log(f"{label}: {res['status']} after {res['calls']} writer call(s)")
    except Exception as e:  # noqa: BLE001
        res.update(status="error", note=str(e)[:160])
        log(f"{label}: error {res['note']}")
    finally:
        res["secs"] = round(time.time() - t0)
    return res


def run_levels(m, count):
    d = REPO / "mechanics" / f"{m['id']}-{m['slug']}"
    doc = json.loads((d / "levels.json").read_text(encoding="utf-8"))
    examples = json.dumps([{"name": l["name"], "difficulty": l["difficulty"], "data": l["data"]} for l in doc["levels"][:2]], indent=1)
    prompt = LEVELS_PROMPT.replace("$COUNT", str(count)).replace("$NAME", m["name"]).replace("$EXAMPLES", examples).replace("$HINT", LEVEL_HINTS.get(m["id"], ""))
    out = {"id": m["id"], "slug": m["slug"], "accepted": 0, "rejected": [], "tokens": 0, "calls": 0, "note": ""}
    try:
        for attempt in range(2):
            _, text, toks = chat([(WRITER, WRITER_TIMEOUT)], prompt, 6000)
            out["calls"] += 1
            out["tokens"] += toks
            blocks = re.findall(r"```(?:json)?\s*\n(.*?)```", text, re.S)
            body = blocks[0] if blocks else text[text.find("["): text.rfind("]") + 1]
            proposed = REPO / "build" / "writer" / f"proposed-{m['id']}.json"
            proposed.parent.mkdir(parents=True, exist_ok=True)
            proposed.write_text(body, encoding="utf-8")
            r = node([str(HERE / "merge_levels.js"), m["id"], str(proposed), str(count)])
            try:
                summary = json.loads(r.stdout.strip().splitlines()[-1])
            except Exception:  # noqa: BLE001
                out["note"] = "merge helper gave no result: " + (r.stderr or r.stdout)[:150]
                continue
            if "error" in summary:
                out["note"] = summary["error"]
                continue
            out["accepted"] += summary["accepted"]
            out["rejected"] += summary["rejected"]
            out["note"] = ""
            break
        log(f"levels {m['id']}: {out['accepted']} accepted, {len(out['rejected'])} rejected")
    except Exception as e:  # noqa: BLE001
        out["note"] = str(e)[:160]
    return out


def write_report(path, results, level_result, minutes, wall):
    passed = [r for r in results if r["status"] == "passed"]
    lines = [
        "# Writer pilot",
        "",
        f"Time box: {minutes:g} minutes. Wall time: {wall / 60:.1f} minutes. Writer: `{WRITER}`. Designers (spec and tests), in order of preference: {', '.join(f'`{m}`' for m, _ in DESIGN_MODELS)}. When the writer model also designed, the test author was not independent.",
        "",
        f"**{len(passed)} of {len(results)} mechanics passed** (contract checks plus the designer's tests).",
        "",
        "| Mechanic | Result | Designer | Writer calls | Rejected patches | Seconds | Designer tokens | Writer tokens | Note |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for r in results:
        lines.append(f"| {r['id']}-{r['slug']} | {r['status']} | {r['designer']} | {r['calls']} | {r['rejected']} | {r['secs']} | {r['design_tokens']} | {r['writer_tokens']} | {r['note'].replace('|', '/')} |")
    if level_result:
        lines += ["", "## Levels", "", f"Mechanic {level_result['id']}-{level_result['slug']}: {level_result['accepted']} new levels accepted by the solver, {len(level_result['rejected'])} rejected, {level_result['tokens']} writer tokens in {level_result['calls']} call(s)."]
        for rej in level_result["rejected"][:12]:
            lines.append(f"- rejected \"{rej.get('name')}\": {rej['reason']}")
        if level_result["note"]:
            lines.append(f"- note: {level_result['note']}")
    lines += ["", "Caveats: one run per mechanic. A passing mechanic satisfies the checks, which is not proof that it is fun or complete. Tests written by the designer can also be wrong; failures are not all writer mistakes.", ""]
    path.write_text("\n".join(lines), encoding="utf-8")


def main():
    global START
    START = time.time()
    ap = argparse.ArgumentParser()
    ap.add_argument("--minutes", type=float, default=30)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--only", default="")
    ap.add_argument("--levels", default="")
    ap.add_argument("--count", type=int, default=12)
    ap.add_argument("--report", default="docs/benchmarks/writer-pilot-1.md")
    args = ap.parse_args()

    registry = json.loads((REPO / "registry" / "mechanics.json").read_text(encoding="utf-8"))["mechanics"]
    by_slug = {m["slug"]: m for m in registry}
    slugs = [s for s in (args.only.split(",") if args.only else PILOT) if s and s != "none"]
    deadline = START + args.minutes * 60
    launch_cutoff = START + max(args.minutes - 7, 1) * 60

    level_result = None
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        level_future = None
        if args.levels:
            level_future = pool.submit(run_levels, next(m for m in registry if m["id"] == args.levels.zfill(4)), args.count)
        futures = [pool.submit(run_mechanic, by_slug[s], PILOT.get(s, by_slug[s]["name"]), deadline, launch_cutoff) for s in slugs]
        results = [f.result() for f in futures]
        if level_future:
            level_result = level_future.result()

    for r in results:
        if r["status"] == "passed":
            subprocess.run(["node", str(REPO / "tools" / "registry_set.js"), r["id"], "status=logic", "levels=endless", "bot=true"], cwd=REPO, check=True, capture_output=True)
    subprocess.run(["node", str(REPO / "tools" / "make_status.js")], cwd=REPO, check=True, capture_output=True)
    if results or level_result:
        write_report(REPO / args.report, results, level_result, args.minutes, time.time() - START)

    passed = [r for r in results if r["status"] == "passed"]
    print(f"\nDONE in {(time.time() - START) / 60:.1f} min: {len(passed)}/{len(results)} mechanics passed")
    for r in results:
        print(f"  {r['id']}-{r['slug']:<20} {r['status']:<14} calls={r['calls']} rejected={r['rejected']} {r['note'][:90]}")
    if level_result:
        print(f"  levels {level_result['id']}: {level_result['accepted']} accepted, {len(level_result['rejected'])} rejected {level_result['note']}")


START = time.time()

if __name__ == "__main__":
    main()
