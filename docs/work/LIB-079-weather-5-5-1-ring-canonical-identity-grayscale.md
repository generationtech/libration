# LIB-079 — WEATHER-5.5.1: Ring Canonical Identity Grayscale

| Field | Value |
|-------|-------|
| ID | LIB-079 |
| Status | complete |
| Created | 2026-08-22 |
| Approved | 2026-08-22 (human; this request) |
| Completed | 2026-08-22 |

Human-authorized. This request explicitly authorizes creation, approval, activation, implementation, verification, and completion of WEATHER-5.5.1 ring canonical identity grayscale. Do not commit, push, tag, branch, or release. Do not activate proposed LIB-037, LIB-058, LIB-061, LIB-062, LIB-066, LIB-068, LIB-070, LIB-072, LIB-074, LIB-076, or LIB-078. Do not begin q>0 blending, WEATHER-6, numeric netCDF, cloud-mask, physical illumination, or polar special cases.

Predecessor: [LIB-078](LIB-078-weather-5-5-ring-gibs-mean-cloud-confidence-calibration-investigation.md) (WEATHER-5.5 calibration investigation; remains proposed) and [LIB-077](LIB-077-weather-5-4-1-chroma-aware-gibs-near-gray-inversion.md) (chroma-aware GIBS near-gray inversion; complete). This item owns **EUMET ring canonical grayscale interpretation only**. Coverage, quality, winner policy, GIBS gray, Meteosat mapping, shared confidence, opacity, and cloud color remain settled.

## Objective

Remove the obsolete EUMET-ring BP56 canonical offset. Interpret the ring’s grayscale signal with identity grayscale `canonicalIR = clamp(luma / 255, 0, 1)`, the same rule already used for Meteosat, so ordinary ring cloud is no longer trapped below the shared confidence floor.

## Scope

**In scope**

- Change `canonicalIR01FromEumetRingIr108Gray` to identity grayscale.
- Remove BP56 from the production ring canonical interpretation. Do not replace it with another fitted black point.
- Bump Clouds transfer/materialization version so old ring canonicalizations cannot be reused.
- DEV-only `cloudsRingCalibration=identity|bp56` for verification; absent from production dist. Production default is identity unconditionally.
- Tests, visual verification, proportional docs. Amend ADR 0025 consequence if useful.

**Out of scope**

- Affine, piecewise, histogram, per-frame, component-specific, or source-pair calibration.
- Coverage, regional quality, ring quality, winner policy, freshness, cadence, TIMES, hierarchy.
- GIBS hybrid interpretation, chroma threshold 8, Meteosat interpretation, shared confidence knots.
- Clouds RGB, factory opacity 0.42, illumination, Historical Demo policy.
- Blending, feathering, polar special cases, WEATHER-6, numeric BT, cloud-mask, physical illumination.
- User calibration controls. Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0022](../decisions/0022-observational-data-three-clocks.md)
- [ADR 0023](../decisions/0023-observational-composites-heterogeneous-observation-times.md)
- [ADR 0024](../decisions/0024-observational-quality-distinct-from-coverage.md)
- [ADR 0025](../decisions/0025-heterogeneous-display-normalized-before-shared-presentation.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [LIB-069](LIB-069-weather-4-3-quality-plane-overlap-authority.md) through [LIB-078](LIB-078-weather-5-5-ring-gibs-mean-cloud-confidence-calibration-investigation.md)

## Acceptance criteria

- Production ring mapping is `canonicalIR = clamp(luma / 255, 0, 1)`.
- BP56 is not the production interpretation. No replacement fitted black point.
- Numeric mapping is monotone and matches representative luma → IR → confidence values from LIB-078.
- Sahara, Arabian Sea, and representative clear Atlantic stay below a broad cloud-wash; typical clear luma 63–73 remains confidence 0.
- India / Mumbai / Bay: authority map unchanged; Meteosat | good-ring | Himawari geography unchanged; ordinary ring cloud previously below the floor becomes appropriately visible; no resurrection of LIB-077 GIBS gray speckle.
- Ring→Himawari alpha seam remeasured at ~15°N / 25°N / 35°N. The 25°N chromatic convective-core discontinuity need not vanish.
- Southern Indian Ocean dark corridor at ~70°E / 45°S rises from zero confidence toward other IR sources without recreating an authority seam.
- Antarctica may brighten existing cold-surface IR; no polar special case.
- Where ring and Meteosat overlap, identity does not create a new systematic mismatch.
- Winner source-id array, coverage arrays, and quality arrays are identical before vs after calibration for identical source inputs.
- Independent source TIMES remain intact. No common TIME.
- Transfer version increments. DEV calibration URL absent from production dist.
- `npx tsc --noEmit`, `npm test`, and `npm run build` pass.

## Verification plan

- Focused tests: identity mapping, BP56 vs identity, numeric knots, Sahara/Arabian/Atlantic clear, Himalaya-class ordinary cloud, SIO luma ~111, Antarctic rise without warm-ocean halo, monotone 0–255, winner/coverage/quality/TIMES identity, GIBS gray 102, MSG identity equivalence, India class geography
- Full suite: yes (`npm test`)
- Type-check: yes (`npx tsc --noEmit`)
- Build: yes — production dist must omit DEV ring-calibration / sector-debug / scenario strings
- Visual verification: required — ordinary live Clouds, India/Mumbai/Bay (India-centered if practical), Sahara, southern Indian Ocean, Antarctica, Atlantic, winner diagnostic, Historical Demo, DEV Clouds fixture, per [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md)
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md)
- [`docs/VISUAL_VERIFICATION.md`](../VISUAL_VERIFICATION.md)
- [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0025](../decisions/0025-heterogeneous-display-normalized-before-shared-presentation.md) consequence

## Completion record

Completed: 2026-08-22

**Implementation summary**

EUMET ring canonical IR is now identity grayscale `clamp(luma / 255, 0, 1)`, the same rule as Meteosat. The former BP56 offset is DEV-only (`cloudsRingCalibration=bp56` / `legacy`). Production default is identity unconditionally. Transfer version `wx55-ring-identity-v1`. GIBS hybrid, chroma ≤ 8, confidence knots, opacity 0.42, RGB `(248,250,252)`, coverage, quality, winners, and TIMES are unchanged. No blend, no polar special case, no new user control. ADR 0025 consequence amended.

**Commands run**

- `npx tsc --noEmit` — clean
- Focused tests (`weather55RingIdentityGrayscale`, `weather51CanonicalIr`, `weather54GibsNearGrayInversion`, `weather53/52/43`, `visualScenarios`, `cloudsSectorDebugTint`) — 169 passed after one numeric-quantization fix; weather55 then 14/14
- `npm test` — 271 files / 2618 passed / 0 failed
- `npm run build` — succeeded (`dist/assets/index-Dk5E2hC_.js`); `cloudsRingCalibration` / `wx55-ring-bp56` / `cloudsGibsGray` / `cloudsSectorDebug` / `visualScenarios` / `cloudsTransfer` / `legacyLut` absent from `dist/`. Production retains `wx55-ring-identity-v1`.

**Actual results**

Identity mapping: luma 72 → IR 0.282 / conf 0; 90 → 0.353 / ~0.07; 120 → 0.471 / ~0.33; 160 → 0.627 / ~0.73; 220 → 0.863 / ~0.97. Monotone 0–255. Clear luma 63–73 stays conf 0. BP56 still zeroes luma 90/111/114; identity lifts them. Ring IR matches Meteosat at the same luma. GIBS gray 102 remains IR ~0.26 / conf 0. India class sequence `msg>good-ring>himawari` at 15/25/35°N. Ordinary ring→Himawari alpha step shrinks; 25°N chromatic-core step remains large. SIO luma 111 conf ~0.19 (was 0). Antarctic luma 203 rises; warm ocean luma 70–73 stays 0. Winner / coverage / quality / TIMES identity vs BP56. 512×256 ring transfer 64 ms.

**Visual verification**

Cursor Browser, device metrics **1920×1080**, canvas CSS 1889×1080 (bitmap **1888×1079**). Session ~22:15–22:22 UTC 22 Aug 2026. Compositor screenshot remains Americas-weighted; India/Sahara/SIO/Antarctic sampled on the canvas backing store (scene inset y≥90).

Ordinary live: Clouds on. Status **Clouds · mixed freshness · 34m–4h old** then **35m–4h** / **22m–4h** / restore **23m–4h**. Weather: slider **0.4** (factory 0.42). Copy “Near-current satellite cloud depiction.” Observation times independent: EUMET ring **4h**, GOES-West **40 min**, GOES-East **40 min**, Meteosat **35 min**, Himawari **50 min**. Attribution EUMETSAT/GIBS. No source selector, no ring-calibration control. Illumination: “Clouds are informational and do not participate in physical illumination.” No participation control.

Canvas samples: Sahara `[100,94,89]` desert tan (not wash); Arabian Sea `[11,54,66]` dark ocean; Mumbai night land dark; Atlantic 40°W dark ocean; Antarctic 75°S `[180,184,193]` bright ice/cloud. India 25°N west-of-75 land, east-of-78 brighter cloud; not GIBS gray speckle.

`?cloudsSectorDebug=winner`: GOES-West Pacific cyan; Meteosat Africa/Sahara yellow; Himawari Bay green; India corridor and SIO 70°E 45°S violet ring. Hard class edges. No user control.

Historical Demo 2017-08-21: **Live-only data is hidden while viewing another product time.** Disable demo restored **Clouds · mixed freshness · 23m–4h old** without re-checking Clouds.

`?scenario=clouds`: banner `scenario: clouds · 2026-08-21T20:40:00.000Z · persistence isolated`; status **Clouds (DEV fixture)**.

**Not verified**

- In-app compositor screenshot of an India-centered 1920×1080 crop (Cursor pane remains Americas-weighted). India was sampled on the 1888×1079 canvas bitmap at ~75°E.
- Live WMS re-fetch of the LIB-078 2048×1024 India crop for pixel-identical seam remesure (unit-test / canvas samples used instead).
- Pixel-identical illumination raster ON vs OFF.
- `?cloudsRingCalibration=bp56` live rematerialize (URL wired; mapping proven in unit tests).
- Tauri binary.

**Discovered, not done**

Inherent IR limits remain: warm/low-cloud ambiguity, cold-surface / polar ice, GIBS false-color convective cores versus ring gray, residual provider texture. q>0 blending — not justified; dual q>0 MSG∩Himawari over India remains empty; leftover 25°N step is encoding, not a missing crossfade. WEATHER-6, numeric BT, cloud-mask, physical illumination. Polar special case not added. LIB-037, LIB-058, LIB-061, LIB-062, LIB-066, LIB-068, LIB-070, LIB-072, LIB-074, LIB-076, LIB-078 stay proposed.
