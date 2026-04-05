# MVP Release Checklist

Use this checklist before declaring an MVP release candidate.

## Verification

- [ ] `npm run verify` passes from repo root.
- [ ] No failing or skipped critical service tests.
- [ ] Build output generated successfully by `npm run build`.

## Product smoke checks

- [ ] Import at least one source and confirm compilation run completes.
- [ ] Confirm review queue accepts/rejects updates correctly.
- [ ] Generate a passport and confirm output renders.
- [ ] Create/revoke a visa and confirm access log entry appears.
- [ ] Create an export package and confirm download works.

## Governance and safety

- [ ] Policy/grant constrained routes deny unauthorized operations.
- [ ] Audit log records governed mutations.
- [ ] Backup can be created and restore flow completes into isolated target path.

## Documentation

- [ ] `README.md` workflow commands are accurate.
- [ ] `docs/spec/Documentation.md` matches current stack and repo layout.
- [ ] `plans/mvp_execplan.md` reflects current milestone status.
