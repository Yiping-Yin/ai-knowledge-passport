# Project Blueprint

> Canonical implementation controls now live in `AGENTS.md`, `PLANS.md`, and `plans/mvp_execplan.md`. Treat this file as background product framing, not the primary execution guide.

## One-line Definition

AI Personal Knowledge Passport System is an AI-mountable personal knowledge base: a local-first system for knowledge compilation, authorized projection, and governed AI use.

## Why This Exists

The project responds to a larger problem in the AI era: people need durable, portable, user-owned context.

Most current knowledge workflows still break in four places:

- accumulation and reuse are disconnected
- AI chat and long-term memory are disconnected
- private knowledge and outward expression are disconnected
- personal expression and future digital agents are disconnected

This system exists to repair those four breaks by turning personal knowledge into a governed AI-readable context layer instead of passive notes.

## Core Product Nature

This is not primarily a note-taking app and not primarily a chat UI.

It is a layered product:

1. A core context compiler
2. A passport and mount layer
3. A governed agent layer

The goal is to help any AI understand the user’s foundation, current goal, and blind spots quickly under authorization.

## Double-loop Model

### Inner Loop: Knowledge Growth

Raw material enters the system, is incrementally compiled into local knowledge structures, becomes queryable for research and outputs, then flows back into the knowledge base as new structured artifacts.

`source -> compile -> signals -> postcards -> passport -> research/output -> flowback`

### Outer Loop: Mount and Governance

Internal knowledge artifacts are compressed into postcards, organized into passports, narrowed into visas, used in governed AI sessions or export bundles, and then logged and reviewed for controlled re-entry.

`knowledge -> postcard/passport -> visa/agent pack -> governed use -> audit -> review -> update`

## System Layers

### 1. Source Layer

Stores raw user-owned material such as web pages, PDFs, transcripts, chat logs, images, notes, and project files.

### 2. Fragment Layer

Splits material into precise, referenceable evidence units that can be cited and traced back to original locations.

### 3. Claim Layer

Captures atomic assertions, methods, experiences, and findings as the smallest units of knowledge that can be reviewed, compared, disputed, or reused.

### 4. Wiki / Graph Layer

Builds concept pages, topic pages, project pages, method pages, and indexes from claims and source evidence.

### 5. Research & Output Layer

Supports local-first Q&A, comparisons, notes, briefs, outlines, and formal outputs, with every result able to flow back into the knowledge system.

### 6. Projection Layer

Packages confirmed knowledge into postcards, passports, and future scenario bundles with explicit visibility boundaries.

### 7. Agent & Governance Layer

Controls future digital-agent access through explicit knowledge packs, boundaries, escalation rules, and audit trails.

## Core Object Chain

The current object chain is best understood as:

`Source -> Fragment -> Claim -> Wiki Node -> Capability Signal / Mistake Pattern / Focus Card -> Postcard -> Passport -> Visa -> Agent Pack -> Avatar`

Governance objects around that chain include:

- Grant / Policy
- Compilation Run
- Audit Log
- Output

The current strategic reset is not about adding more layers. It is about making the first AI-readable layer sharper:

- workspace-scoped context
- capability signals instead of hard ability claims
- mistake patterns instead of vague “AI memory”
- active focus cards so AI understands the user’s present, not only their past

## Front-stage Expression Model

The outward-facing product should preserve three layers:

### Postcard

The smallest expressive unit for a theme, claim, method, or project.

### Passport

The canonical AI entry object for quickly understanding the user’s themes, active goal, signals, blind spots, and boundaries.

### Visa / Scenario Bundle

A constrained mount-time context package for a specific audience, task, and time window.

## Core Principles

- local-first by default
- source-traceable by design
- AI proposes, user decides
- outputs matter more than chat turns
- sharing is authorization, not exposure
- future agents must operate inside explicit boundaries

## Target User

The first strong-fit user is not “everyone who takes notes.” It is the long-term knowledge worker who:

- collects material from many places
- repeatedly turns knowledge into outputs
- needs to explain prior work and capabilities often
- uses multiple AI systems but wants one persistent private context base
- expects future AI delegation to require clear boundaries

## Current Product Reset

The product now treats this as the primary loop:

`import -> compile -> signals -> postcard -> passport -> mount`

The product is successful when an AI can read the passport layer and give more relevant help with less repeated explanation.

## Suggested Delivery Phases

### Foundation

- multi-source import
- incremental local compilation
- accepted nodes and claims
- citations and flowback
- postcards and passports

### Mount Layer

- visas
- access analytics
- controlled feedback flowback

### Governed AI Layer

- agent packs
- avatars
- internal live governed sessions
- cross-AI exports
- policy engine

## Success Metrics

The best north-star metric is not raw DAU or import count.

It is:

The number of times an AI can successfully help the user after reading passport context, without the user having to re-explain core background.

Supporting metrics:

- source-to-node conversion rate
- node-to-signal/passport conversion rate
- citation-backed answer rate
- output flowback rate
- scenario bundle usage count
- retrieval success rate
- health recommendation adoption rate
- backup and restore success rate

## Current Strategic Priority

The repo already contains deep advanced layers. The present priority is product sharpness:

1. Make workspace-scoped AI context explicit
2. Make capability signals and mistake patterns first-class
3. Make focus cards the active-goal layer
4. Make passport the canonical AI entry surface

If those layers mature, the system stops reading like a broad future-total platform and starts behaving like a concrete AI-readable personal knowledge base.

## Canonical Implementation Guidance

This blueprint is product/background context. For canonical implementation and execution guidance, use:

- [`AGENTS.md`](../AGENTS.md)
- [`PLANS.md`](../PLANS.md)
- [`plans/mvp_execplan.md`](../plans/mvp_execplan.md)
- [`docs/spec/Documentation.md`](./spec/Documentation.md)

