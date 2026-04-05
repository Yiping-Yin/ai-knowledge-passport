# Codex Workflow Docs

Use this directory for repository-specific Codex/automation workflows.

Suggested contents:

- prompt and workflow conventions
- branch and PR hygiene
- reproducible validation patterns

## Preferred completion loop

1. update the active plan (`plans/mvp_execplan.md`)
2. implement one milestone slice
3. run `npm run verify`
4. update docs/checklists in the same PR
5. open a focused `codex/*` PR with verification output
