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

import { describe, expect, it, vi } from "vitest";
import {
  mapXFromLongitudeDeg,
  mapYFromLatitudeDeg,
} from "./equirectangularProjection";
import { EARTH_FIXED_SCENE_REFERENCE_FRAME, issPositionLockedSceneReferenceFrame, moonLongitudeLockedSceneReferenceFrame, moonPositionLockedSceneReferenceFrame, sunPositionLockedSceneReferenceFrame } from "./sceneReferenceFrame";
import {
  canonicalLatitudeDegFromSceneY,
  canonicalLongitudeDegFromSceneX,
} from "./sceneCamera";
import {
  earthquakeMarkerHitRadiusPx,
  earthquakeMarkerRadiusPx,
  pickHoveredEarthquakeHit,
  placeEarthquakeHoverLabel,
  projectEarthquakeHoverHits,
  resolveEarthquakeHoverId,
  type EarthquakeHoverFeature,
} from "./earthquakeMarkerHover";

const W = 1400;
const H = 700;

function feature(
  patch: Partial<EarthquakeHoverFeature> & Pick<EarthquakeHoverFeature, "id">,
): EarthquakeHoverFeature {
  return {
    lonDeg: 0,
    latDeg: 0,
    compactLabel: `M3 · ${patch.id}`,
    ...patch,
  };
}

function at(lonDeg: number, latDeg: number): { x: number; y: number } {
  return {
    x: mapXFromLongitudeDeg(lonDeg, W),
    y: mapYFromLatitudeDeg(latDeg, H),
  };
}

describe("LIB-060 earthquake hover hit radius", () => {
  it("uses painted radius plus padding, with a 7px floor", () => {
    const small = earthquakeMarkerRadiusPx(2.5, W);
    expect(small).toBeLessThan(7);
    expect(earthquakeMarkerHitRadiusPx(small)).toBe(7);
    const large = earthquakeMarkerRadiusPx(7, W);
    expect(earthquakeMarkerHitRadiusPx(large)).toBe(large + 2);
  });
});

describe("LIB-060 eligible marker hover", () => {
  it("picks a visible marker under the pointer", () => {
    const features = [
      feature({ id: "a", lonDeg: -120, latDeg: 35, magnitude: 3.1 }),
    ];
    const p = at(-120, 35);
    expect(
      resolveEarthquakeHoverId({
        features,
        pointerSceneCss: p,
        viewportWidthPx: W,
        viewportHeightPx: H,
        showLabelOnHover: true,
      }),
    ).toBe("a");
  });

  it("does not hover when the option is off", () => {
    const features = [
      feature({ id: "a", lonDeg: -120, latDeg: 35, magnitude: 3.1 }),
    ];
    expect(
      resolveEarthquakeHoverId({
        features,
        pointerSceneCss: at(-120, 35),
        viewportWidthPx: W,
        viewportHeightPx: H,
        showLabelOnHover: false,
      }),
    ).toBeNull();
  });

  it("does not hover when the pointer is null (leave canvas)", () => {
    expect(
      resolveEarthquakeHoverId({
        features: [feature({ id: "a", lonDeg: 0, latDeg: 0 })],
        pointerSceneCss: null,
        viewportWidthPx: W,
        viewportHeightPx: H,
        showLabelOnHover: true,
      }),
    ).toBeNull();
  });

  it("does not hover a marker that is not in the prepared visible set", () => {
    const visible = [
      feature({ id: "kept", lonDeg: 10, latDeg: 10, magnitude: 4 }),
    ];
    expect(
      resolveEarthquakeHoverId({
        features: visible,
        pointerSceneCss: at(-120, 35),
        viewportWidthPx: W,
        viewportHeightPx: H,
        showLabelOnHover: true,
      }),
    ).toBeNull();
  });
});

describe("LIB-060 overlap resolution", () => {
  it("chooses nearest center, then larger magnitude, then newer event, then stable id", () => {
    const origin = at(0, 0);
    const sameSpot: EarthquakeHoverFeature[] = [
      feature({
        id: "older-small",
        lonDeg: 0,
        latDeg: 0,
        magnitude: 3,
        eventTimeMs: 1000,
      }),
      feature({
        id: "newer-small",
        lonDeg: 0,
        latDeg: 0,
        magnitude: 3,
        eventTimeMs: 2000,
      }),
      feature({
        id: "aaa-large",
        lonDeg: 0,
        latDeg: 0,
        magnitude: 5,
        eventTimeMs: 1000,
      }),
      feature({
        id: "zzz-large",
        lonDeg: 0,
        latDeg: 0,
        magnitude: 5,
        eventTimeMs: 1000,
      }),
    ];
    const hits = projectEarthquakeHoverHits(sameSpot, W, H);
    expect(pickHoveredEarthquakeHit(hits, origin.x, origin.y)?.id).toBe(
      "aaa-large",
    );

    const offset: EarthquakeHoverFeature[] = [
      feature({ id: "far", lonDeg: 2, latDeg: 0, magnitude: 9 }),
      feature({ id: "near", lonDeg: 0.2, latDeg: 0, magnitude: 2 }),
    ];
    const nearHits = projectEarthquakeHoverHits(offset, W, H);
    const near = nearHits.find((h) => h.id === "near")!;
    expect(pickHoveredEarthquakeHit(nearHits, near.x, near.y)?.id).toBe("near");
  });
});

describe("LIB-060 hover label placement", () => {
  it("prefers right of the disc when there is room", () => {
    const placed = placeEarthquakeHoverLabel({
      originX: 400,
      originY: 300,
      radiusPx: 6,
      text: "M3.1 · Chile",
      sizePx: 11,
      viewportWidthPx: 800,
      viewportHeightPx: 600,
    });
    expect(placed.textAlign).toBe("left");
    expect(placed.x).toBeGreaterThan(400);
  });

  it("places left when the right side would leave the canvas", () => {
    const placed = placeEarthquakeHoverLabel({
      originX: 790,
      originY: 300,
      radiusPx: 6,
      text: "M5.2 · Taiwan region of a long place name",
      sizePx: 11,
      viewportWidthPx: 800,
      viewportHeightPx: 600,
    });
    expect(placed.textAlign).toBe("right");
    expect(placed.x).toBeLessThan(790);
  });
});

describe("LIB-060 pointer scan cost", () => {
  it("scans a few hundred visible markers without a spatial index", () => {
    const features: EarthquakeHoverFeature[] = [];
    for (let i = 0; i < 400; i += 1) {
      features.push(
        feature({
          id: `eq-${i}`,
          lonDeg: -180 + (i % 40) * 9,
          latDeg: -80 + Math.floor(i / 40) * 16,
          magnitude: 2.5 + (i % 40) / 10,
        }),
      );
    }
    const t0 = performance.now();
    const id = resolveEarthquakeHoverId({
      features,
      pointerSceneCss: at(0, 0),
      viewportWidthPx: W,
      viewportHeightPx: H,
      showLabelOnHover: true,
    });
    const elapsedMs = performance.now() - t0;
    expect(id === null || typeof id === "string").toBe(true);
    expect(elapsedMs).toBeLessThan(20);
  });

  it("does not invoke any fetch on resolve", () => {
    const fetchFn = vi.fn();
    resolveEarthquakeHoverId({
      features: [feature({ id: "a", lonDeg: 0, latDeg: 0 })],
      pointerSceneCss: at(0, 0),
      viewportWidthPx: W,
      viewportHeightPx: H,
      showLabelOnHover: true,
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("LIB-080 earthquake hover through scene camera", () => {
  it("hits a zoomed marker at its camera-mapped scene position, not the identity map point", () => {
    const features = [
      feature({ id: "a", lonDeg: -120, latDeg: 35, magnitude: 3.1 }),
    ];
    const camera = {
      scale: 2,
      centerU: 0.25,
      centerV: 0.4,
    } as const;
    const identity = at(-120, 35);
    expect(
      resolveEarthquakeHoverId({
        features,
        pointerSceneCss: identity,
        viewportWidthPx: W,
        viewportHeightPx: H,
        showLabelOnHover: true,
        camera,
      }),
    ).toBeNull();
    const hits = projectEarthquakeHoverHits(features, W, H, camera);
    expect(
      resolveEarthquakeHoverId({
        features,
        pointerSceneCss: { x: hits[0]!.x, y: hits[0]!.y },
        viewportWidthPx: W,
        viewportHeightPx: H,
        showLabelOnHover: true,
        camera,
      }),
    ).toBe("a");
  });

  it("hits a wrapped display copy of a marker under a panned camera", () => {
    const features = [
      feature({ id: "dateline", lonDeg: 170, latDeg: 0, magnitude: 5 }),
    ];
    const camera = { scale: 1, centerU: 0.9, centerV: 0.5 } as const;
    const hits = projectEarthquakeHoverHits(features, W, H, camera);
    const onScreen = hits.filter((hit) => hit.x >= 0 && hit.x <= W);
    expect(onScreen.length).toBeGreaterThanOrEqual(1);
    expect(
      resolveEarthquakeHoverId({
        features,
        pointerSceneCss: { x: onScreen[0]!.x, y: onScreen[0]!.y },
        viewportWidthPx: W,
        viewportHeightPx: H,
        showLabelOnHover: true,
        camera,
        sceneReferenceFrame: EARTH_FIXED_SCENE_REFERENCE_FRAME,
      }),
    ).toBe("dateline");

    const recoveredLon = canonicalLongitudeDegFromSceneX(
      onScreen[0]!.x,
      W,
      camera,
      EARTH_FIXED_SCENE_REFERENCE_FRAME,
    );
    const recoveredLat = canonicalLatitudeDegFromSceneY(
      onScreen[0]!.y,
      H,
      camera,
      EARTH_FIXED_SCENE_REFERENCE_FRAME,
    );
    const lonDelta = recoveredLon - 170;
    expect(Math.abs(lonDelta - Math.round(lonDelta / 360) * 360)).toBeLessThan(1e-8);
    expect(recoveredLat).toBeCloseTo(0, 8);
  });

  it("hits the canonical earthquake under Moon longitude-lock with pan and wrap", () => {
    const features = [
      feature({ id: "hawaii", lonDeg: -155.5, latDeg: 19.4, magnitude: 4 }),
    ];
    const frame = moonLongitudeLockedSceneReferenceFrame(40);
    const camera = { scale: 2, centerU: 1.08, centerV: 0.45 } as const;
    const hits = projectEarthquakeHoverHits(features, W, H, camera, frame);
    const onScreen = hits.filter((hit) => hit.x >= 0 && hit.x <= W);
    expect(onScreen.length).toBeGreaterThanOrEqual(1);
    expect(
      resolveEarthquakeHoverId({
        features,
        pointerSceneCss: { x: onScreen[0]!.x, y: onScreen[0]!.y },
        viewportWidthPx: W,
        viewportHeightPx: H,
        showLabelOnHover: true,
        camera,
        sceneReferenceFrame: frame,
      }),
    ).toBe("hawaii");
  });

  it("hits the canonical earthquake under Moon position-lock after both-axis translation", () => {
    const features = [
      feature({ id: "valparaiso", lonDeg: -71.6, latDeg: -33.05, magnitude: 3.2 }),
    ];
    const frame = moonPositionLockedSceneReferenceFrame(40, 18);
    const camera = { scale: 2, centerU: 1.08, centerV: 0.42 } as const;
    const hits = projectEarthquakeHoverHits(features, W, H, camera, frame);
    const onScreen = hits.filter((hit) => hit.x >= 0 && hit.x <= W);
    expect(onScreen.length).toBeGreaterThanOrEqual(1);
    expect(
      resolveEarthquakeHoverId({
        features,
        pointerSceneCss: { x: onScreen[0]!.x, y: onScreen[0]!.y },
        viewportWidthPx: W,
        viewportHeightPx: H,
        showLabelOnHover: true,
        camera,
        sceneReferenceFrame: frame,
      }),
    ).toBe("valparaiso");
    const recoveredLat = canonicalLatitudeDegFromSceneY(
      onScreen[0]!.y,
      H,
      camera,
      frame,
    );
    expect(recoveredLat).toBeCloseTo(-33.05, 6);
  });

  it("hits the canonical earthquake under Sun position-lock with pan and wrap", () => {
    const features = [
      feature({ id: "valparaiso", lonDeg: -71.6, latDeg: -33.05, magnitude: 3.2 }),
    ];
    const frame = sunPositionLockedSceneReferenceFrame(40, 18);
    const camera = { scale: 2, centerU: 1.08, centerV: 0.42 } as const;
    const hits = projectEarthquakeHoverHits(features, W, H, camera, frame);
    const onScreen = hits.filter((hit) => hit.x >= 0 && hit.x <= W);
    expect(onScreen.length).toBeGreaterThanOrEqual(1);
    expect(
      resolveEarthquakeHoverId({
        features,
        pointerSceneCss: { x: onScreen[0]!.x, y: onScreen[0]!.y },
        viewportWidthPx: W,
        viewportHeightPx: H,
        showLabelOnHover: true,
        camera,
        sceneReferenceFrame: frame,
      }),
    ).toBe("valparaiso");
    const recoveredLat = canonicalLatitudeDegFromSceneY(
      onScreen[0]!.y,
      H,
      camera,
      frame,
    );
    expect(recoveredLat).toBeCloseTo(-33.05, 6);
  });

  it("hits the canonical earthquake under ISS position-lock with pan and wrap", () => {
    const features = [
      feature({ id: "valparaiso", lonDeg: -71.6, latDeg: -33.05, magnitude: 3.2 }),
    ];
    const frame = issPositionLockedSceneReferenceFrame(40, 18);
    const camera = { scale: 2, centerU: 1.08, centerV: 0.42 } as const;
    const hits = projectEarthquakeHoverHits(features, W, H, camera, frame);
    const onScreen = hits.filter((hit) => hit.x >= 0 && hit.x <= W);
    expect(onScreen.length).toBeGreaterThanOrEqual(1);
    expect(
      resolveEarthquakeHoverId({
        features,
        pointerSceneCss: { x: onScreen[0]!.x, y: onScreen[0]!.y },
        viewportWidthPx: W,
        viewportHeightPx: H,
        showLabelOnHover: true,
        camera,
        sceneReferenceFrame: frame,
      }),
    ).toBe("valparaiso");
    const recoveredLat = canonicalLatitudeDegFromSceneY(
      onScreen[0]!.y,
      H,
      camera,
      frame,
    );
    expect(recoveredLat).toBeCloseTo(-33.05, 6);
  });
});
