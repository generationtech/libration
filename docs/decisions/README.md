# Architecture decision records

Durable architectural decisions, with the reasoning that produced them.

An ADR belongs here when a future developer could plausibly reconsider the decision without knowing why it was made, and the rationale can be grounded in the repository. Ordinary implementation choices do not get an ADR.

| # | Decision |
|---|----------|
| [0001](0001-renderplan-as-the-renderer-boundary.md) | `RenderPlan` as the hard renderer boundary |
| [0002](0002-single-upstream-planetary-illumination-rasterpatch.md) | Planetary illumination composes upstream into one `rasterPatch` |
| [0003](0003-bundled-base-map-catalog-with-durable-family-ids.md) | Bundled base-map catalog with durable family ids |
| [0004](0004-one-canonical-utc-instant-per-frame.md) | One canonical UTC instant per frame |
| [0005](0005-dynamic-data-acquisition-outside-the-render-path.md) | Dynamic data acquired outside the render path, bound to product time |
| [0006](0006-browser-first-spa-with-non-load-bearing-tauri-shell.md) | Browser-first SPA with a non-load-bearing Tauri shell |
| [0007](0007-overlay-readability-derived-not-sampled.md) | Overlay readability derived upstream, not sampled |
| [0008](0008-bundled-nasa-solar-eclipse-authority.md) | Bundled NASA solar eclipse authority independent of ambient astronomy |
| [0009](0009-cached-solar-eclipse-event-corridor.md) | Cached solar eclipse event corridor |
| [0010](0010-eclipse-events-global-circumstances-derived.md) | Eclipse events are global; reference-city circumstances are derived |
| [0011](0011-lunar-eclipse-moonlight-attenuation-is-physical-illumination.md) | Lunar-eclipse moonlight attenuation is physical illumination |
| [0012](0012-active-solar-eclipse-obscuration-is-physical-illumination.md) | Active solar-eclipse obscuration is physical illumination |
| [0013](0013-current-only-internet-data-requires-live-enough-product-time.md) | Current-only internet data requires live-enough product time |
| [0014](0014-iss-live-tle-ordered-provider-failover.md) | ISS live TLE uses ordered provider failover |
| [0015](0015-domain-tour-sequencer-drives-shared-demo-time.md) | Domain tour sequencer drives shared Demo time |
| [0016](0016-offline-planetary-ephemeris-authority.md) | Offline planetary apparent-position authority |
| [0017](0017-offline-iau-galactic-zenith-projection-authority.md) | Offline IAU Galactic zenith-projection authority |
| [0018](0018-milky-way-viewing-window-is-a-reference-city-event.md) | Milky Way Viewing Window is a reference-city event |
| [0019](0019-domain-event-playback-belongs-to-data.md) | Domain event playback belongs to Data |
| [0020](0020-event-playback-merges-enabled-domain-sources.md) | Event playback merges enabled domain sources |
| [0021](0021-one-primary-milky-way-viewing-event.md) | One primary Milky Way viewing event, peak-UTC footprint, and HUD notice arbitration |
| [0022](0022-observational-data-three-clocks.md) | Observational data distinguishes product time, observation time, and acquisition time |
| [0023](0023-observational-composites-heterogeneous-observation-times.md) | Observational composites may combine heterogeneous observation times |
| [0024](0024-observational-quality-distinct-from-coverage.md) | Observational quality is distinct from coverage and may lose to better geometry |
| [0025](0025-heterogeneous-display-normalized-before-shared-presentation.md) | Heterogeneous observational display rasters are normalized before shared presentation |
| [0026](0026-scene-camera-independent-of-projection-and-reference-frame.md) | Scene camera is independent of projection, physical state, and scene reference frame |
| [0027](0027-moon-longitude-lock-is-a-scene-reference-frame.md) | Moon longitude-lock is a scene reference frame, not camera-follow |
| [0028](0028-moon-position-lock-translates-scene-frame-latitude.md) | Moon position-lock translates scene-frame latitude; it is not camera-follow |
| [0029](0029-sun-anchoring-reuses-moon-axis-lock.md) | Sun anchoring reuses Moon axis-lock; it is not a second frame theory |
| [0030](0030-anchored-scene-frames-are-one-production-kind.md) | Anchored scene frames are one production kind; Moon/Sun identity later became `target` ([0032](0032-anchored-frames-target-a-trackable-map-object.md)) |
| [0031](0031-position-lock-default-camera-is-automatic-scene-cover-zoom.md) | Position-lock default camera is automatic scene-cover zoom, not camera-follow |
| [0032](0032-anchored-frames-target-a-trackable-map-object.md) | Anchored frames target a trackable map object; resolution is separate from frame math |

Format: `NNNN-short-title.md`, with Context, Decision, Consequences, and Status.

Records 0001–0007 were written during documentation modernization in August 2026. The decisions themselves are older and are evidenced in the source; the records reconstruct rationale from the code, its comments, and the archived planning material in [`docs/history/`](../history/). Where rationale could only be inferred rather than evidenced, the record says so or the decision was left without an ADR.

Superseding a decision means adding a new record and marking the old one superseded, not editing the old one.
