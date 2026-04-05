---
name: compiler-bench-loop
description: Run a bounded benchmark-driven optimization loop for one compiler or passport-generation module after a fixed evaluator exists. Use only when explicitly asked and when fixtures and guardrails are already implemented. Do not use for normal feature work or before the evaluator exists.
---

# Compiler Bench Loop

Your job is to run a small, disciplined optimization loop.

## Preconditions

All must be true:

- evaluator exists
- fixtures exist
- writable scope is explicitly named
- human explicitly requested optimization work

If any precondition fails, stop and say why.

## Protocol

1. Re-read `docs/research/program.md` and `docs/research/eval_contract.md`.
2. Confirm the writable scope.
3. Create or switch to a dedicated research branch.
4. Make one coherent change only.
5. Run the evaluator.
6. Record a structured row in `results.tsv`.
7. Keep the change only if promotion rules pass.
8. Otherwise discard the change.

## Limits

- max 3 experiments
- no fixture edits
- no evaluator edits
- no infinite loop
- no widening writable scope without updating the plan

## Output

At the end, report:
- experiments attempted
- kept vs discarded result
- metric summary
- remaining improvement ideas
