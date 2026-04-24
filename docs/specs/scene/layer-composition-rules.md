# Layer Composition Rules


## Current Implemented Composition Status

Current implementation status:

- Scene composition is driven by `SceneConfig` and a centralized composition plan.
- Base map remains foundational and below overlays.
- Overlay ordering is deterministic and user-controlled via `SceneLayerInstance.order`.
- Equal-order ties preserve array order.
- Static and derived overlays participate through supported source semantics.
- Base-map month-aware raster resolution is not a composition concern; composition receives the resolved layer state.

The next composition frontier remains future blending/masking, especially for day/night emissive map composition.

---

## Ordering
- User-controlled stack
- zIndex resolved at runtime

## Opacity
- per-layer alpha

## Future
- blending modes
- masking
- clipping

## Constraint
Base layers must remain beneath overlays.



---

# ADDITIONS (v2.1)

## Clarified Composition Model (Added)

Layer composition is the process of combining multiple layer outputs into a single visual result within the scene.

Each layer contributes independently, and composition determines:

- visibility precedence
- transparency interaction
- future blending behavior

---

## Ordering Semantics (Expanded)

Current rule:
- User-controlled stacking (Option B)

Clarifications:
- Lower order (or earlier stack position) renders first
- Higher order renders later (appears visually on top)
- Ordering must be deterministic

Tie-breaking rule:
- If equal order values exist → preserve array order

---

## Base Map Constraint (Clarified)

> Base map must remain visually beneath all overlay layers.

However:
- Base map is still an explicit participant in the scene model
- Implementation may special-case its placement for performance

---

## Opacity Semantics (Expanded)

Opacity is applied per layer during composition.

Important rules:

- Opacity affects visual blending only
- Opacity must not alter:
  - underlying data values
  - spatial meaning
- Opacity stacking is cumulative (later layers applied on top)

---

## Future Blending Modes (Expanded)

Reserved for future implementation:

```ts
type LayerBlendingMode =
  | "normal"
  | "multiply"
  | "screen"
  | "additive"
```

Expected use cases:

- multiply → terrain + weather overlays
- screen → glow / highlight effects
- additive → intensity heatmaps

---

## Masking & Clipping (Future)

Future composition features may include:

- geometric clipping (layer restricted to region)
- alpha masking (one layer defines visibility of another)
- viewport clipping (required for zoom/pan)

These are not part of v1 but must not be blocked.

---

## Invariants (Added)

The following MUST hold:

1. Composition order is deterministic
2. All layers share the same projection and scene view
3. Composition must not introduce spatial distortion
4. Layer visibility is controlled only by:
   - enabled flag
   - opacity
   - ordering
5. Composition must be side-effect free

---

## Anti-Patterns to Avoid (Added)

Future implementations MUST NOT:

- hardcode layer ordering in rendering code
- assume specific layer types always appear above/below others
- embed composition logic inside layer implementations
- treat opacity as a substitute for proper layering
- allow hidden implicit layers

---

## Interaction Considerations (Future)

Composition impacts interaction:

- topmost visible layer may capture interaction
- hit-testing must respect layer ordering
- transparency may affect interaction behavior

These should be designed explicitly when interaction features are added.

---

## Performance Considerations (Added)

Future composition systems may require:

- batching layers by type
- minimizing overdraw
- GPU compositing paths
- selective redraw based on changed layers

Composition design must remain compatible with these optimizations.

---

## Why This Matters (Added)

Layer composition is where:

- visual clarity is determined
- user expectations are enforced
- multiple datasets coexist meaningfully

Poor composition rules lead to:

- confusing visuals
- incorrect interpretation of data
- loss of user trust

This system must remain simple, deterministic, and extensible.

---

## Summary (Expanded)

Layer Composition Rules define:

- how layers are stacked and combined
- how transparency behaves
- how future blending and masking will integrate

It is a core part of the Scene System and must remain:

- explicit
- deterministic
- user-controlled

