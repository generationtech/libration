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
  alignBottomStackTimeBodiesToColonColumn,
  estimateBottomHudLatinInkWidthPx,
  maxBottomStackLabelColumnInkWidthPx,
} from "./bottomStackTimeColumnLayout.ts";

describe("alignBottomStackTimeBodiesToColonColumn", () => {
  it("no-ops for a single body", () => {
    expect(alignBottomStackTimeBodiesToColonColumn(["14:05:06"], 16)).toEqual(["14:05:06"]);
  });

  it("pads prefix ink so colons share a vertical column (string index may still differ)", () => {
    const fs = 16;
    const out = alignBottomStackTimeBodiesToColonColumn([" 7:05 PM", "22:04:05"], fs);
    const inkBeforeColon = out.map((s) => {
      const i = s.indexOf(":");
      return estimateBottomHudLatinInkWidthPx(s.slice(0, i), fs);
    });
    expect(inkBeforeColon[0]).toBeCloseTo(inkBeforeColon[1]!, 1);
  });
});

describe("maxBottomStackLabelColumnInkWidthPx", () => {
  it("ignores null labels", () => {
    expect(maxBottomStackLabelColumnInkWidthPx([null, "UTC"], 14)).toBeGreaterThan(0);
  });
});

describe("estimateBottomHudLatinInkWidthPx", () => {
  it("is deterministic for the same input", () => {
    const a = estimateBottomHudLatinInkWidthPx("UTC", 14);
    const b = estimateBottomHudLatinInkWidthPx("UTC", 14);
    expect(a).toBe(b);
  });
});
