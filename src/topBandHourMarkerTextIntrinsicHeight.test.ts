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
import { defaultFontAssetRegistry } from "./typography/fontAssetRegistry.ts";
import { resolveTypographyRole } from "./typography/typographyResolver.ts";
import {
  nominalTextIntrinsicContentHeightPxFromResolvedStyle,
  resolveTopBandHourMarkerTextIntrinsicContentHeightPxFromTypography,
  resolveTopBandHourMarkerTextResolvedStyleForLayout,
} from "./topBandHourMarkerTextIntrinsicHeight.ts";

describe("resolveTopBandHourMarkerTextIntrinsicContentHeightPxFromTypography", () => {
  it("uses lineHeightPx from the resolved role when present", () => {
    const style = resolveTypographyRole("chromeDenseMono", { fontSizePx: 12 });
    expect(nominalTextIntrinsicContentHeightPxFromResolvedStyle(style)).toBe(14);
  });

  it("uses nominal em scaling when lineHeightPx is absent", () => {
    const style = resolveTopBandHourMarkerTextResolvedStyleForLayout({
      fontRegistry: defaultFontAssetRegistry,
      selection: { kind: "text", fontAssetId: undefined, sizeMultiplier: 1 },
      markerLayoutBoxSizePx: 18,
    });
    expect(nominalTextIntrinsicContentHeightPxFromResolvedStyle(style)).toBeCloseTo(18, 10);
    expect(
      resolveTopBandHourMarkerTextIntrinsicContentHeightPxFromTypography({
        fontRegistry: defaultFontAssetRegistry,
        selection: { kind: "text", fontAssetId: undefined, sizeMultiplier: 1 },
        markerLayoutBoxSizePx: 18,
      }),
    ).toBeCloseTo(18, 10);
  });
});
