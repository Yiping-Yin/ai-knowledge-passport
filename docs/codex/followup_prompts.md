# Follow-up Prompts for Codex

## Prompt for M2 — Compile pipeline v0

Read `AGENTS.md`, `PLANS.md`, `plans/mvp_execplan.md`, `docs/spec/Prompt.md`, `docs/spec/Borrowed_Patterns_and_Risks.md`, and `docs/review/code_review.md` first.

Use plan mode if available.

Implement **M2 only**.

Goal:
Build the source -> compile pipeline that generates evidence-backed knowledge artifacts and a Passport.

Required behaviors:
- preserve raw sources
- generate knowledge nodes (`topic`, `project`, `method`, `question`)
- extract evidence fragments
- generate capability signals
- generate mistake patterns
- generate 3-5 representative Topic Cards / postcards
- regenerate Passport including active Focus Card

Constraints:
- do not widen outside-AI access
- do not implement mount/review UI yet
- do not start research-loop optimization
- keep cold start simple and inspectable

Validation:
- format / typecheck / tests
- fixture or golden validation if available
- review against `docs/review/code_review.md`

---

## Prompt for M3 — Gateway + Review + Audit

Read the same control docs first.

Use plan mode if available.

Implement **M3 only**.

Goal:
Enable narrow outside-AI delivery with Passport-first access, Visa-gated deep reads, mount-session logging, writeback candidates, review queue support, and audit trail behavior.

Constraints:
- default outside-AI surface remains Passport + Focus Card + representative Topic Cards
- no whole-workspace default search
- no auto-merge writeback
- keep permissions to `passport_read`, `topic_read`, `writeback_candidate`

Validation:
- contract tests for access control and writeback behavior
- review against `docs/review/code_review.md`

---

## Prompt for M4 — Thin UI

Read the same control docs first.

Use plan mode if available.

Implement **M4 only**.

Goal:
Create the thin operator UI for:
- Dashboard
- Inbox
- Knowledge
- Passport
- Mount
- Review

Constraints:
- do not create speculative pages for every internal object
- keep user-facing objects simple
- capability signals and mistake patterns can appear as sections, not primary products
- trust/review surfaces must remain obvious

Validation:
- real frontend checks for the repo
- manual smoke-test notes
- review against `docs/review/code_review.md`

---

## Prompt for M5 — Bounded compiler optimization loop

Read:
- `AGENTS.md`
- `PLANS.md`
- `plans/mvp_execplan.md`
- `docs/research/program.md`
- `docs/research/eval_contract.md`
- `docs/review/code_review.md`

Only proceed if the evaluator already exists.

Use `$compiler-bench-loop`.

Task:
Run one bounded optimization batch against the named compiler module.

Constraints:
- max 3 experiments
- no fixture edits
- no evaluator edits
- no infinite loop
- keep the commit only if guardrails pass and score improves

Outputs:
- structured result entries in local `results.tsv`
- kept or discarded diff with explanation
- review summary
