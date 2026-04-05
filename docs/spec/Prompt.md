# Product Prompt / Product Spec — AI知识护照盘

## One-sentence positioning

**把用户的资料、项目、误区和当前目标，编译成任何 AI 都能快速读懂的个人护照。**

## The first pain to solve

Users repeatedly have to re-explain themselves when they change:

- model
- task
- context
- project
- learning phase

This MVP exists to reduce that repetition.

## Core product claim

Outside AI should become faster and more accurate at helping the user **because it can read a compact, evidence-backed, goal-aware Passport first**, not because it gets unrestricted access to the whole workspace.

## Target user

P0 users are high-frequency AI collaborators who already accumulate meaningful materials, such as:

- students
- researchers
- developers
- creators
- consultants
- knowledge workers
- freelancers

Shared traits:

- they switch between multiple AI systems
- they have scattered notes/files/projects
- they dislike repeating background context
- they want better-calibrated help
- they want valuable AI outputs to compound over time

## Non-goals

This product does **not** try to be, in MVP:

- a generic cloud notes app
- a social knowledge network
- an enterprise team knowledge platform
- a model training system
- an autonomous agent swarm
- a “give me a skill score” product
- a protocol-first platform with weak actual utility

## Product principles

1. **Passport first**
   Outside AI starts with a Passport manifest.

2. **Postcard first**
   Topic cards / postcards summarize high-value context before deep reads.

3. **Read-only first**
   Outside AI does not mutate canonical knowledge by default.

4. **Evidence-backed**
   High-level claims should trace to evidence fragments and sources.

5. **Goal-aware**
   The current Focus Card is essential. The system must express what the user is solving now.

6. **Capability signals, not scores**
   Use evidence-backed signs of practice and gaps, not hard ratings.

7. **Local-first with controlled delivery**
   Core knowledge remains user-controlled; delivery to outside AI is scoped and revocable.

8. **Model-agnostic**
   The system should not depend on one AI vendor.

## User-facing objects in P0

Keep the user mental model simple.

### 1) Passport
Top-level entry point for outside AI. Includes:

- user summary
- theme/topic map
- active Focus Card
- representative Topic Cards
- selected capability signals
- redaction-aware machine manifest

### 2) Focus Card
What the user is trying to solve **now**. Includes:

- current goal
- active problem
- time window
- priority
- success criteria
- related topics

### 3) Topic Card
A compact representation of one topic. Includes:

- what the user appears to know
- what they have done
- recurring gaps or confusion
- active questions
- suggested next step
- linked evidence

## Internal objects

Internally, the system may use:

- workspace
- source
- knowledge_node
- evidence_fragment
- capability_signal
- mistake_pattern
- postcard
- passport
- visa_bundle
- mount_session
- review_candidate
- audit_log

Internal richness is allowed.
User-facing complexity is not.

## Architectural layers

### Source layer
Stores raw imported materials.

### Compile layer
Transforms sources into:

- knowledge nodes
- evidence fragments
- capability signals
- mistake patterns
- topic cards / postcards

### Passport layer
Generates the Passport and machine-readable manifest.

### Mount layer
Delivers the narrow default surface and enforces Visa-based deep access.

### Review & governance layer
Handles review queue, audit log, revoke/expiry, and recovery/export.

## Canonical flows

### 1. Import and compile
source import
-> inbox
-> parse / retain raw source
-> generate knowledge nodes
-> extract evidence fragments
-> generate capability signals and mistake patterns
-> update or propose Topic Cards
-> regenerate Passport

### 2. Mount and assist
outside AI connects
-> reads Passport manifest
-> reads Focus Card + representative Topic Cards
-> optionally requests deeper Topic/Card scope via Visa
-> produces help for the user

### 3. Writeback and review
outside AI produces summary/outline/questions/next steps
-> create writeback candidate
-> enter review queue
-> user accepts / edits then accepts / rejects
-> accepted content merges into canonical knowledge with trace

## P0 scope

P0 includes:

- multi-source import
- source preservation
- basic compile pipeline
- capability signal extraction v0
- mistake pattern extraction v0
- Focus Card
- Topic Cards / postcards
- Passport generation
- read-only-first mount
- simple Visa control
- mount session logs
- writeback candidate queue
- audit logs
- local export/backup path if practical in the repo

P0 excludes:

- autonomous research as a product surface
- cross-user knowledge sharing
- enterprise permission complexity
- automatic execution in external systems
- full graph exploration UX
- always-on connectors sprawl
- automatic writeback merge

## Minimal permission model

Only three scopes are required in MVP:

- `passport_read`
- `topic_read`
- `writeback_candidate`

Anything beyond that should be treated as out of scope.

## Default delivery surface

Outside AI should **not** start with:

- whole-workspace search
- arbitrary raw source reads
- all knowledge nodes
- unrestricted compiled graph traversal

Outside AI **should** start with:

- Passport manifest
- active Focus Card
- 3-5 representative Topic Cards

## Cold-start policy

Cold start is a major risk.

The first week goal is **not** to model the whole person.

The first week goal is:

- import a few meaningful sources
- compile enough evidence-backed structure
- generate 3-5 high-value representative Topic Cards
- generate the first useful Passport

If the repo or UX choices make cold start feel heavy, prefer simplification.

## UI priorities for P0

P0 page set:

- Dashboard
- Inbox
- Knowledge
- Passport
- Mount
- Review

Avoid over-segmenting the UI into too many concept pages.
Signals and mistake patterns can live as sections inside Knowledge or cards.

## Minimal API/gateway surface (suggested)

If this repo needs an HTTP surface, a minimal gateway is enough:

- `GET /passport/{id}/manifest`
- `GET /cards/{id}`
- `POST /visas`
- `POST /mount-sessions`
- `POST /writeback-candidates`

This is guidance, not a mandatory route shape.

## Success metrics

### North star
After reading the Passport, outside AI gives more useful, better-calibrated help with less repeated user explanation.

### Supporting metrics
- reduction in repeated background explanation
- first-response match quality
- evidence coverage for high-level claims
- Passport usefulness rating
- cold-start completion success
- writeback candidate acceptance rate
- zero unsafe default data leaks

## Design discipline

When in doubt:

- choose clarity over abstraction
- choose reviewability over automation
- choose a smaller surface over a cleverer framework
- choose evidence-backed signals over confident guesses
- choose one good default path over many metaphors
