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
 * Runtime policy for the Moon longitude-locked scene frame (LIB-083).
 *
 * Continuity:
 * - While Moon longitude-lock remains active, each new canonical sublunar
 *   longitude follows the previous continuous anchor (nearest equivalent).
 *   Ordinary animation, Demo/high-speed time, direct time selection, and
 *   jumps all use this path so the map does not jump ~360° at ±180°.
 * - A new scene/frame epoch reinitializes from the canonical longitude
 *   (no multi-turn carry): first entry into Moon longitude-lock, reload,
 *   and switching back from Earth-fixed. Demo start/reset while already in
 *   Moon longitude-lock still follows (a time jump, not a new frame epoch).
 *
 * Camera: switching Earth-fixed ↔ Moon longitude-lock resets the camera to
 * identity. Reset view resets the camera only and does not change the frame.
 */

import { IDENTITY_SCENE_CAMERA, type SceneCamera } from "./sceneCamera";
import {
  continuousLongitudeFollowingCanonicalDeg,
  rebaseContinuousLongitudeDeg,
} from "./longitudeContinuity";

export type SceneReferenceFrameUiKind = "earthFixed" | "moonLongitudeLocked";

export type MoonAnchorEpochPolicy = "follow" | "reinitialize";

/**
 * Advance or replace the continuous lunar anchor.
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
 * Switching the production scene-frame kind recenters to the identity view of
 * the destination frame so a leftover pan/zoom is not re-interpreted in a
 * different coordinate system. Scale is not preserved.
 */
export function sceneCameraAfterReferenceFrameKindChange(): SceneCamera {
  return IDENTITY_SCENE_CAMERA;
}
