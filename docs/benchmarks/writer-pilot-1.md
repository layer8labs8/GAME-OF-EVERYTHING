# Writer pilot

Time box: 30 minutes. Wall time: 23.6 minutes. Writer: `nvidia/nemotron-3-ultra-550b-a55b`. Designers (spec and tests), in order of preference: `stepfun-ai/step-5-preview`, `nvidia/nemotron-3-ultra-550b-a55b`. When the writer model also designed, the test author was not independent.

**1 of 16 mechanics passed** (contract checks plus the designer's tests).

| Mechanic | Result | Designer | Writer calls | Rejected patches | Seconds | Designer tokens | Writer tokens | Note |
|---|---|---|---|---|---|---|---|---|
| 0016-snake | failed | nemotron-3-ultra-550b-a55b | 1 | 0 | 310 | 4243 | 8000 | writer reply had no code block |
| 0017-court-rally | failed | nemotron-3-ultra-550b-a55b | 5 | 4 | 484 | 6794 | 21962 | not ok 1 - createState returns correct initial state |
| 0018-shard-breaker | error |  | 0 | 0 | 303 | 0 | 0 | nemotron-3-ultra-550b-a55b: Request timed out. |
| 0019-whack-a-mole | failed | nemotron-3-ultra-550b-a55b | 1 | 0 | 290 | 7513 | 8000 | writer reply had no code block |
| 0021-tap-timing | error |  | 0 | 0 | 301 | 0 | 0 | nemotron-3-ultra-550b-a55b: Request timed out. |
| 0020-one-button-jumper | design-failed | nemotron-3-ultra-550b-a55b | 0 | 0 | 272 | 9000 | 0 | designer reply had no SPEC/TESTS layout |
| 0065-memory-match | passed | nemotron-3-ultra-550b-a55b | 2 | 0 | 297 | 6567 | 5016 |  |
| 0070-minesweeper | error | nemotron-3-ultra-550b-a55b | 0 | 0 | 341 | 5424 | 0 | nemotron-3-ultra-550b-a55b: Request timed out. |
| 0064-sliding-puzzle | failed | nemotron-3-ultra-550b-a55b | 5 | 3 | 371 | 3335 | 15961 | not ok 2 - legalActions returns only valid directions |
| 0063-merge-puzzle | design-failed | nemotron-3-ultra-550b-a55b | 0 | 0 | 264 | 9000 | 0 | designer reply had no SPEC/TESTS layout |
| 0071-stack-tower | design-failed | nemotron-3-ultra-550b-a55b | 0 | 0 | 273 | 9000 | 0 | designer reply had no SPEC/TESTS layout |
| 0042-falling-blocks | failed | nemotron-3-ultra-550b-a55b | 1 | 0 | 259 | 4379 | 8000 | writer reply had no code block |
| 0086-blackjack | failed | nemotron-3-ultra-550b-a55b | 5 | 3 | 344 | 9000 | 11558 | not ok 1 - test.js |
| 0068-sudoku | failed | nemotron-3-ultra-550b-a55b | 5 | 4 | 483 | 8168 | 20040 | not ok 1 - test.js |
| 0067-pipe-connect | failed | nemotron-3-ultra-550b-a55b | 5 | 4 | 462 | 8659 | 20869 | not ok 5 - Example 1: first move no connection |
| 0169-clicker | error | nemotron-3-ultra-550b-a55b | 3 | 2 | 292 | 6567 | 8888 | nemotron-3-ultra-550b-a55b: Error code: 500 - {'type': 'urn:nvcf-worker-service:problem-details:internal-server-error', 'title': |

## Levels

Mechanic 0043-sokoban: 2 new levels accepted by the solver, 10 rejected, 1168 writer tokens in 1 call(s).
- rejected "First push": duplicate
- rejected "Two in a row": rows must have equal length
- rejected "Step aside": too short (3 moves)
- rejected "Block and pass": crates (2) and targets (1) must match
- rejected "Order matters": crates (2) and targets (3) must match
- rejected "Corridor dance": crates (2) and targets (4) must match
- rejected "Double back": unsolvable
- rejected "Deadlock alley": unsolvable
- rejected "Split decision": unsolvable
- rejected "Four corners": rows must have equal length

Caveats: one run per mechanic. A passing mechanic satisfies the checks, which is not proof that it is fun or complete. Tests written by the designer can also be wrong; failures are not all writer mistakes.
