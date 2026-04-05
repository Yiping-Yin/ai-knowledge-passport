# Evaluator Contract — Compiler / Passport Quality

This contract defines how compiler and passport quality should be measured.

## Why this exists

A single scalar metric is too weak for this product.
Compiler changes must improve usefulness **without** harming privacy, evidence traceability, or latency.

## Fixture set

A reasonable minimum benchmark set is 10 fixtures across representative source types, such as:

1. markdown study note
2. project README or design doc
3. meeting summary
4. PDF excerpt or extracted text
5. research note
6. reflection / learning log
7. error/debugging log
8. method/process document
9. mixed-topic folder snapshot
10. focus/goal note

Each fixture should include:

- raw source input
- expected topic hints
- must-keep evidence fragments
- expected focus terms (if applicable)
- forbidden leaks / redacted content expectations

## Required evaluator outputs

The evaluator should emit structured output with at least:

- `evidence_coverage` — fraction of required claims or sections backed by expected evidence
- `citation_precision` — fraction of included citations/evidence links that actually support the claim
- `focus_alignment` — how well the output reflects the active Focus Card or current task
- `passport_token_count` — approximate token size of the delivered Passport surface
- `compile_seconds` — end-to-end runtime for the compile step under test
- `unsafe_leak_count` — count of privacy or scope violations

Optional helpful metrics:

- `topic_recall`
- `signal_quality`
- `mistake_pattern_quality`
- `review_pollution_risk`

## Guardrails

Minimum guardrails for a candidate to be promotable:

- `unsafe_leak_count == 0`
- `citation_precision >= baseline_citation_precision`
- `focus_alignment >= baseline_focus_alignment - tolerance`
- `passport_token_count <= baseline_token_count * 1.15`
- `compile_seconds <= baseline_compile_seconds * 1.20`

You may tighten these if the repo’s benchmark harness supports it.

## Recommended composite score

Only use a composite score after guardrails pass.

Suggested weighted score:

`score = 0.40 * evidence_coverage + 0.35 * citation_precision + 0.25 * focus_alignment`

Token count and latency are treated as guardrails, not reward terms.

## Promotion threshold

A candidate is promotable only if:

- guardrails pass, and
- `score >= baseline_score + 0.01`

Adjust the epsilon only if measurement noise clearly requires it.

## Evaluator output shape (suggested)

```json
{
  "run_id": "2026-04-05-a",
  "scope": "packages/compiler/src/compile_passport.ts",
  "score": 0.82,
  "evidence_coverage": 0.84,
  "citation_precision": 0.89,
  "focus_alignment": 0.71,
  "passport_token_count": 1340,
  "compile_seconds": 2.8,
  "unsafe_leak_count": 0,
  "status": "keep",
  "summary": "Improved evidence selection without increasing leaks."
}
```

## Anti-gaming rules

The evaluator should not reward:

- shorter outputs that omit essential evidence
- vague claims with no traceability
- overconfident capability claims
- hidden widening of access scope
- silently dropping difficult sections

## Manual fallback

If an automated evaluator does not yet exist, do **not** start a research loop.
Instead:

- build the evaluator as a normal milestone,
- or run a one-off manual comparison outside the bounded research protocol.
