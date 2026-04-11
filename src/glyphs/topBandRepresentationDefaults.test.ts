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
import {
  resolveTopBandAnnotationSpec,
  resolveTopBandHourNumeralSpec,
} from "./topBandRepresentationDefaults.ts";

describe("topBandRepresentationDefaults", () => {
  it("resolves upper hour numeral to chromeHourEmphasis + upper chrome glyph style", () => {
    const s = resolveTopBandHourNumeralSpec();
    expect(s.mode).toBe("geometric");
    expect(s.textRole).toBe("chromeHourEmphasis");
    expect(s.glyphStyleId).toBe("topBandChromeUpperNumeral");
  });

  it("resolves noon/midnight annotation to chromeZoneLabel + annotation chrome glyph style", () => {
    const s = resolveTopBandAnnotationSpec("noon");
    expect(s.mode).toBe("geometric");
    expect(s.textRole).toBe("chromeZoneLabel");
    expect(s.glyphStyleId).toBe("topBandChromeAnnotation");
    expect(resolveTopBandAnnotationSpec("midnight").textRole).toBe("chromeZoneLabel");
  });
});
