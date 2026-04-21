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
 * Semantic roles for structural UTC hour columns on the top band: hour 0 = midnight, hour 12 = noon
 * (same civil frame as {@link ../renderer/displayChrome.ts!topBandMarkerAnnotationKind}).
 */

import type {
  EffectiveNoonMidnightCustomization,
  EffectiveTwentyFourHourAnchorCustomization,
  HourMarkersNoonMidnightExpressionMode,
} from "./topBandHourMarkersTypes.ts";

/** Structural role for indicator entries; `none` for hours other than 0 and 12. */
export type IndicatorEntryNoonMidnightRole = "none" | "noon" | "midnight";

export function indicatorEntryNoonMidnightRole(structuralHour0To23: number): IndicatorEntryNoonMidnightRole {
  if (structuralHour0To23 === 0) {
    return "midnight";
  }
  if (structuralHour0To23 === 12) {
    return "noon";
  }
  return "none";
}

export type NoonMidnightActiveIntent =
  | { active: false }
  | {
      active: true;
      role: "noon" | "midnight";
      expressionMode: HourMarkersNoonMidnightExpressionMode;
    };

export function noonMidnightActiveIntent(
  customization: EffectiveNoonMidnightCustomization,
  structuralHour0To23: number,
): NoonMidnightActiveIntent {
  const role = indicatorEntryNoonMidnightRole(structuralHour0To23);
  if (role === "none" || !customization.enabled) {
    return { active: false };
  }
  return {
    active: true,
    role,
    expressionMode: customization.expressionMode,
  };
}

export type TwentyFourHourAnchorActiveIntent =
  | { active: false }
  | { active: true; boxedNumberBoxColor: string };

/**
 * Structural hours 0 and 12 only: boxed tape numerals for 24-hour mode (no civil wording).
 */
export function twentyFourHourAnchorActiveIntent(
  customization: EffectiveTwentyFourHourAnchorCustomization,
  structuralHour0To23: number,
): TwentyFourHourAnchorActiveIntent {
  if (!customization.enabled) {
    return { active: false };
  }
  if (structuralHour0To23 !== 0 && structuralHour0To23 !== 12) {
    return { active: false };
  }
  return { active: true, boxedNumberBoxColor: customization.boxedNumberBoxColor };
}

const WORDS: Record<"noon" | "midnight", string> = {
  noon: "NOON",
  midnight: "MIDNIGHT",
};

/**
 * Disk label for text-backed realizations and tape-derived strings. When customization is active in `textWords` mode,
 * replaces the label with NOON / MIDNIGHT; otherwise returns the tape hour label unchanged.
 */
export function resolveIndicatorEntryDiskDisplayLabel(
  tapeHourLabel: string,
  structuralHour0To23: number,
  customization: EffectiveNoonMidnightCustomization,
): string {
  const intent = noonMidnightActiveIntent(customization, structuralHour0To23);
  if (!intent.active || intent.expressionMode !== "textWords") {
    return tapeHourLabel;
  }
  return WORDS[intent.role];
}
