# Bounded Compiler Research Program

This document defines the only allowed “autoresearch-like” loop for this repository.

## Status

**Disabled by default.**
Do not start this loop unless the evaluator and fixtures already exist and the human explicitly asks for compiler optimization work.

## Purpose

Improve one narrow compiler or passport-generation module using fixed fixtures and guardrail metrics.

This is **not** an open-ended autonomy loop.

## Preconditions

All of these must be true before starting:

- `docs/research/eval_contract.md` exists and is implemented
- fixed fixtures are checked in
- golden expectations or structured expected outputs exist
- writable scope can be narrowed to one module or file set
- the human explicitly asks for an optimization run

If any precondition is false, do normal milestone work instead.

## Human-owned files

Do not modify these during an optimization loop unless the human explicitly asks:

- `AGENTS.md`
- `PLANS.md`
- `plans/mvp_execplan.md`
- `docs/spec/Prompt.md`
- `docs/spec/Borrowed_Patterns_and_Risks.md`
- `docs/research/eval_contract.md`
- fixtures and goldens

## Read-only evaluation surface

Do not modify during optimization:

- evaluator code
- benchmark fixtures
- golden outputs
- redaction/leakage rules
- review policy docs

## Writable scope

The human or plan must name one narrow writable scope, for example:

- `packages/compiler/src/compile_passport.ts`
- `packages/compiler/src/postcard_builder.ts`
- `apps/api/src/passport/serializer.ts`

If writable scope is not explicitly named, do not start the loop.

## Branching

Use a dedicated branch such as:

`research/passport-compiler/<tag>`

If the repo prefers worktrees and they are already in use, a matching worktree is acceptable. Otherwise use a branch only.

## Experiment budget

Per optimization run:

- maximum experiments: 3
- maximum kept commits: 1 unless the human asks for a longer run
- stop early if no meaningful improvement is found
- do not continue indefinitely
- do not ask “should I continue forever?”

## Experiment protocol

For each experiment:

1. Re-read the evaluator contract.
2. Re-state the writable scope.
3. Make one coherent experimental change only.
4. Commit the change locally.
5. Run the evaluator.
6. Record a structured result in `results.tsv`.
7. Keep the commit only if the promotion rule passes.
8. Otherwise reset to the previous kept commit.

## Promotion rule

A commit may be kept only if **all** of these hold:

- `unsafe_leak_count == 0`
- `citation_precision` does not regress
- `focus_alignment` does not regress materially
- token budget does not exceed the allowed guardrail
- compile latency does not regress beyond the allowed guardrail
- total score improves by the threshold defined in the evaluator contract

If any guardrail fails, discard the commit.

## Results ledger

Use a tab-separated local ledger named `results.tsv`.

Columns:

`run_id	branch	commit	scope	evidence_coverage	citation_precision	focus_alignment	passport_token_count	compile_seconds	unsafe_leak_count	status	description`

Do not commit `results.tsv` unless the human explicitly asks.

## Logging discipline

Do not feed raw terminal logs back into future prompts when a structured summary is available.

Prefer:

- evaluator JSON
- summarized failure reason
- last relevant stack trace excerpt only when needed

## Hard prohibitions

- no fixture edits
- no evaluator edits
- no widening writable scope mid-run without updating the plan
- no infinite loops
- no “improvements” that weaken evidence traceability or privacy
