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

import type { TopBandTimeMode } from "./appConfig.ts";
import type { LibrationConfigV2 } from "./v2/librationConfig.ts";
import { coerceHourMarkersForUtc24IfProcedural } from "./topBandUtcRealizationCoercion.ts";

/**
 * Applies an hour-label / {@link TopBandTimeMode} change: entering `utc24` rewrites non-text hour-marker
 * realization to text first so authored state never pairs UTC display with procedural realization.
 */
export function applyTopBandModeToLibrationDraft(
  draft: LibrationConfigV2,
  nextMode: TopBandTimeMode,
): void {
  const prev = draft.chrome.displayTime.topBandMode;
  if (nextMode === "utc24" && prev !== "utc24") {
    draft.chrome.layout.hourMarkers = coerceHourMarkersForUtc24IfProcedural(draft.chrome.layout.hourMarkers);
  }
  draft.chrome.displayTime.topBandMode = nextMode;
}
