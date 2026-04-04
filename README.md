# AI Personal Knowledge Passport System

This project is a local-first personal knowledge compiler. It continuously compiles raw materials into a traceable personal wiki, then organizes selected and authorized parts into knowledge postcards, knowledge passports, and future scenario-specific visa bundles.

The public repository currently implements a single-user Web MVP with this end-to-end loop:

`import -> incremental compile -> local Q&A -> formal output -> flowback -> postcards -> lightweight passport -> local backup`

## Project Status

- Stage: public MVP / early open-source phase
- Product direction: local-first, traceable sources, AI-maintained, user-governed
- Current scope: single user, local runtime, OpenAI-first provider, SQLite persistence

## What Exists Today

- Multi-source import: `markdown`, `txt`, `pdf`, `url`, `image`, `chat`, `audio`
- Local object storage and SQLite data model
- Hybrid retrieval with FTS5 + embeddings
- Knowledge compilation, review queue, research Q&A, and output flowback
- Postcard generation, passport snapshot generation, and backup zip exports
- Next.js Web UI and a local worker

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

4. Open:

- [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

## Environment

Current variables in `apps/web/.env.example`:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_EMBEDDING_MODEL`
- `AIKP_DATA_DIR`
- `AIKP_DATABASE_PATH`
- `AIKP_INLINE_JOBS`

Without `OPENAI_API_KEY`, the project can still perform some local operations, but OCR, transcription, compilation, research Q&A, and passport generation will be limited.

## Validation

```bash
npm run typecheck
npm run test
npm run build
```

## Roadmap

The GitHub repository already includes an `MVP` milestone and the first batch of issues split by subsystem:

- `foundation`
- `ingestion`
- `compiler`
- `research`
- `postcard-passport`
- `backup`

Next major directions include:

- More stable ingestion and parsing
- Higher-quality incremental compilation and review
- Stronger citation, comparison, and conflict analysis
- Better outward-facing postcard and passport outputs
- More reliable backup and restore workflows

## Contributing

Contributions of code, documentation, tests, fixtures, and design ideas are welcome.

Before contributing, please read:

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [SECURITY.md](./SECURITY.md)

## License

This project is licensed under the [MIT License](./LICENSE).
