# AI Personal Knowledge Passport System

This project is an AI-mountable personal knowledge base. It compiles raw materials into a traceable local knowledge system, then packages the right subset into postcards, passports, visas, and governed agent layers so any AI can understand the user quickly under authorization.

The canonical product flow is:

`import -> compile -> signals -> postcards -> passport -> mount`

Writeback still remains candidate-only and user-reviewed.

## Project Status

- Stage: public MVP / early open-source phase
- Product direction: local-first, traceable sources, AI-readable context, user-governed
- Current scope: single user, local runtime, OpenAI-first provider, SQLite persistence

## What Exists Today

- Multi-source import: `markdown`, `txt`, `pdf`, `url`, `image`, `chat`, `audio`
- Local object storage and SQLite data model
- Hybrid retrieval with FTS5 + embeddings
- Knowledge compilation, review queue, research Q&A, and output flowback
- Workspace-scoped context with `Focus Cards`, `Capability Signals`, and `Mistake Patterns`
- Postcard generation, passport snapshot generation, and backup zip exports
- Visa bundle generation, managed secret-link sharing, machine-manifest downloads, and lightweight external flowback
- Agent pack snapshots, avatar profiles, and governed internal-only simulation sessions
- Cross-AI zip bundle exports for agent packs with manifests, counts, and checksum tracking
- Unified object-level policies across passports, visas, agent packs, avatars, and exports
- Internal live governed avatar sessions with multi-turn threads and scoped citations
- Fragment inspection, health diagnostics, audit history, and visual knowledge summaries
- Next.js Web UI and a local worker

## Current App Surfaces

The current app shell is grouped into:

Core:

- `Dashboard`
- `Inbox`
- `Knowledge`
- `Signals`
- `Postcards`
- `Passport`
- `Review Queue`
- `Research`

Advanced:

- `Mount Center`
- `Avatars`
- `Exports`
- `Policies`
- `Grants`
- `Audit Log`
- `Health Center`
- `Visuals`
- `Fragments`
- `Compilation Runs`

Compatibility surfaces still present in the app:

- `Review Queue`
- `Outputs`
- `Avatar Sessions`

## Architecture

- `apps/web`: Web UI, Route Handlers, worker, and service layer
- `packages/shared`: shared types, Zod schemas, and constants
- `data`: SQLite, local object storage, exports, and backups

Core stack:

- Next.js App Router
- React + TypeScript
- SQLite + Drizzle ORM + FTS5
- OpenAI provider abstraction
- Local worker queue

## Product Promise

The product is no longer framed as a general future-total knowledge OS.

The primary promise is:

**help any AI understand the user’s foundation, current goal, and common blind spots quickly under authorization**

The new first-layer objects are:

- `Workspace`
- `Capability Signal`
- `Mistake Pattern`
- `Focus Card`

The advanced layers remain:

- `Passport`
- `Visa`
- `Agent Pack`
- `Avatar`
- `Export Package`

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Configure environment variables

```bash
cp apps/web/.env.example apps/web/.env.local
```

3. Start the app and worker

```bash
npm run dev:all
```

Available run modes:

```bash
npm run dev:web
npm run dev:worker
npm run dev:all
```

4. Open:

- [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

## Demo Seed

To create a deterministic demo dataset without calling a live model:

```bash
npm run demo:seed
```

This seeds:

- demo sources
- accepted knowledge nodes
- capability signals
- mistake patterns
- one active focus card
- one postcard
- one passport
- one visa
- one agent pack
- one avatar
- one export package

Recommended walkthrough after seeding:

1. open `/signals`
2. open `/passport`
3. open `/visas`
4. open `/avatars`
5. open `/exports`

## Environment

Current variables in `apps/web/.env.example`:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_EMBEDDING_MODEL`
- `AIKP_DATA_DIR`
- `AIKP_DATABASE_PATH`
- `AIKP_INLINE_JOBS`
- `AIKP_SHARE_SECRET`

Without `OPENAI_API_KEY`, the project can still perform some local operations, but OCR, transcription, compilation, research Q&A, and passport generation will be limited.

`AIKP_SHARE_SECRET` is optional. If omitted, the app will generate and persist a local share secret under `data/` so visa secret links remain stable across restarts.

Recommended local defaults:

- leave `AIKP_DATA_DIR` empty to use the repo-local `data/` directory
- leave `AIKP_DATABASE_PATH` empty to use `data/knowledge-passport.sqlite`
- keep `AIKP_INLINE_JOBS=true` for the simplest local development loop

## Restore Workflow

Backups are created from the Passport & Backup page and can now be restored into a clean target directory.

Current restore behavior:

- the archive is extracted into a separate directory instead of overwriting the live runtime
- the restored SQLite file is checked against the stored SHA256 from the backup manifest
- restored object files are unpacked under the same target directory

Recommended restore workflow:

1. create a backup from the running app
2. use the restore form in Passport & Backup
3. inspect the restored directory before pointing any runtime to it
4. only switch runtime paths after verifying the restored data

## Daily Workflow

The intended contributor loop is:

```bash
npm install
cp apps/web/.env.example apps/web/.env.local
npm run dev:all
npm run verify
```

If you only need one part of the app:

- use `npm run dev:web` for the UI
- use `npm run dev:worker` for the queue worker
- use `npm run verify` before opening a PR

## Validation

```bash
npm run verify
```

Equivalent individual commands:

```bash
npm run typecheck
npm run test
npm run build
```

## Repository Conventions

- default feature branch prefix: `codex/`
- preferred PR model: one feature slice per branch
- CI uses `npm ci` and a single `ci:verify` entrypoint
- Dependabot is enabled for npm dependency updates
- editor defaults are defined in `.editorconfig`
- Node version hint lives in `.nvmrc`

## Current Product Shape

Core context:

- raw sources
- accepted knowledge nodes
- capability signals
- mistake patterns
- active focus cards
- postcards
- passport manifests

Governed downstream layers:

- visas for mount-time narrowing
- agent packs for bounded AI behavior
- avatars for governed replies and live internal sessions
- export packages for cross-AI portability

## Near-Term Direction

The current priority is not adding more abstract layers. It is tightening the product around the AI-readable entry surface:

- sharper passport generation
- better learner-state synthesis
- clearer workspace boundaries
- stronger mount-time narrowing
- stable downstream governed AI behavior

For the full product-system framing, see [docs/project-blueprint.md](./docs/project-blueprint.md).

## Contributing

Contributions of code, documentation, tests, fixtures, and design ideas are welcome.

Before contributing, please read:

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [SECURITY.md](./SECURITY.md)

## License

This project is licensed under the [MIT License](./LICENSE).
