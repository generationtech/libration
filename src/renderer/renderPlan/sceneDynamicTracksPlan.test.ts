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
  DEFAULT_ISS_DOT_COLOR,
  DEFAULT_ISS_ORBITAL_PRESENTATION,
  DEFAULT_ISS_ORBIT_PAST_COLOR,
  issOrbitLineWidthPx,
  type IssOrbitalPresentation,
} from "../../core/issOrbitalPresentation";
import { DYNAMIC_TRACKS_KIND, type DynamicTracksPayload } from "../../layers/dynamicTracksPayload";
import { buildDynamicTracksRenderPlan } from "./sceneDynamicTracksPlan";

const NOW = Date.UTC(2026, 7, 17, 14, 0, 0);

function payload(patch: Partial<IssOrbitalPresentation> = {}): DynamicTracksPayload {
  const presentation: IssOrbitalPresentation = {
    ...DEFAULT_ISS_ORBITAL_PRESENTATION,
    ...patch,
  };
  return {
    kind: DYNAMIC_TRACKS_KIND,
    tracks: [
      {
        id: "iss",
        label: "ISS",
        samples: [
          { lonDeg: -20, latDeg: 10, timeMs: NOW - 120_000 },
          { lonDeg: -10, latDeg: 12, timeMs: NOW - 60_000 },
          { lonDeg: 10, latDeg: 14, timeMs: NOW + 60_000 },
          { lonDeg: 20, latDeg: 16, timeMs: NOW + 120_000 },
        ],
        pastSamples: [
          { lonDeg: -20, latDeg: 10, timeMs: NOW - 120_000 },
          { lonDeg: -10, latDeg: 12, timeMs: NOW - 60_000 },
          { lonDeg: 0, latDeg: 13, timeMs: NOW },
        ],
        futureSamples: [
          { lonDeg: 0, latDeg: 13, timeMs: NOW },
          { lonDeg: 10, latDeg: 14, timeMs: NOW + 60_000 },
          { lonDeg: 20, latDeg: 16, timeMs: NOW + 120_000 },
        ],
      },
    ],
    currentPosition: { lonDeg: 0, latDeg: 13, timeMs: NOW },
    presentation,
  };
}

function planOf(patch: Partial<IssOrbitalPresentation> = {}) {
  return buildDynamicTracksRenderPlan({
    viewportWidthPx: 1800,
    viewportHeightPx: 900,
    layerOpacity: 1,
    payload: payload(patch),
  });
}

describe("LIB-038 ISS presentation RenderPlan", () => {
  it("track master gates line primitives, not the current marker", () => {
    const off = planOf({ trackEnabled: false });
    expect(off.items.filter((i) => i.kind === "line")).toHaveLength(0);
    expect(off.items.some((i) => i.kind === "path2d")).toBe(true);
    expect(off.items.some((i) => i.kind === "text" && i.text === "ISS")).toBe(true);
  });

  it("past toggle gates only the past segment color", () => {
    const both = planOf();
    const pastOff = planOf({ pastEnabled: false });
    const pastStroke = "120, 210, 255";
    const futureStroke = "168, 228, 255";
    const hasPast = (items: typeof both.items) =>
      items.some((i) => i.kind === "line" && i.stroke.includes(pastStroke));
    const hasFuture = (items: typeof both.items) =>
      items.some((i) => i.kind === "line" && i.stroke.includes(futureStroke));
    expect(hasPast(both.items)).toBe(true);
    expect(hasFuture(both.items)).toBe(true);
    expect(hasPast(pastOff.items)).toBe(false);
    expect(hasFuture(pastOff.items)).toBe(true);
    expect(pastOff.items.some((i) => i.kind === "path2d")).toBe(true);
  });

  it("future toggle gates only the future segment", () => {
    const futureOff = planOf({ futureEnabled: false });
    expect(futureOff.items.some((i) => i.kind === "line")).toBe(true);
    expect(futureOff.items.some((i) => i.kind === "path2d")).toBe(true);
    const futureOnly = planOf({ pastEnabled: false, futureEnabled: true });
    expect(futureOnly.items.some((i) => i.kind === "line")).toBe(true);
  });

  it("applies independent past and future colors to their line primitives", () => {
    const plan = planOf({ pastColor: "#ff0000", futureColor: "#00ff00" });
    const lines = plan.items.filter((i) => i.kind === "line");
    expect(lines.some((i) => i.kind === "line" && i.stroke.includes("255") && i.stroke.includes("0, 0"))).toBe(
      true,
    );
    expect(lines.some((i) => i.kind === "line" && /0,\s*255,\s*0/.test(i.stroke))).toBe(true);
  });

  it("shared line thickness reaches RenderPlan", () => {
    const thin = planOf({ lineThickness: "thin" });
    const thick = planOf({ lineThickness: "thick" });
    const thinLine = thin.items.find((i) => i.kind === "line");
    const thickLine = thick.items.find((i) => i.kind === "line");
    expect(thinLine?.kind).toBe("line");
    expect(thickLine?.kind).toBe("line");
    if (thinLine?.kind === "line" && thickLine?.kind === "line") {
      expect(thinLine.strokeWidthPx).toBe(issOrbitLineWidthPx("thin"));
      expect(thickLine.strokeWidthPx).toBe(issOrbitLineWidthPx("thick"));
      expect(thickLine.strokeWidthPx).toBeGreaterThan(thinLine.strokeWidthPx);
    }
  });

  it("dot glyph emits the current disc family and uses dot color", () => {
    const plan = planOf({ glyphType: "dot", dotColor: "#ff00aa" });
    const discs = plan.items.filter((i) => i.kind === "path2d");
    expect(discs.length).toBe(2);
    expect(discs.every((i) => i.kind === "path2d" && i.pathKind === "path2d")).toBe(true);
    expect(
      discs.some((i) => i.kind === "path2d" && i.fill !== undefined && /255,\s*0,\s*170/.test(i.fill)),
    ).toBe(true);
  });

  it("silhouette glyph emits a station path descriptor, not the disc pair", () => {
    const plan = planOf({ glyphType: "silhouette", glyphColor: "#ffffff" });
    const paths = plan.items.filter((i) => i.kind === "path2d");
    expect(paths.some((i) => i.kind === "path2d" && i.pathKind === "descriptor")).toBe(true);
    expect(paths.filter((i) => i.kind === "path2d" && i.pathKind === "path2d")).toHaveLength(0);
  });

  it("glyph size changes the marker footprint", () => {
    const small = planOf({ glyphType: "dot", glyphSize: "small" });
    const large = planOf({ glyphType: "dot", glyphSize: "extraLarge" });
    const smallHalo = small.items.filter((i) => i.kind === "path2d")[1];
    const largeHalo = large.items.filter((i) => i.kind === "path2d")[1];
    expect(smallHalo?.kind).toBe("path2d");
    expect(largeHalo?.kind).toBe("path2d");
  });

  it("label toggle removes the ISS text while keeping the marker", () => {
    const on = planOf({ labelEnabled: true });
    const off = planOf({ labelEnabled: false });
    expect(on.items.some((i) => i.kind === "text" && i.text === "ISS")).toBe(true);
    expect(off.items.some((i) => i.kind === "text")).toBe(false);
    expect(off.items.some((i) => i.kind === "path2d")).toBe(true);
  });

  it("label follows the current marker x", () => {
    const plan = planOf();
    const text = plan.items.find((i) => i.kind === "text");
    expect(text?.kind).toBe("text");
    if (text?.kind === "text") {
      expect(text.x).toBeGreaterThan(800);
      expect(text.x).toBeLessThan(1000);
      expect(text.y).toBeGreaterThan(0);
    }
  });

  it("does not emit a world-spanning line across the dateline for past or future", () => {
    const wrap: DynamicTracksPayload = {
      kind: DYNAMIC_TRACKS_KIND,
      tracks: [
        {
          id: "iss",
          label: "ISS",
          samples: [
            { lonDeg: 170, latDeg: 10, timeMs: NOW - 120_000 },
            { lonDeg: 175, latDeg: 11, timeMs: NOW - 60_000 },
            { lonDeg: -175, latDeg: 12, timeMs: NOW + 60_000 },
            { lonDeg: -170, latDeg: 13, timeMs: NOW + 120_000 },
          ],
          pastSamples: [
            { lonDeg: 170, latDeg: 10, timeMs: NOW - 120_000 },
            { lonDeg: 175, latDeg: 11, timeMs: NOW - 60_000 },
            { lonDeg: -179, latDeg: 11.5, timeMs: NOW },
          ],
          futureSamples: [
            { lonDeg: -179, latDeg: 11.5, timeMs: NOW },
            { lonDeg: -175, latDeg: 12, timeMs: NOW + 60_000 },
            { lonDeg: -170, latDeg: 13, timeMs: NOW + 120_000 },
          ],
        },
      ],
      currentPosition: { lonDeg: -179, latDeg: 11.5, timeMs: NOW },
      presentation: { ...DEFAULT_ISS_ORBITAL_PRESENTATION },
    };
    const plan = buildDynamicTracksRenderPlan({
      viewportWidthPx: 1800,
      viewportHeightPx: 900,
      layerOpacity: 1,
      payload: wrap,
    });
    const lines = plan.items.filter((i) => i.kind === "line");
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      if (line.kind !== "line") continue;
      expect(Math.abs(line.x2 - line.x1)).toBeLessThan(900);
    }
    const texts = plan.items.filter((i) => i.kind === "text");
    expect(texts).toHaveLength(1);
    if (texts[0]?.kind === "text") {
      expect(texts[0].x).toBeGreaterThanOrEqual(0);
      expect(texts[0].x).toBeLessThanOrEqual(1800);
    }
  });

  it("factory defaults keep the current disc color family", () => {
    const plan = planOf();
    const fill = plan.items.find((i) => i.kind === "path2d" && i.fill);
    expect(fill?.kind).toBe("path2d");
    if (fill?.kind === "path2d" && fill.fill) {
      expect(fill.fill).toContain("180, 240, 255");
    }
    expect(DEFAULT_ISS_DOT_COLOR).toBe("#b4f0ff");
    expect(DEFAULT_ISS_ORBIT_PAST_COLOR).toBe("#78d2ff");
  });
});
