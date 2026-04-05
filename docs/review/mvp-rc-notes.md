# MVP Release Candidate Notes

## Candidate summary

This release candidate already supports the core governed knowledge loop:

- import local source material
- compile it into evidence-backed knowledge artifacts
- review pending nodes, capability signals, and mistake patterns
- generate a Passport manifest
- narrow delivery through Visa bundles
- export governed downstream packages for agent/avatar use

## Canonical MVP mental model

Externally, the MVP should be explained through three primary user-facing objects:

- Passport
- Focus Card
- Topic Card

The implementation still contains richer internal layers and compatibility pages, but the release candidate should be narrated Passport-first rather than as a broad future platform.

## Canonical access model

MVP scope is limited to:

- `passport_read`
- `topic_read`
- `writeback_candidate`

No other grant scope should be treated as canonical in release docs, UI copy, or review guidance.

## Known non-blocking limitations

- The operator UI still exposes more advanced/internal surfaces than the final P0 mental model.
- No dedicated formatter or lint command exists yet; the release verification baseline remains `npm run verify`.
- The bounded research/evaluator loop is still blocked because no fixed evaluator and checked-in fixture harness exist.

## Release gate

Do not call the MVP release candidate ready unless:

- `npm run verify` is green
- manual smoke checks in `docs/review/mvp-release-checklist.md` are completed
- top-level UI exposure has been narrowed to the intended MVP path without breaking compatible routes
