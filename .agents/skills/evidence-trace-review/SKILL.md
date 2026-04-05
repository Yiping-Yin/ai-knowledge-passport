---
name: evidence-trace-review
description: Review changes that touch compiler, passport, access control, or writeback behavior. Use this when a diff may affect provenance, privacy, permissions, or review gates. Do not use it for unrelated cosmetic changes.
---

# Evidence Trace Review

Your job is to review high-risk diffs for trust-boundary and provenance regressions.

## Inputs

- current diff
- `AGENTS.md`
- `docs/spec/Prompt.md`
- `docs/spec/Borrowed_Patterns_and_Risks.md`
- `docs/review/code_review.md`

## Review checklist

1. Is the default outside-AI surface still narrow?
2. Can high-level artifacts still trace back to evidence and sources?
3. Did any change introduce hard capability scoring or unjustified inference?
4. Is there any new auto-merge path from outside AI to canonical knowledge?
5. Are revoke/expiry/audit paths preserved?
6. Did the diff widen access to raw sources or the whole workspace?
7. Does the UI or schema reintroduce concept overload?

## Output format

Return:
- PASS or FAIL
- a short list of critical findings
- a short list of suggested fixes
