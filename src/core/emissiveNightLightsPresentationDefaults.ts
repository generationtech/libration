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
 * Single source for emissive night-light **presentation** defaults used by SceneConfig normalization
 * and by illumination raster planning. Lives in `core` so renderer paths avoid importing `config/v2`.
 * Presentation **mode** greenfield defaults (`illustrative` / moonlight parity) live in
 * {@link ./sceneIlluminationPresentationDefaults}.
 */

export const DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY = 1;
export const DEFAULT_EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT = 0.6;
