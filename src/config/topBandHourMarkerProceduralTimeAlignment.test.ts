/*
 * Libration
 * Copyright (C) 2026 Ken McDonald
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */

import { describe, expect, it } from "vitest";
import { longitudeDegFromMapX } from "../core/equirectangularProjection.ts";
import { solarLocalWallClockStateFromUtcMs } from "../core/solarLocalWallClock.ts";
import { createHourMarkerGlyph } from "../glyphs/glyphFactory.ts";
import { hourToTheta } from "../glyphs/glyphGeometry.ts";
import { normalizeDisplayChromeLayout } from "./v2/librationConfig.ts";
import { resolveEffectiveTopBandHourMarkers } from "./topBandHourMarkersResolver.ts";
import {
  buildSemanticTopBandHourMarkers,
  wallClockLongitudeDegForStructuralHourMarkers,
} from "./topBandHourMarkersSemanticPlan.ts";
import { structuralColumnCenterLongitudeDeg } from "./topBandHourMarkersSemanticTypes.ts";
import { hourMarkerRepresentationSpecForTopBandEffectiveSelection } from "./topBandVisualPolicy.ts";

/** Non-exact minute-bearing instant (not top-of-hour). */
const REF_MS = Date.UTC(2026, 3, 18, 15, 37, 22);

describe("top-band hour marker procedural time vs semantic wall clock", () => {
  it("radialLine and radialWedge glyph hour matches continuous solar hour for each structural column (effective staticZoneAnchored)", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          behavior: "tapeAdvected",
          realization: { kind: "radialLine", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect(eff.behavior).toBe("staticZoneAnchored");
    const plan = buildSemanticTopBandHourMarkers(eff, { referenceNowMs: REF_MS });
    const spec = hourMarkerRepresentationSpecForTopBandEffectiveSelection({
      kind: "glyph",
      glyphMode: "radialLine",
      sizeMultiplier: 1,
    });

    for (const inst of plan.instances) {
      const h = inst.structuralHour0To23;
      const lon = structuralColumnCenterLongitudeDeg(h);
      const expected = solarLocalWallClockStateFromUtcMs(REF_MS, lon);
      expect(inst.content.kind).toBe("localWallClock");
      if (inst.content.kind !== "localWallClock") {
        continue;
      }
      expect(inst.content.wallClock.continuousHour0To24).toBeCloseTo(expected.continuousHour0To24, 10);

      const g = createHourMarkerGlyph(
        {
          structuralHour0To23: h,
          displayLabel: "00",
          continuousHour0To24: inst.content.wallClock.continuousHour0To24,
        },
        spec,
      );
      expect(g.kind).toBe("radialLine");
      if (g.kind === "radialLine") {
        expect(g.hour).toBeCloseTo(expected.continuousHour0To24, 10);
        expect(hourToTheta(g.hour)).toBeCloseTo(hourToTheta(expected.continuousHour0To24), 10);
      }
    }

    const effWedge = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          realization: { kind: "radialWedge", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect(effWedge.behavior).toBe("staticZoneAnchored");
    const planW = buildSemanticTopBandHourMarkers(effWedge, { referenceNowMs: REF_MS });
    const specW = hourMarkerRepresentationSpecForTopBandEffectiveSelection({
      kind: "glyph",
      glyphMode: "radialWedge",
      sizeMultiplier: 1,
    });
    for (const inst of planW.instances) {
      const h = inst.structuralHour0To23;
      const lon = structuralColumnCenterLongitudeDeg(h);
      const expected = solarLocalWallClockStateFromUtcMs(REF_MS, lon);
      expect(inst.content.kind).toBe("localWallClock");
      if (inst.content.kind !== "localWallClock") {
        continue;
      }
      const g = createHourMarkerGlyph(
        {
          structuralHour0To23: h,
          displayLabel: "00",
          continuousHour0To24: inst.content.wallClock.continuousHour0To24,
        },
        specW,
      );
      expect(g.kind).toBe("radialWedge");
      if (g.kind === "radialWedge") {
        expect(g.hour).toBeCloseTo(expected.continuousHour0To24, 10);
      }
    }
  });

  it("radial procedural angle matches analog clock hour-hand angle for the same column and reference instant", () => {
    const ref = REF_MS;
    const effAnalog = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          realization: { kind: "analogClock", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    const effRadial = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          realization: { kind: "radialLine", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    const analogPlan = buildSemanticTopBandHourMarkers(effAnalog, { referenceNowMs: ref });
    const radialPlan = buildSemanticTopBandHourMarkers(effRadial, { referenceNowMs: ref });
    const spec = hourMarkerRepresentationSpecForTopBandEffectiveSelection({
      kind: "glyph",
      glyphMode: "radialLine",
      sizeMultiplier: 1,
    });

    for (let h = 0; h < 24; h += 1) {
      const a = analogPlan.instances[h]!;
      const r = radialPlan.instances[h]!;
      expect(a.content.kind).toBe("localWallClock");
      expect(r.content.kind).toBe("localWallClock");
      if (a.content.kind !== "localWallClock" || r.content.kind !== "localWallClock") {
        continue;
      }
      expect(a.content.wallClock.continuousHour0To24).toBeCloseTo(r.content.wallClock.continuousHour0To24, 10);
      const rg = createHourMarkerGlyph(
        {
          structuralHour0To23: h,
          displayLabel: "00",
          continuousHour0To24: r.content.wallClock.continuousHour0To24,
        },
        spec,
      );
      expect(rg.kind).toBe("radialLine");
      if (rg.kind !== "radialLine") {
        continue;
      }
      const analogHourHandTheta = hourToTheta(a.content.wallClock.continuousHour0To24 % 24);
      const radialTheta = hourToTheta(rg.hour % 24);
      expect(radialTheta).toBeCloseTo(analogHourHandTheta, 10);
    }
  });

  it("authored tapeAdvected and explicit staticZoneAnchored agree on procedural semantic wall-clock state (both resolve to static)", () => {
    const effTape = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          behavior: "tapeAdvected",
          realization: { kind: "radialLine", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    const effStatic = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          behavior: "staticZoneAnchored",
          realization: { kind: "radialLine", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    const p1 = buildSemanticTopBandHourMarkers(effTape, { referenceNowMs: REF_MS });
    const p2 = buildSemanticTopBandHourMarkers(effStatic, { referenceNowMs: REF_MS });
    for (let h = 0; h < 24; h += 1) {
      const t = p1.instances[h]!.content;
      const s = p2.instances[h]!.content;
      expect(t.kind).toBe("localWallClock");
      expect(s.kind).toBe("localWallClock");
      if (t.kind !== "localWallClock" || s.kind !== "localWallClock") {
        continue;
      }
      expect(t.wallClock.continuousHour0To24).toBeCloseTo(s.wallClock.continuousHour0To24, 10);
    }
  });

  it("procedural radialLine uses structural-column longitudes when product supplies wall-clock overrides (authored tapeAdvected ignored at effective layer)", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          behavior: "tapeAdvected",
          realization: { kind: "radialLine", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect(eff.behavior).toBe("staticZoneAnchored");
    const w = 2400;
    const cx = 317.5;
    const markers = Array.from({ length: 24 }, (_, h) => ({
      centerX: h === 7 ? cx : h * 10,
      structuralHour0To23: h,
    }));
    const wallLon = wallClockLongitudeDegForStructuralHourMarkers(eff.behavior, markers, w);
    expect(wallLon[7]).toBeCloseTo(structuralColumnCenterLongitudeDeg(7), 10);
    expect(wallLon[7]).not.toBeCloseTo(longitudeDegFromMapX(cx, w), 3);
    const plan = buildSemanticTopBandHourMarkers(eff, {
      referenceNowMs: REF_MS,
      wallClockLongitudeDegByStructuralHour: wallLon,
    });
    const expected = solarLocalWallClockStateFromUtcMs(REF_MS, wallLon[7]!);
    const inst = plan.instances[7]!;
    expect(inst.content.kind).toBe("localWallClock");
    if (inst.content.kind === "localWallClock") {
      expect(inst.content.wallClock.continuousHour0To24).toBeCloseTo(expected.continuousHour0To24, 10);
      expect(inst.content.wallClock.continuousMinute0To60).toBeCloseTo(expected.continuousMinute0To60, 10);
    }
  });

  it("unset behavior defaults to staticZoneAnchored for analogClock, radialLine, and radialWedge", () => {
    const kinds = [
      { kind: "analogClock" as const, realization: { kind: "analogClock" as const, appearance: {} } },
      { kind: "radialLine" as const, realization: { kind: "radialLine" as const, appearance: {} } },
      { kind: "radialWedge" as const, realization: { kind: "radialWedge" as const, appearance: {} } },
    ];
    for (const { realization } of kinds) {
      const eff = resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            realization,
            layout: { sizeMultiplier: 1 },
          },
        }),
      );
      expect(eff.behavior).toBe("staticZoneAnchored");
    }
  });

  it("authored tapeAdvected on radialLine does not change effective behavior", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          behavior: "tapeAdvected",
          realization: { kind: "radialLine", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect(eff.behavior).toBe("staticZoneAnchored");
  });
});
