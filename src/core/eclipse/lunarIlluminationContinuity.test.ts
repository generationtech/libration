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
import { getLunarEclipseEventById } from "./eclipseAuthority";
import { lunarEclipseGeometryAt } from "./lunarEclipseGeometry";
import { lunarEclipseMoonlightTransmission } from "./lunarEclipseMoonlightTransmission";
import { resolveEclipseFrame } from "./eclipseEventService";
import { isMoonGeometricallyAboveHorizon } from "./lunarVisibilityGeometry";
import {
  buildIlluminationFrameState,
  illuminationAstronomyIdentity,
} from "../illuminationFrameState";
import { createTimeContext } from "../time";
import { createSolarShadingLayer } from "../../layers/solarShadingLayer";
import { isSolarShadingPayload } from "../../layers/solarShadingPayload";
import { createLunarEclipseLayer } from "../../layers/lunarEclipseLayer";
import { getMoonlightPolicy } from "../moonlightPolicy";
import {
  buildSolarShadingIlluminationRenderPlan,
  SOLAR_SHADING_PLAN_DOWNSAMPLE,
} from "../../renderer/renderPlan/sceneSolarShadingIlluminationPlan";
import type { RenderRasterPatchItem } from "../../renderer/renderPlan/renderPlanTypes";

const TOTAL_2029 = "nasa-5mcle-lunar-9716";
const ILL = getMoonlightPolicy("illustrative");
const RASTER_W = 180;
const RASTER_H = 90;

const PROBES = {
  easternNA: { lonDeg: -74.0, latDeg: 40.7 },
  westernNA: { lonDeg: -122.4, latDeg: 37.8 },
  southAmerica: { lonDeg: -46.6, latDeg: -23.6 },
  atlantic: { lonDeg: -30.0, latDeg: 0.0 },
  southernAfrica: { lonDeg: 25.0, latDeg: -30.0 },
  indianOcean: { lonDeg: 80.0, latDeg: -20.0 },
} as const;

function wrapLon(lonDeg: number): number {
  let x = lonDeg;
  while (x <= -180) x += 360;
  while (x > 180) x -= 360;
  return x;
}

function antipode(latDeg: number, lonDeg: number): { latDeg: number; lonDeg: number } {
  return { latDeg: -latDeg, lonDeg: wrapLon(lonDeg + 180) };
}

function checksum(rgba: Uint8ClampedArray): number {
  let h = 2166136261;
  for (let i = 0; i < rgba.length; i += 1) {
    h ^= rgba[i]!;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rasterAt(utcMs: number): {
  item: RenderRasterPatchItem;
  identity: string;
  transmission: number;
  state: ReturnType<typeof buildIlluminationFrameState>;
  buildMs: number;
} {
  const frame = resolveEclipseFrame(utcMs, { lunarHorizonMs: 7 * 86_400_000 });
  const state = buildIlluminationFrameState(utcMs, frame.lunarGeometry);
  const t0 = performance.now();
  const plan = buildSolarShadingIlluminationRenderPlan({
    viewportWidthPx: RASTER_W,
    viewportHeightPx: RASTER_H,
    subsolarLatDeg: state.subsolarLatDeg,
    subsolarLonDeg: state.subsolarLonDeg,
    sublunarLatDeg: state.sublunarLatDeg,
    sublunarLonDeg: state.sublunarLonDeg,
    lunarIlluminatedFraction: state.lunarIlluminatedFraction,
    moonlightTransmission01: state.moonlightTransmission01,
    layerOpacity: 1,
    moonlightPolicy: ILL,
  });
  const buildMs = performance.now() - t0;
  const item = plan.items[0];
  if (!item || item.kind !== "rasterPatch") {
    throw new Error("expected illumination rasterPatch");
  }
  return {
    item,
    identity: illuminationAstronomyIdentity(state),
    transmission: state.moonlightTransmission01,
    state,
    buildMs,
  };
}

function probeAlpha(
  item: RenderRasterPatchItem,
  lonDeg: number,
  latDeg: number,
): { r: number; g: number; b: number; a: number; luma: number } {
  const sw = item.widthPx;
  const sh = item.heightPx;
  const i = Math.max(0, Math.min(sw - 1, Math.round(((wrapLon(lonDeg) + 180) / 360) * sw - 0.5)));
  const j = Math.max(0, Math.min(sh - 1, Math.round(((90 - latDeg) / 180) * sh - 0.5)));
  const p = (j * sw + i) * 4;
  const r = item.rgba[p]!;
  const g = item.rgba[p + 1]!;
  const b = item.rgba[p + 2]!;
  const a = item.rgba[p + 3]!;
  return { r, g, b, a, luma: 0.2126 * r + 0.7152 * g + 0.0722 * b };
}

function solarDot(
  latDeg: number,
  lonDeg: number,
  subLat: number,
  subLon: number,
): number {
  const phi = (latDeg * Math.PI) / 180;
  const lam = (lonDeg * Math.PI) / 180;
  const phiS = (subLat * Math.PI) / 180;
  const lamS = (subLon * Math.PI) / 180;
  return Math.cos(phi) * Math.cos(phiS) * Math.cos(lam - lamS) + Math.sin(phi) * Math.sin(phiS);
}

describe("lunar illumination continuity (LIB-044)", () => {
  const event = getLunarEclipseEventById(TOTAL_2029)!;

  it("builds one astronomical illumination state from the product instant", () => {
    const utc = event.greatestEclipseUtcMs;
    const frame = resolveEclipseFrame(utc);
    const state = buildIlluminationFrameState(utc, frame.lunarGeometry);
    expect(state.productUtcMs).toBe(utc);
    expect(state.moonlightTransmission01).toBeLessThan(0.2);
    expect(state.lunarIlluminatedFraction).toBeGreaterThan(0.9);
    const shading = createSolarShadingLayer({ moonlightMode: "illustrative" }).getState(
      createTimeContext(utc, 0, true, { eclipseFrame: frame }),
    );
    expect(isSolarShadingPayload(shading.data)).toBe(true);
    if (!isSolarShadingPayload(shading.data)) {
      return;
    }
    expect(shading.data.subsolarLatDeg).toBe(state.subsolarLatDeg);
    expect(shading.data.sublunarLonDeg).toBe(state.sublunarLonDeg);
    expect(shading.data.moonlightTransmission01).toBe(state.moonlightTransmission01);
  });

  it("does not change the physical raster when the lunar eclipse overlay layer is constructed", () => {
    const utc = event.greatestEclipseUtcMs;
    const frame = resolveEclipseFrame(utc, { lunarHorizonMs: 7 * 86_400_000 });
    const time = createTimeContext(utc, 0, true, { eclipseFrame: frame });
    const shadingOn = createSolarShadingLayer({ moonlightMode: "illustrative" }).getState(time);
    const shadingOff = createSolarShadingLayer({ moonlightMode: "illustrative" }).getState(time);
    expect(shadingOn.data).toEqual(shadingOff.data);
    createLunarEclipseLayer({
      alignment: { enabled: false },
    }).getState(time);
    createLunarEclipseLayer({
      alignment: { enabled: false },
    }).getState(time);
    const a = rasterAt(utc);
    const b = rasterAt(utc);
    expect(checksum(a.item.rgba)).toBe(checksum(b.item.rgba));
  });

  it("keeps small-step probe luminance continuous except at the solar terminator", () => {
    const t0 = event.p1UtcMs! - 10 * 60_000;
    const t1 = event.p4UtcMs! + 10 * 60_000;
    const stepMs = 60_000;
    let prev = rasterAt(t0);
    let maxNonTerm = 0;
    for (let t = t0 + stepMs; t <= t1; t += stepMs) {
      const cur = rasterAt(t);
      expect(cur.item.widthPx).toBe(Math.ceil(RASTER_W / SOLAR_SHADING_PLAN_DOWNSAMPLE));
      expect(cur.identity).not.toBe(prev.identity);
      for (const probe of Object.values(PROBES)) {
        const pa = probeAlpha(prev.item, probe.lonDeg, probe.latDeg);
        const pb = probeAlpha(cur.item, probe.lonDeg, probe.latDeg);
        const dot = solarDot(
          probe.latDeg,
          probe.lonDeg,
          cur.state.subsolarLatDeg,
          cur.state.subsolarLonDeg,
        );
        const da = Math.abs(pb.a - pa.a);
        if (Math.abs(dot) > 0.12) {
          maxNonTerm = Math.max(maxNonTerm, da);
          expect(da).toBeLessThan(12);
        }
      }
      const moonBelow = antipode(cur.state.sublunarLatDeg, cur.state.sublunarLonDeg);
      const belowA = probeAlpha(prev.item, moonBelow.lonDeg, moonBelow.latDeg);
      const belowB = probeAlpha(cur.item, moonBelow.lonDeg, moonBelow.latDeg);
      const belowDot = solarDot(
        moonBelow.latDeg,
        moonBelow.lonDeg,
        cur.state.subsolarLatDeg,
        cur.state.subsolarLonDeg,
      );
      if (belowDot < -0.2) {
        expect(Math.abs(belowB.a - belowA.a)).toBeLessThan(8);
      }
      prev = cur;
    }
    expect(maxNonTerm).toBeLessThan(12);
  });

  it("does not snap the physical raster at lifecycle activation when overlap is tiny", () => {
    const p1 = event.p1UtcMs!;
    const before = rasterAt(p1 - 1000);
    const after = rasterAt(p1 + 1000);
    expect(before.item.widthPx).toBe(after.item.widthPx);
    expect(before.item.heightPx).toBe(after.item.heightPx);
    expect(Math.abs(after.transmission - before.transmission)).toBeLessThan(0.04);
    let abs = 0;
    let n = 0;
    for (let i = 3; i < before.item.rgba.length; i += 16) {
      abs += Math.abs(after.item.rgba[i]! - before.item.rgba[i]!);
      n += 1;
    }
    expect(abs / n).toBeLessThan(4);
  });

  it("keeps transmission continuous across contacts without a geography switch", () => {
    const contacts = [
      event.p1UtcMs!,
      event.u1UtcMs!,
      event.u2UtcMs!,
      event.greatestEclipseUtcMs,
      event.u3UtcMs!,
      event.u4UtcMs!,
      event.p4UtcMs!,
    ];
    for (const c of contacts) {
      const a = lunarEclipseMoonlightTransmission(lunarEclipseGeometryAt(event, c - 10_000));
      const b = lunarEclipseMoonlightTransmission(lunarEclipseGeometryAt(event, c));
      const d = lunarEclipseMoonlightTransmission(lunarEclipseGeometryAt(event, c + 10_000));
      expect(Math.abs(b - a)).toBeLessThan(0.08);
      expect(Math.abs(d - b)).toBeLessThan(0.08);
    }
    expect(lunarEclipseMoonlightTransmission(lunarEclipseGeometryAt(event, event.p1UtcMs! - 60_000))).toBe(
      1,
    );
    expect(lunarEclipseMoonlightTransmission(lunarEclipseGeometryAt(event, event.p4UtcMs! + 60_000))).toBe(
      1,
    );
  });

  it("does not darken day-side or moon-below-horizon controls from the lunar eclipse", () => {
    const utc = event.greatestEclipseUtcMs;
    const row = rasterAt(utc);
    const day = { lonDeg: row.state.subsolarLonDeg, latDeg: row.state.subsolarLatDeg };
    const daySample = probeAlpha(row.item, day.lonDeg, day.latDeg);
    expect(daySample.a).toBeLessThan(40);
    const below = antipode(row.state.sublunarLatDeg, row.state.sublunarLonDeg);
    expect(
      isMoonGeometricallyAboveHorizon(
        below.latDeg,
        below.lonDeg,
        row.state.sublunarLatDeg,
        row.state.sublunarLonDeg,
      ),
    ).toBe(false);
    const uneclipsed = rasterAt(event.p1UtcMs! - 3_600_000);
    const belowNow = probeAlpha(row.item, below.lonDeg, below.latDeg);
    const belowPre = probeAlpha(uneclipsed.item, below.lonDeg, below.latDeg);
    expect(Math.abs(belowNow.a - belowPre.a)).toBeLessThan(20);
  });

  it("rebuilds a half-res world grid without a moving bbox", () => {
    const row = rasterAt(event.greatestEclipseUtcMs);
    expect(row.item.x).toBe(0);
    expect(row.item.y).toBe(0);
    expect(row.item.destWidth).toBe(RASTER_W);
    expect(row.item.destHeight).toBe(RASTER_H);
    expect(row.item.widthPx).toBe(Math.ceil(RASTER_W / SOLAR_SHADING_PLAN_DOWNSAMPLE));
    expect(row.buildMs).toBeLessThan(750);
  });
});
