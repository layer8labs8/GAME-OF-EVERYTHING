# Idea: writer AI + checker loop

## Short description

A task is given. Another AI (through an API) writes the code, the code is checked after every step, and the loop repeats until the result is good. The overseer only reads a short result, so few tokens are used.

## Design

- **Writer:** free NVIDIA endpoints (OpenAI-compatible API). The key lives in the `NVIDIA_API_KEY` environment variable. Never paste the key into chat and never commit it.
- **Checker:** automatic tests, lint and type checks. A program runs them, not an LLM.
- **Overseer:** sees only a short summary ("2 tests failed, this error"). It looks after the automatic checks pass, or after 3 failed attempts.
- **The writer returns small diffs, not whole files.**
- **One failure at a time.** The writer gets only that failure and the related function.
- **Patch limit:** at most about 30 lines, and only the named function. A larger patch is rejected and reverted, so the writer cannot delete a large part and rewrite it.
- **Test independence:** if the AI that writes the code also writes the test, the same misunderstanding ends up in the test. A person gives a few short "this must be true" examples, and a different AI than the writer does the checking.

## Does the idea work?

Measures:

- what share of tasks is solved
- how many loops it takes
- overseer tokens versus writer tokens
- how many patches were rejected by the limit
