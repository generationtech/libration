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
 * UI-only topic areas for the Layers configuration tab. Not persisted — editor navigation only.
 */
export type LayersTopicId =
  | "layerMasters"
  | "map"
  | "illumination"
  | "eclipse"
  | "moonAndLibration"
  | "astronomyPaths"
  | "spaceObjects"
  | "advanced";

export const LAYERS_TOPIC_IDS: readonly LayersTopicId[] = [
  "layerMasters",
  "map",
  "illumination",
  "eclipse",
  "moonAndLibration",
  "astronomyPaths",
  "spaceObjects",
  "advanced",
];

export const DEFAULT_LAYERS_TOPIC: LayersTopicId = "layerMasters";

export function labelForLayersTopic(id: LayersTopicId): string {
  switch (id) {
    case "layerMasters":
      return "Layer masters";
    case "map":
      return "Map";
    case "illumination":
      return "Illumination";
    case "eclipse":
      return "Eclipse";
    case "moonAndLibration":
      return "Moon & libration";
    case "astronomyPaths":
      return "Astronomy paths";
    case "spaceObjects":
      return "Space objects";
    case "advanced":
      return "Advanced";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function descriptionForLayersTopic(id: LayersTopicId): string {
  switch (id) {
    case "layerMasters":
      return "Show or hide scene layers. Presentation for each topic lives in the other Layers groups.";
    case "map":
      return "Base-map family, preview, source and license, and per-family display tuning.";
    case "illumination":
      return "Moonlight, night lights, and cloud participation in the planetary illumination raster.";
    case "eclipse":
      return "Solar and lunar eclipse geography, alignment, reference-city information, and appearance.";
    case "moonAndLibration":
      return "Moon glyph size and optical-libration mark. Independent of eclipse and path overlays.";
    case "astronomyPaths":
      return "Lunar ground track extents and colors, Lunar locus stroke, and Solar analemma stroke.";
    case "spaceObjects":
      return "Presentation for tracked space objects. ISS and planets. Layer visibility stays under Layer masters.";
    case "advanced":
      return "Overlay-readability veil and lift, including per-layer pilots. Does not change layer on/off.";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
