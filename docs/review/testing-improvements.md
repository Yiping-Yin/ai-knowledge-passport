# Testing Improvements Log

Track incremental improvements to verification and debugging quality.

## 2026-04-05

### Added standard debug commands

- Root scripts now include:
  - `npm run verify:steps`
  - `npm run debug:typecheck`
  - `npm run debug:test`
  - `npm run debug:build`

### Why

- Makes contributor troubleshooting consistent across PRs.
- Reduces ambiguity when a single verify phase fails.

### Next recommended improvements

- Stabilize dependency install path in this environment so `npm ci` consistently completes.
- Add CI job output annotations for failed phase (`typecheck` / `test` / `build`).
- Add a minimal smoke command set to run after `npm run build`.
