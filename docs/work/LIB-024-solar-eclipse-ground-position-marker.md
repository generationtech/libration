# LIB-024 — Solar eclipse live ground-position marker + 2017 README recapture

| Field | Value |
|-------|-------|
| ID | LIB-024 |
| Status | approved |
| Created | 2026-08-16 |
| Approved | 2026-08-16 (human; this request) |
| Completed | |

Paused 2026-08-16 by human direction. [LIB-025](LIB-025-solar-eclipse-lifecycle-shading-reconciliation.md) is complete. Ground-position marker implementation remains in the tree. README recapture still waits for an explicit later request; do not recapture media until asked.

Human-authorized item. Authorized to create, approve, activate, diagnose, implement, recapture the 2017 README screenshots, verify, and complete in the same request. Do not commit, push, tag, branch, or release.

## Objective

Make the instantaneous authoritative ground position of a live central solar eclipse unmistakable with one configurable marker at the E1 shadow-axis intersection, then recapture the six 2017 README screenshots with Extra Large Moon, Event labels off, Dramatic alignment, and a Large high-contrast ground marker.

## Scope

**In scope**

- Diagnose the existing small circle in the live central path.
- Implement or enhance one authoritative live ground-position marker (total / annular / hybrid; none for partial-only, upcoming, or completed).
- Durable enable / size / color controls in the existing Solar eclipses / Eclipse appearance groups.
- Automatic contrasting under-ring; no duplicate target calculation vs the E5 beam.
- Tests: geometry, movement, config, beam coincidence, dateline, polar (structural).
- Cursor Browser visual iteration of default color/size.
- Recapture the six `docs/images/eclipse-2017/` PNGs via the LIB-023 canvas PNG pipeline.
- Proportional docs, STATE, DEVELOPMENT_LOG, and this completion record.

**Out of scope**

- README.md edits.
- Animation / GIF / video.
- New ADR unless a durable architecture boundary is introduced.
- Commits, pushes, tags, branches, or releases.
- Changing production Moon size, Event label, or alignment-intensity factory defaults to the screenshot-session values.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; backends must not decide product behaviour.
- ADR 0008 (NASA solar authority); ADR 0009 (cached corridor); ADR 0010 (global vs derived circumstances).
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md) — marker is presentation, not authority truth.
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md) — Cursor Browser; canvas `toDataURL` for README PNGs.
- Predecessors: [LIB-014](LIB-014-solar-eclipse-live-footprint.md) … [LIB-023](LIB-023-repair-readme-screenshot-capture.md).

## Acceptance criteria

- Existing small-circle artifact is identified; no second overlapping marker with the same semantics.
- One live ground-position marker at the authoritative E1 central point when a central shadow exists.
- Total / annular / hybrid show it; partial-only / upcoming / after-event do not.
- Marker moves with product UTC along the corridor; same UTC → same position.
- Marker coincides with the E5 beam target; lies at/inside the live central footprint.
- Enable (default on), size, and color persist / normalize / reset; Solar off disables the controls.
- Automatic contrast under-ring; Canvas remains astronomy-neutral.
- Six 2017 README PNGs recaptured (genuine canvas export; Extra Large Moon; Event labels off; Dramatic on active frames; Large marker; high-contrast default color).
- Type-check, full suite, and production build pass. Repository returns to AWAITING SCOPE. README.md is not edited.

## Verification plan

- Focused tests: ground-position marker, solar live layer, beam alignment, config/persistence, RenderPlan, solar scenarios
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — production must exclude DEV scenario/capture machinery
- Visual verification: required — Cursor Browser color/size iteration plus README-scale review of the six PNGs

## Documentation impact

- This work item.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) only if an existing deferred “current location marker” idea is fulfilled
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)

## Completion record

Fill only when completing.

**Implementation summary**

**Commands run**

**Actual results**

**Visual verification**

**Not verified**

**Discovered, not done**
