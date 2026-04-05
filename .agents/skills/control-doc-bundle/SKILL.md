# control-doc-bundle

## Purpose

Apply or refresh the repository control-document bundle without changing runtime behavior.

## Workflow

1. Ensure canonical docs exist and are aligned:
   - `AGENTS.md`
   - `PLANS.md`
   - `plans/mvp_execplan.md`
2. Keep `docs/spec/Documentation.md` synchronized to observable repo state.
3. Make only light alignment edits to existing long-form context docs.
4. Run `npm run verify` before opening a PR.
5. Confirm no transport artifacts (zip/temporary extracted folders) are committed.

## Expected PR shape

- Branch prefix: `codex/`
- Scope: docs/process only unless explicitly requested otherwise
- Verification block: centered on `npm run verify`
