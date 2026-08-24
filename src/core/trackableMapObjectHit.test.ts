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
  IDENTITY_SCENE_CAMERA,
  SCENE_CAMERA_PAN_DRAG_THRESHOLD_PX,
  clampSceneCamera,
} from "./sceneCamera";
import { sceneCameraCoverPolicyAfterFrameKindChange } from "./sceneCamera";
import { sceneCameraAfterReferenceFrameKindChange } from "./sceneFrameAnchor";
import { EARTH_FIXED_SCENE_REFERENCE_FRAME } from "./sceneReferenceFrame";
import { TRACKABLE_MAP_OBJECT_IDS, cityTrackableMapObjectId, planetTrackableMapObjectId, trackableMapObjectIdEquals } from "./trackableMapObject";
import {
  TRACKABLE_MAP_OBJECT_HIT_MIN_RADIUS_PX,
  TRACKABLE_MAP_OBJECT_HIT_PADDING_PX,
  TRACKABLE_MAP_OBJECT_HIT_TIE_EPSILON_PX,
  applyTrackableMapObjectClick,
  collectWrappedPointGlyphCopies,
  hitTargetsFromGlyphCopies,
  pickTrackableMapObjectHit,
  trackableMapObjectHitRadiusPx,
  type TrackableMapObjectHitTarget,
} from "./trackableMapObjectHit";
import {
  DEFAULT_TRACKING_SELECTION,
  isTrackingSelectionPositionLocked,
  setTrackingTarget,
  trackingSelectionTransition,
  type TrackingSelectionState,
} from "./trackingSelection";

const ALWAYS_AVAILABLE = { moon: true, sun: true, iss: true } as const;
const ISS_UNAVAILABLE = { moon: true, sun: true, iss: false } as const;

function selection(
  target: TrackingSelectionState["target"],
  rememberedMode: TrackingSelectionState["rememberedMode"] = "position",
): TrackingSelectionState {
  return { target, rememberedMode };
}

function hit(
  target: TrackableMapObjectHitTarget["target"],
  sceneX: number,
  sceneY: number,
  hitRadiusPx = 12,
): TrackableMapObjectHitTarget {
  return { target, sceneX, sceneY, hitRadiusPx };
}

describe("LIB-091 trackable map-object hit testing", () => {
  it("uses painted radius plus padding, floored at the accessible minimum", () => {
    expect(TRACKABLE_MAP_OBJECT_HIT_PADDING_PX).toBe(3);
    expect(TRACKABLE_MAP_OBJECT_HIT_MIN_RADIUS_PX).toBe(8);
    expect(trackableMapObjectHitRadiusPx(10)).toBe(13);
    expect(trackableMapObjectHitRadiusPx(2)).toBe(8);
  });

  it("selects inside the hit radius and ignores the same pointer outside it", () => {
    const targets = [hit("moon", 100, 80, 12)];
    expect(pickTrackableMapObjectHit(targets, 100, 80)?.target).toBe("moon");
    expect(pickTrackableMapObjectHit(targets, 100 + 12, 80)?.target).toBe("moon");
    expect(pickTrackableMapObjectHit(targets, 100 + 12.01, 80)).toBeNull();
  });

  it("prefers the nearest center when hit areas overlap", () => {
    const targets = [hit("moon", 0, 0, 20), hit("sun", 8, 0, 20)];
    expect(pickTrackableMapObjectHit(targets, 6, 0)?.target).toBe("sun");
    expect(pickTrackableMapObjectHit(targets, 2, 0)?.target).toBe("moon");
  });

  it("breaks an effective distance tie with stable moon, sun, iss order", () => {
    expect(TRACKABLE_MAP_OBJECT_IDS).toEqual(["moon", "sun", "iss"]);
    const targets = [hit("iss", 0, 0, 20), hit("sun", 0, 0, 20), hit("moon", 0, 0, 20)];
    expect(pickTrackableMapObjectHit(targets, 0, 0)?.target).toBe("moon");
    const sunIss = [hit("iss", 0, 0, 20), hit("sun", TRACKABLE_MAP_OBJECT_HIT_TIE_EPSILON_PX, 0, 20)];
    expect(pickTrackableMapObjectHit(sunIss, 0, 0)?.target).toBe("sun");
  });

  it("gives wrapped copies the same target identity", () => {
    const copies = collectWrappedPointGlyphCopies({
      lonDeg: 0,
      latDeg: 10,
      viewportWidthPx: 800,
      viewportHeightPx: 400,
      camera: clampSceneCamera({ ...IDENTITY_SCENE_CAMERA, centerU: 0 }),
      frame: EARTH_FIXED_SCENE_REFERENCE_FRAME,
      renderedRadiusPx: 8,
      xClipRadiusMultiple: 4,
    });
    const hits = hitTargetsFromGlyphCopies("iss", copies, 800, 400);
    expect(hits.length).toBeGreaterThan(1);
    expect(new Set(hits.map((row) => row.target))).toEqual(new Set(["iss"]));
    expect(new Set(hits.map((row) => row.sceneX)).size).toBe(hits.length);
  });

  it("clicking Moon from Earth-fixed keeps remembered mode", () => {
    const next = applyTrackableMapObjectClick({
      current: selection(null, "position"),
      hits: [hit("moon", 40, 40)],
      pointerX: 40,
      pointerY: 40,
      panBecameActive: false,
      available: ALWAYS_AVAILABLE,
    });
    expect(next).toEqual(selection("moon", "position"));
    expect(next).toEqual(
      setTrackingTarget(selection(null, "position"), "moon", ALWAYS_AVAILABLE),
    );
  });

  it("clicking a different target retains remembered mode", () => {
    const current = selection("sun", "longitude");
    const next = applyTrackableMapObjectClick({
      current,
      hits: [hit("iss", 10, 10)],
      pointerX: 10,
      pointerY: 10,
      panBecameActive: false,
      available: ALWAYS_AVAILABLE,
    });
    expect(next).toEqual(selection("iss", "longitude"));
  });

  it("same-target click is a no-op and does not reinitialize camera", () => {
    const current = selection("moon", "position");
    const next = applyTrackableMapObjectClick({
      current,
      hits: [hit("moon", 5, 5)],
      pointerX: 5,
      pointerY: 5,
      panBecameActive: false,
      available: ALWAYS_AVAILABLE,
    });
    expect(next).toEqual(current);
    expect(trackingSelectionTransition(current, next)).toMatchObject({
      selectionChanged: false,
      reinitializeCamera: false,
      reinitializeContinuity: false,
    });
  });

  it("empty geography does not change selection", () => {
    const current = selection("sun", "position");
    const next = applyTrackableMapObjectClick({
      current,
      hits: [hit("moon", 0, 0, 8)],
      pointerX: 400,
      pointerY: 200,
      panBecameActive: false,
      available: ALWAYS_AVAILABLE,
    });
    expect(next).toEqual(current);
  });

  it("refuses unavailable ISS through setTrackingTarget", () => {
    const current = selection("moon", "position");
    const next = applyTrackableMapObjectClick({
      current,
      hits: [hit("iss", 0, 0)],
      pointerX: 0,
      pointerY: 0,
      panBecameActive: false,
      available: ISS_UNAVAILABLE,
    });
    expect(next).toEqual(current);
    expect(setTrackingTarget(current, "iss", ISS_UNAVAILABLE)).toEqual(current);
  });

  it("does not select when the pointer sequence became a pan", () => {
    expect(SCENE_CAMERA_PAN_DRAG_THRESHOLD_PX).toBe(4);
    const next = applyTrackableMapObjectClick({
      current: DEFAULT_TRACKING_SELECTION,
      hits: [hit("moon", 0, 0)],
      pointerX: 0,
      pointerY: 0,
      panBecameActive: true,
      available: ALWAYS_AVAILABLE,
    });
    expect(next).toEqual(DEFAULT_TRACKING_SELECTION);
  });

  it("click-to-track uses the same camera policy as the Target control", () => {
    const fromEarth = applyTrackableMapObjectClick({
      current: selection(null, "position"),
      hits: [hit("moon", 0, 0)],
      pointerX: 0,
      pointerY: 0,
      panBecameActive: false,
      available: ALWAYS_AVAILABLE,
    });
    const fromControl = setTrackingTarget(selection(null, "position"), "moon", ALWAYS_AVAILABLE);
    expect(fromEarth).toEqual(fromControl);
    expect(trackingSelectionTransition(selection(null, "position"), fromEarth)).toMatchObject({
      reinitializeCamera: true,
      reinitializeContinuity: true,
    });
    expect(isTrackingSelectionPositionLocked(fromEarth)).toBe(true);
    expect(sceneCameraCoverPolicyAfterFrameKindChange(true)).toBe("auto");
    expect(sceneCameraAfterReferenceFrameKindChange()).toEqual(IDENTITY_SCENE_CAMERA);

    const lonClick = applyTrackableMapObjectClick({
      current: selection(null, "longitude"),
      hits: [hit("sun", 0, 0)],
      pointerX: 0,
      pointerY: 0,
      panBecameActive: false,
      available: ALWAYS_AVAILABLE,
    });
    expect(isTrackingSelectionPositionLocked(lonClick)).toBe(false);
    expect(sceneCameraCoverPolicyAfterFrameKindChange(false)).toBe("off");
  });

  it("clicks a city or planet through setTrackingTarget and retains mode", () => {
    const london = cityTrackableMapObjectId("city.london");
    const jupiter = planetTrackableMapObjectId("jupiter");
    const available = {
      moon: true,
      sun: true,
      iss: true,
      cities: new Set(["city.london"]),
      planets: new Set(["jupiter"] as const),
    };
    const fromCity = applyTrackableMapObjectClick({
      current: selection(null, "position"),
      hits: [hit(london, 40, 40)],
      pointerX: 40,
      pointerY: 40,
      panBecameActive: false,
      available,
    });
    expect(fromCity).toEqual(selection(london, "position"));
    expect(fromCity).toEqual(setTrackingTarget(selection(null, "position"), london, available));
    const fromPlanet = applyTrackableMapObjectClick({
      current: selection(london, "longitude"),
      hits: [hit(jupiter, 10, 10)],
      pointerX: 10,
      pointerY: 10,
      panBecameActive: false,
      available,
    });
    expect(fromPlanet).toEqual(selection(jupiter, "longitude"));
    const same = applyTrackableMapObjectClick({
      current: fromPlanet,
      hits: [hit(jupiter, 10, 10)],
      pointerX: 10,
      pointerY: 10,
      panBecameActive: false,
      available,
    });
    expect(same).toEqual(fromPlanet);
    expect(trackingSelectionTransition(fromPlanet, same)).toMatchObject({
      selectionChanged: false,
      reinitializeCamera: false,
      reinitializeContinuity: false,
    });
  });

  it("gives wrapped city copies one identity and prefers nearest center, then tie key", () => {
    const london = cityTrackableMapObjectId("city.london");
    const copies = collectWrappedPointGlyphCopies({
      lonDeg: 0,
      latDeg: 10,
      viewportWidthPx: 800,
      viewportHeightPx: 400,
      camera: clampSceneCamera({ ...IDENTITY_SCENE_CAMERA, centerU: 0 }),
      frame: EARTH_FIXED_SCENE_REFERENCE_FRAME,
      renderedRadiusPx: 4,
      xClipRadiusMultiple: 8,
    });
    const hits = hitTargetsFromGlyphCopies(london, copies, 800, 400);
    expect(hits.length).toBeGreaterThan(1);
    expect(hits.every((row) => trackableMapObjectIdEquals(row.target, london))).toBe(true);
    const jupiter = planetTrackableMapObjectId("jupiter");
    const overlap = [hit(london, 0, 0, 20), hit(jupiter, 0, 0, 20), hit("moon", 0, 0, 20)];
    expect(pickTrackableMapObjectHit(overlap, 0, 0)?.target).toBe("moon");
    const cityPlanet = [hit(london, 0, 0, 20), hit(jupiter, 0, 0, 20)];
    expect(pickTrackableMapObjectHit(cityPlanet, 0, 0)?.target).toEqual(jupiter);
  });
});

