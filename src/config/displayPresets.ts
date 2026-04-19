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

import type { AppConfig } from "./appConfig";
import { ALL_REFERENCE_CITY_IDS, cloneHourMarkersConfig, DEFAULT_APP_CONFIG } from "./appConfig";

/**
 * Named display presets are code-defined {@link AppConfig} compositions.
 * {@link DISPLAY_PRESET_METADATA} holds ordered ids, labels, and short descriptions for future shell use;
 * {@link ALL_DISPLAY_PRESET_IDS} is the id list derived from that metadata (matches keys of {@link DISPLAY_PRESETS}).
 *
 * | Preset | Meaning (short) |
 * | --- | --- |
 * | `full` | All layers on; all reference cities when pins are enabled. |
 * | `minimal` | Base map, day/night shading; UTC hour scale is in display chrome (no scene UTC text). |
 * | `celestial` | Like minimal plus grid and sun/moon markers; no city pins (UTC scale in chrome). |
 * | `featuredCities` | Base map and a small curated city set only — no shading, grid, time, or celestial overlays. |
 */
export type DisplayPresetId =
  | "full"
  | "minimal"
  | "celestial"
  | "featuredCities";

/** Preset id, UI label, and short description; ids stay internal, label/description are presentation-only. */
export type DisplayPresetDescriptor = {
  id: DisplayPresetId;
  label: string;
  /** One-line hint for the active preset (for future presentation). */
  description: string;
};

/**
 * Reference city ids shown by {@link DISPLAY_PRESETS.featuredCities} (curated subset of
 * {@link ALL_REFERENCE_CITY_IDS}, not the full list).
 */
export const FEATURED_REFERENCE_CITY_IDS: readonly string[] = [
  "city.london",
  "city.tokyo",
  "city.sydney",
];

function cloneConfig(config: AppConfig): AppConfig {
  const tz = config.displayTime.referenceTimeZone;
  const anchor = config.displayTime.topBandAnchor;
  const g = config.geography;
  const dcl = config.displayChromeLayout;
  return {
    layers: { ...config.layers },
    visibleCityIds: [...config.visibleCityIds],
    customPins: config.customPins.map((p) => ({ ...p })),
    pinPresentation: { ...config.pinPresentation },
    displayTime: {
      referenceTimeZone:
        tz.source === "fixed" ? { source: "fixed", timeZone: tz.timeZone } : { source: "system" },
      topBandMode: config.displayTime.topBandMode,
      topBandAnchor:
        anchor.mode === "fixedLongitude"
          ? { mode: "fixedLongitude", longitudeDeg: anchor.longitudeDeg }
          : anchor.mode === "fixedCity"
            ? { mode: "fixedCity", cityId: anchor.cityId }
            : { mode: "auto" },
    },
    displayChromeLayout: {
      bottomInformationBarVisible: dcl.bottomInformationBarVisible,
      tickTapeVisible: dcl.tickTapeVisible,
      timezoneLetterRowVisible: dcl.timezoneLetterRowVisible,
      hourMarkers: cloneHourMarkersConfig(dcl.hourMarkers),
      ...(dcl.tickTapeAreaBackgroundColor !== undefined
        ? { tickTapeAreaBackgroundColor: dcl.tickTapeAreaBackgroundColor }
        : {}),
      ...(dcl.timezoneLetterRowCellBackgroundColorEven !== undefined
        ? { timezoneLetterRowCellBackgroundColorEven: dcl.timezoneLetterRowCellBackgroundColorEven }
        : {}),
      ...(dcl.timezoneLetterRowCellBackgroundColorOdd !== undefined
        ? { timezoneLetterRowCellBackgroundColorOdd: dcl.timezoneLetterRowCellBackgroundColorOdd }
        : {}),
      ...(dcl.timezoneLetterRowLetterForegroundColor !== undefined
        ? { timezoneLetterRowLetterForegroundColor: dcl.timezoneLetterRowLetterForegroundColor }
        : {}),
      ...(dcl.timezoneLetterRowActiveCellBackgroundColor !== undefined
        ? { timezoneLetterRowActiveCellBackgroundColor: dcl.timezoneLetterRowActiveCellBackgroundColor }
        : {}),
      ...(dcl.timezoneLetterRowFontAssetId !== undefined
        ? { timezoneLetterRowFontAssetId: dcl.timezoneLetterRowFontAssetId }
        : {}),
      ...(dcl.defaultTextFontAssetId !== undefined
        ? { defaultTextFontAssetId: dcl.defaultTextFontAssetId }
        : {}),
      ...(dcl.bottomReadoutFontAssetId !== undefined
        ? { bottomReadoutFontAssetId: dcl.bottomReadoutFontAssetId }
        : {}),
      ...(dcl.configUiFontAssetId !== undefined
        ? { configUiFontAssetId: dcl.configUiFontAssetId }
        : {}),
    },
    geography: {
      referenceMode: g.referenceMode,
      fixedCoordinate: {
        latitude: g.fixedCoordinate.latitude,
        longitude: g.fixedCoordinate.longitude,
        label: g.fixedCoordinate.label,
      },
      showFixedCoordinateLabelInTimezoneStrip: g.showFixedCoordinateLabelInTimezoneStrip,
    },
    data: {
      mode: config.data.mode,
      showDataAnnotations: config.data.showDataAnnotations,
      demoTime: {
        enabled: config.data.demoTime.enabled,
        startIsoUtc: config.data.demoTime.startIsoUtc,
        speedMultiplier: config.data.demoTime.speedMultiplier,
      },
    },
  };
}

/** Preset keyed by id; each value is a complete {@link AppConfig}. */
export const DISPLAY_PRESETS: Record<DisplayPresetId, AppConfig> = {
  /**
   * Full scene: every layer enabled; {@link AppConfig.visibleCityIds} lists all reference cities.
   */
  full: cloneConfig(DEFAULT_APP_CONFIG),

  /**
   * Minimal chrome: base map, solar shading — no grid, local clock, pins, or sun/moon markers.
   * UTC time-of-day is shown only in the fixed top display-chrome hour scale (not as a map overlay).
   * {@link AppConfig.visibleCityIds} is empty because city pins are off.
   */
  minimal: {
    ...cloneConfig(DEFAULT_APP_CONFIG),
    layers: {
      baseMap: true,
      solarShading: true,
      grid: false,
      utcClock: false,
      localClock: false,
      cityPins: false,
      subsolarMarker: false,
      sublunarMarker: false,
    },
    visibleCityIds: [],
  },

  /**
   * Celestial emphasis: base map, shading, grid, subsolar and sublunar markers; no local clock or city pins.
   * UTC hour scale is in display chrome (not a map text overlay).
   * {@link AppConfig.visibleCityIds} is empty because city pins are off.
   */
  celestial: {
    ...cloneConfig(DEFAULT_APP_CONFIG),
    layers: {
      baseMap: true,
      solarShading: true,
      grid: true,
      utcClock: false,
      localClock: false,
      cityPins: false,
      subsolarMarker: true,
      sublunarMarker: true,
    },
    visibleCityIds: [],
  },

  /**
   * Map plus a small curated set of reference-city pins only: no day/night shading, grid, clocks, or celestial markers.
   * Uses {@link FEATURED_REFERENCE_CITY_IDS} (not the full reference list).
   */
  featuredCities: {
    ...cloneConfig(DEFAULT_APP_CONFIG),
    layers: {
      baseMap: true,
      solarShading: false,
      grid: false,
      utcClock: false,
      localClock: false,
      cityPins: true,
      subsolarMarker: false,
      sublunarMarker: false,
    },
    visibleCityIds: [...FEATURED_REFERENCE_CITY_IDS],
  },
};

/**
 * Ordered preset metadata (labels and descriptions). Order is stable and matches {@link ALL_DISPLAY_PRESET_IDS}.
 */
export const DISPLAY_PRESET_METADATA: readonly DisplayPresetDescriptor[] = [
  {
    id: "full",
    label: "Full",
    description:
      "Complete reference display with all core overlays and cities.",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Reduced display for a cleaner map-first view.",
  },
  {
    id: "celestial",
    label: "Celestial",
    description: "Emphasizes solar and lunar context.",
  },
  {
    id: "featuredCities",
    label: "Featured Cities",
    description: "Curated city subset for a simplified multi-city view.",
  },
];

/** Default preset used when the app applies a fixed factory configuration (see {@link getActiveAppConfig}). */
export const ACTIVE_DISPLAY_PRESET_ID: DisplayPresetId = "full";

export function getAppConfigForPreset(id: DisplayPresetId): AppConfig {
  return cloneConfig(DISPLAY_PRESETS[id]);
}

/** Config for the default preset (see {@link ACTIVE_DISPLAY_PRESET_ID}); used by bootstrap when no config is passed. */
export function getActiveAppConfig(): AppConfig {
  return getAppConfigForPreset(ACTIVE_DISPLAY_PRESET_ID);
}

/** Preset ids present in {@link DISPLAY_PRESETS} (derived from {@link DISPLAY_PRESET_METADATA}). */
export const ALL_DISPLAY_PRESET_IDS: readonly DisplayPresetId[] =
  DISPLAY_PRESET_METADATA.map((d) => d.id);

/** Known reference city ids not listed in config are ignored by the pins layer; this checks ids are known. */
export function isAppConfigCityIdsResolvable(config: AppConfig): boolean {
  const known = new Set(ALL_REFERENCE_CITY_IDS);
  return config.visibleCityIds.every((id) => known.has(id));
}
