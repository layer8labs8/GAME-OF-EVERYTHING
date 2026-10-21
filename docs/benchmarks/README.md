# NVIDIA model benchmark, 2026-10-21

The endpoint listed 83 models. Thirteen likely code-capable ones were each asked for two JavaScript functions, and the answers were run against 28 tests.

Tasks:

- `validateLevel(rows)`: validate a tile level and check that the exit is reachable (12 tests, includes a 200x200 grid).
- `move(grid, dir)` and `isSolved(grid)`: Sokoban rules (16 tests).

| Model | Tests passed | Seconds (both tasks) | Completion tokens |
|---|---|---|---|
| nvidia/nemotron-3-ultra-550b-a55b | 28/28 | 70 | 4906 |
| stepfun-ai/step-5-preview | 28/28 | 279 | 10818 |
| z-ai/glm-5.3-flash | 28/28 | 462 | 8331 |
| deepseek-ai/deepseek-v4.1-flash | 28/28 | 463 | 7745 |
| poolside/laguna-xs-2.1 | 22/28 | 344 | 1600 |
| nvidia/nemotron-3.5-lightning-30b-a3b | 12/28 | 134 | 12413 |
| openai/gpt-oss-20b | 12/28, then 504 | n/a | n/a |
| google/gemma-4-31b-it | no result (timeouts, 504) | n/a | n/a |
| z-ai/glm-5.3 | no result (timeouts, 504) | n/a | n/a |
| nvidia/nemotron-3-super-120b-a12b | 404, not callable | n/a | n/a |
| nvidia/llama-3.1-nemotron-ultra-253b-v1 | 404, not callable | n/a | n/a |
| moonshotai/kimi-k2.6 | 404, not callable | n/a | n/a |
| mistralai/codestral-22b-instruct-v0.1 | 404, not callable | n/a | n/a |

## Caveats

- Two small tasks, one run each. Models that tied at 28/28 are separated only by speed.
- The endpoint is free and shared, so latency depends on load. Seconds are the sum of both tasks, which ran in parallel.
- A missing result (timeout, 504, 404) is availability, not a quality verdict.
- `nemotron-3.5-lightning` returned no code for one task: its reasoning used up the 8000-token limit.
- The list contains embedding, safety and vision models too, which were not tested.
- There is no image-generation model in the list.

Raw output: [raw-run-1.json](raw-run-1.json), [raw-run-2-retry.json](raw-run-2-retry.json).
