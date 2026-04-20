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
import { createHourMarkerGlyph } from "../glyphs/glyphFactory.ts";
import { hourToTheta } from "../glyphs/glyphGeometry.ts";
import { normalizeDisplayChromeLayout } from "./v2/librationConfig.ts";
import { resolveEffectiveTopBandHourMarkers } from "./topBandHourMarkersResolver.ts";
import {
  buildSemanticTopBandHourMarkers,
  wallClockLongitudeDegForStructuralHourMarkers,
} from "./topBandHourMarkersSemanticPlan.ts";
import {
  anchoredTimezoneSegmentWallClockState,
  structuralColumnCenterLongitudeDeg,
} from "./topBandHourMarkersSemanticTypes.ts";
import { hourMarkerRepresentationSpecForTopBandEffectiveSelection } from "./topBandVisualPolicy.ts";

const ANCHORED = {
  referenceFractionalHour: 15.62,
  presentTimeStructuralHour0To23: 10,
} as const;

describe("top-band hour marker procedural time vs semantic wall clock (civil anchored)", () => {
  it("radialLine and radialWedge glyph hour matches anchored civil wall clock per structural column", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          realization: { kind: "radialLine", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect(eff.behavior).toBe("civilColumnAnchored");
    const plan = buildSemanticTopBandHourMarkers(eff, { anchoredTimezoneSegment: ANCHORED });
    const spec = hourMarkerRepresentationSpecForTopBandEffectiveSelection({
      kind: "glyph",
      glyphMode: "radialLine",
      sizeMultiplier: 1,
    });

    for (const inst of plan.instances) {
      const h = inst.structuralHour0To23;
      const expected = anchoredTimezoneSegmentWallClockState(
        ANCHORED.referenceFractionalHour,
        h,
        ANCHORED.presentTimeStructuralHour0To23,
      );
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
    expect(effWedge.behavior).toBe("civilColumnAnchored");
    const planW = buildSemanticTopBandHourMarkers(effWedge, { anchoredTimezoneSegment: ANCHORED });
    const specW = hourMarkerRepresentationSpecForTopBandEffectiveSelection({
      kind: "glyph",
      glyphMode: "radialWedge",
      sizeMultiplier: 1,
    });
    for (const inst of planW.instances) {
      const h = inst.structuralHour0To23;
      const expected = anchoredTimezoneSegmentWallClockState(
        ANCHORED.referenceFractionalHour,
        h,
        ANCHORED.presentTimeStructuralHour0To23,
      );
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

  it("radial procedural angle matches analog clock hour-hand angle for the same column (same anchored civil basis)", () => {
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
    const analogPlan = buildSemanticTopBandHourMarkers(effAnalog, { anchoredTimezoneSegment: ANCHORED });
    const radialPlan = buildSemanticTopBandHourMarkers(effRadial, { anchoredTimezoneSegment: ANCHORED });
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

  it("wallClockLongitudeDegForStructuralHourMarkers uses structural column centers for civilColumnAnchored layout", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          realization: { kind: "radialLine", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect(eff.behavior).toBe("civilColumnAnchored");
    const w = 2400;
    const zoneX = Array.from({ length: 24 }, (_, h) => (h / 24) * w + w / 48);
    const markers = zoneX.map((centerX, h) => ({
      centerX,
      structuralHour0To23: h,
    }));
    const wallLon = wallClockLongitudeDegForStructuralHourMarkers(eff.behavior, markers, w, zoneX);
    expect(wallLon[7]).toBeCloseTo(longitudeDegFromMapX(zoneX[7]!, w), 10);
    expect(wallLon[7]).toBeCloseTo(structuralColumnCenterLongitudeDeg(7), 10);
  });

  it("analogClock, radialLine, and radialWedge resolve to civilColumnAnchored", () => {
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
      expect(eff.behavior).toBe("civilColumnAnchored");
    }
  });
});
