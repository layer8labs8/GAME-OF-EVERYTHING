# Writer and checker pipeline

**Status: active prototype.** `tools/writer/loop.py` and `tools/writer/contract_check.js` implement the writer-checker loop, evaluated in [benchmarks/writer-pilot-1.md](benchmarks/writer-pilot-1.md). Original notes: [notes/original-idea.md](notes/original-idea.md).

## Roles

- **Writer:** an NVIDIA-hosted model. It writes code.
- **Checker:** a program (tests, registry check), not a model. It decides pass or fail.
- **Overseer:** a person or a stronger assistant. It only reads a short summary such as "2 tests failed, this error", after the checks pass or after three failed attempts. This keeps its token use small.

## Rules of the loop

1. **Small patches, not whole files.** The writer returns a diff.
2. **One failure at a time.** The writer sees only that failure and the related function.
3. **Patch limit.** A patch is limited to about 30 lines and to the named function. A bigger patch is rejected and reverted, so the writer cannot delete a large part and rewrite it.
4. **Independent tests.** A person gives a few short "this must be true" examples. Verification is not done only by the model that wrote the code.
5. **Hard stop.** After three failed attempts the loop stops and reports.

## What to measure

- share of mechanics solved
- loops needed per mechanic
- overseer tokens versus writer tokens
- patches rejected by the limit

## Writer model choice

A small benchmark of 13 models on two tasks is in [benchmarks/README.md](benchmarks/README.md). In short: `nvidia/nemotron-3-ultra-550b-a55b` passed everything and was the fastest; several others passed but were much slower; several listed models could not be called at all. It is a tiny test (two tasks, one run each), so treat it as a starting point.

## Tools

| Tool | Use |
|---|---|
| `tools/nvidia/client.py` | Shared client; reads the key from the environment or a file outside the repository |
| `tools/nvidia/smoke_test.py` | One streaming request to confirm the key works |
| `tools/nvidia/list_models.py` | List model ids on the endpoint |
| `tools/nvidia/bench.py` | Run the two-task benchmark; pass model ids to re-run only those |

```bash
python tools/nvidia/list_models.py
python tools/nvidia/bench.py z-ai/glm-5.3-flash
```
