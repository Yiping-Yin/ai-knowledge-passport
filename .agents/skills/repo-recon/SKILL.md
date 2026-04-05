---
name: repo-recon
description: Inventory a repository before implementation. Use this when the real stack, commands, module boundaries, or test harness are unknown or when you must adapt a product spec to an existing repo. Do not use this skill for routine coding once repo inventory is already documented.
---

# Repo Recon

Your job is to produce a reliable repo inventory before meaningful code changes.

## Inputs

- current working tree
- `AGENTS.md`
- `PLANS.md`
- `plans/mvp_execplan.md`
- `docs/spec/Prompt.md`

## Steps

1. Find package manifests, task runners, CI files, migration tools, and test runners.
2. Identify the real module boundaries already present in the repo.
3. Determine the canonical commands for install, format, lint, typecheck, test, build, migrate, and seed.
4. Identify the best insertion points for:
   - domain/schema
   - compile pipeline
   - passport generation
   - gateway/access control
   - review/audit logic
   - thin UI
5. Write findings into `docs/spec/Documentation.md`.
6. Update `plans/mvp_execplan.md` with discovered commands and insertion points.
7. Summarize blockers and unresolved assumptions.

## Hard rules

- prefer reading over editing
- do not implement product features
- do not invent commands that the repo does not support
- if the repo already has an equivalent module, recommend extending it instead of duplicating it
