# 0011 — Lunar-eclipse moonlight attenuation is physical illumination

- **Status:** Accepted
- **Date:** 2026-08-16 (record written with [LIB-021](../work/LIB-021-lunar-eclipse-visual-reconciliation.md))

## Context

Ambient night-side illumination already includes a phase-dependent moonlight contribution in the upstream planetary `rasterPatch`. During a lunar eclipse the Moon is near full, so the ordinary phase model still predicts strong moonlight, but Earth's shadow physically suppresses the reflected light.

Lunar eclipse *presentation* (Moon-visible region, glyph shadow, alignment, labels) is gated by the Lunar eclipses master and child toggles. Treating moonlight the same way would let a user hide the overlay and still see physically impossible bright full-Moon illumination during totality.

## Decision

**Lunar-eclipse attenuation of ordinary moonlight is physical illumination behaviour. It follows authoritative lunar geometry at product UTC independently of whether informational lunar-eclipse overlays are enabled.**

- Transmission is `ordinaryPhaseMoonlight × eclipseTransmission`, where `eclipseTransmission` comes from geometric disc coverage of the catalog penumbra and umbra circles.
- Lunar phase itself is unchanged.
- Reference-city visibility does not affect the scalar.
- The Lunar eclipses master and Moon Earth-shadow treatment toggle continue to gate map overlays and the glyph shadow, not the illumination scalar.
- The Moon-visible region remains an informational overlay and must not masquerade as moonlight.

## Consequences

**Good.**

- Totality cannot present a bright full-Moon night side merely because the user hid eclipse geography.
- Illumination stays in the existing upstream `rasterPatch` (ADR 0002); Canvas still sees pixels, not eclipse vocabulary.
- Tests can assert transmission from `lunarGeometry` without constructing overlay layers.

**Costs.**

- Two independently gated surfaces exist: physical attenuation vs informational overlays. Copy and tests must keep that distinction explicit.
- The transmission approximation is geometric coverage, not radiative transfer.

**Explicitly not decided.** This does not approve a standing ambient Lunar Visibility overlay, atmospheric eclipse darkness for solar events, or a user toggle for physical moonlight attenuation.
