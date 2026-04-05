<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
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

Status: NOT STARTED

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

Status: NOT STARTED

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

Status: NOT STARTED

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

Status: NOT STARTED

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
- M1: not started
- M2: not started
- M3: not started
- M4: not started
- M5: blocked

## Notes for the current run

This control-doc bundle PR is intentionally docs/process-only:

- imported the canonical control docs and repo-local skills
- aligned M0 inventory content with the actual monorepo
- left runtime behavior unchanged

Default starting instruction unless the human says otherwise:

- do **M1 only** next
- do **not** start M2+ without explicit instruction
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
# MVP Execution Plan

Status: in progress
Last updated: 2026-04-05

## M0 — Repository inventory baseline

### Monorepo/workspaces

- Root `package.json` defines npm workspaces:
  - `apps/*`
  - `packages/*`
- Active packages:
  - `apps/web` (`@ai-knowledge-passport/web`)
  - `packages/shared` (`@ai-knowledge-passport/shared`)

### Stack and runtime

- App framework: Next.js `^16.2.2` (App Router)
- UI: React `^19.1.0`, TypeScript
- Persistence: SQLite via `better-sqlite3` + Drizzle ORM
- Testing: Vitest (`vitest run` in `apps/web`)
- CI verification: `.github/workflows/ci.yml` installs deps and runs `npm run ci:verify` (`npm run verify`)

### Core repository paths

- Web app and server logic: `apps/web/`
- Shared schemas/types: `packages/shared/src/index.ts`
- Database schema/init: `apps/web/src/server/db/`
- Services and route handlers:
  - `apps/web/src/server/services/`
  - `apps/web/src/app/api/`
- Tests: `apps/web/src/server/tests/`

### Commands

- Install: `npm install`
- Develop (web): `npm run dev:web`
- Develop (worker): `npm run dev:worker`
- Develop (both): `npm run dev:all`
- Seed demo data: `npm run demo:seed`
- Verify: `npm run verify`

## M1 — Control-doc bundle integration (docs/process only)

Status: done

Delivered in this plan iteration:

- Added canonical control docs: `AGENTS.md`, `PLANS.md`, and this file.
- Added implementation/reference doc trees:
  - `docs/spec/`
  - `docs/research/`
  - `docs/review/`
  - `docs/codex/`
- Added repo-local skill entrypoints under `.agents/skills/`.
- Added light alignment updates in:
  - `README.md`
  - `docs/project-blueprint.md`

## Architecture notes (current)

- The product is local-first and source-traceable.
- `apps/web` currently hosts both UI and server-side logic for APIs/services.
- `packages/shared` provides shared schemas/constants consumed by the web app.
- Data is persisted locally and versioned by schema/service logic in the web package.

## Verification expectations

- Primary local verification for changes: `npm run verify`
- CI mirrors this via `npm run ci:verify`.
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
