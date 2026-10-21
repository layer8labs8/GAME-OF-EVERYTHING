# Contributing

## Setup

```bash
npm run setup     # pre-commit hook that blocks keys
npm run verify    # must pass before every commit
```

## Add or finish a mechanic

1. Find or add its entry in `registry/mechanics.json`. Ids are four digits and never reused.
2. Create `mechanics/<id>-<slug>/` and write `test.js` first, from short "this must be true" examples. See [docs/MECHANIC-SPEC.md](docs/MECHANIC-SPEC.md).
3. Write `www/logic.js` until the tests pass. Keep it pure and seeded.
4. Add `www/index.html` if the mechanic is playable.
5. Choose its `levels` value (`none`, `endless` or `data`). For `data`, add `levels.json` and `solver.js` as described in [docs/LEVELS.md](docs/LEVELS.md).
6. Update the entry with `node tools/registry_set.js <id> status=logic levels=data`, then run `npm run status` to regenerate `registry/STATUS.md` and the README block.
7. Run `npm run verify`.

## Rules

- Original rules text, names, art and levels only. See [docs/LEGAL.md](docs/LEGAL.md).
- No dependencies in `mechanics/` or `tools/` unless there is a strong reason.
- Never commit keys. Read [SECURITY.md](SECURITY.md).
- Commit messages: a short imperative summary, then a blank line and the reason if it is not obvious.
