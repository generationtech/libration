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
 * Runtime policy for Moon- and Sun-anchored scene frames.
 *
 * Continuity (same deterministic policy for both anchors):
 * - While an anchored frame remains active, each new canonical longitude
 *   follows the previous continuous anchor (nearest equivalent).
 *   Ordinary animation, Demo/high-speed time, direct time selection, and
 *   jumps all use this path so the map does not jump ~360° at ±180°.
 * - A new scene/frame epoch reinitializes from the canonical longitude
 *   (no multi-turn carry): first entry into an anchored frame, reload,
 *   and switching among Earth-fixed / Moon modes / Sun modes.
 *   Demo start/reset while already in an anchored frame still follows
 *   (a time jump, not a new frame epoch).
 * - Latitude has no continuity state: it is the current sublunar or
 *   subsolar latitude for the canonical UTC instant.
 *
 * Camera: switching among the production frame configurations resets
 * the camera to identity. Reset view resets the camera only and does not
 * change the frame.
 */

import { IDENTITY_SCENE_CAMERA, type SceneCamera } from "./sceneCamera";
import {
  continuousLongitudeFollowingCanonicalDeg,
  rebaseContinuousLongitudeDeg,
} from "./longitudeContinuity";
import {
  EARTH_FIXED_SCENE_REFERENCE_FRAME,
  moonLongitudeLockedSceneReferenceFrame,
  moonPositionLockedSceneReferenceFrame,
  sunLongitudeLockedSceneReferenceFrame,
  sunPositionLockedSceneReferenceFrame,
  type SceneReferenceFrame,
} from "./sceneReferenceFrame";

export type SceneReferenceFrameUiKind =
  | "earthFixed"
  | "moonLongitudeLocked"
  | "moonPositionLocked"
  | "sunLongitudeLocked"
  | "sunPositionLocked";

export type MoonAnchorEpochPolicy = "follow" | "reinitialize";

export type AnchorEpochPolicy = MoonAnchorEpochPolicy;

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

export function isAnchoredSceneReferenceFrameUiKind(
  kind: SceneReferenceFrameUiKind,
): boolean {
  return (
    isMoonAnchoredSceneReferenceFrameUiKind(kind) ||
    isSunAnchoredSceneReferenceFrameUiKind(kind)
  );
}

/**
 * Advance or replace a continuous longitude anchor.
 *
 * `previousContinuousLonDeg === null` always reinitializes (no prior epoch).
 * Shared by Moon and Sun; not a generic entity-frame type.
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

export function nextMoonAnchorContinuousLonDeg(args: {
  readonly previousContinuousLonDeg: number | null;
  readonly nextCanonicalLonDeg: number;
  readonly policy: MoonAnchorEpochPolicy;
}): number {
  return nextAnchorContinuousLonDeg(args);
}

export function sceneReferenceFrameFromUiKind(
  kind: SceneReferenceFrameUiKind,
  continuousAnchorLonDeg: number,
  anchorLatDeg: number,
): SceneReferenceFrame {
  switch (kind) {
    case "earthFixed":
      return EARTH_FIXED_SCENE_REFERENCE_FRAME;
    case "moonLongitudeLocked":
      return moonLongitudeLockedSceneReferenceFrame(continuousAnchorLonDeg, anchorLatDeg);
    case "moonPositionLocked":
      return moonPositionLockedSceneReferenceFrame(continuousAnchorLonDeg, anchorLatDeg);
    case "sunLongitudeLocked":
      return sunLongitudeLockedSceneReferenceFrame(continuousAnchorLonDeg, anchorLatDeg);
    case "sunPositionLocked":
      return sunPositionLockedSceneReferenceFrame(continuousAnchorLonDeg, anchorLatDeg);
  }
}

/**
 * Switching the production scene-frame configuration recenters to the identity
 * view of the destination frame so a leftover pan/zoom is not re-interpreted
 * in a different coordinate system. Scale is not preserved.
 */
export function sceneCameraAfterReferenceFrameKindChange(): SceneCamera {
  return IDENTITY_SCENE_CAMERA;
}
