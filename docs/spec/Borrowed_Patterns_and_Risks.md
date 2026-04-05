# Borrowed Patterns and Risks

This file explains **what to borrow**, **what not to copy**, and **which weaknesses to guard against**.

## Why this file exists

The project draws inspiration from several strong patterns:

- compiled knowledge systems
- bounded experiment loops
- agentic coding runtimes

Those patterns are useful, but each also carries failure modes. This file prevents uncritical copying.

---

## A. From “LLM Wiki”-style compiled knowledge systems

### Good patterns to adopt

1. **Immutable raw source layer**
   Keep original documents as the provenance source of truth.

2. **Compiled middle layer**
   Build reusable artifacts that accumulate value over time instead of re-deriving everything from raw files on every query.

3. **Schema as an agent contract**
   Use repo docs to tell the agent how to ingest, structure, answer, and maintain the system.

4. **Index and log discipline**
   Maintain a navigable catalog and a chronological ledger.

5. **Lint / health-check mindset**
   Periodically check for contradictions, stale claims, orphaned topics, and missing links.

### Weaknesses and risks

1. **Wiki sprawl**
   A persistent wiki can explode into too many pages, weak structure, and inconsistent quality.

2. **Markdown drift**
   Free-form page editing can erode schema discipline over time.

3. **Weak permissions**
   A wiki pattern is usually optimized for synthesis, not object-level access control or scoped delivery.

4. **Poor review boundaries**
   It is easy for generated summaries to become canonical without enough scrutiny.

5. **Search-first temptation**
   Over time, teams may add broad search and accidentally expose more than the safe default surface.

### Countermeasures in this repo

- user-facing P0 is Passport + Focus Card + Topic Cards, not “the wiki”
- evidence links are first-class
- outside AI gets a narrow surface first
- all outside-AI outputs become candidates, not canonical truth
- review and audit are mandatory, not optional

---

## B. From “autoresearch”-style bounded experiment loops

### Good patterns to adopt

1. **Human edits the rules; agent edits the implementation**
   Keep spec/eval files human-owned and narrow the agent’s writable scope.

2. **Fixed evaluator**
   Compare experiments under the same benchmark and budget.

3. **Result ledger**
   Record experiments in a structured, comparable format.

4. **Keep/discard discipline**
   Improvement should be measured, not merely narrated.

5. **Branch isolation**
   Experiments should not pollute the main line.

### Weaknesses and risks

1. **Infinite autonomy**
   Unbounded loops can waste money, time, and attention.

2. **Single-metric gaming**
   A scalar objective can reward harmful regressions elsewhere.

3. **Compute burn**
   Frequent experiment loops can become expensive quickly.

4. **Branch sprawl**
   Too many experiment branches become confusing.

5. **Benchmark overfit**
   The agent can improve the benchmark while making real outputs worse.

6. **Log overexposure**
   Feeding raw logs back into the agent can create noisy or unsafe optimization behavior.

### Countermeasures in this repo

- research loops are **disabled by default**
- bounded loops require a fixed evaluator and narrow writable scope
- use multiple metrics and guardrails, not one scalar score
- stop after a limited experiment budget
- summarize results structurally instead of recycling raw logs
- do not edit evaluator or fixtures during optimization

---

## C. From Claude Code-style agent runtimes

### Good patterns to borrow conceptually

1. **Plan vs execution separation**
   Use a read-first planning phase before code changes.

2. **Role separation**
   Exploration, implementation, and review are different jobs.

3. **Skills for reusable workflows**
   Package recurring tasks into narrow, reusable instructions.

4. **Isolation for risky work**
   Use feature branches or worktrees when parallel or risky experimentation justifies them.

5. **Long-session discipline**
   Persist learnings in docs and ledgers, not only in chat state.

### Weaknesses and risks

1. **Runtime envy**
   It is easy to copy the shape of a mature agent platform instead of solving the actual product problem.

2. **Feature sprawl**
   Hooks, subagents, worktrees, memory, plugins, and permissions can become an infrastructure project of their own.

3. **Repo mismatch**
   A runtime-heavy design may not fit the actual repository or product stage.

4. **False confidence**
   More automation can mask missing tests, weak specs, or poor product clarity.

5. **Proprietary assumption leak**
   Some runtime features may not exist in Codex or in this repo and should not be assumed.

### Countermeasures in this repo

- emulate the useful discipline, not the entire runtime
- use AGENTS.md, PLANS.md, skills, review files, and validation scripts as portable controls
- keep subagent use explicit and sparse
- prefer feature branches first; use worktrees only when clearly justified
- keep the product loop in focus

---

## D. From the original AI Passport PRD itself

### Strengths to preserve

- sharp pain: repeated background explanation across AI systems
- evidence-backed capability signals instead of hard capability claims
- explicit Focus Card / current goal layer
- postcard/passport/visa model for controlled AI understanding
- read-only-first outside AI access
- review-gated writeback
- auditability and revocation
- cold-start priority on 3-5 high-value cards

### Weaknesses to guard against

1. **Concept overload**
   Too many metaphors and top-level nouns can confuse users.

2. **Future-platform drift**
   The product can start sounding like a grand protocol or operating system instead of a useful tool.

3. **Cold-start heaviness**
   Trying to compile everything immediately makes the first experience slow and empty.

4. **Capability overreach**
   Overinterpreting notes/projects as true ability can mislead both user and AI.

5. **Permission complexity**
   Excess policy depth early on can reduce trust.

### Countermeasures in this repo

- P0 keeps only three user-facing objects
- P0 keeps only three access scopes
- cold start focuses on 3-5 representative cards
- the product story stays narrow: help AI understand the user faster
- protocol/export is treated as an output surface, not the main value

---

## E. Summary operating doctrine

When there is tension between inspiration and practicality, choose:

- compiled artifacts over repeated raw retrieval
- bounded loops over open-ended autonomy
- reviewability over cleverness
- explicit scope over silent power
- evidence over confident abstraction
- a small, clear MVP over a grand runtime fantasy
