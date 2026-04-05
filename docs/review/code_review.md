# Code Review Checklist

Use this file when reviewing milestone diffs, ideally with `/review` or an explicit self-review pass.

## 1. Scope discipline

- Does the diff stay within the named milestone?
- Did the change introduce speculative adjacent features?
- If a prerequisite change expanded scope, is it explained in the plan/decision log?

## 2. Product clarity

- Does the change reinforce the product’s narrow value: helping AI understand the user faster?
- Did the diff accidentally turn the product into a generic notes/wiki system?
- Does the UI keep P0 user-facing objects simple (Passport, Focus Card, Topic Card)?

## 3. Trust boundary

- Is outside-AI default access still narrow?
- Is the default surface still Passport + Focus Card + representative Topic Cards?
- Is deep access still Visa-gated?
- Is there any new path that can auto-merge outside-AI output into canonical knowledge? If yes, reject.

## 4. Evidence traceability

- Can high-level claims or summaries trace back to evidence fragments and sources?
- Did any new artifact lose provenance?
- Are tests or contracts covering evidence linkage where appropriate?

## 5. Capability overclaim

- Did any change introduce hard capability scoring or unjustified confidence?
- Are “capability signals” still framed as evidence-backed observations and gaps?

## 6. Privacy and leakage

- Could the diff widen access to raw sources or the whole workspace unintentionally?
- Are redaction, scope, or leakage rules weakened?
- Are logs/audit records appropriate without exposing unnecessary sensitive content?

## 7. Review and auditability

- Are writebacks still candidates, not canonical merges?
- Does the review path preserve source session trace?
- Are revoke/expiry/audit paths preserved or improved?

## 8. Technical quality

- Are the changed files the right insertion points for this repo?
- Are validations documented and run?
- Are tests updated or added?
- Are explicit errors preferred over silent fallbacks?

## 9. Final verdict rubric

A milestone should not be marked done if any of the following are true:

- scope boundary broken
- trust boundary weakened
- evidence traceability regressed
- privacy/safety guardrails regressed
- validation incomplete
- docs/status not updated
