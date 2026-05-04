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
 * Neutral defaults for scene illumination **presentation modes** (moonlight and emissive night lights).
 * Mirrors greenfield / missing-subtree behavior in normalized `SceneConfig`; lives in `core` so
 * planners, layers, and tests can align omitted-option fallbacks without importing `config/v2`.
 */
import type { EmissiveNightLightsPresentationMode } from "./emissiveNightLightsPolicy";
import type { MoonlightPresentationMode } from "./moonlightPolicy";

export const DEFAULT_SCENE_MOONLIGHT_PRESENTATION_MODE: MoonlightPresentationMode = "illustrative";

export const DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE: EmissiveNightLightsPresentationMode =
  "illustrative";
