# PLANS.md

This file defines plan requirements for this repository.

## Plan requirements

Every execution plan should:

1. Start from observed repository state (no `TODO` / `UNKNOWN` placeholders for discoverable facts).
2. Separate docs/process changes from runtime/API/schema changes.
3. Include a verification section centered on `npm run verify`.
4. Track status explicitly (`not started`, `in progress`, `blocked`, `done`).
5. Link to concrete files and commands so another contributor can execute the plan without guesswork.

## Plan lifecycle

- Draft or update plans in `plans/`.
- Keep one canonical active MVP plan at `plans/mvp_execplan.md`.
- When reality changes (stack, paths, commands, CI), update the plan in the same PR if practical.
