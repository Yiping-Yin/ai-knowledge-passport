# Debug & Test Matrix

This page is for contributor-level debugging and test triage.

## Fast triage order

1. Confirm dependencies are installed (`npm ci` preferred).
2. Run root checks in dependency order (or use `npm run verify:steps`):
   - `npm run typecheck`
   - `npm run test`
   - `npm run build`
3. If one step fails, debug that step before running full `npm run verify` again.

## Common failure buckets

### TypeScript / config

Symptoms:

- compiler option incompatibility
- missing type definitions

Debug commands:

- `npm run typecheck`
- `npm run typecheck -w @ai-knowledge-passport/shared`
- `npm run typecheck -w @ai-knowledge-passport/web`

### Unit/service test failures

Symptoms:

- failing Vitest assertions
- test-only runtime errors

Debug commands:

- `npm run test`
- `npm run test -w @ai-knowledge-passport/web`

### Build failures

Symptoms:

- Next.js compilation issues
- route/build-time exceptions

Debug commands:

- `npm run build`
- `npm run build -w @ai-knowledge-passport/web`

## Final verification gate

After resolving errors in individual phases, run:

- `npm run verify:steps`
- `npm run verify`

Record the command result in your PR description.
