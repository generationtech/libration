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
 * Runtime policy for anchored scene frames (Moon, Sun, and ISS targets).
 *
 * Continuity (target-agnostic; depends on longitude values, not object type):
 * - While an anchored frame remains active, each new canonical longitude
 *   follows the previous continuous anchor (nearest equivalent).
 *   Ordinary animation, Demo/high-speed time, direct time selection, and
 *   jumps all use this path so the map does not jump ~360° at ±180°.
 * - A new scene/frame epoch reinitializes from the canonical longitude
 *   (no multi-turn carry): first entry into an anchored frame, reload,
 *   and switching among Earth-fixed / Moon / Sun / ISS modes.
 *   Continuity is tracking-session-local: switching target clears the
 *   previous continuous longitude rather than carrying it across objects.
 *   Demo start/reset while already in an anchored frame still follows
 *   (a time jump, not a new frame epoch).
 * - Latitude has no continuity state: it is the resolved target latitude
 *   for the canonical UTC instant, supplied by the caller after target
 *   resolution.
 *
 * Camera: switching among the production frame configurations reinitializes
 * camera policy (identity for Earth-fixed / longitude-lock; automatic cover
 * for position-lock). Reset view restores that frame's default camera and
 * does not change the frame. Position-lock default is cover scale, not
 * necessarily scale = 1.
 *
 * This module owns anchored-frame runtime policy (longitude continuity and
 * camera reset on an effective frame-configuration change). User-facing
 * tracking selection lives in `trackingSelection.ts`. Target resolution
 * lives in `trackableMapObject.ts`. Production frames live in
 * `sceneReferenceFrame.ts`. Combined UI kind strings remain as compatibility
 * aliases; new UI must not depend on them.
 */

import { IDENTITY_SCENE_CAMERA, type SceneCamera } from "./sceneCamera";
import {
  continuousLongitudeFollowingCanonicalDeg,
  rebaseContinuousLongitudeDeg,
} from "./longitudeContinuity";
import {
  type AnchoredSceneFrameLockMode,
  type SceneReferenceFrame,
  type TrackableMapObjectId,
} from "./sceneReferenceFrame";
import {
  sceneReferenceFrameFromTrackingSelection,
  type TrackingSelectionState,
} from "./trackingSelection";

export type SceneReferenceFrameUiKind =
  | "earthFixed"
  | "moonLongitudeLocked"
  | "moonPositionLocked"
  | "sunLongitudeLocked"
  | "sunPositionLocked"
  | "issLongitudeLocked"
  | "issPositionLocked";

export const SCENE_REFERENCE_FRAME_UI_KINDS = [
  "earthFixed",
  "moonLongitudeLocked",
  "moonPositionLocked",
  "sunLongitudeLocked",
  "sunPositionLocked",
  "issLongitudeLocked",
  "issPositionLocked",
] as const satisfies readonly SceneReferenceFrameUiKind[];

export type AnchorEpochPolicy = "follow" | "reinitialize";

/** @deprecated Use {@link AnchorEpochPolicy}. */
export type MoonAnchorEpochPolicy = AnchorEpochPolicy;

export function isMoonAnchoredSceneReferenceFrameUiKind(
  kind: SceneReferenceFrameUiKind,
): boolean {
  return kind === "moonLongitudeLocked" || kind === "moonPositionLocked";
}

export function isSunAnchoredSceneReferenceFrameUiKind(
  kind: SceneReferenceFrameUiKind,
): boolean {
  return kind === "sunLongitudeLocked" || kind === "sunPositionLocked";
}

export function isIssAnchoredSceneReferenceFrameUiKind(
  kind: SceneReferenceFrameUiKind,
): boolean {
  return kind === "issLongitudeLocked" || kind === "issPositionLocked";
}

export function isAnchoredSceneReferenceFrameUiKind(
  kind: SceneReferenceFrameUiKind,
): boolean {
  return (
    isMoonAnchoredSceneReferenceFrameUiKind(kind) ||
    isSunAnchoredSceneReferenceFrameUiKind(kind) ||
    isIssAnchoredSceneReferenceFrameUiKind(kind)
  );
}

export function isPositionLockedSceneReferenceFrameUiKind(
  kind: SceneReferenceFrameUiKind,
): boolean {
  return (
    kind === "moonPositionLocked" ||
    kind === "sunPositionLocked" ||
    kind === "issPositionLocked"
  );
}

export function trackableMapObjectIdFromUiKind(
  kind: SceneReferenceFrameUiKind,
): TrackableMapObjectId | null {
  if (kind === "earthFixed") {
    return null;
  }
  if (isMoonAnchoredSceneReferenceFrameUiKind(kind)) {
    return "moon";
  }
  if (isSunAnchoredSceneReferenceFrameUiKind(kind)) {
    return "sun";
  }
  return "iss";
}

/** @deprecated Use {@link trackableMapObjectIdFromUiKind}. */
export function sceneFrameAnchorKindFromUiKind(
  kind: SceneReferenceFrameUiKind,
): TrackableMapObjectId | null {
  return trackableMapObjectIdFromUiKind(kind);
}

export function anchoredSceneFrameLockModeFromUiKind(
  kind: SceneReferenceFrameUiKind,
): AnchoredSceneFrameLockMode | null {
  if (kind === "earthFixed") {
    return null;
  }
  return isPositionLockedSceneReferenceFrameUiKind(kind) ? "position" : "longitude";
}

/**
 * ISS tracking is unavailable unless an authoritative ISS position exists.
 * An active ISS UI kind must fall back to Earth-fixed rather than construct
 * an anchored frame from missing coordinates. Moon and Sun remain always
 * resolvable.
 */
export function sceneReferenceFrameUiKindWhenTargetUnavailable(
  kind: SceneReferenceFrameUiKind,
  available: Readonly<Record<TrackableMapObjectId, boolean>>,
): SceneReferenceFrameUiKind {
  const target = trackableMapObjectIdFromUiKind(kind);
  if (target !== null && available[target] === false) {
    return "earthFixed";
  }
  return kind;
}

/**
 * Advance or replace a continuous longitude anchor.
 *
 * `previousContinuousLonDeg === null` always reinitializes (no prior epoch).
 * Shared by every production anchor; depends on longitude values only.
 */
export function nextAnchorContinuousLonDeg(args: {
  readonly previousContinuousLonDeg: number | null;
  readonly nextCanonicalLonDeg: number;
  readonly policy: AnchorEpochPolicy;
}): number {
  const canonical = args.nextCanonicalLonDeg;
  if (args.previousContinuousLonDeg === null || args.policy === "reinitialize") {
    return rebaseContinuousLongitudeDeg(canonical);
  }
  return rebaseContinuousLongitudeDeg(
    continuousLongitudeFollowingCanonicalDeg(args.previousContinuousLonDeg, canonical),
  );
}

/** @deprecated Use {@link nextAnchorContinuousLonDeg}. */
export function nextMoonAnchorContinuousLonDeg(args: {
  readonly previousContinuousLonDeg: number | null;
  readonly nextCanonicalLonDeg: number;
  readonly policy: AnchorEpochPolicy;
}): number {
  return nextAnchorContinuousLonDeg(args);
}

/** @deprecated Combined UI kinds. Prefer {@link trackingSelectionFromUiKind}. */
export function trackingSelectionFromUiKind(
  kind: SceneReferenceFrameUiKind,
): TrackingSelectionState {
  return {
    target: trackableMapObjectIdFromUiKind(kind),
    rememberedMode: anchoredSceneFrameLockModeFromUiKind(kind) ?? "position",
  };
}

export function sceneReferenceFrameFromUiKind(
  kind: SceneReferenceFrameUiKind,
  continuousAnchorLonDeg: number,
  anchorLatDeg: number,
): SceneReferenceFrame {
  return sceneReferenceFrameFromTrackingSelection(
    trackingSelectionFromUiKind(kind),
    continuousAnchorLonDeg,
    anchorLatDeg,
  );
}

/**
 * Switching the production scene-frame configuration clears leftover pan/zoom
 * so it is not re-interpreted in a different coordinate system. Returns
 * identity; the render loop then applies automatic cover when the destination
 * is position-lock. Scale is not preserved. Manual zoom override is not
 * carried across kinds.
 */
export function sceneCameraAfterReferenceFrameKindChange(): SceneCamera {
  return IDENTITY_SCENE_CAMERA;
}
