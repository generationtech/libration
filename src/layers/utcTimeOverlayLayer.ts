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

import { formatUtcClock } from "../core/timeFormat";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import { TEXT_OVERLAY_KIND, type TextOverlayPayload } from "./textOverlayPayload";

const UTC_OVERLAY_ID = "layer.overlay.utc";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

/**
 * UTC clock from {@link TimeContext.now} (epoch ms), formatted for prominent display.
 */
export function createUtcTimeOverlayLayer(): Layer {
  return {
    id: UTC_OVERLAY_ID,
    name: "UTC time",
    enabled: true,
    zIndex: 20,
    type: "text",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const data: TextOverlayPayload = {
        kind: TEXT_OVERLAY_KIND,
        placement: "top-left",
        primary: formatUtcClock(time.now),
        label: "UTC",
      };
      return {
        visible: true,
        opacity: 1,
        data,
      };
    },
  };
}
