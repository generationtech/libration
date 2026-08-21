# LIB-062 — Weather architecture and global near-current clouds v1 investigation

| Field | Value |
|-------|-------|
| ID | LIB-062 |
| Status | proposed |
| Created | 2026-08-21 |
| Approved | |
| Completed | |

Survey-only reconnaissance authorized by the investigation request. Do **not** activate, implement, or change production behaviour. A human must approve any follow-on implementation item. This item supersedes proposed [LIB-061](LIB-061-global-clouds-ir-end-to-end-investigation.md) on **product direction** (do not treat CTT TIME+PNG as the next Clouds default). LIB-061 remains valid as the black-screen diagnosis.

## Objective

Determine the smallest durable architecture for a Weather domain in Libration, and pick one exact Clouds v1 implementation target that gives an intuitive, near-current, global view of actual cloud cover across day and night, without inventing a parallel GIS stack.

## Scope

**In scope**

- Repository reconnaissance of dynamic-data lifecycle, catalogs, snapshots, clouds/IR acquisition, illumination participation, Layers/Data ownership, ISS/earthquake provenance, ADRs 0002/0004/0005/0013/0019, weather-cloud composition plan, LIB-034/035/036/043/044/056/057/059/061.
- Live provider survey (GIBS, NOAA/NESDIS, GOES, Himawari, EUMETSAT/Meteosat, composites) with HTTP diagnostics distinct from repository truth.
- Architecture recommendation and one Clouds v1 target. Planning evidence only.

**Out of scope**

- Any production source, config-schema, network, layer, renderer, asset, or dependency change.
- CTT TIME+PNG repair, Weather topic, new provider wiring, illumination change, provenance UI, historical weather, radar/wind/lightning/severe/tropical.
- Activating this item or creating an approved implementation LIB.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0002](../decisions/0002-single-upstream-planetary-illumination-rasterpatch.md)
- [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md)
- [ADR 0005](../decisions/0005-dynamic-data-acquisition-outside-the-render-path.md)
- [ADR 0006](../decisions/0006-browser-first-spa-with-non-load-bearing-tauri-shell.md)
- [ADR 0013](../decisions/0013-current-only-internet-data-requires-live-enough-product-time.md)
- [ADR 0019](../decisions/0019-domain-event-playback-belongs-to-data.md)
- [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md)
- [`docs/specs/scene/weather-cloud-composition-plan.md`](../specs/scene/weather-cloud-composition-plan.md)

## Acceptance criteria

- Repository confirmed AWAITING SCOPE at start.
- Structured survey covering the requested sections.
- No production source changes.
- This item remains `proposed` unless a human approves it.
- `docs/STATE.md` stays AWAITING SCOPE.

## Verification plan

- Focused tests: none (survey-only)
- Full suite: no
- Type-check: no
- Build: no
- Visual verification: no production paint. Candidate provider images inspected independently of Canvas. DEV-only comparison rasters lived under `/tmp/libration-weather-survey/` (not added to the repository).

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md) — awaiting-human-decision pointer only

## Completion record

Leave empty until a human approves and this survey is formally closed, or until a later approved item supersedes it. The structured survey below is the investigation record.

---

# Structured survey

Recorded 2026-08-21. Wall clock during live fetches: **2026-08-21T20:44Z–21:36Z**. Diagnostic files lived only under `/tmp/libration-weather-survey/` (not added to the repository).

Labels: **(repo)** repository truth; **(live)** HTTP/image this session; **(docs)** provider documentation; **(inference)** not directly tested.

## 1. Verdict

**WEATHER ARCHITECTURE + GLOBAL CLOUDS V1 INVESTIGATION COMPLETE**

Do not invent a parallel `WeatherObservationSnapshot` store. Grow the existing dynamic-data lifecycle: `acquiredAtMs` = acquisition, `validTimeMs` = observation (or forecast valid start), product time stays `TimeContext.now`. Weather is a domain on that seam, not a second framework.

Clouds v1 should **not** repair `MODIS_Terra_Cloud_Top_Temp_Day` as the default overlay. That product is daily daytime scientific CTT. The black-screen diagnosis in LIB-061 stands; the product goal has changed.

**Clouds v1 shippable target (browser-direct):** NASA GIBS WMS stacked `GOES-East_ABI_Band13_Clean_Infrared` + `GOES-West_ABI_Band13_Clean_Infrared` + `Himawari_AHI_Band13_Clean_Infrared`, PNG + alpha, explicit TIME, local IR→white/translucent cloud presentation, illumination participation **off**.

**Better global composite (blocked on browser CORS this session):** EUMETSAT EUMETView `mumi:worldcloudmap_ir108` (Geostationary Ring IR 10.8 μm, 3-hour multimission mosaic including Meteosat). Full-world EPSG:4326 PNG with polar holes only. GET lacked `Access-Control-Allow-Origin` despite OPTIONS `*`.

## 2. Repository state

At investigation start: [`docs/STATE.md`](../STATE.md) **AWAITING SCOPE**. Last completed [LIB-060](LIB-060-earthquake-hover-labels.md). No active item. Proposed LIB-037, LIB-058, LIB-061 remain proposed.

This item is drafted `proposed` only. It is **not** activated. Production source is unchanged.

## 3. Current cloud situation

**(repo)** Layer `globalCloudsIr` / source `global-clouds-ir-v1` fetches NASA GIBS `MODIS_Terra_Cloud_Top_Temp_Day` JPEG 2048×1024, no TIME, 15 min poll, fixture fallback, `validTimeMs` = wall clock. Overlay `imageBlit` at opacity 0.45. Illumination Model A maps JPEG luma to cloud opacity (factory **off**). ADR 0013 hides it unless product time is live-enough.

**(live, this session, confirms LIB-061)** Production URL still returns a 19 603-byte JPEG, **99.05% pure black**. PNG + `TIME=2026-08-20` is a mature rainbow CTT mosaic (~1.46 MB, 26.5% transparent). JPEG flattening and omitted TIME remain the black-screen pair; the larger product failure is that CTT Day is not “where the clouds are right now.”

## 4. Weather-domain product goals

Libration should eventually host a coherent Weather domain (clouds, radar, wind, lightning, severe, tropical, fields) as Model B overlays first. Model A illumination participation only when a physically meaningful cloud field exists. Model C climatology substrates stay map curation.

Clouds v1 question: look at the world map and see where clouds currently are — intuitive, recent, spatially believable, day/night, no opaque black no-data, no default scientific rainbow, composable with existing solar/night illumination.

## 5. Product time vs observation time vs acquisition time

| Clock | Meaning | Representation |
|-------|---------|----------------|
| **Product time** | Instant the scene depicts | `TimeContext.now` / canonical UTC. Never mutated by weather. |
| **Observation time** | Instant the meteorological field represents (satellite mosaic time, radar scan, model analysis time) | Snapshot `validTimeMs`. Optional `validUntilMs` for a validity window. |
| **Acquisition time** | When Libration obtained the bytes | Snapshot `acquiredAtMs`. |

These are not equivalent. Clouds today sets both snapshot times to wall clock — that must stop. Do not add a third snapshot clock unless forecast **issued/run** time is later needed (`issuedAtMs` / `runTimeUtcMs` on forecast products only).

## 6. Existing dynamic-data fit

Reuse: catalogs + durable `sourceId`; `DynamicSnapshotRecord`; store/resolver/acquisition controller; live HTTP adapter; `equirectRaster` / `pointFeatures` / `tracks`; `timePolicy: wallClockCurrent`; origin `live|fixture`; ISS/earthquake provenance pattern; Layers masters + topic presentation; ADR 0013 gate; RenderPlan `imageBlit`.

Weather is already named as “one consumer among many” in the lifecycle spec. Do not build a second ingestion framework.

## 7. Required weather-specific extensions (minimal)

On **catalogs** (not a new store type):

- `timePolicy` expand later: `wallClockCurrent` \| `observationNearest` \| `historicalQueryable` \| `forecastValidTime` (v1 keeps `wallClockCurrent`).
- Source-owned freshness: `nominalCadenceMs`, `freshUntilMs`, `staleUntilMs`, `suppressAfterMs`.
- Optional `coverageKind`: `global` \| `regional` \| `partial`.
- Optional `payloadKind` note when it is not the snapshot kind (e.g. IR raster vs cloud-mask raster).

On **snapshots**: set `validTimeMs` from provider TIME/analysis time; keep `origin`; optional coverage ratio/bounds on equirect body metadata.

On **Weather domain** (presentation, upstream of RenderPlan): IR→white transfer; Layers → Weather copy; no backend weather policy.

Do **not** create `WeatherObservationSnapshot` as a parallel type. If a name is useful in docs, it is an alias for a `DynamicSnapshotRecord` whose catalog is in the Weather group.

## 8. Weather payload taxonomy

| Category | Existing kind? | Future weather use |
|----------|----------------|--------------------|
| Raster observation | `equirectRaster` | Clouds v1, radar mosaic, smoke |
| Scalar grid | **none** | Temperature, pressure, humidity, cloud fraction numeric |
| Vector grid | **none** | Wind u/v, streamlines |
| Point events | `pointFeatures` | Lightning, storm reports |
| Line/track | `tracks` | Hurricane track, storm motion |
| Polygon advisories | **none** (do not jam into points) | Watches/warnings, forecast cone, wind radii |

Add scalar-grid / vector-grid / polygon kinds only when those products are scoped. Clouds v1 uses `equirectRaster` only. Do not assume weather = image.

## 9. Provenance model

Follow earthquakes/ISS, not current clouds:

`loading` | `live/recent` | `stale` | `unavailable` | `DEV fixture` | `partial coverage`

Production must not paint fixture as live. Clouds still opt into fixture fallback **(repo)**; that should end in the Clouds v1 LIB. Abort ≠ failure. Last-good **live** snapshot may paint while inside stale band.

## 10. Freshness model

Source/product-owned. No global stale constant.

Suggested Clouds v1 bands (observation age = `productUtcMs − validTimeMs`, not acquisition age):

| Band | Age | Presentation |
|------|-----|----------------|
| Fresh | ≤ 3 h | Live/recent (covers GIBS ~2 h ingest lag seen this session) |
| Stale | 3–6 h | Paint; status stale |
| Suppress | > 6 h | Hide; unavailable |

Cadence (10 min geo) ≠ ingest latency (~2 h GIBS this session). Status must use mosaic TIME, not poll interval.

## 11. Coverage / no-data model

Do not infer coverage from black pixels.

Distinguish in the payload/presentation:

1. **Cloudy**
2. **Clear sky** (only if the product is a mask/fraction, or after an explicit IR threshold that is documented as approximate)
3. **Provider no-data**
4. **Outside coverage** (geo disk edge, polar hole, Africa/Europe gap)

Transport: PNG/WebP alpha or numeric mask. Never JPEG for overlays with no-data. Never black-fill. Never treat missing as clear sky.

v1 coverage: `partial` (geostationary disks; poles transparent; GIBS stack also lacks Africa/Europe).

## 12. Future Layers structure

One topic **Weather** with sections (Clouds first). Split into multiple topics only if the topic becomes unusable. Layer masters remain visibility authority. Do not create the topic in this investigation.

Suggested sections later: Clouds; Radar / precipitation; Wind; Lightning; Severe weather; Tropical cyclones; Atmospheric fields.

## 13. Data / time ownership

Unchanged: Layers = what is shown; Data = when it is viewed ([ADR 0019](../decisions/0019-domain-event-playback-belongs-to-data.md)). Weather presentation lives in Layers. No weather-specific clock. Historical weather, if ever, uses Demo/product time + source `timePolicy`, not a second tape.

## 14. Clouds v1 exact requirement

Global near-current cloud **cover overlay**: white/gray translucent clouds, transparent clear/no-data, day and night, registered to equirect −180…180 / −90…90, browser/Tauri feasible, no API key, sustainable cadence. Not GeoColor-as-substrate. Not CTT rainbow.

## 15. Daytime cloud strategy

v1: **IR-derived white/gray overlay everywhere** (option B). Visible-day imagery shows land/ocean and fights illumination. GeoColor is a complete visual product, not a cloud layer.

## 16. Nighttime cloud strategy

Same IR field. Thermal IR → white/gray translucent clouds. Do not use GeoColor city lights (Libration already has emissive night lights).

## 17. Twilight strategy

v1: none (single IR representation). If a later hybrid visible-day / IR-night is approved, blend by **solar altitude** from LIB-056 geometry, not a screen-space terminator. No hard seam.

## 18. Provider candidate table

See chat report §18. Headline **(live)**:

| Provider / product | Coverage | Cadence / latency | CORS GET | Key | Clouds v1 |
|--------------------|----------|-------------------|----------|-----|-----------|
| GIBS GOES-E/W + Himawari Band13 PNG stack | Geo disks; **Africa/Europe gap**; poles hole | 10 min slots; **~2 h GIBS lag** this session | `*` | no | **v1 target** |
| EUMETView `mumi:worldcloudmap_ir108` | Global geo ring incl. Meteosat; poles hole | PT3H; default TIME 18:00Z at 20:45Z | **none on GET** | no | best composite; transport blocked in browser |
| GIBS CTT Day PNG+TIME | Day mosaic, swath holes | Daily | `*` | no | scientific only |
| GIBS Cloud Fraction Day | Day mosaic, rainbow | Daily | `*` | no | not live |
| NESDIS MERGED_GeoColor | GOES-E+W only; Africa transparent | current | reflects Origin | no | not global; fights illumination |
| NOAA GMGSI GIF URLs | 60N–60S **(docs)** | hourly **(docs)** | n/a | no | **404 this session**; AWS NetCDF not browser imagery |
| STAR GOES GeoColor JPEG | Single full disk | latest | `*` | no | 16–18 MB; not equirect |
| EUMETView MSG/IODC/MTG IR | Regional disks | 10–15 min | GET no ACAO | no | gap-fill later |

## 19–24. Authority assessments

**NASA GIBS.** Cannot satisfy Clouds v1 **alone** as a seamless global geo composite: no Meteosat / Geostationary Ring layer in WMS 1.1.1 or WMTS identifiers this session (0 EUMETSAT/MSG/MTG/ring layer names). Does provide GOES GeoColor, GOES/Himawari Band13, daily MODIS/VIIRS cloud science. CORS `*`, no key, EPSG:4326 WMS. CTT default TIME was still tomorrow (`2026-08-22`).

**NOAA/NESDIS.** GMGSI is the U.S. global geo mosaic **(docs)**: Himawari-9, GOES-18/19, Meteosat-9/10, 60N–60S, hourly, 2–3 h latency. OSPO GIF URLs 404. AWS `noaa-gmgsi-pds` is NetCDF from 2021 listing, not a PNG WMS. NESDIS ArcGIS `MERGED_GeoColor` / `MERGEDGC_current` are GOES merged GeoColor, Web Mercator or geographic, Africa sample transparent. STAR CDN full-disk JPEGs CORS `*`. Radar/hurricane/lightning exist as other NOAA families (later).

**GOES.** GIBS Band13/GeoColor 10 min PNG alpha CORS `*`. STAR latest GeoColor ~16–18 MB JPEG. Covers Americas + East Pacific. Not Africa/Europe.

**Himawari.** GIBS `Himawari_AHI_Band13_Clean_Infrared` 10 min PNG CORS `*`. Asia/Oceania disk. Direct NICT/JMA not required for v1.

**Meteosat/EUMETSAT.** EUMETView WMS, no login **(docs)**. `msg_fes:ir108` 15 min default TIME 20:15Z; `mumi:worldcloudmap_ir108` global 3 h, TIME 18:00Z, EPSG:4326 ±180/±90, PNG 87.5% gray / 12.5% transparent (poles). GET CORS missing — **not browser-direct this session**. Attribution required under EUMETSAT Data Policy. Visualisation service (not original numeric Recommended Data).

**Global composites.** Best live-tested imagery: EUMETSAT worldcloudmap IR. Best browser-direct: GIBS 3-sat Band13 stack. NOAA GMGSI not fetchable as GIF this session.

## 25–32. Clouds v1 recommendation

**Provider:** NASA GIBS  
**Products:** `GOES-East_ABI_Band13_Clean_Infrared`, `GOES-West_ABI_Band13_Clean_Infrared`, `Himawari_AHI_Band13_Clean_Infrared` (one WMS `LAYERS=` stack)  
**Observation cadence:** 10 min TIME slots  
**Expected latency:** ~2 h GIBS ingest lag observed 2026-08-21 (defaults 18:30–18:40Z at 20:44Z wall)  
**Coverage:** geostationary disks; **documented Africa/Europe gap**; polar holes ~±81°  
**Day/night:** same IR field  
**Projection:** GIBS `epsg4326` WMS, BBOX −180/−90/180/90, 2048×1024  
**Transport:** `FORMAT=image/png`, `TRANSPARENT=TRUE`, explicit `TIME`  
**Transparency:** provider alpha outside disk; local IR→white/gray cloud; warm/dark surface → transparent (approximate, documented)  
**Freshness:** observation-age bands in §10  
**Fallback:** last-good live; then unavailable; **no fixture-as-live**  
**Polling:** 10 min; immediate on enable; 15 s timeout; do not omit TIME; do not trust GIBS default date  

Config v1: Layer master + opacity only. Performance: ~2.2 MB PNG/stack this session; keep last ~4 snapshots (~9 MB).

## 33. Current CTT layer disposition

**C + D, not A.** Do not implement CTT TIME+PNG as Clouds v0. Abandon CTT as default. Keep TIME+PNG discipline for the new product. Optionally retain CTT later as a scientific “Cloud-top temperature” presentation, renamed and separated from Clouds.

## 34. Cloud illumination participation

**C. Keep off** until a real cloud mask / optical depth / fraction field exists. Current luma-of-rainbow (and luma-of-IR) is not transmittance. Recommend deprecating Model A on `global-clouds-ir-v1` CTT bytes in the Clouds v1 LIB (presentation `off`, do not sample false physics). Data needed later: cloud optical depth or mask, not display luma.

## 35. Historical weather

GIBS and EUMETView both expose TIME. Architecturally `observationNearest` / `historicalQueryable` can coexist with ADR 0013 by **source policy**. Do not implement historical Clouds in v1. v1 stays `wallClockCurrent`.

## 36–40. Later product implications

- **Radar:** US MRMS/NEXRAD vs incomplete global mosaics (RainViewer personal/educational; CORS historically weak). Needs raster mosaic or Phase 11 tiles. Cadence ~2–5 min. Not Clouds v1.
- **Wind:** GFS/NOMADS u/v grids — **vector grid**, not imagery. New kind later.
- **Lightning:** point events + age window; fast freshness; reuse `pointFeatures`.
- **Severe:** NWS polygons; **safety-critical provenance**; watches vs warnings; stale alerts are dangerous.
- **Tropical:** NHC GIS tracks, cone, radii, advisory time — tracks + polygons, not cloud rasters.

## 41. Weather event / notice boundary

Do not insert live observational weather into astronomical Event Playback. LIB-057 HUD notices are astronomy presentation, not a safety channel. Future severe-weather alerts need a **separate** status surface if implemented at all. Do not mix tornado warnings with “Milky Way tonight.”

## 42. Licensing / auth / CORS

- GIBS: free/open with attribution; no key; CORS `*` **(live)**.
- NOAA: public domain/open with attribution; no endorsement; NESDIS GET reflects Origin **(live)**; GMGSI GIF 404 **(live)**.
- EUMETSAT: visualisation WMS, no login **(docs)**; attribution required; GET ACAO absent **(live)**; OPTIONS `*` **(live)**.
- RainViewer: personal/educational; not v1.
- No Clouds v1 API key. No secret storage.

## 43. Architecture risks

Too much generic Weather abstraction; GIBS lock-in and Africa gap; EUMETSAT CORS; multi-sat TIME mismatch; IR overlay veiling land if threshold is wrong; 2 MB/10 min bandwidth; polar holes read as clear; false illumination physics; unsafe warning UX later; fixture-as-live if clouds policy is not aligned with earthquakes.

## 44. Recommended immediate implementation LIB (not created)

**Clouds v1 on GIBS 3-sat Band13 PNG + TIME + local white-cloud overlay + provenance/freshness like earthquakes + fixture-as-live removed + illumination participation forced off.**

Out of that LIB: Weather topic completeness, EUMETSAT, CTT scientific mode, historical TIME for Demo, radar/wind, hybrid visible/IR, Model A physics.

## 45. Recommended Weather roadmap

- **WEATHER-1:** observational metadata (`validTimeMs` = observation) + Clouds v1 (GIBS stack, PNG, provenance, no fixture-as-live, illumination off).
- **WEATHER-2:** EUMETSAT worldcloudmap if CORS/Tauri `fetchFn` is approved; polar/gap honesty; IR transfer tuning.
- **WEATHER-3:** radar (US first unless a rights-clear global mosaic exists).
- **WEATHER-4:** wind vector-grid kind + streamlines.
- **WEATHER-5:** tropical tracks/cones (observational, not Event Playback).
- **WEATHER-6:** lightning points.
- **WEATHER-7:** severe polygons only with a safety/provenance design.

## 46. What NOT to build yet

Radar, wind, lightning, tornadoes, hurricanes, weather alerts, historical weather, cloud physics, model forecasts, GeoColor overlay, CTT default repair, Weather topic chrome without Clouds v1, a second snapshot framework.

## 47. Not verified

- In-browser Canvas paint of candidates (raw images only).
- Chrome/Tauri `fetch` of EUMETView (header inspection only; GET ACAO absent).
- Whether Worldview hosts Geostationary Ring via a non-GIBS proxy.
- Mature-day CTT as a user-facing white-cloud restyle.
- Latest GIBS geo TIME closer than the GetCapabilities default (~2 h lag).
- AWS GMGSI latest NetCDF decode to PNG.
- RainViewer/NWS/GFS live CORS.
- Desktop Tauri webview vs Chrome.

## 48. Final state

Investigation only. Production unchanged. Repository remains **AWAITING SCOPE**. This item stays `proposed`.
