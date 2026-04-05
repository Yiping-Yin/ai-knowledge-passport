# Repository Documentation / Working Notes

This file is updated as the repository is explored and changed.

## 1. Repo inventory

### 1.1 Root layout
- `apps/web`: Next.js web app, route handlers, worker scripts, server services, and tests
- `packages/shared`: shared Zod schemas and TypeScript types consumed by the app
- `data`: default local runtime storage for SQLite, objects, exports, and backups
- `docs`: product and contributor documentation
- `.github`: CI workflow, PR template, and issue templates
- `.agents/skills`: repo-local skills for recurring contributor workflows

### 1.2 Stack
- package manager: npm workspaces
- languages: TypeScript, React, SQL/SQLite
- frontend stack: Next.js 16 App Router, React 19, Tailwind CSS 4
- backend/service stack: Next.js route handlers plus `apps/web/src/server/services/*`
- database/persistence: SQLite via `better-sqlite3` + Drizzle ORM; local filesystem object storage under `data/`
- test runner(s): Vitest

### 1.3 Canonical commands
- install: `npm install`
- dev: `npm run dev:all`
- format: no dedicated formatter script exists today
- lint: no dedicated lint script exists today
- typecheck: `npm run typecheck`
- test: `npm run test`
- build: `npm run build`
- db migrate: no standalone migration command; schema creation and incremental upgrades live in `apps/web/src/server/db/init.ts`
- db seed: `npm run demo:seed`

### 1.4 CI / automation
- GitHub Actions workflow: `.github/workflows/ci.yml`
- triggers: pushes to `main` and `codex/**`, plus all pull requests
- steps: checkout, setup Node 25 with npm cache, `npm ci`, `npm run ci:verify`
- PR template expects a short summary plus explicit checkboxes for `npm run typecheck`, `npm run test`, and `npm run build`

## 2. Architecture map

### 2.1 Existing modules
- domain and persistence: `apps/web/src/server/db/schema.ts` and `apps/web/src/server/db/init.ts`
- shared contracts: `packages/shared/src/index.ts`
- ingest and compile: `apps/web/src/server/services/sources.ts`, `parsers.ts`, `compiler.ts`
- passport and context objects: `passports.ts`, `postcards.ts`, `signals.ts`, `focus-cards.ts`, `workspaces.ts`
- gateway and access control: `visas.ts`, `grants.ts`, `policies.ts`, `privacy.ts`, route handlers under `apps/web/src/app/api/*`, and public mount routes under `apps/web/src/app/v/[token]`
- review, audit, and downstream governed flows: `audit.ts`, `outputs.ts`, `exports.ts`, `agent-packs.ts`, `avatars.ts`, `avatar-live-sessions.ts`
- UI: `apps/web/src/app/*` pages and `apps/web/src/components/*`
- tests: `apps/web/src/server/tests/*`

### 2.2 Best insertion points for MVP responsibilities
- domain / schema: `apps/web/src/server/db/schema.ts` plus shared types in `packages/shared/src/index.ts`
- compile pipeline: `apps/web/src/server/services/compiler.ts`, `parsers.ts`, and `sources.ts`
- passport generation: `apps/web/src/server/services/passports.ts`, `postcards.ts`, `signals.ts`, and `focus-cards.ts`
- gateway / access control: `apps/web/src/server/services/visas.ts`, `grants.ts`, `policies.ts`, `privacy.ts`, and related route handlers
- review queue / audit: `apps/web/src/server/services/audit.ts`, `outputs.ts`, `visas.ts`, and the `/review` surface in `apps/web/src/app/review`
- UI pages: `apps/web/src/app/dashboard`, `inbox`, `knowledge`, `passport`, `review`, `visas`, and related components
- tests / fixtures: `apps/web/src/server/tests`; no dedicated evaluator or fixture directory is checked in yet

## 3. Product implementation notes

### 3.1 P0 user-facing objects
- Passport
- Focus Card
- Topic Card

### 3.2 Internal objects
- Existing schema already models workspaces, sources, source fragments, claims/wiki nodes, postcards, passport snapshots, capability signals, mistake patterns, focus cards, visa bundles, visa access logs, visa feedback queue, agent-pack snapshots, avatar profiles/sessions, export packages, object policies, research sessions, outputs, and citations.

### 3.3 Open questions
- Should `Topic Card` be a renamed/refined presentation of the current `postcards` model, or a distinct object with separate persistence?
- Should `review_candidate` extend the existing `visa_feedback_queue` / `outputs` path, or become a new canonical table when M3 begins?
- Once fixture-driven compile work starts, should dedicated fixtures live under `apps/web/src/server/tests/fixtures` or in a new top-level test area?

## 4. Decisions

> Add concise decision notes here as the repo evolves.

- Extend the existing `apps/web` and `packages/shared` structure instead of introducing new top-level apps/packages for MVP work.
- Treat `apps/web/src/app/api/*` plus `apps/web/src/server/services/*` as the canonical API/service layer.
- Treat `apps/web/src/server/db/init.ts` as the current migration/upgrade mechanism until a dedicated migration workflow is justified.
- Use `npm run verify` as the canonical validation gate for contributor work.

## 5. Milestone progress

### M0
- status: completed in the control-doc alignment PR

### M1
- status: not started

### M2
- status: not started

### M3
- status: not started

### M4
- status: not started

### M5
- status: blocked pending evaluator + fixtures

## 6. Risks / blockers

- No dedicated formatter or lint command exists yet, so plans and PRs should not claim those validations until they are added.
- No fixed evaluator or checked-in compile fixture harness exists yet, so bounded research-loop work remains blocked.
- The current app already exposes more internal surfaces than the narrowed P0 framing, so future milestones need to tighten presentation without destabilizing existing functionality.
