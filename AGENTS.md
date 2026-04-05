# AGENTS.md

<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
## Mission

Build the MVP of **AI知识护照盘 / AI Passport**: a compiled, local-first, AI-mountable personal knowledge system that helps outside AI understand a person faster and more accurately through a **Passport manifest**, a **Focus Card**, and a small number of representative **Topic Cards**, rather than forcing the model to rediscover context from raw notes every time.

## Product identity

This product is:

- compiled-knowledge-first
- passport-first and postcard-first
- read-only-first for outside AI
- evidence-backed
- goal-aware
- review-gated for writebacks
- auditable, revocable, and time-bounded
- model-agnostic

This product is **not**:

- a generic note-taking app
- a full wiki UI as the primary user experience
- a team wiki or social knowledge graph
- a model training or fine-tuning platform
- an autonomous multi-agent swarm
- a full-workspace search surface for outside AI by default
- an auto-merge memory sink
- a “capability score” product

## Primary user value

The first pain to solve is simple:

**When the user switches AI, tasks, or contexts, they should not need to repeatedly explain who they are, what they know, what they are doing now, and where they are stuck.**

The MVP succeeds only if outside AI can help faster and more accurately after reading the Passport than in an empty chat.

## Borrowed operating principles

Adopt these patterns deliberately:

1. **Compiled middle layer over query-time-only retrieval**
   Preserve raw sources, then compile them into reusable, inspectable artifacts.

2. **Bounded research loops, not infinite autonomy**
   If optimizing the compiler, use fixed fixtures, a narrow writable scope, a result ledger, and explicit keep/discard rules.

3. **Plan -> apply -> verify**
   Separate exploration/planning from implementation and from review.

4. **Capability signals, not capability claims**
   Never infer a hard skill score from notes or projects alone.

5. **Default narrow surface**
   Outside AI starts with Passport + Focus Card + representative Topic Cards, not the whole workspace.

## Critical anti-patterns

Do **not** drift into these traps:

- turning the product into a giant markdown wiki UI
- exposing too many metaphors or top-level objects in P0
- equating note volume with skill or competence
- widening outside-AI default access “for convenience”
- auto-merging outside-AI outputs into canonical knowledge
- inventing a large runtime platform before proving the product loop
- copying proprietary runtime features from other agents as if they exist here
- starting autonomous improvement loops before a fixed evaluator exists
- optimizing one scalar metric while degrading safety, evidence traceability, or token budget

## User-facing objects for P0

Treat these as the only three primary user-facing objects in P0:

- **Passport**: top-level entry point for outside AI
- **Focus Card**: what the user is trying to solve now
- **Topic Card**: compact summary of one topic’s knowns, practice, gaps, questions, and evidence

Internally, you may still model:

- sources
- evidence fragments
- knowledge nodes
- capability signals
- mistake patterns
- postcards
- passports
- visa bundles
- mount sessions
- writeback candidates
- audit logs

But do **not** force all internal objects into top-level navigation or user vocabulary.

## Non-negotiable MVP invariants

These are hard constraints:

- Raw sources remain the provenance source of truth.
- Every high-level summary must trace back to one or more evidence fragments.
- Outside AI reads the **Passport manifest** first.
- The active **Focus Card** is always accessible from the Passport.
- Deeper access requires an explicit **Visa Bundle**.
- Outside AI may create **writeback candidates** only.
- Canonical knowledge never changes automatically from outside-AI output.
- P0 permissions stay limited to:
  - `passport_read`
  - `topic_read`
  - `writeback_candidate`
- Cold start optimizes for **3-5 representative cards**, not a full knowledge graph.
- Access must be revocable, auditable, and time-bounded.
- Prefer structured evaluation artifacts over raw chatty experiment logs.

## How to work in this repository

1. **Inspect before editing**
   First discover the real stack, commands, CI checks, and natural module boundaries from the repository itself.

2. **Adapt to the existing repo**
   If the repository already has equivalent modules, use them. Do not impose the suggested architecture when the repo already has a better-fitting structure.

3. **Record what you discover**
   Write repo-specific findings into `docs/spec/Documentation.md`.

4. **Plan before complex changes**
   Use `PLANS.md` and keep `plans/mvp_execplan.md` current.

5. **Keep diffs tight**
   Stay inside the current milestone. Do not opportunistically add adjacent features.

6. **Verify continuously**
   Run the best available format/typecheck/test/build/review commands after meaningful changes, not only at the end.

7. **Review as a separate step**
   Before declaring a milestone done, review the diff against `docs/review/code_review.md`.

## Suggested responsibility map

Map these responsibilities onto the real repo layout:

- domain / schema / invariants
- source ingest / compile pipeline
- passport generation / redaction
- gateway / visa / mount logic
- review queue / diff / audit logic
- thin UI
- contract tests / fixtures

If the repo is empty or near-empty, a reasonable default is:

- `apps/web`
- `apps/api`
- `packages/domain`
- `packages/compiler`
- `packages/passport`
- `packages/gateway`
- `packages/review`
- `tests/contracts`

## Planning rules

- Use a plan for any multi-step, ambiguous, or high-risk task.
- Keep milestone acceptance criteria explicit.
- If a validation fails, stop and fix before moving on.
- If the repo contradicts the ideal architecture, write down the decision and why.
- Plans are living documents, not static proposals.

## Skills and delegation

This repository includes repo-local skills under `.agents/skills`.

Preferred usage:

- use `$repo-recon` when you need to inventory the repo before coding
- use `$evidence-trace-review` when changes touch compile/passport/gateway/review trust boundaries
- use `$compiler-bench-loop` only after a fixed evaluator exists

Subagents are optional and must be used intentionally. If you use them:

- use at most one read-only exploration subagent for repo discovery or code search
- use at most one review-oriented subagent for a second-pass critique
- do not create a web of nested agents
- do not use subagents to bypass the milestone boundary

## Default surface and permissions

Outside-AI default surface:

- Passport manifest
- active Focus Card
- representative Topic Cards

MVP scopes only:

- `passport_read`
- `topic_read`
- `writeback_candidate`

No default whole-workspace search for outside AI.

Every mount session must record:

- who accessed
- when
- which scope was granted
- what was read
- what candidates were written back

## Review rules

- Canonical knowledge changes must go through a review queue.
- Review should be diff-first.
- Rejection should be cheap and lossless.
- Writeback candidates must preserve source session trace and evidence references when applicable.

## Validation order

When the repo supports these, validate in this order:

1. formatting / static checks
2. type checking
3. unit tests
4. contract tests / fixtures
5. milestone-specific validation
6. review against `docs/review/code_review.md`

## Definition of done

A milestone is done only when all of the following are true:

- the scoped feature works end-to-end for that milestone
- relevant checks pass
- relevant tests pass
- docs are updated
- `plans/mvp_execplan.md` reflects reality
- risks and assumptions are recorded
- no speculative adjacent feature was added
- the diff passes a trust-boundary review
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
This repository's canonical mission is to build a local-first, traceable AI personal knowledge passport system.

## Working contract

- Prefer small, reviewable PRs on `codex/*` branches.
- Keep runtime behavior stable unless the change explicitly targets runtime behavior.
- Use `npm run verify` as the baseline local verification step before PR.
- Preserve source traceability and user-governed boundaries in product and docs changes.

## Canonical guidance order

When guidance conflicts, use this order:

1. `AGENTS.md` (repo mission and agent workflow contract)
2. `PLANS.md` (plan quality and execution requirements)
3. `plans/mvp_execplan.md` (current execution baseline)
4. Context/background docs such as `docs/project-blueprint.md`

## Documentation expectations

- Keep implementation-facing docs under `docs/spec`.
- Keep research process and findings under `docs/research`.
- Keep review standards and checklists under `docs/review`.
- Keep codex/automation workflow docs under `docs/codex`.

## Verification

- Required verification block for PRs: `npm run verify`
- CI mirror: `.github/workflows/ci.yml` runs `npm run ci:verify`.
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
