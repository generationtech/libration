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

import type { NumericRepresentationMode } from "../config/appConfig.ts";
import type { HourMarkerRepresentationSpec } from "./hourMarkerRepresentation.ts";

/**
 * Default hour-marker representation for the current user-facing {@link NumericRepresentationMode}.
 */
export function resolveDefaultHourMarkerRepresentationSpec(
  mode: NumericRepresentationMode,
): HourMarkerRepresentationSpec {
  switch (mode) {
    case "geometric":
      return {
        mode: "geometric",
        textRole: "chromeHourPrimary",
        glyphStyleId: "topBandHourDefault",
      };
    case "segment":
      return {
        mode: "segment",
        textRole: "chromeSegment",
        glyphStyleId: "topBandHourSegment",
      };
    case "dotmatrix":
      return {
        mode: "dotmatrix",
        textRole: "chromeDotMatrix",
        glyphStyleId: "topBandHourDotMatrix",
      };
    case "terminal":
      return {
        mode: "terminal",
        textRole: "chromeDenseMono",
        glyphStyleId: "topBandHourTerminal",
      };
    case "analogClock":
      return {
        mode: "analogClock",
        textRole: "chromeHourPrimary",
        glyphStyleId: "topBandHourAnalogClock",
      };
    case "radialLine":
      return {
        mode: "radialLine",
        textRole: "chromeHourPrimary",
        glyphStyleId: "topBandHourDefault",
      };
    case "radialWedge":
      return {
        mode: "radialWedge",
        textRole: "chromeHourPrimary",
        glyphStyleId: "topBandHourDefault",
      };
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}
