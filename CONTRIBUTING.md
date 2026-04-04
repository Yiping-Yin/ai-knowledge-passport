# Contributing

Thank you for contributing to AI Personal Knowledge Passport System.

This repository is currently in the public MVP phase. The highest-value contributions are:

- Local-first knowledge workflows
- Stability of multi-source ingestion and parsing
- Knowledge compilation and review quality
- Retrieval, citation, and research-answer quality
- Backup, restore, and knowledge-ownership capabilities

## Before You Start

Before implementing anything, please:

1. Review existing issues and the `MVP` milestone.
2. Open an issue first, or describe your plan in an existing issue for larger changes.
3. Avoid turning product-direction debates into broad code rewrites without alignment.

## Local Setup

```bash
npm install
cp apps/web/.env.example apps/web/.env.local
npm run dev:all
```

Default entry point:

- Web UI: `http://localhost:3000/dashboard`

Common verification commands:

```bash
npm run typecheck
npm run test
npm run build
```

## Branching

- Default feature branch prefix: `codex/`
- Make sure you are not working directly on `main`
- If your change maps to an issue, prefer an issue-shaped branch name such as `codex/ingestion-retries`

## Pull Requests

Keep PRs focused on a single purpose. The description should at least explain:

- The problem being solved
- The implementation approach
- The main tradeoffs
- The verification steps

If your change affects product behavior, update the following as needed:

- `README.md`
- Relevant API or environment variable documentation
- Tests or examples

## Coding Expectations

- Preserve the local-first and traceability principles. Do not default to sending user data to third-party services.
- Formal outputs should preserve source back-links and evidence structure whenever possible.
- New capabilities should prefer the service layer and shared schemas over scattering logic directly into pages.
- Changes affecting ingestion, compilation, Q&A, passports, or backups should include at least minimal regression coverage.

## Good First Contributions

Good first contributions often include:

- Fixing ingestion failures and edge cases
- Adding parsing and compilation tests
- Improving English UI copy and information hierarchy
- Expanding docs, sample data, and development scripts

## Security

Do not disclose security vulnerabilities in public issues.

See [SECURITY.md](./SECURITY.md).
