# AGENTS.md

This repository's canonical mission is to build a local-first, traceable AI personal knowledge passport system.

## Working contract

- Prefer small, reviewable PRs on `codex/*` branches.
- Keep runtime behavior stable unless the change explicitly targets runtime behavior.
- Use `npm run verify` as the baseline local verification step before PR.
- Preserve source traceability and user-governed boundaries in product and docs changes.

## Canonical guidance order

When guidance conflicts, use this order:

1. `AGENTS.md` (repo mission and agent workflow contract)
2. `PLANS.md` (plan quality and execution requirements)
3. `plans/mvp_execplan.md` (current execution baseline)
4. Context/background docs such as `docs/project-blueprint.md`

## Documentation expectations

- Keep implementation-facing docs under `docs/spec`.
- Keep research process and findings under `docs/research`.
- Keep review standards and checklists under `docs/review`.
- Keep codex/automation workflow docs under `docs/codex`.

## Verification

- Required verification block for PRs: `npm run verify`
- CI mirror: `.github/workflows/ci.yml` runs `npm run ci:verify`.
