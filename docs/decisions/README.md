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

Format: `NNNN-short-title.md`, with Context, Decision, Consequences, and Status.

Records 0001–0007 were written during documentation modernization in August 2026. The decisions themselves are older and are evidenced in the source; the records reconstruct rationale from the code, its comments, and the archived planning material in [`docs/history/`](../history/). Where rationale could only be inferred rather than evidenced, the record says so or the decision was left without an ADR.

Superseding a decision means adding a new record and marking the old one superseded, not editing the old one.
