# Development state

Updated: 2026-08-24
Status: AWAITING SCOPE

## Active work item

None

## Last completed

[LIB-089](work/LIB-089-iss-tracking-target.md) — ISS tracking target. `"iss"` is a third `TrackableMapObjectId`. Longitude-lock and position-lock reuse the existing anchored frame, ISS overlay authority, generic continuity, and LIB-087 auto-cover. Transitional seven-choice Scene frame selector. ADR 0033.

## Blockers

None

## Known failing verification

None

## Awaiting human decision

2.0.0 is the completed, stable baseline (`docs/releases/2.0.0.md`; application version metadata 2.0.0). Tag `v2.0.0`, push, and GitHub Release await explicit human approval.

Proposed [LIB-037](work/LIB-037-iss-propagation-timestamp-audit-and-ground-track-correction.md) stays proposed.

Proposed [LIB-058](work/LIB-058-earthquake-live-layer-capability-survey.md) earthquake live-layer survey stays proposed (investigation only; not activated).

Proposed [LIB-061](work/LIB-061-global-clouds-ir-end-to-end-investigation.md) Global clouds / IR survey stays proposed (investigation only; not activated).

Proposed [LIB-062](work/LIB-062-weather-architecture-and-global-clouds-v1-investigation.md) Weather architecture + Clouds v1 survey stays proposed (investigation only; not activated). LIB-063 implemented its Clouds v1 recommendation and supersedes it on **product direction**. LIB-064 superseded its EUMETView CORS-blocked conclusion. LIB-065 supersedes the single-time global mosaic: freshness outranks temporal uniformity.

Proposed [LIB-066](work/LIB-066-weather-4-cloud-mosaic-seam-investigation.md) Cloud mosaic seam / footprint artifact survey stays proposed (investigation only; not activated). LIB-067 implemented its coverage-authority recommendation.

Proposed [LIB-068](work/LIB-068-weather-4-2-cloud-source-quality-seam-investigation.md) Cloud source-quality / radiometric seam survey stays proposed (investigation only; not activated). LIB-069 implemented its quality-authority recommendation.

Proposed [LIB-070](work/LIB-070-weather-5-cloud-radiometry-and-presentation-investigation.md) WEATHER-5 cloud radiometry / presentation survey stays proposed (investigation only; not activated). LIB-071 implemented its WEATHER-5.1 recommendation.

Proposed [LIB-072](work/LIB-072-weather-5-2-residual-cloud-boundary-provenance-investigation.md) WEATHER-5.2 residual cloud-boundary provenance survey stays proposed (investigation only; not activated). LIB-073 implemented its ring-over-q0 recommendation.

Proposed [LIB-074](work/LIB-074-weather-5-3-ring-artifact-provenance-and-cross-source-texture-investigation.md) WEATHER-5.3 ring-artifact provenance and cross-source texture survey stays proposed (investigation only; not activated). LIB-075 implemented its ring component-geometry quality recommendation.

Proposed [LIB-076](work/LIB-076-weather-5-4-cross-source-cloud-radiometric-equivalence-investigation.md) WEATHER-5.4 cross-source cloud radiometric equivalence survey stays proposed (investigation only; not activated). LIB-077 implemented its chroma-aware GIBS near-gray recommendation.

Proposed [LIB-078](work/LIB-078-weather-5-5-ring-gibs-mean-cloud-confidence-calibration-investigation.md) WEATHER-5.5 ring-GIBS mean cloud-confidence calibration survey stays proposed (investigation only; not activated). LIB-079 implemented its identity-grayscale recommendation.

Those WEATHER-5 investigations must not spawn new corrective Clouds LIBs.

## Next action

Await human scope. Do not start D2 (further targets / selector UX), click-to-track, or other [`docs/FUTURE_FEATURES.md`](FUTURE_FEATURES.md) ideas.
