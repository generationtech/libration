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
 * Compatibility exports for Eclipse playback. Canonical home is eventPlaybackRuntime.
 */

export {
  buildEclipsePlaybackSchedule as buildEclipseTourSchedule,
  eclipseTourShouldDeactivate,
  eventPlaybackStartYmdFromNow as eclipseTourStartYmdFromNow,
  eventPlaybackStructuralFingerprint as eclipseTourStructuralFingerprint,
} from "./eventPlaybackRuntime";
