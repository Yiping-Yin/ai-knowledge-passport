# MVP Execution Plan — AI知识护照盘 / AI Passport

## Objective

Ship an MVP that proves one thing:

**Outside AI can understand the user faster and more accurately after reading a Passport than in an empty conversation, without being given full default access to the user’s knowledge base.**

## Source documents

Use these as the source of truth:

- `AGENTS.md`
- `PLANS.md`
- `docs/spec/Prompt.md`
- `docs/spec/Borrowed_Patterns_and_Risks.md`
- `docs/review/code_review.md`
- `docs/research/eval_contract.md` (only when the evaluator exists)
- `docs/research/program.md` (only for bounded benchmark loops)

## Current repo inventory

### Stack
- package manager: npm workspaces
- language(s): TypeScript, React, SQL/SQLite
- app/runtime layout: Next.js App Router app in `apps/web`, shared types/schemas in `packages/shared`, local data under `data/`
- database/persistence: SQLite via `better-sqlite3` + Drizzle ORM, plus local object/file storage
- test runner(s): Vitest

### Commands
- install: `npm install`
- format: no dedicated formatter script exists today
- lint: no dedicated lint script exists today
- typecheck: `npm run typecheck`
- test: `npm run test`
- build: `npm run build`
- migration/seed: no standalone migration CLI; schema bootstrap and incremental upgrades live in `apps/web/src/server/db/init.ts`; demo seed is `npm run demo:seed`

### Architecture notes
- canonical API layer: Next.js route handlers under `apps/web/src/app/api/*` plus public mount routes under `apps/web/src/app/v/[token]`
- canonical domain/model layer: `apps/web/src/server/db/schema.ts`, `apps/web/src/server/db/init.ts`, and shared schemas/types in `packages/shared/src/index.ts`
- canonical UI layer: `apps/web/src/app/*` and `apps/web/src/components/*`
- canonical test/fixture location: `apps/web/src/server/tests`; no dedicated evaluator/fixture harness is checked in yet

## Milestones

### M0 — Repo reconnaissance and control-doc alignment

Goal:
- discover the actual repo structure, commands, conventions, and insertion points
- align the control docs to repo reality before product implementation

Deliverables:
- fill in `docs/spec/Documentation.md`
- update this plan with discovered commands and module map
- identify the natural home for domain/compiler/passport/gateway/review responsibilities
- decide whether scaffolding is needed or whether existing modules should be extended

Acceptance criteria:
- repo commands are documented
- module map is documented
- open unknowns are reduced to specific questions or assumptions
- no product code changed unless a tiny doc/scaffold change was strictly necessary

Validation:
- run the safest read-only discovery commands available
- if docs-only changes were made, no additional validation is required beyond confirming file integrity

Status: COMPLETED in the control-doc bundle PR. Repo inventory and insertion points are documented, and no runtime behavior was changed.

---

### M1 — Domain layer, schema, and seed data

Goal:
- create or extend the canonical domain and persistence model for the MVP

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

Deliverables:
- domain types/models/entities
- persistence schema and migration(s)
- seed data for one realistic sample workspace
- tests for key invariants and relations
- documentation updates

Acceptance criteria:
- every high-level artifact can trace to evidence/source
- permission model is restricted to `passport_read`, `topic_read`, `writeback_candidate`
- writeback objects are candidates, not canonical merges
- schema supports revocation, auditability, and versioning where needed

Validation:
- format
- typecheck
- tests
- migration and seed validation if applicable

Status: IN PROGRESS. The repo already contains baseline schema, persistence, and sample data paths for these entities; current work is narrowing the model and documentation to the MVP contract.

---

### M2 — Compile pipeline v0

Goal:
- compile imported sources into reusable, evidence-backed artifacts

Required pipeline outputs:
- knowledge nodes (`topic`, `project`, `method`, `question`)
- evidence fragments
- capability signals
- mistake patterns
- representative topic cards / postcards
- passport manifest regeneration

Deliverables:
- ingest-to-compile pipeline
- source preservation and provenance links
- fixture-driven tests using representative inputs
- documentation updates

Acceptance criteria:
- raw sources remain preserved
- high-level artifacts have evidence links
- cold start can produce 3-5 representative cards
- active Focus Card is included in Passport output
- compile outputs are inspectable and reviewable

Validation:
- format
- typecheck
- tests
- fixture/golden validation
- benchmark harness only if it already exists

Status: IN PROGRESS. A working compile pipeline, learner-state generation, and passport regeneration path already exist; current work is focused on consistency, fixture discipline, and release hardening.

---

### M3 — Gateway, mount, review, and audit

Goal:
- allow safe outside-AI access without giving away the whole workspace

Required behaviors:
- default surface is Passport + Focus Card + representative cards
- deeper access requires a Visa Bundle
- sessions are logged
- outside AI can only submit writeback candidates
- review queue is diff-first
- audit trail records read/write/revoke/review actions

Deliverables:
- API/service layer for passport read
- visa creation and enforcement
- mount session recording
- writeback candidate submission
- review queue and decision actions
- audit log plumbing
- contract tests

Acceptance criteria:
- no whole-workspace default access
- no auto-merge from outside AI
- session trace is preserved
- revoke and expiry paths exist

Validation:
- format
- typecheck
- tests
- contract tests for access control and writeback behavior

Status: IN PROGRESS. Visa, grant, audit, and writeback-adjacent flows already exist; current work is tightening them to the canonical MVP scopes and review boundaries.

---

### M4 — Thin operator UI

Goal:
- expose only the minimum surfaces needed to operate the MVP

P0 pages:
- Dashboard
- Inbox
- Knowledge
- Passport
- Mount
- Review

Design guidance:
- user-facing objects stay limited to Passport, Focus Card, Topic Cards
- capability signals and mistake patterns may appear as sections, not separate top-level products
- default UI should reinforce trust and review, not abstraction sprawl

Deliverables:
- thin UI scaffolding or pages in the repo’s real frontend
- minimal flows for viewing Passport, inspecting evidence, managing mount sessions, and reviewing writeback candidates

Acceptance criteria:
- no speculative “future platform” UI
- no needlessly separate nav for Signals/Postcards if the repo is starting from scratch
- review and audit surfaces are visible and understandable

Validation:
- format
- typecheck
- tests where the frontend stack supports them
- manual smoke test notes

Status: IN PROGRESS. The app already has a broad operator UI; current work is reducing top-level exposure so the MVP reads as Passport-first instead of platform-first.

---

### M5 — Bounded compiler optimization loop (optional, later)

Goal:
- improve compiler/passport quality with a fixed evaluator and strict guardrails

Preconditions:
- M2 is complete
- evaluator exists
- fixtures are checked in
- guardrail metrics are defined
- writable scope can be narrowed to one module

Deliverables:
- evaluator wiring
- local `results.tsv` usage
- one bounded experiment batch if explicitly requested

Acceptance criteria:
- no infinite autonomy
- no fixture edits
- no evaluator edits during optimization
- score improvements respect safety/token/latency guardrails

Validation:
- evaluator output
- results ledger entry
- review of kept diff

Status: BLOCKED until M2 + evaluator exist

## Out of scope for MVP

- multi-agent autonomous research as a product feature
- public sharing/social graph
- enterprise RBAC matrix
- broad connector ecosystem
- model training or fine-tuning
- automatic writeback merge
- full-text outside-AI search over all private knowledge by default

## Risk register

1. **Concept overload**
   Too many metaphors or object types can make the product unreadable.
   Mitigation: Passport + Focus Card + Topic Card are the only top-level user objects in P0.

2. **Compile hallucination**
   High-level summaries may distort the source.
   Mitigation: evidence traceability, reviewability, and fixture tests.

3. **Capability overclaim**
   Notes/projects do not equal true skill.
   Mitigation: capability signals only, never hard scores.

4. **Permission creep**
   “Temporary” shortcuts can widen access beyond the intended surface.
   Mitigation: explicit three-scope access model and contract tests.

5. **Benchmark gaming**
   Optimizing only one scalar score can produce worse real outputs.
   Mitigation: multi-metric evaluator with guardrails.

6. **Repo mismatch**
   Forcing a prewritten architecture onto the real repo can cause churn.
   Mitigation: M0 reconnaissance first, adapt before scaffolding.

## Decision log

> Update as decisions are made.

- Extend the existing `apps/web` and `packages/shared` modules instead of inventing new top-level apps/packages for the MVP.
- Treat `apps/web/src/app/api/*` plus `apps/web/src/server/services/*` as the canonical API/service layer.
- Treat `apps/web/src/server/db/init.ts` as the current migration/upgrade mechanism until a dedicated migration workflow is justified.
- Use `npm run verify` as the canonical contributor validation gate for this repo.

## Status summary

- M0: completed
- M1: in progress
- M2: in progress
- M3: in progress
- M4: in progress
- M5: blocked

## Notes for the current run

The repository is past a blank-slate MVP state:

- baseline import, compile, review, passport, visa, export, and avatar flows already exist in code and tests
- current work is release hardening and narrowing the exposed user-facing surface to the intended MVP mental model

Default release-candidate instruction unless the human says otherwise:

- align docs and milestone status to implemented reality
- tighten top-level UI exposure without deleting compatible routes
- keep `npm run verify` green throughout
