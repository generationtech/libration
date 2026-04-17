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
  computeHourMarkerContentRowVerticalMetrics,
  defaultHourMarkerContentRowPaddingPx,
  HOUR_MARKER_AUTO_CONTENT_ROW_PADDING_FRAC_OF_INTRINSIC_PER_SIDE,
  resolveHourMarkerContentRowPaddingPx,
  resolveHourMarkerDiskRowIntrinsicContentHeightPx,
} from "./topBandHourMarkerContentRowVerticalMetrics.ts";

describe("computeHourMarkerContentRowVerticalMetrics", () => {
  it("sums padding + intrinsic into allocated height and places center at intrinsic mid by default", () => {
    const m = computeHourMarkerContentRowVerticalMetrics({
      intrinsicContentHeightPx: 10,
      contentPaddingTopPx: 2,
      contentPaddingBottomPx: 3,
    });
    expect(m.allocatedContentRowHeightPx).toBe(15);
    expect(m.contentCenterYFromRowTopPx).toBeCloseTo(7, 10);
    expect(m.intrinsicContentHeightPx).toBe(10);
    expect(m.contentPaddingTopPx).toBe(2);
    expect(m.contentPaddingBottomPx).toBe(3);
  });

  it("applies contentCenterYOffsetFromIntrinsicMidPx to the emission center", () => {
    const m = computeHourMarkerContentRowVerticalMetrics({
      intrinsicContentHeightPx: 20,
      contentPaddingTopPx: 4,
      contentPaddingBottomPx: 6,
      contentCenterYOffsetFromIntrinsicMidPx: -1.25,
    });
    expect(m.allocatedContentRowHeightPx).toBe(30);
    expect(m.contentCenterYFromRowTopPx).toBeCloseTo(4 + 10 - 1.25, 10);
  });
});

describe("resolveHourMarkerContentRowPaddingPx", () => {
  it("uses symmetric intrinsic-proportional padding when both sides are omitted", () => {
    const h = 32;
    const p = h * HOUR_MARKER_AUTO_CONTENT_ROW_PADDING_FRAC_OF_INTRINSIC_PER_SIDE;
    expect(
      resolveHourMarkerContentRowPaddingPx({
        layout: { sizeMultiplier: 1 },
        intrinsicContentHeightPx: h,
      }),
    ).toEqual({ contentPaddingTopPx: p, contentPaddingBottomPx: p });
  });

  it("uses explicit values when both sides are set (clamped to authoring bounds)", () => {
    expect(
      resolveHourMarkerContentRowPaddingPx({
        layout: { sizeMultiplier: 1, contentPaddingTopPx: 9, contentPaddingBottomPx: -1 },
        intrinsicContentHeightPx: 32,
      }),
    ).toEqual({ contentPaddingTopPx: 9, contentPaddingBottomPx: -1 });
  });

  it("uses explicit top and intrinsic-proportional bottom when only top is set", () => {
    const h = 30;
    const pb = h * HOUR_MARKER_AUTO_CONTENT_ROW_PADDING_FRAC_OF_INTRINSIC_PER_SIDE;
    expect(
      resolveHourMarkerContentRowPaddingPx({
        layout: { sizeMultiplier: 1, contentPaddingTopPx: 3 },
        intrinsicContentHeightPx: h,
      }),
    ).toEqual({ contentPaddingTopPx: 3, contentPaddingBottomPx: pb });
  });

  it("uses intrinsic-proportional top and explicit bottom when only bottom is set", () => {
    const h = 30;
    const pt = h * HOUR_MARKER_AUTO_CONTENT_ROW_PADDING_FRAC_OF_INTRINSIC_PER_SIDE;
    expect(
      resolveHourMarkerContentRowPaddingPx({
        layout: { sizeMultiplier: 1, contentPaddingBottomPx: 5 },
        intrinsicContentHeightPx: h,
      }),
    ).toEqual({ contentPaddingTopPx: pt, contentPaddingBottomPx: 5 });
  });

  it("clamps an oversized explicit top; auto bottom stays intrinsic-proportional", () => {
    const h = 30;
    const pb = h * HOUR_MARKER_AUTO_CONTENT_ROW_PADDING_FRAC_OF_INTRINSIC_PER_SIDE;
    expect(
      resolveHourMarkerContentRowPaddingPx({
        layout: { sizeMultiplier: 1, contentPaddingTopPx: 100 },
        intrinsicContentHeightPx: h,
      }),
    ).toEqual({ contentPaddingTopPx: 48, contentPaddingBottomPx: pb });
  });
});

describe("defaultHourMarkerContentRowPaddingPx", () => {
  it("mirrors symmetric auto padding from intrinsic height", () => {
    const h = 10;
    const p = h * HOUR_MARKER_AUTO_CONTENT_ROW_PADDING_FRAC_OF_INTRINSIC_PER_SIDE;
    expect(defaultHourMarkerContentRowPaddingPx({ intrinsicContentHeightPx: h })).toEqual({
      contentPaddingTopPx: p,
      contentPaddingBottomPx: p,
    });
  });
});

describe("resolveHourMarkerDiskRowIntrinsicContentHeightPx", () => {
  it("uses head diameter as glyph disk-row intrinsic height", () => {
    expect(resolveHourMarkerDiskRowIntrinsicContentHeightPx({ headDiameterPx: 22.5 })).toBe(22.5);
  });
});

