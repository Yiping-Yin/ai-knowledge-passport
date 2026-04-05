# MVP Execution Plan

Status: in progress
Last updated: 2026-04-05
Scope: product completion roadmap from current repository baseline

## Current baseline (observed)

### Monorepo and packages

- npm workspaces: `apps/*`, `packages/*`
- Active packages:
  - `@ai-knowledge-passport/web` (`apps/web`)
  - `@ai-knowledge-passport/shared` (`packages/shared`)

### Stack

- Next.js `^16.2.2` + React `^19.1.0`
- TypeScript monorepo
- SQLite (`better-sqlite3`) + Drizzle ORM
- Vitest test runner in `apps/web`
- CI workflow at `.github/workflows/ci.yml` runs `npm ci` + `npm run ci:verify`

### Runtime architecture

- App router pages and API routes: `apps/web/src/app`
- Service layer: `apps/web/src/server/services`
- DB client/schema/init: `apps/web/src/server/db`
- Shared types/schemas: `packages/shared/src/index.ts`

## Primary objective

Finish the MVP as a stable, locally-runnable product where core loops work end-to-end with verification and contributor guidance.

## Milestones

## M0 — Baseline integrity and verification unblock

Status: in progress

### Goals

- Ensure repository verification can run reliably in local and CI contexts.

### Tasks

- Resolve TypeScript compatibility issue causing `npm run verify` failure (`TS5103` on `--ignoreDeprecations`).
- Confirm `npm run typecheck`, `npm run test`, and `npm run build` all succeed from repo root.
- Record any env/version requirements discovered while unblocking.

### Exit criteria

- `npm run verify` passes locally on the contributor baseline environment.
- CI `verify` job is expected to pass with the same commands.

## M1 — Core ingest → compile → review loop hardening

Status: not started

### Goals

- Make source import, compilation, and review queue behavior predictable and test-covered.

### Tasks

- Validate all import pathways (`markdown`, `txt`, `pdf`, `url`, `image`, `chat`, `audio`) against happy-path and failure modes.
- Audit compile pipeline service boundaries and error handling.
- Ensure review queue actions have deterministic state transitions.
- Add/adjust tests under `apps/web/src/server/tests` for regressions.

### Exit criteria

- Core ingest and compile routes have passing service-level coverage for critical paths.
- Manual smoke flow works end-to-end from app UI without data corruption.

## M2 — Passport/visa/export quality bar

Status: not started

### Goals

- Ensure passport generation and downstream projection objects are reliable and governable.

### Tasks

- Validate passport generation output format and citations.
- Validate visa creation/revocation and access-log behaviors.
- Validate export package generation/download and checksum semantics.
- Add release-smoke scenarios covering these objects.

### Exit criteria

- Passport → visa → export flow works end-to-end in seeded/dev data.
- Audit and policy hooks are present for governed actions.

## M3 — Governed session surfaces (avatars/agent packs)

Status: not started

### Goals

- Ensure governed AI surfaces behave within explicit boundaries.

### Tasks

- Validate agent pack create/read/update/delete and export interactions.
- Validate avatar status/session/simulation route behavior.
- Verify policy + grant enforcement on governed surfaces.
- Expand tests around denial/edge conditions.

### Exit criteria

- Governed sessions and packs enforce documented constraints.
- Edge-case test coverage exists for authorization and state transitions.

## M4 — Documentation and contributor completion kit

Status: in progress

### Goals

- Keep canonical contributor docs aligned with implementation reality.

### Tasks

- Maintain `AGENTS.md`, `PLANS.md`, and this execution plan as canonical control docs.
- Keep `docs/spec/Documentation.md` synchronized to actual stack/paths/scripts/CI.
- Keep `README.md` contributor links and workflow accurate.
- Keep `docs/project-blueprint.md` marked as context/background, not canonical implementation source.

### Exit criteria

- New contributor can follow docs and run the project + verify without ambiguity.

## M5 — MVP release readiness

Status: not started

### Goals

- Package an MVP release candidate with clear release and rollback guidance.

### Tasks

- Add/confirm release checklist under `docs/review`.
- Run full `npm run verify` and documented smoke checks.
- Confirm backup/restore and data safety behavior in a release rehearsal.
- Prepare concise release notes for MVP scope.

### Exit criteria

- Release checklist complete.
- Verification and smoke checks pass on release candidate commit.

## Standard commands

- Install: `npm install`
- Run web app: `npm run dev:web`
- Run worker: `npm run dev:worker`
- Run both: `npm run dev:all`
- Seed demo data: `npm run demo:seed`
- Verify: `npm run verify`

## Risks and active blockers

- Active blocker: TypeScript config compatibility currently prevents `npm run verify` from passing.
- Risk: Documentation drift if stack/scripts/paths change without synchronized docs updates.
