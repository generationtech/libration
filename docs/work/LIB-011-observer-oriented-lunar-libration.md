# LIB-011 — Observer-oriented lunar libration and contrast-safe marker

| Field | Value |
|-------|-------|
| ID | LIB-011 |
| Status | complete |
| Created | 2026-08-15 |
| Approved | 2026-08-15 (human) |
| Completed | 2026-08-15 |

Human-authorized contrast-safe Moon libration stroke plus map/observer orientation, following the existing reference city. Authorized to create, approve, activate, implement, verify, and complete in the same request.

## Objective

Keep optical libration and phase distinct, make the ring/crosshair readable over every lunar phase with a two-pass contrasting under-stroke, and rotate the libration presentation into the terrestrial observer frame by default using the configured reference city.

## Scope

**In scope**

- Automatic luminance-based under-stroke plus user-selected foreground for ring and crosshair.
- Durable Map-oriented / Observer-oriented libration setting (default observer-oriented).
- Durable “use reference city” preference (default on); reuse existing reference-city coordinates.
- Upstream observer lunar-orientation astronomy; presentation transform into RenderPlan.
- Crosshair axes rotate in observer-oriented mode; ring stays circular.
- Config normalization, DEV verification, tests, visual verification.
- Refine the existing lunar-orientation backlog wording if needed.

**Out of scope**

- Lunar surface texture / maria rotation / detailed lunar-north arrow.
- Separate Moon observer lat/lon picker.
- Lunar locus or Solar analemma geometry changes.
- Solar ground track; reference-city architecture redesign.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`.
- [ADR 0001](../decisions/0001-renderplan-as-the-renderer-boundary.md), [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md).
- Cursor rules `010`, `020`, `060`.

## Acceptance criteria

See the authorizing prompt §41. Summary: two-pass contrast; observer-oriented default using shared reference-city truth; map-oriented preserves LIB-010 axes; fallback when no observer; tests, build, visual verification; richer lunar-surface orientation remains backlog-only.

## Verification plan

- Focused tests: contrast luminance; orientation astronomy; config; presentation transform; reference-city integration.
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — no DEV scenario selectors in `dist/`
- Visual verification: required — [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — refine richer lunar-orientation backlog only.
- [`docs/STATE.md`](../STATE.md), [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md).

## Completion record

**Implementation summary**

Two-pass luminance under-stroke plus user-selected foreground for ring and crosshair. Durable `librationOrientation` (`map` / `observer`, default observer) and `librationUseReferenceCity` (default on). Observer coordinates come only from chrome `displayTime.topBandAnchor` via `resolveReferenceCityObserverLocation`; missing city falls back to map-oriented (χ = 0). Astronomy: χ = C − q in `lunarObserverOrientation.ts`; unwrap in the Moon layer; RenderPlan emits final geometry/colors/widths; Canvas does not know reference city or parallactic angle.

**Commands run**

- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- Cursor in-editor Browser visual loop at inner 1920×1080 (`?scenario=moon-libration` epochs/cities/orientation plus ordinary `http://localhost:1420/`)

**Actual results**

- `npx tsc --noEmit`: clean
- `npm test`: 174 files / 1631 passed / 0 failed
- `npm run build`: succeeded (`dist/assets/index-DIS_LCA3.js`); `moon-libration`, `librationEpoch`, and `observerCity` absent from `dist/`; production key `librationOrientation` present as expected

**Visual verification**

Cursor in-editor Browser, inner 1920×1080, `?scenario=moon-libration` (banner `moon-libration · … · persistence isolated`):

- Full (`librationEpoch=full`), extra-large ring, default `#c5d4e8`: circular ring, dark under-stroke on bright disc, Knoxville observer displacement.
- New (`librationEpoch=new`), extra-large black crosshair: light under-stroke around black X on dark disc; axes rotated (~54°).
- Diagonal crosshair: Sydney displacement lower-left (χ ≈ 126°); Knoxville upper-right (χ ≈ −18°); Map-oriented axis-aligned `+` upper-right (LIB-010); `observerCity=none` pixel-identical to map-oriented.
- Live Chrome city switch Knoxville → Sydney: Moon crop matched the Sydney DEV scenario; hour tape used the same city.
- Layers UI: Observer-oriented, Use reference city on, Ring, `#c5d4e8`; use-reference-city disabled when Map-oriented.
- Accelerated demo 86400× then Pause (button became Resume). Paused diagonal scenario canvas FNV hash `312517341` identical after 1.5 s.
- Ordinary startup `http://localhost:1420/`: no scenario banner; Knoxville pin/hour-tape live; default Moon size.

**Not verified**

- Dedicated quarter/gibbous Moon-glyph crops (quarter clip missed the glyph; mixed-phase covered by diagonal ~0.39 and full).
- A third medium foreground color on every phase (luminance tests cover mapping; visual used default pale and black).
- London / Tokyo / São Paulo visual crops (astronomy tests used those catalog cities; visual city pair was Knoxville vs Sydney).
- Two-frame Moon-glyph pixel freeze immediately after 86400× motion (glyph not reacquired); pause freeze was confirmed on the reloaded paused scenario canvas.

**Discovered, not done**

- Topocentric optical-libration corrections beyond orientation rotation.
- Richer lunar-surface / maria / explicit lunar-north visualization remains `docs/FUTURE_FEATURES.md`.
