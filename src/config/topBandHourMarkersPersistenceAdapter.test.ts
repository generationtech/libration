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
import { cloneHourMarkersConfig, DEFAULT_HOUR_MARKERS_CONFIG } from "./appConfig.ts";
import { normalizeHourMarkersInput } from "./topBandHourMarkersPersistenceAdapter.ts";

describe("normalizeHourMarkersInput", () => {
  it("returns default for undefined, null, or non-object", () => {
    expect(normalizeHourMarkersInput(undefined)).toEqual(cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG));
    expect(normalizeHourMarkersInput(null)).toEqual(cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG));
    expect(normalizeHourMarkersInput("x")).toEqual(cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG));
  });

  it("returns default when customRepresentationEnabled is missing", () => {
    expect(normalizeHourMarkersInput({})).toEqual(cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG));
  });

  it("custom off: canonical default font and size from layout", () => {
    expect(
      normalizeHourMarkersInput({
        customRepresentationEnabled: false,
        realization: { kind: "text", fontAssetId: "flip-clock" },
        layout: { sizeMultiplier: 1.5 },
      }),
    ).toEqual({
      customRepresentationEnabled: false,
      realization: { kind: "text", fontAssetId: "zeroes-one" },
      layout: { sizeMultiplier: 1.5 },
    });
  });

  it("custom on text: clamps size, trims color, keeps known font ids", () => {
    expect(
      normalizeHourMarkersInput({
        customRepresentationEnabled: true,
        realization: { kind: "text", fontAssetId: "computer", color: "  #abc  " },
        layout: { sizeMultiplier: 3 },
      }),
    ).toEqual({
      customRepresentationEnabled: true,
      realization: { kind: "text", fontAssetId: "computer", color: "#abc" },
      layout: { sizeMultiplier: 2 },
    });
  });

  it("custom on glyph: clamps size and preserves color", () => {
    expect(
      normalizeHourMarkersInput({
        customRepresentationEnabled: true,
        realization: { kind: "radialWedge", color: "#fff" },
        layout: { sizeMultiplier: 0.25 },
      }),
    ).toEqual({
      customRepresentationEnabled: true,
      realization: { kind: "radialWedge", color: "#fff" },
      layout: { sizeMultiplier: 0.5 },
    });
  });

  it("unknown text font id falls back to default bundled font", () => {
    expect(
      normalizeHourMarkersInput({
        customRepresentationEnabled: true,
        realization: { kind: "text", fontAssetId: "not-a-font" },
        layout: { sizeMultiplier: 1 },
      }).realization,
    ).toEqual({ kind: "text", fontAssetId: "zeroes-one" });
  });

  it("invalid custom realization kind returns default hour markers", () => {
    expect(
      normalizeHourMarkersInput({
        customRepresentationEnabled: true,
        realization: { kind: "bogus" },
        layout: { sizeMultiplier: 1 },
      }),
    ).toEqual(cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG));
  });

  it("preserves valid behavior and drops invalid behavior", () => {
    expect(
      normalizeHourMarkersInput({
        customRepresentationEnabled: true,
        behavior: "tapeAdvected",
        realization: { kind: "text", fontAssetId: "zeroes-one" },
        layout: { sizeMultiplier: 1 },
      }),
    ).toMatchObject({ behavior: "tapeAdvected" });

    expect(
      normalizeHourMarkersInput({
        customRepresentationEnabled: true,
        behavior: "bogus",
        realization: { kind: "text", fontAssetId: "zeroes-one" },
        layout: { sizeMultiplier: 1 },
      }).behavior,
    ).toBeUndefined();
  });
});
