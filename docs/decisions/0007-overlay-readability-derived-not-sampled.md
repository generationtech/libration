# 0007 — Overlay readability is derived upstream, not sampled from the rendered image

- **Status:** Accepted
- **Date:** 2026-08-14 (record written during documentation modernization; the decision is visible in `src/core/overlayReadabilityFrame.ts` and `src/core/substrateOverlayReadabilityLiftScale.ts`)

## Context

Libration draws vector overlays — a graticule, the analemma, subsolar and sublunar markers, city pins — over eleven visually very different base-map substrates, across the full range of illumination from full daylight to deep night with emissive city lights.

A stroke width and alpha that read well over a dark ocean at night are wrong over a bright chromatic climate map at noon. Something has to adapt.

The direct approach is to measure: sample the rendered pixels beneath an overlay and adjust contrast accordingly. This is a well-known technique and it is what most systems reach for.

## Decision

Readability adjustments are **derived from known upstream state** and never from the rendered image.

One `OverlayReadabilityFrame` is computed per frame from four inputs:

1. the solar field, aligned with the illumination model's night veil;
2. emissive night-lights **policy** — mode, intensity, driver exponent — not the emissive texture;
3. a substrate lift scale derived from the effective base-map presentation plus optional catalog `capabilities` hints (`overlayOptimized`, `darkFriendly`, and eight intrinsic hints such as `reliefShaded`, `chromaticDense`, and `labelDense`), with brightness below default *reducing* the penalty so dimmed substrates keep their lift;
4. normalized scene readability presentation, plus optional per-layer scalars.

Layers receive derived hints and adjust resolved stroke widths and alphas. The backend is unaware readability exists.

## Consequences

**Good.**

- No framebuffer readback, which would be a per-frame cost and would make presentation depend on the backend.
- No feedback loop between drawing and deciding what to draw. Sampling creates one, and it is genuinely nasty: an overlay drawn in a previous pass influences the decision for the next.
- Readability is testable without rendering, like everything else upstream of `RenderPlan`.
- Substrate characteristics are declared once, during curation, rather than re-measured every frame.

**Costs.**

- Substrates must be **characterized by a human**. A new family needs its capability hints chosen correctly, and a mischaracterized substrate produces overlays that are subtly too faint or too heavy with no automatic correction.
- The model is an approximation. It reasons about the substrate as a whole, so it cannot respond to a locally bright feature — a snowfield, a dense label cluster — under one specific overlay segment. Sampling would handle that; this does not.
- The number of tuning inputs is significant, and their interaction is only verifiable visually.

**Scope note.** A fallback path exists for callers with no attached frame; it computes a solar-only approximation. Production always uses the shell-attached frame. The fallback is a safety net, not an equivalent path, and should not be treated as one.
