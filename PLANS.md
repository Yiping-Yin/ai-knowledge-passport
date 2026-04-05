# PLANS.md

This repository uses plans as executable contracts.

## Plan requirements

Every plan must:

1. Start from observed repository state (no `TODO` / `UNKNOWN` placeholders for discoverable facts).
2. State scope explicitly: `docs/process only` vs `runtime/API/schema`.
3. Include entry/exit criteria for each milestone.
4. Include a verification block centered on `npm run verify` (or explain blockers).
5. Track status with one of: `not started`, `in progress`, `blocked`, `done`.
6. Link to concrete files and commands so another contributor can execute without guesswork.

## Plan lifecycle

- Canonical active execution plan: `plans/mvp_execplan.md`.
- If implementation reality changes (stack/paths/scripts/CI), update the active plan in the same PR.
- If a milestone is blocked, document the blocker, owner, and unblock condition.

## Definition of done (plan-level)

A milestone is `done` only when all are true:

- Acceptance criteria are satisfied.
- Required tests/checks have been run and recorded.
- Relevant docs are updated.
- Open risks are explicitly captured with next actions.
