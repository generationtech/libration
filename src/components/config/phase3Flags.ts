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
 * Phase 3 config UI: when false, guarded update paths are inactive (placeholders only).
 * Phase 3b–c: enabled for wired Layers (grid, cityPins, solarShading) and Pins reference-city
 * visibility.
 */
export const ALLOW_PHASE3_MUTATIONS = true as const;
