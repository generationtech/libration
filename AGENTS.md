# AGENTS.md

## Purpose

This file gives AI coding agents persistent project context for Libration.

It is intentionally concise. Human-readable strategy and specification detail lives in the documentation set. Cursor-specific rules live under `.cursor/rules/`.

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

- `PLAN.md` for current execution direction.
- `ARCHITECTURE.md` for durable architecture changes.
- `docs/ROADMAP.md` for phase status.
- `docs/FUTURE_FEATURES.md` when preserving or adding future ideas.
- map docs when onboarding or changing asset workflows.

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
