# 0023 — Observational composites may combine heterogeneous observation times

- **Status:** Accepted
- **Date:** 2026-08-21 (record written with [LIB-065](../work/LIB-065-weather-3-high-cadence-best-current-cloud-composition.md))

## Context

[ADR 0022](0022-observational-data-three-clocks.md) distinguishes product time, observation time, and acquisition time for a snapshot. Clouds v2 treated the painted world as one mosaic with one `validTimeMs`.

High-cadence geostationary IR (GOES, Meteosat FES, Himawari) updates independently. Forcing `min(latestEast, latestWest, latestMeteosat, latestHimawari)` as a shared GetMap TIME, or delaying a fresh sector until others catch up, makes the map older than the observations Libration already has. That is the wrong trade for a current-weather instrument.

The same pressure will apply to future radar, lightning, wind analysis, and tropical/severe advisories: each domain and geography has its own cadence. Synchronizing them to one Weather-wide timestamp would hide fresher truth.

This does not add a second display clock. Product time remains one canonical UTC instant per frame ([ADR 0004](0004-one-canonical-utc-instant-per-frame.md)). Component observation times are data provenance, not scene time.

## Decision

For observational Weather (and other current-only composites that reuse the dynamic-data lifecycle):

- **Freshness outranks temporal uniformity.** The product presents the freshest authoritative observations reasonably available, independently by source, domain, and geography.
- A single rendered product **may contain multiple observation times**. Adjacent sectors with different capture times are accepted. Storm-edge mismatch at a source seam is not automatically a defect.
- Do **not** force a common observation timestamp. Do **not** delay a valid fresh component solely to synchronize with an older one. Do **not** interpolate, motion-warp, or extrapolate meteorology to fabricate a shared “now.”
- Each contributing component retains provider/source id, observation time, acquisition time, freshness band, coverage, and provenance. Status reports the **visible observation-age range**, not one invented aggregate `validTimeMs` that hides the spread.
- Store-level `DynamicSnapshotRecord.validTimeMs` on a composed product may be the newest contributing observation for resolver compatibility. That field must not be treated as the only observation time of the composite.
- Freshness bands, polling, and suppress thresholds are **source-local**. A 10-minute GEO sector does not inherit a 3-hour global-ring stale policy, and vice versa.
- Weather domains must not wait on one another. Clouds, radar, lightning, wind, and tropical/severe products (when they exist) refresh independently.

This does **not** authorize nowcasting, GeoColor/visible-IR hybrid presentation, physical cloud illumination, historical multi-source reconstruction, or a user-facing sync-mode toggle.

## Consequences

**Good.**

- Fresh GOES imagery is not discarded because Meteosat is still on an older slot.
- Status can say `Clouds · observations 5–17 min old` (or `5m–2h` when a slower backstop is actually visible) without claiming the whole Earth was observed at one instant.
- Future Weather products inherit a durable rule instead of re-deriving timestamp policy per layer.

**Costs.**

- Seams between disks can show real temporal disagreement. That is documented product behaviour, not a rendering bug.
- Composite status and provenance are more than one age label. Unused/hidden source ages must not pollute the range.
- Acquisition may poll several endpoints near their publication cadence; bandwidth and concurrency need explicit bounds.

**Explicitly not decided.** Polar LEO cloud fill, GeoColor, optical-depth illumination, radar/lightning/wind/tropical implementation, historical TIME mosaics, and Weather Event Playback remain later work.
