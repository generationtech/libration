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

import { cloneHourMarkersConfig } from "./appConfig.ts";
import type {
  HourMarkersConfig,
  HourMarkersRealizationConfig,
} from "./topBandHourMarkersTypes.ts";

/**
 * Canonical structured realization for a kind switch (matches hour-marker editor semantics).
 * Exported for the editor and for UTC entry coercion.
 */
export function hourMarkersRealizationConfigForKind(
  kind: HourMarkersRealizationConfig["kind"],
  hm: HourMarkersConfig,
): HourMarkersRealizationConfig {
  switch (kind) {
    case "text":
      return {
        kind: "text",
        ...(hm.realization.kind === "text" && hm.realization.fontAssetId !== undefined
          ? { fontAssetId: hm.realization.fontAssetId }
          : {}),
        appearance: {},
      };
    case "analogClock":
      return { kind: "analogClock", appearance: {} };
    case "radialLine":
      return { kind: "radialLine", appearance: {} };
    case "radialWedge":
      return { kind: "radialWedge", appearance: {} };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/**
 * UTC display mode requires text hour-marker realization in authored config. Converts procedural
 * kinds to fresh text ({@link hourMarkersRealizationConfigForKind}("text", …)); leaves text unchanged.
 */
export function coerceHourMarkersForUtc24IfProcedural(hm: HourMarkersConfig): HourMarkersConfig {
  if (hm.realization.kind === "text") {
    return hm;
  }
  return cloneHourMarkersConfig({
    ...cloneHourMarkersConfig(hm),
    realization: hourMarkersRealizationConfigForKind("text", hm),
  });
}
