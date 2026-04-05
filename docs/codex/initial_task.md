Read these files first, in order:

1. `AGENTS.md`
2. `PLANS.md`
3. `plans/mvp_execplan.md`
4. `docs/spec/Prompt.md`
5. `docs/spec/Borrowed_Patterns_and_Risks.md`
6. `docs/review/code_review.md`

Use plan mode if available.

Task for this run:

## Phase 1 — M0 only
Do repo reconnaissance first.

Requirements:
- inspect the repository to discover the real stack, commands, CI, migrations, tests, and natural module boundaries
- do not assume the suggested architecture if the repo already has equivalent modules
- fill `docs/spec/Documentation.md`
- update `plans/mvp_execplan.md` with discovered commands, stack, and insertion points
- identify whether scaffolding is needed or whether the existing structure should be extended

Constraints:
- keep this phase read-heavy and edit-light
- do not implement product code yet unless a tiny scaffold or doc fix is strictly required for M0

Deliverables:
- updated `docs/spec/Documentation.md`
- updated `plans/mvp_execplan.md`
- concise summary of repo inventory, recommended insertion points, and open blockers

## Phase 2 — If and only if M0 is complete, do M1 only
Implement the domain/schema milestone.

Required entities:
- workspace
- source
- knowledge_node
- evidence_fragment
- capability_signal
- mistake_pattern
- focus_card
- postcard or topic_card representation
- passport
- visa_bundle
- mount_session
- review_candidate
- audit_log

Constraints:
- keep permissions limited to `passport_read`, `topic_read`, `writeback_candidate`
- preserve evidence traceability in the schema
- do not implement mount/review/UI features beyond minimal domain/schema support
- do not start the compile pipeline
- do not start benchmark optimization work

Required outputs:
- domain models/types/entities
- schema + migration(s)
- realistic seed data for one sample workspace
- tests for invariants and relations
- updated docs and plan status

Validation:
- run the repo’s real format/typecheck/test/build commands if they exist
- if commands do not exist, document that clearly instead of inventing fake success

Before finishing:
- review the diff against `docs/review/code_review.md`
- summarize created files, commands run, test results, assumptions, and blockers
