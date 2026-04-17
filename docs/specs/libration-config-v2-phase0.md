# LibrationConfig v2 — Phase 0

## Update

### Chrome hour-marker reality today

`chrome.layout.hourMarkers` is now the sole persisted hour-marker config surface.

Hour-marker persistence is no longer expressed through legacy flat `chrome.layout` fields.

Top-band hour-marker rendering now flows through a resolved semantic model:
- structured `chrome.layout.hourMarkers`
- `resolveEffectiveTopBandHourMarkers`
- semantic planner
- layout
- realization adapter
- `RenderPlan`

There is no remaining flat compatibility layer for hour markers in normalization, persistence, or runtime resolution.

---

## Current Direction

The chrome config has evolved beyond single-axis appearance control.

For hour markers, persistence, normalization, editor authoring, and runtime resolution are now aligned on one structured model.

### Important separation
- Config defines intent only
- Resolver produces the effective hour-marker model
- Semantic planning and layout derive runtime meaning
- Typography roles and glyph policies resolve text/glyph realization
- Rendering is derived via `RenderPlan`
- Raw font filenames are not the durable config surface
- Font asset selection is distinct from procedural glyph selection
- Style is layered over representation and asset choice

---

## Structured Hour-Marker Model

Hour markers persist under:

`chrome.layout.hourMarkers`

Conceptually, the persisted model carries:
- optional behavior override
- realization choice
- layout sizing
- content-row padding overrides
- realization-scoped appearance overrides

Runtime content remains derived from that structured intent rather than persisted as a second source of truth.

Top-band visibility that sits alongside this model is also structured in chrome layout state, including:
- `chrome.layout.hourMarkers.indicatorEntriesAreaVisible`
- `chrome.layout.tickTapeVisible`
- `chrome.layout.timezoneLetterRowVisible`

---

## Font / Glyph Clarification

Top-band hour-marker text currently resolves through:

`structured chrome layout -> resolveEffectiveTopBandHourMarkers -> semantic text realization -> typography/intrinsic resolver -> layout -> realization adapter -> RenderPlan text -> Canvas text bridge`

Procedural glyphs resolve through:

`structured chrome layout -> resolveEffectiveTopBandHourMarkers -> semantic glyph realization -> glyph policy/spec -> layout -> procedural glyph -> RenderPlan primitives`

The current config does **not** point directly at raw TTF files or renderer-owned glyph geometry.

Canvas remains responsible for final text realization in the current backend, and bundled font realization is now working for that path.

Scene/chrome composition now also preserves a renderer-agnostic boundary: the visible map strip viewport is derived upstream and passed to the backend as resolved layout data rather than having the backend derive top-chrome reservation math on its own.

---

## Status

The truthful top-band hour-marker runtime contract is in place.

The truthful top-band hour-marker editor contract is in place.

The truthful top-band hour-marker persistence contract is in place.

The truthful indicator-band vertical model is in place:
- intrinsic content height is solved independently
- padding affects spacing only
- visible indicator-band height follows intrinsic content height plus resolved top/bottom padding
- Auto padding is intrinsic-based, not slack-based
- padding never affects marker scale

Current follow-on config/editor work should focus on:
- adding new hour-marker controls only when a concrete feature requires them
- preserving the structured-only `chrome.layout.hourMarkers` contract
- treating the hour-marker editor pattern as the finished reference example rather than reopening migration work
- reusing the pattern elsewhere only after feature pressure justifies it

---

## Breaking Change

Hour-marker persistence now requires:

`chrome.layout.hourMarkers`

Older saved configs that only contained legacy flat hour-marker fields are no longer compatible. This was an intentional full cutover.
