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
 * Defaults for Model A cloud participation presentation (SceneConfig + illumination planning).
 * Mode greenfield default is {@link DEFAULT_SCENE_CLOUD_PARTICIPATION_PRESENTATION_MODE} (`off`)
 * so legacy scenes keep prior illumination appearance until explicitly enabled.
 */

import type { CloudParticipationPresentationMode } from "./cloudParticipationPolicy";

/** Missing / greenfield subtree: no Model A modulation. */
export const DEFAULT_SCENE_CLOUD_PARTICIPATION_PRESENTATION_MODE: CloudParticipationPresentationMode =
  "off";

export const DEFAULT_CLOUD_PARTICIPATION_PRESENTATION_INTENSITY = 1;

export const CLOUD_PARTICIPATION_PRESENTATION_INTENSITY_MIN = 0;
export const CLOUD_PARTICIPATION_PRESENTATION_INTENSITY_MAX = 2;
