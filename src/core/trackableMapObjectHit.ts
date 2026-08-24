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
 * Scene-space hit testing for trackable point-like map objects (LIB-091).
 *
 * Click-to-track resolves a rendered glyph copy to a stable
 * {@link TrackableMapObjectId} and then calls {@link setTrackingTarget}.
 * It does not construct scene frames, mutate camera state, or synthesize
 * chrome control events.
 *
 * Hit testing uses final scene/CSS coordinates of actually rendered glyph
 * copies (including wrapped world copies). Identity is never wrap-copy
 * index, label text, color, or geographic lon/lat.
 *
 * Hit-area policy: at least the painted marker radius, plus
 * {@link TRACKABLE_MAP_OBJECT_HIT_PADDING_PX}, floored at
 * {@link TRACKABLE_MAP_OBJECT_HIT_MIN_RADIUS_PX}. Large enough for
 * accessible clicking; small enough to avoid frequent accidental selection.
 *
 * Overlap policy: nearest hit-target center to the pointer wins. If two
 * distances are effectively tied, {@link trackableMapObjectIdTieKey} is the
 * deterministic secondary key (moon, then sun, then iss, then planets,
 * then Milky Way tagged points, then cities).
 */

import {
  IDENTITY_SCENE_CAMERA,
  sceneCameraHorizontalWorldCopyOffsets,
  sceneXFromLongitudeDeg,
  sceneXShiftForWorldCopy,
  sceneYFromLatitudeDeg,
  type SceneCamera,
} from "./sceneCamera";
import {
  EARTH_FIXED_SCENE_REFERENCE_FRAME,
  type SceneReferenceFrame,
} from "./sceneReferenceFrame";
import {
  TRACKABLE_MAP_OBJECT_IDS,
  isNamedTrackableMapObjectId,
  trackableMapObjectIdTieKey,
  type TrackableMapObjectId,
} from "./trackableMapObject";
import {
  setTrackingTarget,
  type TrackableTargetAvailability,
  type TrackingSelectionState,
} from "./trackingSelection";

/** Extra CSS pixels beyond the painted glyph radius. */
export const TRACKABLE_MAP_OBJECT_HIT_PADDING_PX = 3;

/** Floor so small ISS/Moon discs remain clickable. */
export const TRACKABLE_MAP_OBJECT_HIT_MIN_RADIUS_PX = 8;

/** Distances closer than this are treated as a tie. */
export const TRACKABLE_MAP_OBJECT_HIT_TIE_EPSILON_PX = 0.5;

export type TrackableMapObjectHitTarget = {
  readonly target: TrackableMapObjectId;
  readonly sceneX: number;
  readonly sceneY: number;
  readonly hitRadiusPx: number;
};

export type TrackableMapObjectGlyphCopy = {
  readonly sceneX: number;
  readonly sceneY: number;
  readonly renderedRadiusPx: number;
};

export function trackableMapObjectHitRadiusPx(renderedRadiusPx: number): number {
  return Math.max(
    renderedRadiusPx + TRACKABLE_MAP_OBJECT_HIT_PADDING_PX,
    TRACKABLE_MAP_OBJECT_HIT_MIN_RADIUS_PX,
  );
}

export function trackableMapObjectHitTieRank(target: TrackableMapObjectId): number {
  return isNamedTrackableMapObjectId(target)
    ? TRACKABLE_MAP_OBJECT_IDS.indexOf(target)
    : Number.POSITIVE_INFINITY;
}

export function trackableMapObjectHitTieKey(target: TrackableMapObjectId): string {
  return trackableMapObjectIdTieKey(target);
}

/**
 * Enumerate wrapped scene copies of a lon/lat point glyph using the same
 * camera/frame mapping and x-clip as Moon/Sun marker plans.
 */
export function collectWrappedPointGlyphCopies(options: {
  lonDeg: number;
  latDeg: number;
  viewportWidthPx: number;
  viewportHeightPx: number;
  camera?: SceneCamera;
  frame?: SceneReferenceFrame;
  renderedRadiusPx: number;
  /** Skip copies whose center is further than this from the scene x-range. */
  xClipRadiusMultiple?: number;
}): TrackableMapObjectGlyphCopy[] {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  const r = options.renderedRadiusPx;
  if (!(w > 0) || !(h > 0) || !(r > 0)) {
    return [];
  }
  const camera = options.camera ?? IDENTITY_SCENE_CAMERA;
  const frame = options.frame ?? EARTH_FIXED_SCENE_REFERENCE_FRAME;
  const clipMul = options.xClipRadiusMultiple ?? 4;
  const baseX = sceneXFromLongitudeDeg(options.lonDeg, w, camera, frame);
  const sceneY = sceneYFromLatitudeDeg(options.latDeg, h, camera, frame);
  const copies: TrackableMapObjectGlyphCopy[] = [];
  for (const k of sceneCameraHorizontalWorldCopyOffsets(camera, w)) {
    const sceneX = baseX + sceneXShiftForWorldCopy(w, camera, k);
    if (sceneX < -r * clipMul || sceneX > w + r * clipMul) {
      continue;
    }
    copies.push({ sceneX, sceneY, renderedRadiusPx: r });
  }
  return copies;
}

export function hitTargetsFromGlyphCopies(
  target: TrackableMapObjectId,
  copies: readonly TrackableMapObjectGlyphCopy[],
  viewportWidthPx: number,
  viewportHeightPx: number,
): TrackableMapObjectHitTarget[] {
  const hits: TrackableMapObjectHitTarget[] = [];
  for (const copy of copies) {
    const hitRadiusPx = trackableMapObjectHitRadiusPx(copy.renderedRadiusPx);
    if (
      !hitCircleIntersectsScene(
        copy.sceneX,
        copy.sceneY,
        hitRadiusPx,
        viewportWidthPx,
        viewportHeightPx,
      )
    ) {
      continue;
    }
    hits.push({
      target,
      sceneX: copy.sceneX,
      sceneY: copy.sceneY,
      hitRadiusPx,
    });
  }
  return hits;
}

function hitCircleIntersectsScene(
  x: number,
  y: number,
  radiusPx: number,
  viewportWidthPx: number,
  viewportHeightPx: number,
): boolean {
  const nearestX = Math.max(0, Math.min(viewportWidthPx, x));
  const nearestY = Math.max(0, Math.min(viewportHeightPx, y));
  return Math.hypot(x - nearestX, y - nearestY) <= radiusPx;
}

/**
 * Nearest center within its hit radius. Tied distances use stable id order.
 */
export function pickTrackableMapObjectHit(
  hits: readonly TrackableMapObjectHitTarget[],
  pointerX: number,
  pointerY: number,
): TrackableMapObjectHitTarget | null {
  let best: TrackableMapObjectHitTarget | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const hit of hits) {
    const dist = Math.hypot(pointerX - hit.sceneX, pointerY - hit.sceneY);
    if (dist > hit.hitRadiusPx) {
      continue;
    }
    if (best === null) {
      best = hit;
      bestDist = dist;
      continue;
    }
    if (dist + TRACKABLE_MAP_OBJECT_HIT_TIE_EPSILON_PX < bestDist) {
      best = hit;
      bestDist = dist;
      continue;
    }
    if (Math.abs(dist - bestDist) <= TRACKABLE_MAP_OBJECT_HIT_TIE_EPSILON_PX) {
      if (trackableMapObjectHitTieKey(hit.target) < trackableMapObjectHitTieKey(best.target)) {
        best = hit;
        bestDist = dist;
      }
    }
  }
  return best;
}

/**
 * Canonical click-to-track transition. Pan sequences must pass
 * `panBecameActive: true` so pointer-up does not also select.
 * Empty geography and same-target clicks leave selection unchanged.
 */
export function applyTrackableMapObjectClick(options: {
  current: TrackingSelectionState;
  hits: readonly TrackableMapObjectHitTarget[];
  pointerX: number;
  pointerY: number;
  panBecameActive: boolean;
  available: TrackableTargetAvailability;
}): TrackingSelectionState {
  if (options.panBecameActive) {
    return options.current;
  }
  const hit = pickTrackableMapObjectHit(
    options.hits,
    options.pointerX,
    options.pointerY,
  );
  if (hit === null) {
    return options.current;
  }
  return setTrackingTarget(options.current, hit.target, options.available);
}
