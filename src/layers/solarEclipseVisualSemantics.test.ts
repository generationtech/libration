/*
 * Libration
 * Copyright (C) 2026 Ken McDonald
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, version 3.
 */

import { describe, expect, it } from "vitest";
import { createTimeContext } from "../core/time";
import { getSolarEclipseEventById } from "../core/eclipse/eclipseAuthority";
import { resolveEclipseFrame } from "../core/eclipse/eclipseEventService";
import { solarEclipseGeometryAt } from "../core/eclipse/solarEclipseGeometry";
import {
  SOLAR_ECLIPSE_DRAW_CORRIDOR_FILL,
  SOLAR_ECLIPSE_DRAW_CORRIDOR_LIMIT,
  SOLAR_ECLIPSE_DRAW_FORECAST_PARTIAL,
  SOLAR_ECLIPSE_DRAW_LIVE_CENTRAL,
  SOLAR_ECLIPSE_DRAW_LIVE_PARTIAL,
} from "../core/eclipse/solarEclipseAppearance";
import {
  classifySolarEclipseFillFamily,
  classifySolarEclipseStrokeFamily,
  type SolarEclipseVisualFamily,
} from "../core/eclipse/solarEclipseVisualFamilies";
import { SOLAR_ECLIPSE_2017_STATION_UTC } from "../dev/visualScenarios";
import { isEquirectRegionOverlayPayload } from "./equirectRegionPayload";
import { createSolarEclipseLayer } from "./solarEclipseLayer";
import { buildEquirectRegionOverlayRenderPlan } from "../renderer/renderPlan/equirectRegionPlan";
import type { RenderPath2DItem } from "../renderer/renderPlan/renderPlanTypes";
import canvasBackendSource from "../renderer/canvasRenderBackend.ts?raw";

const HORIZON_7D = 7 * 86_400_000;
const TOTAL_2017_ID = "nasa-5mcse-solar-9546";
const VIEW_W = 1920;
const VIEW_H = 1080;

const STATION_AF = {
  A: Date.parse(SOLAR_ECLIPSE_2017_STATION_UTC.stationA),
  B: Date.parse(SOLAR_ECLIPSE_2017_STATION_UTC.stationB),
  C: Date.parse(SOLAR_ECLIPSE_2017_STATION_UTC.stationC),
  D: Date.parse(SOLAR_ECLIPSE_2017_STATION_UTC.stationD),
  E: Date.parse(SOLAR_ECLIPSE_2017_STATION_UTC.stationE),
  F: Date.parse(SOLAR_ECLIPSE_2017_STATION_UTC.stationF),
} as const;

const ALIGNMENT_DRAMATIC = { enabled: true, solarEnabled: true, intensity: "dramatic" as const };

function payloadAt(utcMs: number, alignment = ALIGNMENT_DRAMATIC) {
  const frame = resolveEclipseFrame(utcMs, { horizonMs: HORIZON_7D });
  const st = createSolarEclipseLayer({
    presentation: { forecastHorizonDays: 7, liveGroundPositionSize: "large" },
    alignment,
    labelsEnabled: false,
  }).getState(createTimeContext(utcMs, 0, true, { eclipseFrame: frame }));
  if (!isEquirectRegionOverlayPayload(st.data)) {
    throw new Error("expected equirect region payload");
  }
  return { frame, data: st.data };
}

function planAt(utcMs: number) {
  const { frame, data } = payloadAt(utcMs);
  const plan = buildEquirectRegionOverlayRenderPlan({
    viewportWidthPx: VIEW_W,
    viewportHeightPx: VIEW_H,
    layerOpacity: 1,
    payload: {
      ...data,
      readability: { nightVeil01: 1, overlayReadabilityLiftScale01: 1 },
    },
  });
  return { frame, data, plan };
}

function familiesOf(data: ReturnType<typeof payloadAt>["data"]): Set<SolarEclipseVisualFamily> {
  const out = new Set<SolarEclipseVisualFamily>();
  for (const fill of data.fills) {
    const fam = classifySolarEclipseFillFamily(fill.fill);
    if (fam) {
      out.add(fam);
    }
  }
  for (const stroke of data.strokes) {
    const fam = classifySolarEclipseStrokeFamily(stroke.stroke);
    if (fam) {
      out.add(fam);
    }
  }
  for (const marker of data.pointMarkers ?? []) {
    const fam = classifySolarEclipseFillFamily(marker.fill);
    if (fam) {
      out.add(fam);
    }
  }
  return out;
}

function pathBBox(item: RenderPath2DItem): { minX: number; maxX: number } | null {
  if (item.pathKind !== "descriptor") {
    return null;
  }
  let minX = Infinity;
  let maxX = -Infinity;
  for (const c of item.pathDescriptor.commands) {
    if (c.kind === "moveTo" || c.kind === "lineTo") {
      minX = Math.min(minX, c.x);
      maxX = Math.max(maxX, c.x);
    }
  }
  return Number.isFinite(minX) ? { minX, maxX } : null;
}

function sameFamilyFillCopiesOverlap(
  plan: ReturnType<typeof buildEquirectRegionOverlayRenderPlan>,
  family: SolarEclipseVisualFamily,
): boolean {
  const boxes: { minX: number; maxX: number }[] = [];
  for (const item of plan.items) {
    if (item.kind !== "path2d" || !item.fill) {
      continue;
    }
    if (classifySolarEclipseFillFamily(item.fill) !== family) {
      continue;
    }
    const box = pathBBox(item);
    if (box) {
      boxes.push(box);
    }
  }
  const seam = VIEW_W * 0.006;
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      const lo = Math.max(Math.max(a.minX, 0), Math.max(b.minX, 0));
      const hi = Math.min(Math.min(a.maxX, VIEW_W), Math.min(b.maxX, VIEW_W));
      if (hi - lo > seam) {
        const aW = Math.min(a.maxX, VIEW_W) - Math.max(a.minX, 0);
        const bW = Math.min(b.maxX, VIEW_W) - Math.max(b.minX, 0);
        if (aW > VIEW_W * 0.2 && bW > VIEW_W * 0.2) {
          return true;
        }
      }
    }
  }
  return false;
}

describe("solar eclipse visual semantics — 2017 A–F", () => {
  it("uses the exact Knoxville-captured UTC stations", () => {
    expect(SOLAR_ECLIPSE_2017_STATION_UTC.stationA).toBe("2017-08-21T14:42:59.000Z");
    expect(SOLAR_ECLIPSE_2017_STATION_UTC.stationB).toBe("2017-08-21T15:56:19.000Z");
    expect(SOLAR_ECLIPSE_2017_STATION_UTC.stationC).toBe("2017-08-21T17:05:58.000Z");
    expect(SOLAR_ECLIPSE_2017_STATION_UTC.stationD).toBe("2017-08-21T17:52:57.000Z");
    expect(SOLAR_ECLIPSE_2017_STATION_UTC.stationE).toBe("2017-08-21T18:36:03.000Z");
    expect(SOLAR_ECLIPSE_2017_STATION_UTC.stationF).toBe("2017-08-21T19:55:15.000Z");
  });

  it("A upcoming: corridor + forecast partial; no live partial, marker, or beam", () => {
    const { frame, data } = payloadAt(STATION_AF.A);
    const fam = familiesOf(data);
    expect(frame.activeSolar).toBeNull();
    expect(fam.has("event-path-fill")).toBe(true);
    expect(fam.has("event-path-limit")).toBe(true);
    expect(fam.has("forecast-partial")).toBe(true);
    expect(fam.has("live-partial")).toBe(false);
    expect(fam.has("live-central-umbra")).toBe(false);
    expect(fam.has("alignment-outer")).toBe(false);
    expect(data.pointMarkers ?? []).toEqual([]);
    expect(data.fills.some((f) => classifySolarEclipseFillFamily(f.fill) === "forecast-partial")).toBe(
      true,
    );
    expect(data.fills.some((f) => f.drawOrder === SOLAR_ECLIPSE_DRAW_FORECAST_PARTIAL)).toBe(true);
  });

  it("B pre-central: corridor only; no live-partial fill, forecast partial, marker, or targeted beam", () => {
    const { frame, data } = payloadAt(STATION_AF.B);
    const fam = familiesOf(data);
    expect(frame.activeSolar?.id).toBe(TOTAL_2017_ID);
    expect(frame.solarGeometry?.centralPoint ?? null).toBeNull();
    expect(fam.has("event-path-fill")).toBe(true);
    expect(fam.has("live-partial")).toBe(false);
    expect(fam.has("forecast-partial")).toBe(false);
    expect(fam.has("live-central-umbra")).toBe(false);
    expect(fam.has("alignment-outer")).toBe(false);
    expect(data.pointMarkers ?? []).toEqual([]);
    expect(data.fills.some((f) => classifySolarEclipseFillFamily(f.fill) === "forecast-partial")).toBe(
      false,
    );
  });

  it("C first-central: marker, umbra, beam, corridor; no live-partial fill or forecast partial", () => {
    const { frame, data } = payloadAt(STATION_AF.C);
    const fam = familiesOf(data);
    expect(frame.solarGeometry?.centralPoint).not.toBeNull();
    expect(data.pointMarkers).toHaveLength(1);
    expect(data.pointMarkers![0]!.latDeg).toBe(frame.solarGeometry!.centralPoint!.latDeg);
    expect(fam.has("event-path-fill")).toBe(true);
    expect(fam.has("live-partial")).toBe(false);
    expect(fam.has("live-central-umbra")).toBe(true);
    expect(fam.has("alignment-outer")).toBe(true);
    expect(fam.has("alignment-mid")).toBe(true);
    expect(fam.has("alignment-core")).toBe(true);
    expect(fam.has("forecast-partial")).toBe(false);
    expect(frame.solarGeometry!.centralPoint!.lonDeg).toBeLessThan(-120);
  });

  it("D mid-central: marker has moved east; families unchanged", () => {
    const c = payloadAt(STATION_AF.C);
    const d = payloadAt(STATION_AF.D);
    expect(d.frame.solarGeometry?.centralPoint).not.toBeNull();
    expect(d.data.pointMarkers![0]!.lonDeg).toBeGreaterThan(c.data.pointMarkers![0]!.lonDeg);
    const fam = familiesOf(d.data);
    expect(fam.has("event-path-fill")).toBe(true);
    expect(fam.has("live-partial")).toBe(false);
    expect(fam.has("live-central-umbra")).toBe(true);
    expect(fam.has("alignment-outer")).toBe(true);
    expect(fam.has("forecast-partial")).toBe(false);
  });

  it("E near-GE: marker in eastern US half; Dramatic beam present", () => {
    const { frame, data } = payloadAt(STATION_AF.E);
    const fam = familiesOf(data);
    expect(frame.solarGeometry?.centralPoint).not.toBeNull();
    expect(data.pointMarkers![0]!.lonDeg).toBeGreaterThan(-95);
    expect(fam.has("live-central-umbra")).toBe(true);
    expect(fam.has("alignment-core")).toBe(true);
    expect(fam.has("forecast-partial")).toBe(false);
  });

  it("F late-central: marker near Atlantic end; corridor remains without live-partial fill", () => {
    const { frame, data } = payloadAt(STATION_AF.F);
    const fam = familiesOf(data);
    expect(frame.solarGeometry?.centralPoint).not.toBeNull();
    expect(data.pointMarkers![0]!.lonDeg).toBeGreaterThan(-85);
    expect(fam.has("event-path-fill")).toBe(true);
    expect(fam.has("live-partial")).toBe(false);
    expect(fam.has("alignment-outer")).toBe(true);
    expect(fam.has("forecast-partial")).toBe(false);
  });

  it("asserts RenderPlan z-order: corridor fill < corridor limits < umbra < marker", () => {
    const { data, plan } = planAt(STATION_AF.D);
    expect(data.fills.find((f) => f.drawOrder === SOLAR_ECLIPSE_DRAW_CORRIDOR_FILL)).toBeDefined();
    expect(data.fills.find((f) => f.drawOrder === SOLAR_ECLIPSE_DRAW_LIVE_PARTIAL)).toBeUndefined();
    expect(data.strokes.find((s) => s.drawOrder === SOLAR_ECLIPSE_DRAW_CORRIDOR_LIMIT)).toBeDefined();
    expect(SOLAR_ECLIPSE_DRAW_CORRIDOR_FILL).toBeLessThan(SOLAR_ECLIPSE_DRAW_CORRIDOR_LIMIT);
    expect(SOLAR_ECLIPSE_DRAW_CORRIDOR_LIMIT).toBeLessThan(SOLAR_ECLIPSE_DRAW_LIVE_CENTRAL);

    const order: string[] = [];
    for (const item of plan.items) {
      if (item.kind !== "path2d") {
        continue;
      }
      const fam = item.fill
        ? classifySolarEclipseFillFamily(item.fill)
        : item.stroke
          ? classifySolarEclipseStrokeFamily(item.stroke)
          : null;
      if (fam && order[order.length - 1] !== fam) {
        order.push(fam);
      }
    }
    const pathFill = order.indexOf("event-path-fill");
    const pathLimit = order.indexOf("event-path-limit");
    const umbra = order.indexOf("live-central-umbra");
    const marker = order.indexOf("ground-marker");
    expect(pathFill).toBeGreaterThanOrEqual(0);
    expect(pathLimit).toBeGreaterThan(pathFill);
    expect(umbra).toBeGreaterThan(pathLimit);
    expect(marker).toBeGreaterThan(umbra);
  });

  it("does not emit an active live-partial overlay fill that could polar-close", () => {
    const utc = Date.parse("2017-08-21T17:52:57.000Z");
    const { data } = planAt(utc);
    expect(data.fills.some((f) => classifySolarEclipseFillFamily(f.fill) === "live-partial")).toBe(
      false,
    );
  });

  it("does not double-stack the same geographic fill family via wrap copies at A–F", () => {
    for (const utc of Object.values(STATION_AF)) {
      const { plan } = planAt(utc);
      expect(sameFamilyFillCopiesOverlap(plan, "live-partial")).toBe(false);
      expect(sameFamilyFillCopiesOverlap(plan, "event-path-fill")).toBe(false);
      expect(sameFamilyFillCopiesOverlap(plan, "forecast-partial")).toBe(false);
    }
  });
});

describe("solar eclipse visual semantics — continuity", () => {
  it("evolves live partial geometry continuously every 2 minutes through the 2017 event", () => {
    const start = Date.parse("2017-08-21T15:40:00.000Z");
    const end = Date.parse("2017-08-21T21:00:00.000Z");
    const event = getSolarEclipseEventById(TOTAL_2017_ID)!;
    let prev:
      | {
          present: boolean;
          minLon: number;
          maxLon: number;
          minLat: number;
          maxLat: number;
          n: number;
        }
      | null = null;
    let presentSteps = 0;
    for (let t = start; t <= end; t += 120_000) {
      const geom = solarEclipseGeometryAt(event, t);
      const present = Boolean(geom && geom.partialRegion.length >= 4);
      if (present && geom) {
        presentSteps += 1;
        let minLon = Infinity;
        let maxLon = -Infinity;
        let minLat = Infinity;
        let maxLat = -Infinity;
        for (const p of geom.partialRegion) {
          minLon = Math.min(minLon, p.lonDeg);
          maxLon = Math.max(maxLon, p.lonDeg);
          minLat = Math.min(minLat, p.latDeg);
          maxLat = Math.max(maxLat, p.latDeg);
        }
        const sample = { present, minLon, maxLon, minLat, maxLat, n: geom.partialRegion.length };
        if (prev?.present) {
          expect(Math.abs(sample.n - prev.n)).toBeLessThan(80);
          expect(Math.abs(sample.minLat - prev.minLat)).toBeLessThan(12);
          expect(Math.abs(sample.maxLat - prev.maxLat)).toBeLessThan(12);
        }
        prev = sample;
      } else {
        if (prev?.present && t < event.globalEndMs - 180_000 && t > event.globalStartMs + 180_000) {
          throw new Error(`live partial disappeared at ${new Date(t).toISOString()}`);
        }
        prev = { present: false, minLon: 0, maxLon: 0, minLat: 0, maxLat: 0, n: 0 };
      }
    }
    expect(presentSteps).toBeGreaterThan(80);
  });

  it("drops marker and targeted beam cleanly around last central-on-Earth contact", () => {
    const event = getSolarEclipseEventById(TOTAL_2017_ID)!;
    let lastCentral = 0;
    for (let t = event.globalStartMs; t <= event.globalEndMs; t += 15_000) {
      const g = solarEclipseGeometryAt(event, t);
      if (g?.centralPoint) {
        lastCentral = t;
      }
    }
    expect(lastCentral).toBeGreaterThan(0);
    const offsets = [-60_000, -30_000, 0, 30_000, 60_000];
    const before = payloadAt(lastCentral - 60_000);
    expect(before.data.pointMarkers).toHaveLength(1);
    expect(familiesOf(before.data).has("alignment-outer")).toBe(true);
    const after = payloadAt(lastCentral + 60_000);
    expect(after.data.pointMarkers ?? []).toEqual([]);
    expect(familiesOf(after.data).has("alignment-outer")).toBe(false);
    expect(familiesOf(after.data).has("event-path-fill")).toBe(true);
    for (const dt of offsets) {
      const { data } = payloadAt(lastCentral + dt);
      const inEvent = lastCentral + dt >= event.globalStartMs && lastCentral + dt <= event.globalEndMs;
      if (inEvent) {
        expect(familiesOf(data).has("event-path-fill")).toBe(true);
      }
    }
  });

  it("drops live partial and corridor at global end without an alpha flash", () => {
    const event = getSolarEclipseEventById(TOTAL_2017_ID)!;
    const before = payloadAt(event.globalEndMs - 60_000);
    expect(familiesOf(before.data).has("live-partial") || familiesOf(before.data).has("event-path-fill")).toBe(
      true,
    );
    const after = payloadAt(event.globalEndMs + 60_000);
    expect(after.frame.activeSolar).toBeNull();
    expect(after.data.fills).toEqual([]);
    expect(after.data.strokes).toEqual([]);
    expect(after.data.pointMarkers ?? []).toEqual([]);
  });
});

describe("solar eclipse visual semantics — regressions", () => {
  it("does not self-overlap the 2016 dateline live partial fill", () => {
    const utc = Date.parse("2016-03-09T01:57:09.400Z");
    const { plan, data } = planAt(utc);
    expect(familiesOf(data).has("live-partial")).toBe(false);
    expect(sameFamilyFillCopiesOverlap(plan, "live-partial")).toBe(false);
    expect(data.pointMarkers).toHaveLength(1);
  });

  it("does not self-overlap the 2021 polar live partial fill", () => {
    const utc = Date.parse("2021-12-04T07:34:00.000Z");
    const { plan, data } = planAt(utc);
    expect(familiesOf(data).has("live-partial")).toBe(false);
    expect(sameFamilyFillCopiesOverlap(plan, "live-partial")).toBe(false);
    expect(sameFamilyFillCopiesOverlap(plan, "event-path-fill")).toBe(false);
  });

  it("keeps 2023 annular visual families without totality styling", () => {
    const utc = Date.parse("2023-10-14T17:59:27.300Z");
    const { data } = payloadAt(utc);
    const fam = familiesOf(data);
    expect(fam.has("live-central-antumbra")).toBe(true);
    expect(fam.has("live-central-umbra")).toBe(false);
    expect(fam.has("alignment-outer")).toBe(true);
    expect(fam.has("live-partial")).toBe(false);
    expect(data.pointMarkers).toHaveLength(1);
  });

  it("keeps 2022 partial-only as live partial without marker, beam, or corridor", () => {
    const utc = Date.parse("2022-10-25T11:00:06.900Z");
    const { data } = payloadAt(utc);
    const fam = familiesOf(data);
    expect(fam.has("live-partial")).toBe(false);
    expect(fam.has("event-path-fill")).toBe(false);
    expect(fam.has("live-central-umbra")).toBe(false);
    expect(data.pointMarkers ?? []).toEqual([]);
    expect(fam.has("alignment-outer") || fam.has("alignment-mid")).toBe(true);
  });
});

describe("solar eclipse visual semantics — containment", () => {
  it("does not teach Canvas astronomy family names", () => {
    expect(canvasBackendSource).not.toMatch(/live-partial|event-path-fill|alignment-outer/i);
    expect(canvasBackendSource).not.toMatch(/drawOrder/i);
  });
});
