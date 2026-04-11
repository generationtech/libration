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
import { resolveDefaultHourMarkerRepresentationSpec } from "./hourMarkerRepresentationDefaults.ts";

describe("resolveDefaultHourMarkerRepresentationSpec", () => {
  it("geometric → chromeHourPrimary + topBandHourDefault", () => {
    const s = resolveDefaultHourMarkerRepresentationSpec("geometric");
    expect(s.mode).toBe("geometric");
    expect(s.textRole).toBe("chromeHourPrimary");
    expect(s.glyphStyleId).toBe("topBandHourDefault");
  });

  it("analogClock → analogClock mode + analog clock style id", () => {
    const s = resolveDefaultHourMarkerRepresentationSpec("analogClock");
    expect(s.mode).toBe("analogClock");
    expect(s.textRole).toBe("chromeHourPrimary");
    expect(s.glyphStyleId).toBe("topBandHourAnalogClock");
  });

  it("radialLine → radialLine + topBandHourDefault", () => {
    const s = resolveDefaultHourMarkerRepresentationSpec("radialLine");
    expect(s.mode).toBe("radialLine");
    expect(s.textRole).toBe("chromeHourPrimary");
    expect(s.glyphStyleId).toBe("topBandHourDefault");
  });

  it("radialWedge → radialWedge + topBandHourDefault", () => {
    const s = resolveDefaultHourMarkerRepresentationSpec("radialWedge");
    expect(s.mode).toBe("radialWedge");
    expect(s.textRole).toBe("chromeHourPrimary");
    expect(s.glyphStyleId).toBe("topBandHourDefault");
  });

  it("segment → chromeSegment + topBandHourSegment", () => {
    const s = resolveDefaultHourMarkerRepresentationSpec("segment");
    expect(s.mode).toBe("segment");
    expect(s.textRole).toBe("chromeSegment");
    expect(s.glyphStyleId).toBe("topBandHourSegment");
  });

  it("dotmatrix → chromeDotMatrix + topBandHourDotMatrix", () => {
    const s = resolveDefaultHourMarkerRepresentationSpec("dotmatrix");
    expect(s.mode).toBe("dotmatrix");
    expect(s.textRole).toBe("chromeDotMatrix");
    expect(s.glyphStyleId).toBe("topBandHourDotMatrix");
  });

  it("terminal → chromeDenseMono + topBandHourTerminal", () => {
    const s = resolveDefaultHourMarkerRepresentationSpec("terminal");
    expect(s.mode).toBe("terminal");
    expect(s.textRole).toBe("chromeDenseMono");
    expect(s.glyphStyleId).toBe("topBandHourTerminal");
  });
});
