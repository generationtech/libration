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

import type { DisplayChromeLayoutConfig } from "./appConfig.ts";
import {
  DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
  resolvedHourMarkerLayoutSizeMultiplier,
} from "./appConfig.ts";
import type {
  EffectiveTopBandHourMarkers,
  EffectiveTopBandHourMarkerRealization,
} from "./topBandHourMarkersTypes.ts";

/** Same trim/empty semantics as hour-marker selection color normalization in appConfig (invalid → no override). */
function normalizeMarkerColor(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const t = raw.trim();
  return t === "" ? undefined : t;
}

/**
 * Resolves {@link EffectiveTopBandHourMarkers} from {@link DisplayChromeLayoutConfig.hourMarkers}.
 * Behavior and content are derived here (not read from separate persistence fields).
 */
export function resolveEffectiveTopBandHourMarkers(
  layout: DisplayChromeLayoutConfig,
): EffectiveTopBandHourMarkers {
  const hm = layout.hourMarkers;
  const sizeMultiplier = resolvedHourMarkerLayoutSizeMultiplier(layout);
  const layoutOut = { sizeMultiplier };

  if (!hm.customRepresentationEnabled) {
    /** Custom representation off: still draws default top-band hour markers — not surface-disabled. */
    return {
      enabled: true,
      behavior: "tapeAdvected",
      content: { kind: "hour24" },
      realization: {
        kind: "text",
        fontAssetId: DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
      },
      layout: layoutOut,
    };
  }

  const color = normalizeMarkerColor(hm.realization.color);

  if (hm.realization.kind === "text") {
    const fontAssetId =
      hm.realization.fontAssetId ?? DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID;
    const realization: EffectiveTopBandHourMarkerRealization = {
      kind: "text",
      fontAssetId,
      ...(color !== undefined ? { color } : {}),
    };
    return {
      enabled: true,
      behavior: "tapeAdvected",
      content: { kind: "hour24" },
      realization,
      layout: layoutOut,
    };
  }

  switch (hm.realization.kind) {
    case "analogClock":
      return {
        enabled: true,
        behavior: "staticZoneAnchored",
        content: { kind: "localWallClock" },
        realization: {
          kind: "analogClock",
          ...(color !== undefined ? { color } : {}),
        },
        layout: layoutOut,
      };
    case "radialLine":
      return {
        enabled: true,
        behavior: "tapeAdvected",
        content: { kind: "hour24" },
        realization: {
          kind: "radialLine",
          ...(color !== undefined ? { color } : {}),
        },
        layout: layoutOut,
      };
    case "radialWedge":
      return {
        enabled: true,
        behavior: "tapeAdvected",
        content: { kind: "hour24" },
        realization: {
          kind: "radialWedge",
          ...(color !== undefined ? { color } : {}),
        },
        layout: layoutOut,
      };
  }
}
