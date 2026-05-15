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
import { mergeCssFilterParts, overlayReadabilityCssFilterAppend } from "./overlayReadabilityRasterFilter";

describe("overlayReadabilityCssFilterAppend", () => {
  it("returns undefined for zero veil", () => {
    expect(overlayReadabilityCssFilterAppend(0)).toBeUndefined();
  });

  it("returns brightness/contrast fragment when veil is high", () => {
    const s = overlayReadabilityCssFilterAppend(1);
    expect(s).toContain("brightness(");
    expect(s).toContain("contrast(");
  });

  it("attenuates lift when liftScale01 is below 1", () => {
    const full = overlayReadabilityCssFilterAppend(1, { liftScale01: 1 })!;
    const weak = overlayReadabilityCssFilterAppend(1, { liftScale01: 0.35 })!;
    const mFull = full.match(/brightness\(([\d.]+)\)/);
    const mWeak = weak.match(/brightness\(([\d.]+)\)/);
    expect(mFull && mWeak).toBeTruthy();
    expect(Number(mWeak![1])).toBeLessThan(Number(mFull![1]));
  });
});

describe("mergeCssFilterParts", () => {
  it("joins two defined fragments", () => {
    expect(mergeCssFilterParts("brightness(1.1)", "contrast(1.05)")).toBe("brightness(1.1) contrast(1.05)");
  });

  it("returns single side when the other is undefined", () => {
    expect(mergeCssFilterParts("brightness(1.1)", undefined)).toBe("brightness(1.1)");
    expect(mergeCssFilterParts(undefined, "contrast(1.05)")).toBe("contrast(1.05)");
  });
});
