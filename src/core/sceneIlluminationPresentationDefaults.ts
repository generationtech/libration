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
 * Neutral defaults for scene illumination **presentation modes** (moonlight, emissive night lights,
 * and Model A cloud participation).
 * Mirrors greenfield / missing-subtree behavior in normalized `SceneConfig`; lives in `core` so
 * planners, layers, and tests can align omitted-option fallbacks without importing `config/v2`.
 */
import type { CloudParticipationPresentationMode } from "./cloudParticipationPolicy";
import type { EmissiveNightLightsPresentationMode } from "./emissiveNightLightsPolicy";
import type { MoonlightPresentationMode } from "./moonlightPolicy";
import { DEFAULT_SCENE_CLOUD_PARTICIPATION_PRESENTATION_MODE as CLOUD_MODE_OFF } from "./cloudParticipationPresentationDefaults";

export const DEFAULT_SCENE_MOONLIGHT_PRESENTATION_MODE: MoonlightPresentationMode = "illustrative";

export const DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE: EmissiveNightLightsPresentationMode =
  "illustrative";

/** Re-export: greenfield Model A cloud participation is off (legacy illumination unchanged). */
export const DEFAULT_SCENE_CLOUD_PARTICIPATION_PRESENTATION_MODE: CloudParticipationPresentationMode =
  CLOUD_MODE_OFF;