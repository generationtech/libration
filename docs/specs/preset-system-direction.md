# Preset System Direction — Composable Partial Configuration Presets

## Purpose

Capture the current design direction for a future preset system in Libration so it can be revisited later without losing the architectural intent behind the idea.

This document describes a preset system that is broader and more powerful than a single-purpose appearance bundle.

Instead of treating narrow appearance packages, ad hoc style toggles, and saved configurations as separate concepts, the system is intended to support **named, composable, partial configuration presets** that can be applied to the running configuration in explicit sequence.

This note is intentionally forward-looking. It is not a commitment to immediate implementation.

---

## Why This Direction Exists

Libration already has a strong structured configuration model and a normalization pipeline. Runtime behavior today is intentionally simple:

- the current running configuration is saved
- restarting the app restores the most recently used settings

That behavior should remain intact.

The future preset system is meant to sit *on top of* that robust configuration architecture, not replace it.

The motivating idea is:

- users may want reusable named configurations
- some presets should affect many settings
- some presets should affect only a narrow slice of the config
- presets should be combinable
- narrow appearance-only bundles should become just one specialized use of the broader preset system

## Built-In Baseline Defaults

Presets do **not** remove the need for a hard-coded baseline product configuration.

Libration still needs one canonical built-in default config in code that defines:
- first-launch behavior
- reset-to-default behavior
- fallback behavior when persisted state is missing or invalid

That baseline is not just another ordinary preset in the user-facing sense. It is part of the product definition itself.

A useful conceptual stack is:
- built-in baseline config
- persisted running config
- future ordered preset overlays
- normalized effective config used by runtime

The baseline may eventually reuse some of the same structured machinery as presets internally, but conceptually it remains special:
- always present
- authoritative for first launch
- suitable for normalization fallbacks
- not an optional user-combinable overlay

During active product development, the baseline should be treated as the current best shipping intent for first launch, not as an immutable forever decision. Changing that baseline should affect:
- first launch
- reset to defaults
- missing/corrupt state recovery

It should **not** silently rewrite already-persisted user running config.

---

## Core Product Idea

A preset is a **named partial structured configuration patch**.

That means:

- a preset does **not** need to define a full app config
- a preset contains only the config subtrees it intends to affect
- any config not present in the preset is left unchanged when the preset is applied

Conceptually:

```ts
type Preset = {
  id: string;
  name: string;
  description?: string;
  configPatch: Partial<LibrationConfigV2>;
}
```

The important part is not the exact final type name. The important part is the model:

- **named**
- **structured**
- **partial**
- **applied as an overlay**

---

## Presets Are Not Just Appearance Bundles

A fixed “look package” usually means a narrow, precomposed appearance slice.

This design is intentionally more general.

Under this model:

- a color/font package can be a preset
- a chrome styling package can be a preset
- a top-band hour-marker package can be a preset
- a mixed preset combining multiple areas can be a preset
- a future scene/layer/data-mode package can be a preset

So a narrow appearance-only preset is only one kind of preset:

- a preset with a small, appearance-oriented scope

This removes the need for a parallel, special-case appearance subsystem if presets are expressive enough.

---

## Core Behavioral Rules

These rules should be treated as foundational.

### 1. Presets are partial structured config patches

A preset stores only the config it intends to control.

If a preset only cares about top-band hour markers, it should only store that subtree.

Example:

```ts
{
  chrome: {
    layout: {
      hourMarkers: {
        realization: { kind: "analogClock" },
        layout: { sizeMultiplier: 1.2 }
      }
    }
  }
}
```

Everything outside that subtree remains untouched when this preset is applied.

---

### 2. Presets may be combined

Multiple presets may be applied to produce an effective result.

This is a feature, not an accident.

Users should be able to build more complex outcomes by combining smaller reusable presets.

Example:

- one preset controls hour indicator style
- one preset controls map layer visibility
- one preset controls display chrome visibility toggles

Applied together, they produce the effective running configuration.

---

### 3. Presets are applied in explicit order

This rule is mandatory.

If users can combine presets, then the system must define how conflicts resolve.

The rule is:

- **order matters**
- presets are applied in explicit sequence
- there is **no hidden merging magic**
- the sequence is user-visible and meaningful

Conceptually:

```ts
effective =
  applyPreset(
    applyPreset(
      applyPreset(baseOrCurrent, presetA),
      presetB
    ),
    presetC
  );
```

---

### 4. Last write wins

If two presets affect the same config path, the later preset overrides the earlier one.

This is the conflict-resolution rule.

Example:

- Preset A sets `chrome.layout.tickTapeVisible = false`
- Preset B sets `chrome.layout.tickTapeVisible = true`

If B is applied after A, the effective result is `true`.

This must be visible and unsurprising.

---

### 5. Normalization still applies

After presets are applied, the resulting configuration should still flow through the normal config validation/normalization path.

This matters because:

- partial presets may intentionally omit related fields
- some selections imply defaults elsewhere
- the system already relies on normalization to keep config truthful

So preset application should not bypass existing config integrity mechanisms.

Conceptually:

```ts
effectiveConfig = normalizeConfig(
  applyOrderedPresetPatches(baseConfig, presets)
);
```

---

## Structural Integrity Rule

This is one of the most important design constraints.

### Presets should operate on meaningful structured subtrees, not arbitrary leaf fragments

The UI may eventually allow users to choose “individual settings”, but the implementation should remain grounded in structured config ownership.

That means the user experience can feel fine-grained, but the stored patch should still respect the config hierarchy.

### Dangerous direction to avoid

Do **not** reduce presets to arbitrary flat key/value fragments with no structural meaning.

Example of a bad direction:

```ts
{
  "hourMarkerColor": "#fff",
  "hourMarkerSize": 1.2
}
```

This is brittle and detached from the actual config architecture.

### Preferred direction

Store structured patches aligned with existing config ownership.

Example:

```ts
{
  chrome: {
    layout: {
      hourMarkers: {
        appearance: {
          color: "#ffffff"
        },
        layout: {
          sizeMultiplier: 1.2
        }
      }
    }
  }
}
```

This preserves:

- ownership
- normalization behavior
- future compatibility
- conceptual clarity

---

## UI Direction for Preset Authoring

The future authoring UI does not need to mirror raw JSON, but it should remain faithful to structured config ownership.

### Original idea

A compact grid or spreadsheet-like UI where the user can choose which settings a preset should include.

That is a good direction, but it should be refined:

- the UI may present many selectable settings
- the stored result should still collapse into structured config patches
- the UI should guide selection by domains and groups, not encourage meaningless per-leaf chaos

### Recommended authoring model

The authoring UI should likely group settings by domain and subdomain.

Example direction:

- Chrome
  - Hour indicators
    - Behavior
    - Realization
    - Appearance
    - Layout
  - Tick tape
  - NATO timezone area
- Scene / layers
- Data mode
- Future surfaces

This keeps authoring understandable and aligned with the architecture.

### Important nuance

Even if the UI allows selecting “individual settings”, the implementation should still prefer saving coherent structured subtrees rather than an arbitrary bag of disconnected leaf values.

---

## Relationship to Running Config

The preset system should not replace the current running-config persistence behavior.

Today’s behavior:

- the app persists the current running config
- on restart, the app restores the most recently used state

That should continue to be true.

The preset system should sit alongside it.

### Likely conceptual model

- there is a current running config
- presets may be authored, saved, applied, removed, reordered
- applying presets changes the running config
- the resulting running config continues to persist normally

This keeps the application usable even before a user deeply engages with preset workflows.

---

## Relationship to Built-In and User Presets

The long-term system should support at least two preset sources:

### 1. Built-in presets
Shipped with the application.

Examples:

- appearance presets
- sample instrument looks
- demonstration configurations
- curated defaults for specific surfaces

### 2. User presets
Created and named by the user.

Examples:

- a preferred analog hour-indicator setup
- a favorite top-band appearance package
- a reusable combination for presentation mode

Both should follow the same logical contract:

- named preset
- partial structured patch
- explicit apply behavior
- same conflict rules

---

## Scope and Touch Metadata

A useful optional enhancement is to track what a preset is intended to affect.

This is not strictly required for the first implementation, but it would improve UX and debugging.

Possible metadata examples:

```ts
type Preset = {
  id: string;
  name: string;
  description?: string;
  configPatch: Partial<LibrationConfigV2>;
  scopes?: string[];
}
```

Or more structured forms such as:

- `chrome.hourIndicators`
- `chrome.tickTape`
- `chrome.natoTimezone`
- `scene.layers`
- `data.mode`

This metadata could help with:

- filtering presets by area
- explaining what a preset touches
- warning users about overlap
- future preset management UI

The metadata should remain descriptive. It should not become the source of truth for how application works. The patch itself remains the authoritative effect.

---

## Applying Presets: Conceptual Pipeline

A clean conceptual pipeline would be:

1. start from a known starting config
2. apply preset patches in explicit user-defined order
3. normalize the resulting config
4. commit it as the new effective running config

Conceptually:

```ts
effectiveConfig =
  normalizeConfig(
    applyPresetPatchesInOrder(startingConfig, orderedPresets)
  );
```

The preset layering contract does not require only one possible `startingConfig`, but the project should explicitly recognize the built-in baseline config as the authoritative first-launch default. Plausible workflows include:

- apply presets onto the current running config
- apply presets onto the built-in baseline config
- support both workflows explicitly

Whatever workflow is chosen later, the existence of the built-in baseline config should not be left ambiguous.

---

## Possible Preset Categories

These are examples, not commitments.

### Appearance-oriented presets
Examples:
- high-contrast labels
- dense digital styling

### Surface-specific presets
Examples:
- hour-indicator analog package
- glyph-heavy top band
- minimal NATO strip
- larger tape emphasis

### Mixed multi-area presets
Examples:
- presentation mode
- clean desktop view
- dense informational view

### Future operational presets
Examples:
- local static demo mode
- map/layer visibility packages
- pin visibility package
- scene annotation package

This is why presets should be more general than a single-purpose appearance bundle.

---

## Cross-Preset Composition Examples

### Example A — narrow appearance composition

Preset 1:
- hour indicators use analog clocks

Preset 2:
- bottom information bar hidden

Preset 3:
- NATO row hidden

Applied in that order, all three contribute to the final state.

### Example B — conflict example

Preset 1:
- `chrome.layout.bottomInformationBarVisible = true`

Preset 2:
- `chrome.layout.bottomInformationBarVisible = false`

Result:
- `false` wins if Preset 2 is later in the ordered stack

This must not be hidden from the user.

---

## What This System Should Avoid

### 1. Hidden smart merging
Do not create undocumented blending logic beyond structured patch application.

Users should not have to guess why a value won.

### 2. Unordered application
If multiple presets can be combined, the system must not pretend order is irrelevant.

### 3. Arbitrary flat leaf-bag storage
That would drift away from the current strong config architecture.

### 4. Appearance-only thinking
That would underuse the strength of the preset concept.

### 5. Premature over-engineering
The first implementation should establish the contract clearly. It does not need every future management feature immediately.

---

## Recommended Initial Implementation Strategy

When this work is eventually revisited, the safest first slice would be:

### Phase 1 — Foundation only
Implement:

- preset data model
- partial patch storage
- ordered application
- last-write-wins behavior
- normalization after application
- built-in + user preset support at a basic level

Do **not** start with:
- elaborate grid authoring
- complex sharing/import/export
- advanced conflict diagnostics
- preset bundles with hidden semantics

### Phase 2 — Authoring and management UI
Implement:

- create/edit/delete/rename presets
- choose what config domains to include
- reorder active preset application sequence
- visible explanation of what each preset touches

### Phase 3 — Rich composition tools
Possible future additions:

- preview diff before applying
- compare presets
- scoped filtering
- import/export
- preset collections
- built-in curated libraries

---

## Relationship to the Current Major-Area UI Direction

This preset idea aligns naturally with the newer major-area-driven configuration UI.

Because the UI is increasingly structured around meaningful areas such as:

- 24 hr indicator entries
- 24 hr tickmarks tape
- NATO timezone area

the preset system can eventually leverage those same conceptual areas during preset authoring.

That does **not** mean presets should be tied to UI state.

It means the major-area structure is a useful guide for exposing preset scope selection in a human-friendly way.

The config model remains primary.

---

## Open Product Questions for Later

These are intentionally deferred.

### 1. What is the preset application baseline for a given workflow?
The built-in baseline config should exist regardless. The open question is which starting config a given preset workflow should target:
- the current running config
- the built-in baseline config
- a user-selected baseline

### 2. How should active presets be represented in the UI?
Examples:
- stack/list with reorder controls
- enable/disable toggles
- one-shot apply buttons
- persistent active preset set

### 3. How granular should preset authoring be?
The direction should remain structured, but the UI granularity still needs product design.

### 4. Should built-in presets be immutable?
Likely yes, but exact behavior can be decided later.

### 5. Should presets support export/import?
Probably useful later, but not required for the foundation.

---

## Recommended Vocabulary

To keep the system conceptually clean, prefer language like:

- **preset**
- **config patch**
- **partial structured preset**
- **ordered preset stack**
- **last write wins**
- **applied preset sequence**

Avoid vague language that suggests hidden intelligence, such as:
- “blend”
- “smart merge”
- “auto-resolve”
- “harmonize”

The system should feel deterministic.

---

## Summary

The intended future direction is:

- keep the current running-config persistence behavior
- add **named presets** as **partial structured config patches**
- allow multiple presets to be combined
- define combination by **explicit order**
- resolve overlap with **last write wins**
- run the result through the existing normalization pipeline
- treat narrow appearance bundles as only one subset of the broader preset concept
- keep preset storage aligned to meaningful structured config ownership
- let future UI expose preset authoring through domain-aware grouping rather than arbitrary flat field selection

This direction is promising because it builds on Libration’s strongest existing asset:

- a structured, normalizable, architecture-aware configuration system

Rather than adding a parallel customization mechanism, it expands the configuration system into a more powerful, reusable composition model.

---

## Status of This Idea

This is a design note only.

It captures a promising future direction but does not imply immediate implementation.

When the project is ready to revisit presets, this document should be used as the starting point for defining:

- the preset data model
- patch-application semantics
- normalization integration
- preset authoring UX
- active preset management UX
