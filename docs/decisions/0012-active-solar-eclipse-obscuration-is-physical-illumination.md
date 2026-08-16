# 0012 — Active solar-eclipse obscuration is physical illumination

- **Status:** Accepted
- **Date:** 2026-08-16 (record written with [LIB-027](../work/LIB-027-continuous-solar-eclipse-obscuration-shading.md))

## Context

Ordinary solar shading already composes day/night, twilight, moonlight, and optional clouds into one upstream planetary `rasterPatch` ([ADR 0002](0002-single-upstream-planetary-illumination-rasterpatch.md)). [ADR 0011](0011-lunar-eclipse-moonlight-attenuation-is-physical-illumination.md) established that lunar-eclipse moonlight attenuation is physical illumination, independent of informational lunar overlays.

Active solar eclipses were still presented as a mostly uniform teal live-partial fill. That overlay changed footprint correctly but did not look like sunlight being removed. Hiding Solar eclipses geography would also have restored physically impossible uneclipsed daylight.

## Decision

**Authoritative active solar-eclipse obscuration attenuates physical solar illumination independently of informational eclipse overlays.**

- The physical quantity is local solar-disc *area* obscuration from the same Besselian observer-plane geometry used by E4 local circumstances (`Rs = (L1'+L2')/2`, `Rm = (L1'−L2')/2`, circle-overlap fraction).
- A geographic field stores *physical* disc overlap (not an E4 horizon boolean) on a modest equirect grid, bilinearly interpolated, and mapped through a presentation transmission curve (`visualDarkening = maxDarken × obscuration^γ`). That transmission multiplies ordinary daylight availability (`1 − nightVeil`) in `sampleIlluminationRgba8`; it does not further darken settled night.
- The field is active-only. Upcoming forecast geography stays an informational teal overlay. Completed events contribute nothing.
- E4 local-circumstance visibility still reports obscuration 0 when the Sun is geometrically below the horizon. The illumination raster does not share that hard cutoff: ordinary solar twilight already takes daylight to zero, so a horizon-masked field would interpolate into a visible seam.
- The Solar eclipses master and child geography toggles continue to gate corridor, compact umbra/antumbra, alignment, marker, and labels — not the illumination field.
- Factory default is ON / Normal. An explicit Active eclipse shading control can disable the physical field; that is a presentation intensity choice, not a second eclipse authority.
- Compact umbra/antumbra remain overlay markers. They are not a substitute for the continuous field and are not encoded by hacking illumination RGB.

## Consequences

**Good.**

- Hiding corridor/marker/beam cannot make sunlight physically return during an active eclipse while solar shading is on.
- Active darkening is spatially continuous and time-continuous, not a polygon on/off.
- Illumination stays in the existing `rasterPatch`; Canvas still sees pixels, not eclipse vocabulary.

**Costs.**

- Two independently gated surfaces exist: physical attenuation vs informational overlays. Copy and tests must keep that distinction explicit.
- The darkness curve is a visual approximation, not photometric lux or atmospheric radiative transfer.
- Grid interpolation can slightly underestimate a narrow umbral peak; the compact central overlay remains the strongest totality cue.

**Explicitly not decided.** This does not approve atmospheric color, corona, refraction, or a second eclipse authority.
