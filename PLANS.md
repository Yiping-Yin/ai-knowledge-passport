# PLANS.md

This file defines how execution plans work in this repository.

A plan is a **living, self-contained implementation document** that a coding agent can follow from repo discovery to validated delivery. The canonical project plan is `plans/mvp_execplan.md`.

## When a plan is required

A plan is required when the task is any of the following:

- multi-step
- ambiguous
- high-risk
- likely to touch multiple files or modules
- likely to require architectural choices
- likely to require custom validation
- likely to exceed one short edit loop

For a very small, local, low-risk patch, a separate plan is optional.

## Principles

- Treat the plan as the source of truth for milestone scope.
- Keep the plan self-contained enough that a fresh session can resume from it.
- Update the plan as facts change.
- If repo reality conflicts with the plan, record the decision and revise the plan.
- Milestones should be small enough to complete and validate in one focused pass.
- Validation failures are stop signs, not “known issues to clean up later.”

## Required sections for an execution plan

Every substantial plan should contain:

1. **Objective**
   What success looks like in user/product terms.

2. **Source documents**
   Which files define the product intent, constraints, and review rules.

3. **Repo inventory**
   Discovered stack, commands, module boundaries, and constraints.

4. **Milestones**
   Ordered checkpoints with deliverables.

5. **Acceptance criteria**
   Concrete conditions that prove each milestone is done.

6. **Validation**
   Exact commands or procedures to run.

7. **Risk register**
   What could go wrong and how to mitigate it.

8. **Decision log**
   Architecture or scope decisions that avoid oscillation.

9. **Status**
   Current state of each milestone.

## Writing milestones

Good milestones are:

- narrow
- testable
- low-ambiguity
- compatible with existing repo structure
- explicit about what is out of scope

Bad milestones are:

- “build everything”
- “refactor as needed”
- “improve architecture”
- “set up all infra”
- “make it production ready”

## Standard execution loop

For each milestone:

1. Re-read the relevant source docs.
2. Inventory the exact code to touch.
3. State the intended diff.
4. Make the smallest coherent change.
5. Run validations.
6. Repair failures immediately.
7. Update docs and status.
8. Review the diff before moving on.

## Stop-and-fix rule

If any required validation fails:

- stop advancement
- diagnose the failure
- fix it or narrow the milestone
- document what changed

Do not stack multiple broken validations and “clean up later.”

## Scope control rule

Do not add adjacent features unless they are:

- a strict prerequisite, and
- small enough to explain in one paragraph in the decision log

## Research-loop rule

Benchmark-driven optimization loops are **disabled by default**.

Only enable them when all of the following are true:

- a fixed evaluator exists
- fixtures are checked in
- writable scope is narrow
- guardrail metrics are defined
- stop conditions are defined

## Review rule

Before marking a milestone done, review against `docs/review/code_review.md`.

## Plan hygiene

Keep plan updates concise but specific:

- what changed
- why it changed
- what is complete
- what remains blocked
