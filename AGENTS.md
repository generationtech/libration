# AGENTS.md

## Purpose

This file gives AI coding agents persistent project context for Libration.

It is intentionally concise. Human-readable strategy and specification detail lives in the documentation set. Cursor-specific rules live under `.cursor/rules/`.

**Planning / discovery sessions:** after `README.md` and `ARCHITECTURE.md`, read **`PLAN.md` → “Agent session handoff (planning prompts)”** (scheduling snapshot table) and **`docs/ROADMAP.md`** phase status before recommending the next PR-sized slice. **Map substrates (shipped):** **`equirect-world-legacy-v1`** (default reference; bundled preview **closed**), **`equirect-world-topography-ne-v1`**, **`equirect-world-political-v1`**, **`equirect-world-geology-v1`**, **`equirect-world-bathymetry-etopo-v1`** (NOAA ETOPO 2022; non-transitional; −180…+180° equirect contract; registration test `bathymetryOnboardedAsset.test.ts`); **structured selector attribution** on all eight bundled families (`attribution`, optional `licenseNote`, `sourceLinks`; **Source & license** in `BaseMapStyleControl`); **month-aware selector polish** (Blue Marble catalog copy, `variantMode` on options, active UTC civil month line from render-clock `productInstantMs` in config UI—not SceneConfig). Legacy scene ids **`equirect-world-topography-v1`** / **`equirect-world-topo-v1`** → **`equirect-world-blue-marble-t-v1`**. **Scheduling:** **default macro PR track** = **Phase 8 / Slice 3** (queue **A**); **single best next PR** = next **A**-class substrate when sourced (queue **(2)**; preferred order: vegetation/land cover → climate normals; bathymetry **closed**; **(2b)** month-aware selector **shipped**); queue **D** weather/cloud **planning** **shipped** ([`docs/specs/scene/weather-cloud-composition-plan.md`](docs/specs/scene/weather-cloud-composition-plan.md)); **Slice 2** = composition *program* when **A** has no increment—fall through to **B**/**C** (not **D** until Phase 10 for implementation).

## Project identity

Libration is a renderer-agnostic, longitude-first world time and global scene instrument.

The product is not a generic map viewer. It is a precision time instrument with a composable scene system.

## Required reading before substantial edits

Before making architectural or multi-file edits, read:

- `README.md`
- `ARCHITECTURE.md`
- `PLAN.md`
- `docs/DEVELOPMENT_STRATEGY.md`
- `docs/ROADMAP.md`
- `docs/PROJECT_STRATEGY.md`
- `docs/FUTURE_FEATURES.md`
- relevant source files in `src/`

For map or scene work, also read:

- `docs/maps/MAP_ASSET_STRATEGY.md`
- `docs/maps/MAP_ASSET_SOURCES.md`

## Non-negotiable architecture rules

1. Product semantics must be resolved upstream of rendering.
2. `RenderPlan` is the hard rendering boundary.
3. Backends execute resolved primitives only.
4. Backends must not inspect config to decide product behavior.
5. SceneConfig is authoritative for scene content.
6. Chrome is screen-space and separate from scene layers.
7. Projection defines spatial truth.
8. Base maps are substrates, not positional truth.
9. Persist durable semantic ids, not derived runtime paths.
10. Keep code phase-scoped and testable.

## Time model rules

- There is one authoritative UTC instant per frame.
- Display modes format or project time presentation.
- Display modes must not mutate the canonical instant.
- Reference city or civil zone selection changes presentation, not the underlying clock.
- Demo mode is the intentional exception when configured.

## Scene and map rules

- Persist `scene.baseMap.id` as a family id.
- Do not persist concrete month raster paths.
- Do not add map families by TypeScript source edits when catalog onboarding is appropriate.
- Use `npm run maps:prep -- --update-catalog` for curated source TIFF onboarding.
- Do not runtime-scan `public/maps`.
- Month-aware behavior must be explicit in the catalog.
- Product time drives month-aware base-map resolution.
- Backend raster load failure reporting is allowed, but fallback policy belongs upstream.
- **Map selector attribution:** catalog-only `attribution`, optional `licenseNote`, and `sourceLinks` (not persisted in SceneConfig); **Source & license** block in `BaseMapStyleControl`. **`maps:prep`** still emits primary `attribution` only—add `licenseNote` / `sourceLinks` manually or extend tooling when onboarding families.
- **Planetary illumination (twilight):** continuous non-emissive twilight in one upstream `rasterPatch`; **shipped cumulative incremental transition tuning** (constants-only, narrow passes; **second** pass doc-finalized—see `PLAN.md` Slice 2 / `docs/ROADMAP.md` Phase 7) lives in `src/renderer/illuminationShading.ts` (no SceneConfig axis in that slice). **Further** atmosphere/scattering, **optional third+** narrow constants passes, and optional persisted “twilight softness” remain future (see `PLAN.md` Slice 2).
- **Overlay readability stack (v1 + v1.1 + derived substrate lift + persisted `scene.overlayReadability.presentation` + six default-stack `perLayer` pilots):** derived upstream (RenderPlan hints + merged `cssFilter` where applicable); the shell attaches one `OverlayReadabilityFrame` per tick on `TimeContext` with subsolar veil, emissive **policy**, **substrate lift scale** (`substrateOverlayReadabilityLiftScale01` from effective base-map presentation + catalog `capabilities`, including optional **`reliefShaded`** / **`boundaryDense`** / **`chromaticDense`** / **`bathymetryShaded`** / **`fineScaleTexture`** / **`labelDense`** / **`etchedReliefDense`** / **`sunGlintDense`** intrinsic hints and **sub-1 brightness** dimming), then applies normalized presentation (`readabilityVeilScale01`, `overlayLiftMultiplier01`) before hints. **`perLayer` pilots** (`grid`, `solarAnalemma`, `subsolarMarker`, `sublunarMarker`, `cityPins`, `staticEquirectOverlay`) optionally repeat those scalars per row (identity omitted on normalize). **Shipped substrate catalog contract:** **eight** optional intrinsics through **`sunGlintDense`** (see `PLAN.md` Slice 2 substrate subsection). **Future:** readability keys for stack rows beyond those defaults (when product-defined) and finer multi-row semantics (e.g. multiple static equirect rows); **further** substrate-only heuristics beyond the **shipped** eight intrinsic catalog hints (`reliefShaded`, `boundaryDense`, `chromaticDense`, `bathymetryShaded`, `fineScaleTexture`, `labelDense`, `etchedReliefDense`, `sunGlintDense`) plus `overlayOptimized` / `darkFriendly` and sub-1 brightness dimming (see `PLAN.md` Slice 2).
- **Weather/cloud participation (planning shipped, no runtime):** [`docs/specs/scene/weather-cloud-composition-plan.md`](docs/specs/scene/weather-cloud-composition-plan.md) — boundaries and Phase 10 prerequisites for future implementation; queue **D** closed. Do not implement live weather in render or reopen planning as a default next PR.

## Cursor and ChatGPT workflow rules

For large changes:

1. Start with an implementation intent.
2. Keep phases narrow.
3. Identify files likely to change.
4. State success criteria.
5. Require tests.
6. Require a final changed-files summary.
7. Avoid broad opportunistic refactors.

For bug fixes:

1. State root cause.
2. Patch the smallest responsible boundary.
3. Add or adjust regression tests.
4. Avoid papering over architectural mismatches.

## Test expectations

Run the narrowest meaningful tests first, then broader tests when the change is architectural.

Common commands:

```bash
npm test
npm run test
npm run build
npm run maps:prep -- --help
npm run fonts:prep
```

Use the commands that actually exist in `package.json`.

## Documentation expectations

When behavior changes, update docs in the same change.

Update:

- `README.md` when public capability bullets change.
- `PLAN.md` for current execution direction.
- `ARCHITECTURE.md` for durable architecture changes.
- `docs/ROADMAP.md` for phase status.
- `docs/FUTURE_FEATURES.md` when preserving or adding future ideas.
- `docs/PROJECT_STRATEGY.md` and `docs/AI_COENGINEERING.md` when shipped scope or strategy summaries change.
- map docs when onboarding or changing asset workflows or **base-map `capabilities` consumed upstream** (`docs/maps/MAP_ASSET_SOURCES.md`, `docs/maps/MAP_ASSET_STRATEGY.md`).

Do not create sprawling speculative spec files unless they provide durable architectural value.

## Output expectations for AI edits

Report:

- files changed.
- what changed.
- why it changed.
- tests run.
- tests not run and why.
- risks or follow-up work.

Do not claim tests passed unless they were actually run.
