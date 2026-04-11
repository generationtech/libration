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

import { formatLocalClock } from "../core/timeFormat";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import { TEXT_OVERLAY_KIND, type TextOverlayPayload } from "./textOverlayPayload";

const LOCAL_OVERLAY_ID = "layer.overlay.local";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

/**
 * Local wall-clock time for the same instant as {@link TimeContext.now} (browser default timezone).
 */
export function createLocalTimeOverlayLayer(): Layer {
  return {
    id: LOCAL_OVERLAY_ID,
    name: "Local time",
    enabled: true,
    zIndex: 21,
    type: "text",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const data: TextOverlayPayload = {
        kind: TEXT_OVERLAY_KIND,
        placement: "top-right",
        primary: formatLocalClock(time.now),
        label: "Local",
      };
      return {
        visible: true,
        opacity: 1,
        data,
      };
    },
  };
}
