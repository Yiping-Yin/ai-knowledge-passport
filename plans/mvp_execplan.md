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
