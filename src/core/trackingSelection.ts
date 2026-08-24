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

/**
 * Runtime tracking selection (LIB-090).
 *
 * User-facing tracking is two orthogonal concepts:
 * - Tracking target — which map object is tracked, or none (Earth-fixed)
 * - Tracking mode — longitude-lock or position-lock
 *
 * Distinct from:
 * - target resolution (`trackableMapObject.ts`)
 * - production `SceneReferenceFrame` (`sceneReferenceFrame.ts`)
 * - camera (`sceneCamera.ts`)
 * - longitude continuity / camera-reset policy (`sceneFrameAnchor.ts`)
 *
 * Earth-fixed is the no-target state. Earth is not a `TrackableMapObjectId`.
 * Mode is a runtime preference retained across target switches; it is not
 * persisted. Reload returns to Earth-fixed with the default mode.
 *
 * Direct rendered-object selection (LIB-091) must call
 * {@link setTrackingTarget} rather than synthesizing chrome events or
 * constructing frames in UI code. Hit testing lives outside this module.
 */

import {
  EARTH_FIXED_SCENE_REFERENCE_FRAME,
  anchoredSceneReferenceFrame,
  type AnchoredSceneFrameLockMode,
  type SceneReferenceFrame,
} from "./sceneReferenceFrame";
import {
  isTrackableMapObjectId,
  type TrackableMapObjectId,
} from "./trackableMapObject";

export const DEFAULT_TRACKING_LOCK_MODE: AnchoredSceneFrameLockMode = "position";

export const TRACKING_TARGET_SELECT_VALUES = ["earthFixed", "moon", "sun", "iss"] as const;
export type TrackingTargetSelectValue = (typeof TRACKING_TARGET_SELECT_VALUES)[number];

export const TRACKING_MODE_SELECT_VALUES = ["longitude", "position"] as const;
export type TrackingModeSelectValue = (typeof TRACKING_MODE_SELECT_VALUES)[number];

/**
 * Runtime chrome/selection state. `rememberedMode` is kept even when
 * `target === null` so Earth-fixed does not erase the last lock mode.
 */
export type TrackingSelectionState = {
  readonly target: TrackableMapObjectId | null;
  readonly rememberedMode: AnchoredSceneFrameLockMode;
};

export const DEFAULT_TRACKING_SELECTION: TrackingSelectionState = {
  target: null,
  rememberedMode: DEFAULT_TRACKING_LOCK_MODE,
};

export type TrackableTargetAvailability = Readonly<Record<TrackableMapObjectId, boolean>>;

export type TrackingSelectionTransition = {
  readonly previous: TrackingSelectionState;
  readonly next: TrackingSelectionState;
  readonly selectionChanged: boolean;
  readonly reinitializeContinuity: boolean;
  readonly reinitializeCamera: boolean;
};

export function trackingSelectionEquals(
  a: TrackingSelectionState,
  b: TrackingSelectionState,
): boolean {
  return a.target === b.target && a.rememberedMode === b.rememberedMode;
}

export function isTrackingModeActive(selection: TrackingSelectionState): boolean {
  return selection.target !== null;
}

export function isTrackingSelectionPositionLocked(
  selection: TrackingSelectionState,
): boolean {
  return selection.target !== null && selection.rememberedMode === "position";
}

export function trackingSelectionEffectiveLockMode(
  selection: TrackingSelectionState,
): AnchoredSceneFrameLockMode | null {
  return selection.target === null ? null : selection.rememberedMode;
}

/**
 * Canonical operation for chrome and for rendered-object click-to-track.
 * Refuses an unavailable target rather than silently substituting another.
 * Does not change remembered mode.
 */
export function setTrackingTarget(
  current: TrackingSelectionState,
  target: TrackableMapObjectId | null,
  available: TrackableTargetAvailability,
): TrackingSelectionState {
  if (target === null) {
    return { target: null, rememberedMode: current.rememberedMode };
  }
  if (available[target] === false) {
    return current;
  }
  return { target, rememberedMode: current.rememberedMode };
}

export function setTrackingMode(
  current: TrackingSelectionState,
  mode: AnchoredSceneFrameLockMode,
): TrackingSelectionState {
  return { target: current.target, rememberedMode: mode };
}

/**
 * When the selected target becomes unavailable (ISS policy), fall back to
 * Earth-fixed and keep the remembered mode.
 */
export function applyTrackingTargetAvailability(
  current: TrackingSelectionState,
  available: TrackableTargetAvailability,
): TrackingSelectionState {
  if (current.target === null || available[current.target] !== false) {
    return current;
  }
  return { target: null, rememberedMode: current.rememberedMode };
}

export function sceneReferenceFrameFromTrackingSelection(
  selection: TrackingSelectionState,
  continuousAnchorLonDeg: number,
  anchorLatDeg: number,
): SceneReferenceFrame {
  if (selection.target === null) {
    return EARTH_FIXED_SCENE_REFERENCE_FRAME;
  }
  return anchoredSceneReferenceFrame({
    target: selection.target,
    lockMode: selection.rememberedMode,
    continuousAnchorLonDeg,
    anchorLatDeg,
  });
}

export function trackingSelectionChangesEffectiveFrame(
  previous: TrackingSelectionState,
  next: TrackingSelectionState,
): boolean {
  if (previous.target !== next.target) {
    return true;
  }
  if (next.target === null) {
    return false;
  }
  return previous.rememberedMode !== next.rememberedMode;
}

export function trackingSelectionTransition(
  previous: TrackingSelectionState,
  next: TrackingSelectionState,
): TrackingSelectionTransition {
  return {
    previous,
    next,
    selectionChanged: !trackingSelectionEquals(previous, next),
    reinitializeContinuity: previous.target !== next.target,
    reinitializeCamera: trackingSelectionChangesEffectiveFrame(previous, next),
  };
}

export function trackingTargetSelectValue(
  target: TrackableMapObjectId | null,
): TrackingTargetSelectValue {
  return target === null ? "earthFixed" : target;
}

export function parseTrackingTargetSelectValue(
  value: string,
): TrackableMapObjectId | null {
  if (value === "earthFixed") {
    return null;
  }
  return isTrackableMapObjectId(value) ? value : null;
}

export function parseTrackingModeSelectValue(
  value: string,
): AnchoredSceneFrameLockMode | null {
  return value === "longitude" || value === "position" ? value : null;
}
