# LIB-012 — Eclipse System reconnaissance and architecture

| Field | Value |
|-------|-------|
| ID | LIB-012 |
| Status | complete |
| Created | 2026-08-15 |
| Approved | 2026-08-15 (human) |
| Completed | 2026-08-15 |

Human-authorized architecture / discovery item. Authorized to create, approve, activate, execute, and complete in the same request. Do not implement production eclipse behaviour.

## Objective

Inventory existing eclipse-relevant capability in Libration, map the recorded Eclipse System product intent onto architectural boundaries, and leave a durable architecture document for human review before any implementation slice is authorized.

## Scope

**In scope**

- Repository reconnaissance of solar/lunar/eclipse-related source, tests, config, docs, history, and assets.
- Capability inventory: production-ready, partial, unused, and missing.
- Sun–Earth–Moon model audit against eclipse needs.
- Domain model, forecast lifecycle, solar vs lunar map architecture, reference-city circumstances, configuration direction, visual/test strategy.
- Precision / astronomy-authority analysis with a recommended option, not a silent product narrowing.
- Finite proposed implementation sequence. Do not create those work items.
- Durable architecture document under the repository’s spec ownership model.
- Work-item / STATE / ROADMAP / FUTURE_FEATURES / DEVELOPMENT_LOG updates required by this architecture item.

**Out of scope**

- Eclipse calculations, dependencies, data sources, APIs, UI, configuration fields, layers, RenderPlan payloads, visual scenarios, or eclipse tests beyond documentation/process verification.
- Refactoring current astronomy.
- A generic Astronomical Events framework.
- Lunar horizon implementation, node decorations, or beam effects.
- Creating, approving, or activating implementation work items.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one UTC instant; no network in the render path.
- [ADR 0001](../decisions/0001-renderplan-as-the-renderer-boundary.md), [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md), [ADR 0005](../decisions/0005-dynamic-data-acquisition-outside-the-render-path.md).
- Product intent: [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md#eclipse-system).
- Cursor rules `010`, `020`, `040`, `050`, `060`.

## Acceptance criteria

- Repository searches are broad enough that claimed reusable capabilities cite concrete source.
- Architecture document records inventory, requirements mapping, recommended structure, solar vs lunar distinction, forecast lifecycle, reference-city integration, configuration direction, verification strategy, implementation sequence, and open human decisions.
- Product intent in the backlog is not silently narrowed.
- No production source, tests, config, or dependencies change.
- No implementation LIB is created or approved.
- STATE returns to **AWAITING SCOPE** with next action = human review of the architecture before any implementation slice.

## Verification plan

- Focused tests: none (documentation/process only)
- Full suite: yes (`npm test`) — baseline confirmation that this item did not change product code
- Type-check: yes (`npx tsc --noEmit`)
- Build: no — documentation-only
- Visual verification: no — rendered output must not change

## Documentation impact

- This work item.
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md) — owns intended Eclipse System structure pending human review.
- [`docs/STATE.md`](../STATE.md)
- [`docs/ROADMAP.md`](../ROADMAP.md) — preferred-next pointer after architecture exists.
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — architecture pointer only; product intent remains here.
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) — read-next pointer only if needed; this item does not change current implementation truth.

## Completion record

**Implementation summary**

Repository reconnaissance found no eclipse engine, catalog, geometry, or presentation. Existing solar/lunar modules are visualization-grade (truncated Meeus-style / mean solar; no distances or radii) and are reusable for ambient astronomy, time, projection, seam wrap, layers, RenderPlan, and the shared reference city — not as event authority. Intended structure is recorded in [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md): an `EclipseEventService` upstream of two presentation layers, hybrid offline authority (recommendation D), solar vs lunar geography kept distinct, forecast lifecycle off the render path. No production code, tests, config, or dependencies changed. No implementation LIB created.

**Commands run**

- Repository searches across source, tests, config, docs, history, and assets (eclipse/umbra/penumbra/path/node/distance/horizon/etc.)
- `npx tsc --noEmit`
- `npm test`

**Actual results**

- No eclipse implementation in source, tests, assets, or history beyond backlog/out-of-scope notes.
- `npx tsc --noEmit`: clean
- `npm test`: 174 files / 1631 passed / 0 failed

**Visual verification**

Not applicable — rendered output must not change.

**Not verified**

- External catalog licence, vendor, and year-span (explicitly deferred to later research after D1/D2).
- Numerical accuracy of the current truncated ephemerides against an almanac (not required to conclude they are visualization-grade).

**Discovered, not done**

- Proposed implementation slices E1–E6 are recorded in the architecture spec only; they are not work items.
- Shared `surfaceDotProduct` helper and Sun RA/Dec exports are optional cleanups, not started.
- Candidate ADR for `EclipseEventService` is deferred until an implementation item is approved.
