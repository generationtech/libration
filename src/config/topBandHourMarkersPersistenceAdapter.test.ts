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

  it("returns default when realization is missing", () => {
    expect(normalizeHourMarkersInput({})).toEqual(cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG));
  });

  it("legacy customRepresentationEnabled is ignored; structured realization wins", () => {
    expect(
      normalizeHourMarkersInput({
        customRepresentationEnabled: false,
        realization: { kind: "text", fontAssetId: "flip-clock", appearance: {} },
        layout: { sizeMultiplier: 1.5 },
      }),
    ).toEqual({
      realization: { kind: "text", fontAssetId: "flip-clock", appearance: {} },
      layout: { sizeMultiplier: 1.5 },
    });
  });

  it("structured text: clamps size, trims appearance.color, keeps known font ids", () => {
    expect(
      normalizeHourMarkersInput({
        realization: { kind: "text", fontAssetId: "computer", appearance: { color: "  #abc  " } },
        layout: { sizeMultiplier: 3 },
      }),
    ).toEqual({
      realization: { kind: "text", fontAssetId: "computer", appearance: { color: "#abc" } },
      layout: { sizeMultiplier: 2 },
    });
  });

  it("glyph realization: clamps size; ignores legacy top-level color", () => {
    expect(
      normalizeHourMarkersInput({
        realization: { kind: "radialWedge", color: "#fff" },
        layout: { sizeMultiplier: 0.25 },
      }),
    ).toEqual({
      realization: { kind: "radialWedge", appearance: {} },
      layout: { sizeMultiplier: 0.5 },
    });
  });

  it("glyph: accepts and trims appearance fields per kind", () => {
    expect(
      normalizeHourMarkersInput({
        realization: {
          kind: "radialLine",
          color: "#111",
          appearance: { lineColor: "  #aabbcc  " },
        },
        layout: { sizeMultiplier: 1 },
      }).realization,
    ).toEqual({
      kind: "radialLine",
      appearance: { lineColor: "#aabbcc" },
    });

    expect(
      normalizeHourMarkersInput({
        realization: {
          kind: "analogClock",
          appearance: { handColor: "#010101", faceColor: "#020202" },
        },
        layout: { sizeMultiplier: 1 },
      }).realization,
    ).toEqual({
      kind: "analogClock",
      appearance: { handColor: "#010101", faceColor: "#020202" },
    });

    expect(
      normalizeHourMarkersInput({
        realization: {
          kind: "radialWedge",
          appearance: { fillColor: "#030303" },
        },
        layout: { sizeMultiplier: 1 },
      }).realization,
    ).toEqual({
      kind: "radialWedge",
      appearance: { fillColor: "#030303" },
    });
  });

  it("unknown text font id falls back to default bundled font", () => {
    expect(
      normalizeHourMarkersInput({
        realization: { kind: "text", fontAssetId: "not-a-font" },
        layout: { sizeMultiplier: 1 },
      }).realization,
    ).toEqual({ kind: "text", fontAssetId: "zeroes-one", appearance: {} });
  });

  it("invalid custom realization kind returns default hour markers", () => {
    expect(
      normalizeHourMarkersInput({
        realization: { kind: "bogus" },
        layout: { sizeMultiplier: 1 },
      }),
    ).toEqual(cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG));
  });

  it("preserves valid behavior and drops invalid behavior", () => {
    expect(
      normalizeHourMarkersInput({
        behavior: "tapeAdvected",
        realization: { kind: "text", fontAssetId: "zeroes-one" },
        layout: { sizeMultiplier: 1 },
      }),
    ).toMatchObject({ behavior: "tapeAdvected" });

    expect(
      normalizeHourMarkersInput({
        behavior: "bogus",
        realization: { kind: "text", fontAssetId: "zeroes-one" },
        layout: { sizeMultiplier: 1 },
      }).behavior,
    ).toBeUndefined();
  });

  it("normalizes and clamps hour-marker content-row padding fields", () => {
    expect(
      normalizeHourMarkersInput({
        realization: { kind: "text", fontAssetId: "zeroes-one", appearance: {} },
        layout: { sizeMultiplier: 1, contentPaddingTopPx: 3.5, contentPaddingBottomPx: -2 },
      }).layout,
    ).toEqual({
      sizeMultiplier: 1,
      contentPaddingTopPx: 3.5,
      contentPaddingBottomPx: -2,
    });

    expect(
      normalizeHourMarkersInput({
        realization: { kind: "text", fontAssetId: "zeroes-one", appearance: {} },
        layout: { sizeMultiplier: 1, contentPaddingTopPx: 999 },
      }).layout.contentPaddingTopPx,
    ).toBe(48);

    expect(
      normalizeHourMarkersInput({
        realization: { kind: "text", fontAssetId: "zeroes-one", appearance: {} },
        layout: { sizeMultiplier: 1, textTopMarginPx: 4, textBottomMarginPx: -5 },
      }).layout,
    ).toEqual({
      sizeMultiplier: 1,
      contentPaddingTopPx: 4,
      contentPaddingBottomPx: -5,
    });
  });
});
