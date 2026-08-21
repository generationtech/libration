# LIB-061 — Global clouds / IR end-to-end investigation

| Field | Value |
|-------|-------|
| ID | LIB-061 |
| Status | proposed |
| Created | 2026-08-21 |
| Approved | |
| Completed | |

Survey-only reconnaissance authorized by the investigation request. Do **not** activate, implement, or change production behaviour. A human must approve any follow-on implementation item.

## Objective

Determine why enabling **Global clouds / IR** currently blacks out almost the entire map and shows only a small colored patch, and what source/request/compositing model Libration should use for a useful global cloud layer. Planning evidence only.

## Scope

**In scope**

- Repository reconnaissance of the cloud/IR pipeline, GIBS adapter, WMS URL, materializers, `imageBlit`, illumination participation, Layers UI, live-only policy, fixture fallback, tests.
- Live NASA GIBS HTTP diagnostics (exact production URL plus TIME/format/CRS variants) and GIBS/Worldview provider documentation (distinct from repository truth).
- Structured survey in this work item.

**Out of scope**

- Any production source, config-schema, network, layer, renderer, asset, or dependency change.
- Switching products, adding TIME, changing format/bbox, illumination repair, fixture removal, polling changes, historical Demo clouds, renaming.
- Activating this item or creating an approved implementation LIB.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md)
- [ADR 0005](../decisions/0005-dynamic-data-acquisition-outside-the-render-path.md)
- [ADR 0013](../decisions/0013-current-only-internet-data-requires-live-enough-product-time.md)
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
- Visual verification: no production paint. Raw GIBS response images inspected independently of Canvas.

## Documentation impact

- This work item
- [`docs/STATE.md`](../STATE.md) — awaiting-human-decision pointer only

## Completion record

Leave empty until a human approves and this survey is formally closed, or until a later approved item supersedes it. The structured survey below is the investigation record.

---

# Structured survey

Recorded 2026-08-21. Wall clock during live GIBS fetches: **2026-08-21T20:18:51Z** (response `Date` header). Diagnostic files lived only under `/tmp/libration-clouds-ir-survey/` (not added to the repository).

Repository truth vs provider truth are labeled **(repo)** and **(GIBS)** below.

## 1. Verdict

**GLOBAL CLOUDS / IR INVESTIGATION COMPLETE**

Network acquisition works. The black map with a tiny lower-right rainbow splash is already present in NASA’s **raw JPEG**. It is **not** a Canvas compositing bug.

Two stacked defects explain the screenshot:

1. **The production WMS URL omits `TIME`.** GIBS then serves the GetCapabilities default date, which at investigation time was **`2026-08-22` (tomorrow)** — a nearly empty daily mosaic (**99.05% pure black**, 19 603 bytes). Byte-identical to `TIME=default` and `TIME=2026-08-22`.
2. **`FORMAT=image/jpeg` cannot carry alpha.** GIBS no-data is transparent in PNG (`transparent="true"` in the colormap) and flattened to **opaque black** in JPEG. `imageBlit` then paints that black over the map at layer opacity **0.45**.

The colored patch is real Terra CTT data over **East Antarctica / Southern Ocean** (about **135°E–180°, 65°S–87°S**), not a swapped bbox. Explicit `TIME=2026-08-21` (today) and `TIME=2026-08-20` (yesterday) return large mosaics (~800–884 KB) with ~78–87% colored pixels.

The chosen product (`MODIS_Terra_Cloud_Top_Temp_Day`) is also a poor long-term fit for a user-facing “global clouds” overlay: daytime-only MODIS L2 CTT, scientific rainbow Kelvin palette, daily (not live), polar-orbiter swaths. JPEG + omitted TIME is what makes it *unusable*; the product choice is what makes even a “fixed” request look like false-color science, not white clouds.

## 2. Repository state

At investigation start: [`docs/STATE.md`](../STATE.md) **AWAITING SCOPE**. Last completed [LIB-060](LIB-060-earthquake-hover-labels.md). No active item. Proposed [LIB-037](LIB-037-iss-propagation-timestamp-audit-and-ground-track-correction.md) and [LIB-058](LIB-058-earthquake-live-layer-capability-survey.md) remain proposed.

This item is drafted `proposed` only. It is **not** activated. Production source is unchanged.

## 3. Current pipeline

Config → layer master → lifecycle arming → acquisition → WMS → HTTP → snapshot → resolver → materializer → RenderPlan → `imageBlit` → Canvas.

| Stage | Ownership | Types / fields | Timing | Cache / fallback | Failure |
|-------|-----------|----------------|--------|------------------|---------|
| Config | `layers.globalCloudsIr` (default **false**); scene row `globalCloudsIr` opacity **0.45**, order **2.5**, `sourceId` `global-clouds-ir-v1` | `AppConfig.layers` + `SceneLayerInstance` | Commit path, not rAF | Durable enablement persists through historical Demo | n/a |
| Layer master | Layers → Layer masters checkbox “Global clouds / IR” | `LayersTab.tsx` | User | Live-only hint when product time is not live-enough; **no** loading/live/stale/fixture status for clouds | n/a |
| Arming | `syncDynamicLifecycleConsumers` → `armDynamicLifecycleConsumers` | Overlay **or** `illumination.cloudParticipation.mode !== "off"` | Config/effect; `runImmediately: true` | Stopped when not live-enough | n/a |
| Acquisition | `createGlobalCloudsIrLiveHttpAcquisitionAdapter` | `fetch(GLOBAL_CLOUDS_IR_LIVE_FEED_URL)`; accept `image/jpeg` only; JPEG SOI validate; **no HTTP timeout** | 15 min `setInterval` | `useFixtureFallback: true` on non-abort failure | Abort does not fixture; `stale-when-cached` if a prior version exists |
| WMS request | String constant in `globalCloudsIrAcquisition.ts` | See §5. **No runtime TIME/bbox.** URL never persisted | Per acquire | n/a | HTTP non-OK → error string |
| HTTP | Browser `fetch`; CORS `Access-Control-Allow-Origin: *` **(GIBS, this session)** | JPEG body | ~0.7–2.2 s observed | `Cache-Control: max-age=0, no-store` | 200 even for empty default date |
| Snapshot | `equirectRaster` | `acquiredAtMs` = wall clock; **`validTimeMs` = wall clock, not GIBS TIME**; lon −180…180, lat −90…90; `contentType: image/jpeg` | At acquire | In-memory store | Invalid JPEG → fail → fixture |
| Resolver | nearest `validTimeMs` | Live-enough gate returns **null** prepared views when Demo is historical | Per frame, sync | Store kept | `missing-prepared-view` |
| Materializer overlay | blob:/data: URL from bytes | No pixel inspect | On store ready, outside rAF | Object URL revoke on drop | Empty bytes skipped |
| Materializer illumination | `jpeg-js` luma → `opacityU8` | Rec. 601 luma; black → 0 | Same store entry | JPEG-only decoder | Decode fail → no opacity view |
| RenderPlan | `buildBaseRasterMapRenderPlan` | One full-viewport `imageBlit`; optional readability `cssFilter` | Per frame | n/a | Skip if image not decoded yet |
| Canvas | `ctx.globalAlpha = 0.45`; default `source-over`; `drawImage` stretch to viewport | No chroma-key; JPEG has no alpha | Per frame | Image cache by src | Failed load logs + optional callback |

## 4. Current provider/product

**(repo)** Catalog and URL name NASA GIBS MODIS Terra Cloud Top Temperature (Day).

**(GIBS)** Layer metadata `MODIS_Terra_Cloud_Top_Temp_Day.json`:

| Field | Value |
|-------|-------|
| Layer id | `MODIS_Terra_Cloud_Top_Temp_Day` |
| Title | Cloud Top Temperature (Day) |
| Platform / instrument | Terra / MODIS |
| Imagery type | Scientific false-color **cloud-top temperature** (Kelvin), not true-color clouds |
| Source products | `MOD06_L2` STD C1443535037-LAADS v6.1; NRT C1426500206-LANCEMODIS v6.1NRT |
| Day/night | **`daynight: ["day"]`** — daytime retrievals only (descending node). Night is a **separate** layer `MODIS_Terra_Cloud_Top_Temp_Night` |
| Temporal resolution | **Daily** (`layerPeriod: "Daily"`). Not subdaily. TIME is `YYYY-MM-DD` |
| Native projection | GIBS serves EPSG:4326 (and 3857) from the `epsg4326/best` WMS; underlying MOD06 is swath 1 km / 5 km, mosaicked by GIBS |
| Date range **(GIBS caps)** | 2000-02-24 … **2026-08-22** with gaps; period `P1D` |
| Intended as global cloud vis? | **No.** It is a science CTT field. Cloudy daytime MODIS pixels only. Clear sky and night are no-data |

Colormap **(GIBS)** `colormaps/v1.3/MODIS_Cloud_Top_Temp.xml`: 150–350 K, purple → blue → green → yellow → red. No-data entry `rgb="220,220,255" transparent="true" nodata="true"`.

## 5. Exact WMS request

**(repo)** Production URL is a compile-time constant — not reconstructed. The running adapter fetches this string with no extra params:

```
https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=MODIS_Terra_Cloud_Top_Temp_Day&STYLES=&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=2048&HEIGHT=1024&FORMAT=image/jpeg
```

| Param | Value |
|-------|-------|
| SERVICE | WMS |
| REQUEST | GetMap |
| VERSION | **1.1.1** (not 1.3.0) |
| LAYERS | MODIS_Terra_Cloud_Top_Temp_Day |
| STYLES | empty |
| FORMAT | image/jpeg |
| TRANSPARENT | **absent** |
| WIDTH | 2048 |
| HEIGHT | 1024 |
| CRS/SRS | **SRS=EPSG:4326** |
| BBOX | **-180,-90,180,90** |
| TIME | **absent** |

**(GIBS)** CORS `Access-Control-Allow-Origin: *`. Content-Type `image/jpeg`. HTTP 200. 19 603 bytes at investigation time.

GIBS Python examples use `time='…'` and `transparent=True` with PNG. Libration matches the 1.1.1 lon/lat bbox pattern but omits both TIME and transparency.

Not captured from a live browser DevTools session; the host never mutates this URL, so the issued request is the constant.

## 6. TIME behavior

**(repo)** TIME was deferred (LIB-033/034/035). `validTimeMs` is acquire/wall clock.

**(GIBS docs)** Omitting TIME returns the GetCapabilities **default** date. `TIME=default` is the same. `Current` is false; you cannot pass `current`. Daily products use `YYYY-MM-DD`. “When requesting a visualization for the current date, much of the world may be empty if data acquisition and processing has not yet occurred.”

**(GIBS this session)** WMS 1.1.1 Extent for this layer:

`default="2026-08-22"` `nearestValue="0"` extent through `2026-08-22/P1D`.

| Request | Bytes | % pure black | Notes |
|---------|-------|--------------|-------|
| omitted TIME (production) | 19 603 | 99.05 | |
| `TIME=default` | 19 603 | 99.05 | **md5 identical to production** |
| `TIME=2026-08-22` | 19 603 | 99.05 | **md5 identical to production** |
| `TIME=2026-08-21` (today) | 796 321 | 13.303 | Incomplete but large mosaic |
| `TIME=2026-08-20` | 883 944 | 4.899 | Mature daily mosaic |
| `TIME=2026-08-19` | 874 236 | 5.157 | Similar |
| `TIME=2026-08-18` | 875 116 | 4.898 | Similar |
| `TIME=2026-08-15` | 868 817 | 3.353 | Similar |
| `TIME=2024-06-15` | 888 150 | 5.178 | Known-good historical day |

**Root cause:** omitted TIME asked for **tomorrow’s empty mosaic**, not “latest complete” and not “today”.

Night layer default at the same moment was `2026-08-21` (today) and returned real coverage. GIBS defaults are not a reliable “latest useful image.”

## 7. BBOX / axis order

Production uses WMS **1.1.1** + `SRS=EPSG:4326` + `BBOX=-180,-90,180,90` (lon,lat). **(GIBS caps)** `LatLonBoundingBox minx="-180" miny="-90" maxx="180" maxy="90"`. This is the correct 1.1.1 axis order for a full-world geographic request.

Diagnostic:

| Variant | Result |
|---------|--------|
| 1.3.0 `CRS=EPSG:4326` `BBOX=-90,-180,90,180` (correct 1.3.0 lat,lon) | Same empty JPEG as production (same default date) |
| 1.3.0 `CRS=EPSG:4326` `BBOX=-180,-90,180,90` (**wrong** 1.3.0 order) | **100% black**, 12 572 bytes, **different** from production |
| 1.3.0 `CRS=CRS:84` `BBOX=-180,-90,180,90` | Same as production (GIBS accepted CRS:84; not listed in the 1.1.1 caps document) |

**Axis order is not the production defect.** A swapped 1.3.0 bbox looks different (all black, no Antarctic patch). Production bbox is full-world and correctly ordered for 1.1.1.

## 8. Projection

- WMS endpoint is `…/wms/epsg4326/best/…`. Result is geographic/equirectangular.
- Libration `imageBlit` stretches the image to the full scene viewport and assumes −180…180 / −90…90, top = north, left = west. **No local reprojection.**
- Pixel orientation on `TIME=2026-08-20`: South Pole sample is black (Antarctic polar night on a Day product in August); East Antarctica 135°E, 70°S is cyan CTT; Sahara is warm red. Matches top=N, x=west→east.
- GIBS mosaics MODIS swaths into EPSG:4326; Libration does not see the native sinusoidal/polar grid.

## 9. Raw response inspection

**Yes. The black-with-small-colored-patch is already in NASA’s JPEG before Libration compositing.**

Decoded production image: **2048×1024**, 2:1, RGB, no alpha, 19 603 bytes. Independent of Canvas.

PNG of the same (no TIME) request: same sparse patch, **99.478% transparent**, 0% black — would **not** black out the map.

## 10. Pixel / alpha distribution

Production JPEG (no TIME / `TIME=2026-08-22`):

| Class | Approx % |
|-------|----------|
| Pure black | **99.05** |
| Near-black (max RGB ≤ 8) | 0.239 |
| Transparent | 0 (JPEG) |
| Colored (chroma) | **0.705** |
| Grayscale non-black | 0.007 |
| Mean luma | 0.33 / 255 |

PNG same request: 99.478% alpha=0, 0.522% colored, 0% black.

`TIME=2026-08-20` JPEG: 4.899% pure black, 7.921% near-black, 86.733% colored, 0.447% gray, mean luma 68.99. Requested and decoded size **2048×1024** in every JPEG/PNG GetMap tested.

## 11. Black-pixel semantics

**(GIBS colormap)** No-data is tagged `transparent="true"` (fill rgb 220,220,255). JPEG cannot encode that, so GIBS flattens no-data to **opaque black**. Black in the current JPEG is **not** a valid cold CTT value (150 K is purple `102,0,119`).

Black means:

- no coverage yet for that data day, and/or
- clear-sky / night / polar-night where CTT is not retrieved, flattened to JPEG background.

It is **not** “very cold cloud.” It **is** “no-data painted as black because JPEG.”

## 12. Lower-right color patch

Production colored-pixel bbox: **x 1792–2047, y 880–1008** on 2048×1024.

Mapped as full-world equirect (top=N, left=W): **lon 135.154°E … 180°, lat 64.839°S … 87.361°S**.

That is **East Antarctica and the adjacent Southern Ocean** (south of Australia / the Tasman, toward the date line) — consistent with an early Terra granule on data-day 2026-08-22, **not** a bbox corner artifact and **not** Australia itself (Australia sample on the empty mosaic is black).

Colors in the patch match the CTT rainbow (blue/cyan/green/magenta), i.e. real temperature styling, not a legend strip baked into the map.

## 13. JPEG / PNG / transparency comparison

| Id | Request | Bytes | Alpha | No-data | Visual |
|----|---------|-------|-------|---------|--------|
| A production | JPEG, no TIME | 19 603 | none | opaque black | black world + Antarctic splash |
| B PNG | PNG, no TIME, no TRANSPARENT | 16 919 | yes (RGBA) | transparent | splash only |
| C PNG+TRANSPARENT | same as B | 16 919 identical | yes | transparent | same as B (GIBS PNG is already transparent here) |
| D JPEG+TRANSPARENT=TRUE | JPEG | 19 603 | none | opaque black | **TRANSPARENT ignored** (JPEG cannot carry alpha) |

Recommended GIBS formats from GetMap: `image/png`, `image/jpeg`, jpeg-png, tiff, etc. PNG is the format that preserves no-data as alpha.

## 14. Known-good date comparison

`TIME=2024-06-15` and `TIME=2026-08-20` both return ~870–888 KB JPEGs with ~5% pure black and ~87% colored — a **global daytime CTT mosaic**, not a corner splash. Sparse production coverage is therefore **default/tomorrow TIME**, not “this product can never mosaic the world.”

Even a mature day remains a rainbow CTT field with orbital/clear-sky/polar-night holes, not a white cloud layer.

## 15. Current-day latency

**(GIBS / LANCE)** NRT MOD06 is typically hours after overpass (provider “within 3 hours” class). Daily GIBS mosaics **fill in during the UTC day**.

At 20:18 UTC 2026-08-21:

- Today (`2026-08-21`): 13.3% black — usable but incomplete.
- Yesterday: ~5% black — mature.
- Tomorrow (default): 99% black — unusable.

GIBS advertising `default=2026-08-22` **before that UTC date exists** is why “latest” via omitted TIME failed.

This product is a **daily mosaic**, not 10-minute live IR. Honest label: **latest available daily CTT**, not “live.”

## 16. NASA Worldview comparison

Worldview uses the same GIBS layer id. With date **2026-08-22** it would show the same empty Antarctic splash (Worldview tiles also honor TIME; empty current date is a documented GIBS behavior). With **2026-08-20** it shows a global false-color CTT mosaic with swath/clear/polar holes — matching our explicit-TIME JPEGs, not a continuous white cloud deck.

Worldview itself was not clicked in a browser this session; comparison is the identical GIBS GetMap used by Worldview plus provider docs.

## 17. Alternative GIBS products (ranked for a cloud overlay)

| Rank | Layer | Coverage | Day/night | Period | Notes |
|------|-------|----------|-----------|--------|-------|
| 1 (repair path) | Keep `MODIS_Terra_Cloud_Top_Temp_Day` **with TIME + PNG** | Global daytime CTT mosaic when date is complete | Day only | Daily | Fastest repair; still scientific rainbow |
| 2 | Stack Day+Night CTT (`…_Day` and `…_Night`) | Near-global polar-orbiter CTT | Both, still daily swaths | Daily | WMS allows multiple LAYERS; still CTT palette + JPEG trap if not PNG |
| 3 | `GOES-East/West_ABI_Band13_Clean_Infrared` + `Himawari_AHI_Band13_Clean_Infrared` | Regional; **Africa/Europe gap** (no Meteosat in GIBS catalog) | Day+night | **10 min** | True “live IR”; grayscale; PNG transparency ~63% outside disk. Defaults were ~18:40Z — actually recent |
| 4 | `MODIS_Terra_Cloud_Fraction_Day` | Day mosaic | Day | Daily | Same empty `default=2026-08-22` trap. More “cloud amount,” still not IR at night |
| 5 | `VIIRS_SNPP_Brightness_Temp_BandI5_{Day,Night}` | Polar-orbiter IR window | Split day/night | Daily | Same mosaic class as MODIS CTT |

No GIBS **global geostationary IR composite** and no Meteosat/SEVIRI layer were found in the v1.0 metadata index.

## 18. Alternative providers

| Rank | Stance |
|------|--------|
| **GIBS WITH BETTER REQUEST (and later better product)** | **Preferred.** CORS `*`, no API key, already wired, browser-feasible |
| KEEP GIBS unchanged product but TIME+PNG | Immediate functional repair |
| DIFFERENT PROVIDER WARRANTED | Only if the product goal is a seamless global 10-min IR mosaic including Africa. NOAA/EUMETSAT mosaics were not live-tested; CORS/keys unknown. Do not switch providers in the first repair LIB |

## 19. Best authority for “Global clouds / IR”

For a **first honest overlay**: NASA GIBS remains the right authority.

Two product goals are currently conflated by the label:

- **A. Scientific IR / CTT** — current layer, after TIME+PNG.
- **B. Intuitive white cloud deck** — needs a different visualization (cloud fraction/optical thickness, or geostationary IR grayscale with alpha), not luma-from-rainbow.

Recommend **keep GIBS CTT for the immediate repair**, rename later if the UI should not promise “clouds” as white cover, and treat geostationary IR as a later phase.

## 20. Overlay compositing

**(repo)** Scene opacity **0.45**. Backend `ctx.globalAlpha = layer.opacity` then `drawImage` full viewport. Default composite **source-over**. `imageBlit` has **no** item-level opacity and **no** `globalCompositeOperation` change. JPEG alpha: none, so every black texel is painted. Readability may append a small night-side `brightness()/contrast()` CSS filter (lifts the overlay, does not punch holes in black).

At 0.45, a black JPEG still veils the substrate to ~55% residual — reads as “almost black,” with a rainbow splash where CTT exists.

## 21. Illumination participation

**(repo)** Same `global-clouds-ir-v1` bytes. `decodeJpegBytesToCloudOpacityBuffer` maps Rec. 601 luma to 0…255 opacity. Policy `off|natural|enhanced|illustrative` (gains 0 / 0.55 / 0.85 / 1.15) × intensity 0…2, clamped. Sampled per illumination texel. Overlay master and participation **both arm the same fetch**; they are not the same paint path.

Illumination sits at scene **order 0**; clouds overlay at **2.5** (above grid). Overlay blackout is on top of illumination. Participation can run with overlay **off**.

## 22. Black / no-data effect on illumination

Black luma → `opacity01 = 0` → **zero solar attenuation**. The empty default JPEG would **not** darken the world via illumination.

Colored CTT pixels **would** attenuate in proportion to palette luma, **not** cloud optical depth. Cold high clouds (purple, low luma) attenuate **less** than warm low clouds (red, high luma) — physically backwards. That is a **second defect**, currently masked because the overlay JPEG is empty and participation defaults to **off**.

Switching overlay to PNG without teaching the opacity materializer to decode PNG would **break** participation (jpeg-js only).

## 23. Polling / update cadence

**(repo)** 15 minutes.

**(GIBS)** Daily CTT. 15 min polling cannot create new Terra data; it can only pick up mosaic fill-in during the current UTC day. Geostationary IR is 10 min — 15 min would be in the right ballpark **if** that product were chosen later.

Do not raise frequency for the current product.

## 24. Resolution / performance

| Request | Fetch | Bytes | Decode (Pillow, this machine) |
|---------|-------|-------|-------------------------------|
| Production 2048×1024 JPEG empty | 0.79 s | 19.6 KB | 1.35 s |
| Today 2048×1024 JPEG | 2.06 s | 796 KB | 1.47 s |
| Yesterday 2048×1024 JPEG | 2.19 s | 884 KB | 1.49 s |
| 1024×512 no TIME JPEG | 0.42 s | 5.7 KB | — |
| PNG 2048×1024 no TIME | 0.70 s | 16.9 KB | 0.51 s |

2048×1024 at 2:1 matches world geography and is appropriate. 1024×512 is adequate for overlay. GIBS resampling artifacts were not separately quantified. Canvas paint cost was not measured in-browser. A full-world transparent PNG of a mature CTT day was not fetched at 2048×1024 (JPEG mature day is ~884 KB; PNG would be larger).

## 25. Fixture behavior

**(repo)** Fixture is a **synthetic 8×4 JPEG** gray-blue longitudinal gradient encoded in `encodeGlobalCloudsIrFixtureJpeg()`, not a recorded GIBS mosaic. Live failure (non-abort) substitutes it under the **same** `sourceId`. Tests treat SOI + store wiring as success. The fixture cannot reproduce “black world + Antarctic splash,” so automated coverage never saw the defect.

Data tab copy honestly says clouds use a bundled fixture when live fetch fails; Layers does **not** surface fixture vs live for clouds (unlike earthquakes).

## 26. Test coverage gap

- DLU-5 asserts URL contains GIBS/JPEG and that mocked JPEG bytes become a snapshot. **No pixel-distribution contract. No TIME param. No live image assertion.**
- LIB-034 visual record treated HTTP 200 + “colorful IR swathe” as LIVE SUCCESS and already noted empty night-side — the JPEG no-data blackout was not classified as a defect.
- No screenshot of the **raw provider** image.
- Fixture visually unlike live CTT.

Future regression: assert TIME present; prefer PNG+alpha; fail if opaque-black fraction exceeds a threshold on a known-good date; distinguish fixture vs live in status.

## 27. Provenance / fallback

Clouds still **opt in** to fixture fallback (ADR 0005). Earthquakes/ISS do not. A failed GIBS fetch can paint the 8×4 gradient as if it were global IR (`freshness` from lifecycle state, often `ready`). No cloud loading/live/stale/unavailable/fixture hint in Layers. Snapshot `validTimeMs` is not the GIBS data day. Same trust class earthquakes had before LIB-059 — **later**, not in the first paint repair.

## 28. Historical Demo feasibility

**(GIBS)** Daily TIME from 2000–present with gaps. Architecturally, Demo could request `TIME=product UTC date` for this layer.

**(repo)** ADR 0013 hides the layer unless product time is live-enough (±5 min). Historical cloud playback is **feasible and source-dependent**, with cache/rate implications (one world image per day). **Do not mix into the next repair LIB.**

## 29. Root-cause classification

| Code | Applies? | Notes |
|------|----------|-------|
| A wrong source/product | **Partial** | Wrong for “intuitive global clouds”; acceptable as scientific CTT once TIME+PNG exist |
| B wrong TIME/default date | **Yes — primary** | Omitting TIME selected tomorrow’s empty mosaic |
| C WMS axis-order/bbox | **No** | 1.1.1 lon/lat bbox is correct; swapped 1.3.0 looks different |
| D projection mismatch | **No** | Equirect 2:1, orientation correct |
| E opaque no-data/JPEG | **Yes — primary amplifier** | PNG no-data is transparent; JPEG paints black |
| F compositing problem | **Secondary** | `source-over` + 0.45 is correct given an opaque JPEG; it will veil any no-data black |
| G provider latency / incomplete current day | **Yes, contributing** | Today still 13% holes; default rolled to tomorrow |
| H illumination-mask misuse | **Yes, latent** | Luma-of-rainbow ≠ cloud; black happens to mean “no cloud” |
| I fixture/test coverage gap | **Yes** | 8×4 gradient; no pixel contract |
| J provenance/fallback trust | **Yes, later** | Fixture can masquerade as live |

## 30. Is network acquisition working?

**Yes.** HTTP 200, JPEG SOI, CORS `*`, snapshot, materialize, blit path are real. The bytes are just the wrong TIME + the wrong format for overlay.

## 31. Is current product appropriate?

**Partially.** Appropriate as “MODIS Terra daytime cloud-top temperature.” Inappropriate as always-on global clouds, night IR, or white cloud cover.

## 32. Is WMS request correct?

**Partially.** Version, SRS, BBOX, WIDTH/HEIGHT, LAYERS are fine. **TIME omitted** and **JPEG without transparency** are incorrect for this product’s no-data semantics.

## 33. Is compositing correct?

**Partially.** Mechanical blit is correct. Compositing an opaque no-data JPEG at 45% is what the user sees. There is no bug in `globalCompositeOperation`; the input image is wrong.

## 34. Is cloud illumination participation correct?

**Partially / no for science.** Black → 0 attenuation (accidentally OK). Rainbow luma as opacity is not cloud optical depth and inverts high/low cloud. JPEG-only decoder will not accept a PNG overlay without a follow-on change. Factory participation is **off**, so this is not the current black-screen bug.

## 35. Recommended immediate next LIB

**Repair the GIBS request and overlay encoding for `global-clouds-ir-v1`:**

1. Send an explicit GIBS `TIME` for a **latest useful UTC day** (today if the mosaic has coverage; otherwise previous day). **Do not omit TIME. Do not trust GetCapabilities `default` blindly** (it was tomorrow and empty).
2. Request **`FORMAT=image/png`** with **`TRANSPARENT=TRUE`**. Extend accept/validate beyond JPEG SOI.
3. Keep the current layer id and GIBS CTT Day product for this slice (no product switch, no geostationary stack, no rename).
4. Decide illumination in the same slice only as far as needed so PNG bytes do not silently disable Model A (decode PNG to opacity, or document participation as JPEG-only until a follow-on).
5. Tests: TIME present; PNG/alpha; opaque-black fraction bound on a fixture or recorded sample; known-good date vs omitted-TIME empty mosaic.

Out of that LIB: fixture-policy honesty, status UI, poll cadence, historical Demo TIME, Day+Night stack, geostationary IR, palette restyle, rename.

## 36. Recommended later phases

1. **Provenance/trust** — fixture vs live, stale, Layers status (earthquake pattern).
2. **Richer presentation** — CTT vs cloud-mask/white-alpha; optional Day+Night; optional geostationary IR; illumination from a real cloud mask not rainbow luma.
3. **Historical Demo clouds** — GIBS TIME at product date; separate policy from ADR 0013.
4. **Provider redundancy** — only if Africa-inclusive live IR is in scope (Meteosat / NOAA mosaic); CORS first.

## 37. Architecture risks

- Overlay blit and illumination decode **share one JPEG contract**. PNG overlay without a PNG opacity path breaks Model A.
- `validTimeMs` = wall clock, not GIBS data day — historical selection would be a lie until TIME is stored.
- Full-viewport opaque rasters sit **above** the grid (order 2.5 > 1). Bad no-data encoding hides geography.
- Durable `sourceId` must stay stable if the WMS URL/format changes.

## 38. Provider / API risks

- GIBS `default` TIME can be **in the future and empty**.
- `nearestValue="0"` — no snap to last good day.
- Daily mosaic incomplete until late UTC; 15 min poll cannot fix that.
- JPEG no-data flattening is inherent.
- No GIBS global geo composite; no Meteosat.
- CORS is open today; still a third-party dependency (CloudFront).
- No API key required.

## 39. Not verified

- In-browser Canvas paint timing / `globalAlpha` as seen on a running `localhost` session (raw images + source inspected instead).
- WMS 1.3.0 GetCapabilities text (1.1.1 caps + 1.3.0 GetMap diagnostics only). CRS:84 listedness in 1.3.0 caps.
- Exact mature-day **PNG** byte size at 2048×1024.
- Worldview UI clicked live (same GIBS layer/GetMap used).
- Desktop Tauri webview vs Chrome.
- Stacked WMS `LAYERS=Day,Night` or GOES+Himawari composite request.
- Subdaily TIME on CTT (caps say daily only; not probed with `THH:MM:SSZ`).
- Illumination numerical field with a mature CTT JPEG in the running app (math traced; not frame-dumped).

## 40. Final state

Investigation only. Production unchanged. Repository remains **AWAITING SCOPE**. This item stays `proposed`.
