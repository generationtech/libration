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
  sceneCameraCoverPolicyAfterFrameKindChange,
  sceneCameraCoverPolicyForFrame,
} from "./sceneCamera";
import { sceneCameraAfterReferenceFrameKindChange } from "./sceneFrameAnchor";
import { EARTH_FIXED_SCENE_REFERENCE_FRAME } from "./sceneReferenceFrame";
import {
  DEFAULT_TRACKING_LOCK_MODE,
  DEFAULT_TRACKING_SELECTION,
  TRACKING_MODE_SELECT_VALUES,
  TRACKING_TARGET_SELECT_VALUES,
  applyTrackingTargetAvailability,
  isTrackingModeActive,
  isTrackingSelectionPositionLocked,
  parseTrackingModeSelectValue,
  parseTrackingTargetSelectValue,
  sceneReferenceFrameFromTrackingSelection,
  setTrackingMode,
  setTrackingTarget,
  trackingSelectionEffectiveLockMode,
  trackingSelectionEquals,
  trackingSelectionTransition,
  trackingTargetSelectValue,
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

describe("tracking selection model", () => {
  it("admits Earth-fixed and each Moon/Sun/ISS lock combination", () => {
    const states: TrackingSelectionState[] = [
      selection(null),
      selection("moon", "longitude"),
      selection("moon", "position"),
      selection("sun", "longitude"),
      selection("sun", "position"),
      selection("iss", "longitude"),
      selection("iss", "position"),
    ];
    expect(states.map((s) => [s.target, trackingSelectionEffectiveLockMode(s)])).toEqual([
      [null, null],
      ["moon", "longitude"],
      ["moon", "position"],
      ["sun", "longitude"],
      ["sun", "position"],
      ["iss", "longitude"],
      ["iss", "position"],
    ]);
    expect(isTrackingModeActive(selection(null))).toBe(false);
    expect(isTrackingModeActive(selection("moon"))).toBe(true);
    expect(DEFAULT_TRACKING_SELECTION).toEqual({
      target: null,
      rememberedMode: DEFAULT_TRACKING_LOCK_MODE,
    });
    expect(DEFAULT_TRACKING_LOCK_MODE).toBe("position");
  });

  it("maps the target control onto null | moon | sun | iss", () => {
    expect(TRACKING_TARGET_SELECT_VALUES).toEqual(["earthFixed", "moon", "sun", "iss"]);
    expect(parseTrackingTargetSelectValue("earthFixed")).toBeNull();
    expect(parseTrackingTargetSelectValue("moon")).toBe("moon");
    expect(parseTrackingTargetSelectValue("sun")).toBe("sun");
    expect(parseTrackingTargetSelectValue("iss")).toBe("iss");
    expect(parseTrackingTargetSelectValue("earth")).toBeNull();
    expect(parseTrackingTargetSelectValue("moonLongitudeLocked")).toBeNull();
    expect(trackingTargetSelectValue(null)).toBe("earthFixed");
    expect(trackingTargetSelectValue("iss")).toBe("iss");
  });

  it("maps the mode control onto longitude | position", () => {
    expect(TRACKING_MODE_SELECT_VALUES).toEqual(["longitude", "position"]);
    expect(parseTrackingModeSelectValue("longitude")).toBe("longitude");
    expect(parseTrackingModeSelectValue("position")).toBe("position");
    expect(parseTrackingModeSelectValue("moonPositionLocked")).toBeNull();
  });

  it("applies the same selected mode to different targets without combined-kind logic", () => {
    const moonPos = setTrackingTarget(selection(null, "position"), "moon", ALWAYS_AVAILABLE);
    const sunPos = setTrackingTarget(moonPos, "sun", ALWAYS_AVAILABLE);
    const issPos = setTrackingTarget(sunPos, "iss", ALWAYS_AVAILABLE);
    expect(sceneReferenceFrameFromTrackingSelection(moonPos, 10, 5)).toEqual({
      kind: "anchored",
      target: "moon",
      lockMode: "position",
      continuousAnchorLonDeg: 10,
      anchorLatDeg: 5,
    });
    expect(sceneReferenceFrameFromTrackingSelection(sunPos, 10, 5)).toEqual({
      kind: "anchored",
      target: "sun",
      lockMode: "position",
      continuousAnchorLonDeg: 10,
      anchorLatDeg: 5,
    });
    expect(sceneReferenceFrameFromTrackingSelection(issPos, 10, 5)).toEqual({
      kind: "anchored",
      target: "iss",
      lockMode: "position",
      continuousAnchorLonDeg: 10,
      anchorLatDeg: 5,
    });
    const moonLon = setTrackingMode(moonPos, "longitude");
    expect(sceneReferenceFrameFromTrackingSelection(moonLon, 40, 18)).toEqual({
      kind: "anchored",
      target: "moon",
      lockMode: "longitude",
      continuousAnchorLonDeg: 40,
      anchorLatDeg: 18,
    });
  });

  it("retains mode when switching among valid trackable targets", () => {
    const moonPos = setTrackingTarget(DEFAULT_TRACKING_SELECTION, "moon", ALWAYS_AVAILABLE);
    expect(moonPos).toEqual(selection("moon", "position"));
    expect(setTrackingTarget(moonPos, "sun", ALWAYS_AVAILABLE)).toEqual(
      selection("sun", "position"),
    );
    const sunLon = setTrackingMode(selection("sun", "position"), "longitude");
    expect(setTrackingTarget(sunLon, "iss", ALWAYS_AVAILABLE)).toEqual(
      selection("iss", "longitude"),
    );
    expect(setTrackingTarget(selection("iss", "longitude"), "moon", ALWAYS_AVAILABLE)).toEqual(
      selection("moon", "longitude"),
    );
  });

  it("maps no target to Earth-fixed and restores remembered mode when returning", () => {
    const tracked = selection("moon", "longitude");
    const earthFixed = setTrackingTarget(tracked, null, ALWAYS_AVAILABLE);
    expect(earthFixed).toEqual(selection(null, "longitude"));
    expect(isTrackingModeActive(earthFixed)).toBe(false);
    expect(sceneReferenceFrameFromTrackingSelection(earthFixed, 10, 5)).toEqual(
      EARTH_FIXED_SCENE_REFERENCE_FRAME,
    );
    expect(setTrackingTarget(earthFixed, "sun", ALWAYS_AVAILABLE)).toEqual(
      selection("sun", "longitude"),
    );
  });

  it("disables ISS selection when unavailable and falls back if ISS is active", () => {
    const refused = setTrackingTarget(selection("moon", "position"), "iss", ISS_UNAVAILABLE);
    expect(refused).toEqual(selection("moon", "position"));
    const fallback = applyTrackingTargetAvailability(
      selection("iss", "longitude"),
      ISS_UNAVAILABLE,
    );
    expect(fallback).toEqual(selection(null, "longitude"));
    expect(sceneReferenceFrameFromTrackingSelection(fallback, 1, 2)).toEqual(
      EARTH_FIXED_SCENE_REFERENCE_FRAME,
    );
    expect(
      applyTrackingTargetAvailability(selection("sun", "position"), ISS_UNAVAILABLE),
    ).toEqual(selection("sun", "position"));
  });

  it("reinitializes camera when target or effective mode changes, not when Earth-fixed remembers mode", () => {
    const moonPos = selection("moon", "position");
    const sunPos = setTrackingTarget(moonPos, "sun", ALWAYS_AVAILABLE);
    const moonLon = setTrackingMode(moonPos, "longitude");
    const earth = setTrackingTarget(moonPos, null, ALWAYS_AVAILABLE);
    expect(trackingSelectionTransition(moonPos, sunPos)).toMatchObject({
      reinitializeCamera: true,
      reinitializeContinuity: true,
    });
    expect(trackingSelectionTransition(moonPos, moonLon)).toMatchObject({
      reinitializeCamera: true,
      reinitializeContinuity: false,
    });
    expect(trackingSelectionTransition(moonPos, earth)).toMatchObject({
      reinitializeCamera: true,
      reinitializeContinuity: true,
    });
    expect(trackingSelectionTransition(earth, setTrackingMode(earth, "longitude"))).toMatchObject(
      {
        reinitializeCamera: false,
        reinitializeContinuity: false,
      },
    );
    expect(sceneCameraAfterReferenceFrameKindChange()).toEqual(IDENTITY_SCENE_CAMERA);
    expect(sceneCameraCoverPolicyAfterFrameKindChange(true)).toBe("auto");
    expect(sceneCameraCoverPolicyAfterFrameKindChange(false)).toBe("off");
  });

  it("arms auto-cover only for tracked position-lock", () => {
    const pos = sceneReferenceFrameFromTrackingSelection(selection("moon", "position"), 0, 40);
    const lon = sceneReferenceFrameFromTrackingSelection(selection("iss", "longitude"), 0, 40);
    expect(isTrackingSelectionPositionLocked(selection("moon", "position"))).toBe(true);
    expect(isTrackingSelectionPositionLocked(selection("moon", "longitude"))).toBe(false);
    expect(isTrackingSelectionPositionLocked(selection(null, "position"))).toBe(false);
    expect(sceneCameraCoverPolicyForFrame(pos)).toBe("auto");
    expect(sceneCameraCoverPolicyForFrame(lon)).toBe("off");
    expect(
      sceneCameraCoverPolicyForFrame(
        sceneReferenceFrameFromTrackingSelection(selection(null, "position"), 0, 0),
      ),
    ).toBe("off");
  });

  it("does not treat Reset as a target or mode change", () => {
    const current = selection("sun", "position");
    expect(trackingSelectionEquals(current, current)).toBe(true);
    expect(trackingSelectionTransition(current, current).selectionChanged).toBe(false);
    expect(trackingSelectionTransition(current, current).reinitializeCamera).toBe(false);
  });
});
