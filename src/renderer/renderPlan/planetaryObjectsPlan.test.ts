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
import { DEFAULT_PLANETARY_OBJECTS_PRESENTATION } from "../../core/planetaryObjectsPresentation";
import { PLANETARY_OBJECTS_KIND, type PlanetaryObjectsPayload } from "../../layers/planetaryObjectsPayload";
import { buildPlanetaryObjectsRenderPlan } from "./planetaryObjectsPlan";

function payload(partial: Partial<PlanetaryObjectsPayload> = {}): PlanetaryObjectsPayload {
  return {
    kind: PLANETARY_OBJECTS_KIND,
    supported: true,
    presentation: DEFAULT_PLANETARY_OBJECTS_PRESENTATION,
    bodies: [],
    ...partial,
  };
}

describe("buildPlanetaryObjectsRenderPlan", () => {
  it("emits nothing when unsupported", () => {
    const plan = buildPlanetaryObjectsRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({ supported: false }),
    });
    expect(plan.items).toHaveLength(0);
  });

  it("does not emit a world-spanning line across the dateline for a locus", () => {
    const plan = buildPlanetaryObjectsRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        bodies: [
          {
            id: "mars",
            displayName: "Mars",
            color: "#c45c4a",
            current: { latDeg: 10, lonDeg: 175 },
            trackPast: [],
            trackFuture: [],
            locus: [
              { latDeg: 10, lonDeg: 170 },
              { latDeg: 12, lonDeg: 176 },
              { latDeg: 11, lonDeg: -178 },
              { latDeg: 9, lonDeg: -170 },
            ],
            showCurrent: false,
            showLabel: false,
            showTrack: false,
            showLocus: true,
          },
        ],
      }),
    });
    const lines = plan.items.filter((item) => item.kind === "line");
    expect(lines.length).toBeGreaterThan(0);
    for (const item of lines) {
      if (item.kind !== "line") {
        continue;
      }
      expect(Math.abs(item.x2 - item.x1)).toBeLessThan(180);
    }
  });

  it("draws glyphs after loci and tracks", () => {
    const plan = buildPlanetaryObjectsRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        bodies: [
          {
            id: "mars",
            displayName: "Mars",
            color: "#c45c4a",
            current: { latDeg: 10, lonDeg: 20 },
            trackPast: [{ latDeg: 10, lonDeg: 10 }],
            trackFuture: [{ latDeg: 10, lonDeg: 30 }],
            locus: [
              { latDeg: 8, lonDeg: 15 },
              { latDeg: 12, lonDeg: 25 },
            ],
            showCurrent: true,
            showLabel: true,
            showTrack: true,
            showLocus: true,
          },
        ],
      }),
    });
    const kinds = plan.items.map((item) => item.kind);
    const firstLine = kinds.indexOf("line");
    const firstPath = kinds.findIndex((k) => k === "path2d");
    const firstText = kinds.indexOf("text");
    expect(firstLine).toBeGreaterThanOrEqual(0);
    expect(firstPath).toBeGreaterThan(firstLine);
    expect(firstText).toBeGreaterThan(firstPath);
  });

  it("keeps polar glyphs finite", () => {
    const plan = buildPlanetaryObjectsRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        bodies: [
          {
            id: "uranus",
            displayName: "Uranus",
            color: "#7ec8c8",
            current: { latDeg: 89.2, lonDeg: 40 },
            trackPast: [],
            trackFuture: [],
            locus: [],
            showCurrent: true,
            showLabel: true,
            showTrack: false,
            showLocus: false,
          },
        ],
      }),
    });
    expect(plan.items.length).toBeGreaterThan(0);
    for (const item of plan.items) {
      if (item.kind === "path2d" && item.pathKind === "descriptor") {
        for (const cmd of item.pathDescriptor.commands) {
          if ("x" in cmd) {
            expect(Number.isFinite(cmd.x)).toBe(true);
          }
          if ("y" in cmd) {
            expect(Number.isFinite(cmd.y)).toBe(true);
          }
        }
      }
    }
  });
});
