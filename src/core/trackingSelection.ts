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
 * Runtime tracking selection (LIB-090 / LIB-092 / LIB-093).
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
 *
 * Native `<select>` option values are UI encoding only. They are not
 * production identity and must not be consumed by reference-frame math.
 */

import {
  EARTH_FIXED_SCENE_REFERENCE_FRAME,
  anchoredSceneReferenceFrame,
  type AnchoredSceneFrameLockMode,
  type SceneReferenceFrame,
} from "./sceneReferenceFrame";
import { isPlanetaryBodyId, type PlanetaryBodyId } from "./planetaryBodies";
import {
  cityTrackableMapObjectId,
  isMilkyWayPointId,
  isNamedTrackableMapObjectId,
  milkyWayPointTrackableMapObjectId,
  planetTrackableMapObjectId,
  trackableMapObjectIdEquals,
  type MilkyWayPointId,
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

/**
 * Named targets are unavailable only when explicitly `false`. City, planet,
 * and Milky Way point targets are available only when present in the
 * corresponding set (planet-style omit: not listed when not rendered).
 */
export type TrackableTargetAvailability = {
  readonly moon: boolean;
  readonly sun: boolean;
  readonly iss: boolean;
  readonly cities?: ReadonlySet<string>;
  readonly planets?: ReadonlySet<PlanetaryBodyId>;
  readonly milkyWayPoints?: ReadonlySet<MilkyWayPointId>;
};

export type TrackingSelectionTransition = {
  readonly previous: TrackingSelectionState;
  readonly next: TrackingSelectionState;
  readonly selectionChanged: boolean;
  readonly reinitializeContinuity: boolean;
  readonly reinitializeCamera: boolean;
};

export type TrackingTargetSelectOption = {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
};

export type TrackingTargetSelectGroup = {
  readonly label: string;
  readonly options: readonly TrackingTargetSelectOption[];
};

export type TrackingTargetSelectModel = {
  readonly ungrouped: readonly TrackingTargetSelectOption[];
  readonly groups: readonly TrackingTargetSelectGroup[];
};

export type TrackingTargetSelectCatalog = {
  readonly cities: readonly { readonly id: string; readonly name: string }[];
  readonly planets: readonly {
    readonly id: PlanetaryBodyId;
    readonly displayName: string;
  }[];
  readonly milkyWayPoints?: readonly {
    readonly id: MilkyWayPointId;
    readonly label: string;
  }[];
};

export type TrackingTargetSelectParseResult =
  | { readonly ok: true; readonly target: TrackableMapObjectId | null }
  | { readonly ok: false };

export function isTrackableTargetAvailable(
  target: TrackableMapObjectId,
  available: TrackableTargetAvailability,
): boolean {
  if (target === "moon") {
    return available.moon !== false;
  }
  if (target === "sun") {
    return available.sun !== false;
  }
  if (target === "iss") {
    return available.iss !== false;
  }
  if (target.kind === "city") {
    return available.cities?.has(target.id) === true;
  }
  if (target.kind === "planet") {
    return available.planets?.has(target.id) === true;
  }
  return available.milkyWayPoints?.has(target.id) === true;
}

export function trackingSelectionEquals(
  a: TrackingSelectionState,
  b: TrackingSelectionState,
): boolean {
  return (
    trackableMapObjectIdEquals(a.target, b.target) && a.rememberedMode === b.rememberedMode
  );
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
  if (!isTrackableTargetAvailable(target, available)) {
    return current;
  }
  if (trackableMapObjectIdEquals(current.target, target)) {
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
 * When the selected target becomes unavailable, fall back to Earth-fixed and
 * keep the remembered mode.
 */
export function applyTrackingTargetAvailability(
  current: TrackingSelectionState,
  available: TrackableTargetAvailability,
): TrackingSelectionState {
  if (current.target === null || isTrackableTargetAvailable(current.target, available)) {
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
  if (!trackableMapObjectIdEquals(previous.target, next.target)) {
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
    reinitializeContinuity: !trackableMapObjectIdEquals(previous.target, next.target),
    reinitializeCamera: trackingSelectionChangesEffectiveFrame(previous, next),
  };
}

/** Native-select option value. UI encoding, not production identity. */
export function trackingTargetSelectValue(target: TrackableMapObjectId | null): string {
  if (target === null) {
    return "earthFixed";
  }
  if (typeof target === "string") {
    return target;
  }
  if (target.kind === "city") {
    return `city:${encodeURIComponent(target.id)}`;
  }
  if (target.kind === "planet") {
    return `planet:${target.id}`;
  }
  return `milkyway:${target.id}`;
}

export function tryParseTrackingTargetSelectValue(
  value: string,
): TrackingTargetSelectParseResult {
  if (value === "earthFixed") {
    return { ok: true, target: null };
  }
  if (isNamedTrackableMapObjectId(value)) {
    return { ok: true, target: value };
  }
  if (value.startsWith("city:")) {
    let id: string;
    try {
      id = decodeURIComponent(value.slice("city:".length));
    } catch {
      return { ok: false };
    }
    if (id.length === 0) {
      return { ok: false };
    }
    return { ok: true, target: cityTrackableMapObjectId(id) };
  }
  if (value.startsWith("planet:")) {
    const id = value.slice("planet:".length);
    if (!isPlanetaryBodyId(id)) {
      return { ok: false };
    }
    return { ok: true, target: planetTrackableMapObjectId(id) };
  }
  if (value.startsWith("milkyway:")) {
    const id = value.slice("milkyway:".length);
    if (!isMilkyWayPointId(id)) {
      return { ok: false };
    }
    return { ok: true, target: milkyWayPointTrackableMapObjectId(id) };
  }
  return { ok: false };
}

/**
 * Earth-fixed and unparseable strings both yield `null`. Prefer
 * {@link tryParseTrackingTargetSelectValue} when invalid input must not
 * switch to Earth-fixed.
 */
export function parseTrackingTargetSelectValue(
  value: string,
): TrackableMapObjectId | null {
  const parsed = tryParseTrackingTargetSelectValue(value);
  return parsed.ok ? parsed.target : null;
}

export function parseTrackingModeSelectValue(
  value: string,
): AnchoredSceneFrameLockMode | null {
  return value === "longitude" || value === "position" ? value : null;
}

export function trackingTargetSelectModel(
  catalog: TrackingTargetSelectCatalog,
  available: TrackableTargetAvailability,
): TrackingTargetSelectModel {
  const celestial: TrackingTargetSelectOption[] = [
    { value: "moon", label: "Moon" },
    { value: "sun", label: "Sun" },
    ...catalog.planets.map((planet) => ({
      value: trackingTargetSelectValue(planetTrackableMapObjectId(planet.id)),
      label: planet.displayName,
    })),
    ...(catalog.milkyWayPoints ?? []).map((point) => ({
      value: trackingTargetSelectValue(milkyWayPointTrackableMapObjectId(point.id)),
      label: point.label,
    })),
  ];
  const spacecraft: TrackingTargetSelectOption[] = [
    {
      value: "iss",
      label: "ISS",
      disabled: available.iss === false,
    },
  ];
  const groups: TrackingTargetSelectGroup[] = [
    { label: "Celestial", options: celestial },
    { label: "Spacecraft", options: spacecraft },
  ];
  if (catalog.cities.length > 0) {
    groups.push({
      label: "Cities",
      options: catalog.cities.map((city) => ({
        value: trackingTargetSelectValue(cityTrackableMapObjectId(city.id)),
        label: city.name,
      })),
    });
  }
  return {
    ungrouped: [{ value: "earthFixed", label: "Earth-fixed" }],
    groups,
  };
}
