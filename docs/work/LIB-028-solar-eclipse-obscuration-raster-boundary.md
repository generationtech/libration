# LIB-028 — Solar-eclipse obscuration raster-boundary reconciliation

| Field | Value |
|-------|-------|
| ID | LIB-028 |
| Status | active |
| Created | 2026-08-16 |
| Approved | 2026-08-16 (human; this request) |
| Completed | |

Human-authorized item. Authorized to create, approve, activate, diagnose, implement, verify, and complete in the same request. Do not commit, push, tag, branch, or release. Do not regenerate README media.

LIB-024 remains approved and paused: ground-position marker is in the tree; README recapture waits for an explicit later request.

## Objective

Remove the rectangular west/east hard edges visible in the active solar-eclipse obscuration field near 2017 ingress and egress. The physical obscuration model from LIB-027 stays; this item reconciles field domain, wrap, interpolation, and raster-patch integration so the field fades to ordinary daylight at the true penumbral limb.

## Scope

**In scope**

- Diagnose the visible west (ingress) / east (egress) hard shadow edges at the listed 2017 UTCs.
- Record field-domain metadata, outside-domain sampler semantics, bilinear edge behaviour, bbox padding, wrap, and raster-patch bounds.
- Compare bounded 288×145 vs full-world 288×145 (cost and visual/numerical continuity).
- Prefer a stable full-world equirect field if cost remains comparable; otherwise retain a bounded field with a proven zero guard band.
- Focused tests for the selected architecture, 2017 edge transects, dateline, polar, annular, partial-only, determinism, quiet path.
- Cursor Browser visual verification of the 2017 sequence, Dramatic, dateline, annular, partial-only; polar automated (visual if practical).
- Proportional docs, STATE, DEVELOPMENT_LOG, this completion record.

**Out of scope**

- New eclipse authority; new obscuration physics; atmospheric radiative transfer; sky/corona.
- Changing Subtle/Normal/Dramatic curves to hide the edge.
- Generic blur/shader; new projection; lunar changes; event browser; notifications.
- README/media; GIF/video; completing LIB-024 recapture.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one `rasterPatch`.
- [ADR 0012](../decisions/0012-active-solar-eclipse-obscuration-is-physical-illumination.md) — physical solar-eclipse illumination. No new ADR unless a broader durable rule is established.
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md).
- Predecessor: [LIB-027](LIB-027-continuous-solar-eclipse-obscuration-shading.md). Preserve `solarEclipseObscurationAt` and E4 identities.

## Acceptance criteria

- Root cause of the west/east hard edges identified and recorded.
- No rectangular field-domain boundary remains visible at 2017 ingress or egress.
- Physical field fades smoothly to ordinary daylight; central transit remains coherent.
- Dateline, polar, annular, and partial-only regressions remain green.
- Same UTC deterministic; quiet non-event path cheap; Canvas eclipse-neutral.
- Performance acceptable (full-world ~10–15 ms uncached is a guideline, not a guess).
- Type-check, full suite, and production build pass. No README/media. Repository returns to AWAITING SCOPE.

## Verification plan

- Focused tests: field domain / wrap / edge transects / quiet path / illumination integration
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — production must exclude DEV scenario machinery
- Visual verification: required — follow [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md) — only if architecture changed
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- ADR: only if a broader durable rule is established (expected: none)

## Completion record

Fill only when completing.

**Implementation summary**

**Commands run**

**Actual results**

**Visual verification**

**Not verified**

**Discovered, not done**
