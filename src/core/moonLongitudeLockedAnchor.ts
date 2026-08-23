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
 * Runtime policy for Moon-anchored scene frames (LIB-083 longitude-lock,
 * LIB-084 position-lock).
 *
 * Continuity:
 * - While a Moon-anchored frame remains active, each new canonical sublunar
 *   longitude follows the previous continuous anchor (nearest equivalent).
 *   Ordinary animation, Demo/high-speed time, direct time selection, and
 *   jumps all use this path so the map does not jump ~360° at ±180°.
 * - A new scene/frame epoch reinitializes from the canonical longitude
 *   (no multi-turn carry): first entry into a Moon-anchored frame, reload,
 *   and switching among Earth-fixed / longitude-lock / position-lock.
 *   Demo start/reset while already in a Moon-anchored frame still follows
 *   (a time jump, not a new frame epoch).
 * - Latitude has no continuity state: it is the current sublunar latitude.
 *
 * Camera: switching among the three production frame configurations resets
 * the camera to identity. Reset view resets the camera only and does not
 * change the frame.
 */

import { IDENTITY_SCENE_CAMERA, type SceneCamera } from "./sceneCamera";
import {
  continuousLongitudeFollowingCanonicalDeg,
  rebaseContinuousLongitudeDeg,
} from "./longitudeContinuity";

export type SceneReferenceFrameUiKind =
  | "earthFixed"
  | "moonLongitudeLocked"
  | "moonPositionLocked";

export type MoonAnchorEpochPolicy = "follow" | "reinitialize";

export function isMoonAnchoredSceneReferenceFrameUiKind(
  kind: SceneReferenceFrameUiKind,
): boolean {
  return kind === "moonLongitudeLocked" || kind === "moonPositionLocked";
}

/**
 * Advance or replace the continuous lunar longitude anchor.
 *
 * `previousContinuousLonDeg === null` always reinitializes (no prior epoch).
 */
export function nextMoonAnchorContinuousLonDeg(args: {
  readonly previousContinuousLonDeg: number | null;
  readonly nextCanonicalLonDeg: number;
  readonly policy: MoonAnchorEpochPolicy;
}): number {
  const canonical = args.nextCanonicalLonDeg;
  if (args.previousContinuousLonDeg === null || args.policy === "reinitialize") {
    return rebaseContinuousLongitudeDeg(canonical);
  }
  return rebaseContinuousLongitudeDeg(
    continuousLongitudeFollowingCanonicalDeg(args.previousContinuousLonDeg, canonical),
  );
}

/**
 * Switching the production scene-frame configuration recenters to the identity
 * view of the destination frame so a leftover pan/zoom is not re-interpreted
 * in a different coordinate system. Scale is not preserved.
 */
export function sceneCameraAfterReferenceFrameKindChange(): SceneCamera {
  return IDENTITY_SCENE_CAMERA;
}
