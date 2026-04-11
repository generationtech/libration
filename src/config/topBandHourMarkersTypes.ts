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

import type { FontAssetId } from "../typography/fontAssetTypes.ts";

/**
 * Persisted authoring intent for top-band hour markers (`chrome.layout.hourMarkers` only).
 * Behavior/content are derived at runtime — not stored here.
 */
export type HourMarkersRealizationConfig =
  | { kind: "text"; fontAssetId: FontAssetId; color?: string }
  | { kind: "analogClock"; color?: string }
  | { kind: "radialLine"; color?: string }
  | { kind: "radialWedge"; color?: string };

export interface HourMarkersConfig {
  customRepresentationEnabled: boolean;
  realization: HourMarkersRealizationConfig;
  layout: {
    sizeMultiplier: number;
  };
}

/** How phased hour markers move with the longitude tape vs fixed structural columns. */
export type EffectiveTopBandHourMarkerBehavior = "tapeAdvected" | "staticZoneAnchored";

/**
 * What civil-time content the marker encodes: 24h tape hour vs local wall-clock for the analog face.
 */
export type EffectiveTopBandHourMarkerContent =
  | { kind: "hour24" }
  | { kind: "localWallClock" };

/**
 * Visual realization on the hour disk. Distinct from {@link EffectiveTopBandHourMarkerContent}, which names the
 * time basis; this names drawable mechanics (text vs procedural variants).
 */
export type EffectiveTopBandHourMarkerRealization =
  | {
      kind: "text";
      /** Bundled font id; {@link resolveEffectiveTopBandHourMarkers} supplies the default when custom is off. */
      fontAssetId?: FontAssetId;
      /** CSS color string; omitted when chrome/role defaults apply. */
      color?: string;
    }
  | { kind: "analogClock"; color?: string }
  | { kind: "radialLine"; color?: string }
  | { kind: "radialWedge"; color?: string };

export type EffectiveTopBandHourMarkerLayout = {
  /** Finite check, default 1.0 when absent/invalid, then clamp to the v2 [0.5, 2] range. */
  sizeMultiplier: number;
};

/**
 * Authoritative resolved model for top-band hour markers: semantic planning and UI consume this shape
 * alongside {@link DisplayChromeLayoutConfig.hourMarkers}.
 */
export type EffectiveTopBandHourMarkers = {
  enabled: boolean;
  behavior: EffectiveTopBandHourMarkerBehavior;
  content: EffectiveTopBandHourMarkerContent;
  realization: EffectiveTopBandHourMarkerRealization;
  layout: EffectiveTopBandHourMarkerLayout;
};
