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
import { TOP_CHROME_STYLE } from "../config/topChromeStyle.ts";
import {
  createHourGlyph,
  createHourMarkerGlyph,
  createTopBandAnnotationGlyph,
  createTopBandHourNumeralGlyph,
} from "./glyphFactory.ts";

describe("createHourGlyph", () => {
  it("maps geometric to TextGlyph with padded 24h numerals", () => {
    const g = createHourGlyph(7, "geometric");
    expect(g.kind).toBe("text");
    if (g.kind === "text") {
      expect(g.text).toBe("07");
      expect(g.role).toBe("chromeHourPrimary");
      expect(g.styleId).toBe("topBandHourDefault");
    }
  });

  it("maps analogClock to ClockFaceGlyph", () => {
    const g = createHourGlyph(14, "analogClock");
    expect(g.kind).toBe("clockFace");
    if (g.kind === "clockFace") {
      expect(g.hour).toBe(14);
      expect(g.showMinuteHand).toBe(false);
      expect(g.styleId).toBe("topBandHourAnalogClock");
    }
  });

  it("normalizes hour to 0–23", () => {
    const g = createHourGlyph(-5, "analogClock");
    expect(g.kind).toBe("clockFace");
    if (g.kind === "clockFace") {
      expect(g.hour).toBe(19);
    }
  });
});

describe("createHourMarkerGlyph", () => {
  it("uses displayLabel and role from spec for geometric", () => {
    const g = createHourMarkerGlyph(
      { structuralHour0To23: 9, displayLabel: "9" },
      { mode: "geometric", textRole: "chromeHourPrimary", glyphStyleId: "topBandHourDefault" },
    );
    expect(g.kind).toBe("text");
    if (g.kind === "text") {
      expect(g.text).toBe("9");
      expect(g.role).toBe("chromeHourPrimary");
      expect(g.styleId).toBe("topBandHourDefault");
    }
  });

  it("uses structural hour for analogClock", () => {
    const g = createHourMarkerGlyph(
      { structuralHour0To23: 22, displayLabel: "10" },
      { mode: "analogClock", textRole: "chromeHourPrimary", glyphStyleId: "topBandHourAnalogClock" },
    );
    expect(g.kind).toBe("clockFace");
    if (g.kind === "clockFace") {
      expect(g.hour).toBe(22);
      expect(g.styleId).toBe("topBandHourAnalogClock");
    }
  });

  it("segment is TextGlyph with representation spec role and style", () => {
    const g = createHourMarkerGlyph(
      { structuralHour0To23: 4, displayLabel: "4" },
      { mode: "segment", textRole: "chromeSegment", glyphStyleId: "topBandHourSegment" },
    );
    expect(g.kind).toBe("text");
    if (g.kind === "text") {
      expect(g.text).toBe("4");
      expect(g.role).toBe("chromeSegment");
      expect(g.styleId).toBe("topBandHourSegment");
    }
  });

  it("createHourGlyph(segment) uses defaults from resolveDefaultHourMarkerRepresentationSpec", () => {
    const g = createHourGlyph(4, "segment");
    expect(g.kind).toBe("text");
    if (g.kind === "text") {
      expect(g.text).toBe("04");
      expect(g.role).toBe("chromeSegment");
      expect(g.styleId).toBe("topBandHourSegment");
    }
  });

  it("createHourGlyph(dotmatrix) and terminal preserve TextGlyph + distinct roles", () => {
    const dm = createHourGlyph(11, "dotmatrix");
    expect(dm.kind).toBe("text");
    if (dm.kind === "text") {
      expect(dm.role).toBe("chromeDotMatrix");
      expect(dm.styleId).toBe("topBandHourDotMatrix");
    }
    const tr = createHourGlyph(2, "terminal");
    expect(tr.kind).toBe("text");
    if (tr.kind === "text") {
      expect(tr.role).toBe("chromeDenseMono");
      expect(tr.styleId).toBe("topBandHourTerminal");
    }
  });

  it("maps radialLine to RadialLineGlyph with structural hour when continuous wall-clock hour is omitted", () => {
    const g = createHourMarkerGlyph(
      { structuralHour0To23: 17, displayLabel: "5" },
      { mode: "radialLine", textRole: "chromeHourPrimary", glyphStyleId: "topBandHourDefault" },
    );
    expect(g.kind).toBe("radialLine");
    if (g.kind === "radialLine") {
      expect(g.hour).toBe(17);
      expect(g.styleId).toBe("topBandHourDefault");
    }
  });

  it("maps radialLine to RadialLineGlyph using continuousHour0To24 when provided", () => {
    const g = createHourMarkerGlyph(
      {
        structuralHour0To23: 5,
        displayLabel: "06",
        continuousHour0To24: 6.42,
      },
      { mode: "radialLine", textRole: "chromeHourPrimary", glyphStyleId: "topBandHourDefault" },
    );
    expect(g.kind).toBe("radialLine");
    if (g.kind === "radialLine") {
      expect(g.hour).toBeCloseTo(6.42, 5);
    }
  });

  it("maps radialWedge to RadialWedgeGlyph with structural hour", () => {
    const g = createHourMarkerGlyph(
      { structuralHour0To23: 2, displayLabel: "2" },
      { mode: "radialWedge", textRole: "chromeHourPrimary", glyphStyleId: "topBandHourDefault" },
    );
    expect(g.kind).toBe("radialWedge");
    if (g.kind === "radialWedge") {
      expect(g.hour).toBe(2);
      expect(g.styleId).toBe("topBandHourDefault");
    }
  });

  it("applies optional marker color to text fill and procedural colorOverride", () => {
    const text = createHourMarkerGlyph(
      { structuralHour0To23: 1, displayLabel: "01" },
      { mode: "geometric", textRole: "chromeHourPrimary", glyphStyleId: "topBandHourDefault" },
      undefined,
      "#c0ffee",
    );
    expect(text.kind).toBe("text");
    if (text.kind === "text") {
      expect(text.fill).toBe("#c0ffee");
    }
    const line = createHourMarkerGlyph(
      { structuralHour0To23: 3, displayLabel: "3" },
      { mode: "radialLine", textRole: "chromeHourPrimary", glyphStyleId: "topBandHourDefault" },
      undefined,
      "#ba5e",
    );
    expect(line.kind).toBe("radialLine");
    if (line.kind === "radialLine") {
      expect(line.colorOverride).toBe("#ba5e");
    }
    const wedge = createHourMarkerGlyph(
      { structuralHour0To23: 5, displayLabel: "5" },
      { mode: "radialWedge", textRole: "chromeHourPrimary", glyphStyleId: "topBandHourDefault" },
      undefined,
      "#facade",
      "rgba(0, 0, 0, 0.45)",
      "#face123",
    );
    expect(wedge.kind).toBe("radialWedge");
    if (wedge.kind === "radialWedge") {
      expect(wedge.colorOverride).toBe("#facade");
      expect(wedge.strokeColorOverride).toBe("rgba(0, 0, 0, 0.45)");
      expect(wedge.faceFillOverride).toBe("#face123");
    }

    const lineWithFace = createHourMarkerGlyph(
      { structuralHour0To23: 4, displayLabel: "4" },
      { mode: "radialLine", textRole: "chromeHourPrimary", glyphStyleId: "topBandHourDefault" },
      undefined,
      "#ba5e",
      undefined,
      "#diskface",
    );
    expect(lineWithFace.kind).toBe("radialLine");
    if (lineWithFace.kind === "radialLine") {
      expect(lineWithFace.faceFillOverride).toBe("#diskface");
    }
  });
});

describe("createHourGlyph radial modes", () => {
  it("radialLine uses createHourGlyph with padded label path unused at glyph level", () => {
    const g = createHourGlyph(8, "radialLine");
    expect(g.kind).toBe("radialLine");
    if (g.kind === "radialLine") {
      expect(g.hour).toBe(8);
    }
  });

  it("radialWedge normalizes hour", () => {
    const g = createHourGlyph(-2, "radialWedge");
    expect(g.kind).toBe("radialWedge");
    if (g.kind === "radialWedge") {
      expect(g.hour).toBe(22);
    }
  });
});

describe("createTopBandHourNumeralGlyph / createTopBandAnnotationGlyph", () => {
  it("produces TextGlyph with chromeHourEmphasis + chrome fill for upper row", () => {
    const g = createTopBandHourNumeralGlyph({ hour0To23: 11, label: "12" }, TOP_CHROME_STYLE);
    expect(g.kind).toBe("text");
    expect(g.text).toBe("12");
    expect(g.role).toBe("chromeHourEmphasis");
    expect(g.styleId).toBe("topBandChromeUpperNumeral");
    expect(g.fill).toBe(TOP_CHROME_STYLE.topHourNumeral.color);
  });

  it("produces TextGlyph with chromeZoneLabel for noon/midnight crown", () => {
    const g = createTopBandAnnotationGlyph({ kind: "midnight", label: "MIDNIGHT" }, TOP_CHROME_STYLE);
    expect(g.kind).toBe("text");
    expect(g.text).toBe("MIDNIGHT");
    expect(g.role).toBe("chromeZoneLabel");
    expect(g.styleId).toBe("topBandChromeAnnotation");
    expect(g.fill).toBe(TOP_CHROME_STYLE.markerAnnotation.color);
  });
});

