# Documentation Spec Baseline

This document captures the current repository implementation baseline and should be treated as the canonical quick inventory for contributors.

## Repository topology

- Monorepo managed by npm workspaces at root `package.json`:
  - `apps/*`
  - `packages/*`
- Current workspace packages:
  - `apps/web` (Next.js application package)
  - `packages/shared` (shared types/schemas/constants)

## Technology baseline

- Next.js: `^16.2.2`
- React / React DOM: `^19.1.0`
- TypeScript (root dev dependency)
- SQLite runtime via `better-sqlite3`
- ORM/query layer via `drizzle-orm`
- Validation/type schema surface includes `zod`

## App structure

- Primary app package: `apps/web`
- Web routes and API handlers use the App Router in `apps/web/src/app`
- Server services live in `apps/web/src/server/services`
- DB schema/client/init live in `apps/web/src/server/db`
- Shared package entrypoint: `packages/shared/src/index.ts`

## Quality and CI baseline

- Test runner: Vitest (`apps/web` script: `vitest run`)
- Root verification command: `npm run verify`
  - Runs typecheck
  - Runs tests
  - Runs production build
- CI workflow: `.github/workflows/ci.yml`
  - Runs on pushes to `main` and `codex/**`, plus pull requests
  - Executes `npm ci` then `npm run ci:verify`
