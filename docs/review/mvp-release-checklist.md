# MVP Release Checklist

Use this checklist before declaring an MVP release candidate.

## Verification

- [ ] `npm run verify` passes from repo root.
- [ ] `apps/web/src/server/tests/mvp.test.ts` passes as part of the normal test run.
- [ ] `apps/web/src/server/tests/release-smoke.test.ts` passes as part of the normal test run.
- [ ] Production build completes through `npm run build`.

## Product smoke checks

- [ ] Start the app with `npm run dev:all`.
- [ ] Import at least one source from `/inbox` and confirm a compilation run completes.
- [ ] Open `/review` and accept or reject at least one pending item.
- [ ] Generate a passport from `/passport` and confirm the human and machine outputs render.
- [ ] Create and revoke a visa from `/visas`, then confirm the access/revoke state is reflected.
- [ ] Create an export package from `/exports` and confirm the download action works.

## Governance and safety

- [ ] Grant and visa flows only use the canonical MVP scopes: `passport_read`, `topic_read`, `writeback_candidate`.
- [ ] Audit log entries are created for governed mutations and access-related actions.
- [ ] Backup creation works and restore still targets an isolated directory instead of overwriting the live runtime.

## Documentation

- [ ] `README.md` still reflects the current development and verification commands.
- [ ] `docs/spec/Documentation.md` matches the current stack, command surface, and repo layout.
- [ ] `plans/mvp_execplan.md` matches the real implementation status rather than a blank-slate milestone ordering.
- [ ] `docs/review/mvp-rc-notes.md` is up to date for the current release candidate.
