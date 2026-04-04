# Project Blueprint

## One-line Definition

AI Personal Knowledge Passport System is a local-first system for personal knowledge compilation, authorized projection, and agent governance.

## Why This Exists

The project responds to a larger problem in the AI era: people need durable, portable, user-owned context.

Most current knowledge workflows still break in four places:

- accumulation and reuse are disconnected
- AI chat and long-term memory are disconnected
- private knowledge and outward expression are disconnected
- personal expression and future digital agents are disconnected

This system exists to repair those four breaks by treating personal knowledge as governed digital infrastructure instead of passive notes.

## Core Product Nature

This is not primarily a note-taking app and not primarily a chat UI.

It is a three-part system:

1. A knowledge compiler
2. A capability projection layer
3. An agent governance layer

The goal is to turn private materials into traceable, reusable, authorized knowledge assets.

## Double-loop Model

### Inner Loop: Knowledge Growth

Raw material enters the system, is incrementally compiled into local knowledge structures, becomes queryable for research and outputs, then flows back into the knowledge base as new structured artifacts.

`source -> compile -> wiki/claims -> research -> output -> flowback -> recompile`

### Outer Loop: Social Circulation

Internal knowledge artifacts are compressed into postcards, organized into passports, cut into scenario bundles, used in collaboration or AI transfer, and then logged and reviewed for controlled re-entry.

`knowledge -> postcard/passport -> scenario bundle -> external use -> audit -> review -> update`

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

The internal object chain should continue to evolve around:

`Source -> Fragment -> Claim -> Wiki Node -> Postcard -> Passport / Visa -> Avatar Pack`

Governance objects around that chain should include:

- Grant / Policy
- Compilation Run
- Audit Log
- Output

The biggest architectural upgrades still missing or partial today are:

- explicit Fragment-centric evidence modeling
- explicit Claim modeling
- explicit Grant / authorization records
- explicit Compilation Run history

## Front-stage Expression Model

The outward-facing product should preserve three layers:

### Postcard

The smallest expressive unit for a theme, claim, method, or project.

### Passport

A structured capability interface for people and AI systems to quickly understand a person’s themes, evidence, methods, and boundaries.

### Visa / Scenario Bundle

A constrained context package for a specific audience, task, and time window.

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

## MVP Definition

The MVP should prove one loop end-to-end:

`import -> compile -> local research -> cited output -> flowback -> postcard -> lightweight passport -> local backup`

The MVP is successful when a user’s private materials can be transformed into reusable, cited, exportable, and authorization-aware knowledge assets.

## Suggested Delivery Phases

### MVP

- multi-source import
- incremental local wiki compilation
- local-first Q&A with citations
- markdown / brief outputs with flowback
- postcards
- lightweight passports
- local backup

### V1

- scenario bundles / visas
- sharing controls and access logs
- health center
- evidence-chain views
- machine-readable passports
- project migration views

### V2

- avatar console
- agent knowledge packs
- escalation and audit rules for agents
- finer-grained permission engine
- cross-AI standard knowledge package export
- multi-device sync and collaboration governance

## Success Metrics

The best north-star metric is not raw DAU or import count.

It is:

The number of effective knowledge units that were reused, flowed back, authorized outward, or used by a governed agent in the last 30 days.

Supporting metrics:

- source-to-node conversion rate
- node-to-postcard/passport conversion rate
- citation-backed answer rate
- output flowback rate
- scenario bundle usage count
- retrieval success rate
- health recommendation adoption rate
- backup and restore success rate

## Current Strategic Priority

The repo already contains the early MVP backbone.

The most important next-system upgrades are:

1. Make Fragment a first-class evidence model
2. Make Claim a first-class knowledge object
3. Make authorization a first-class Grant layer
4. Make compilation history explicit with Compilation Run records

If those layers mature, the system becomes more than a well-organized PKM app. It becomes a real personal knowledge sovereignty infrastructure.
