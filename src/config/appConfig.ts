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

import { REFERENCE_CITIES, type ReferenceCity } from "../data/referenceCities";
import type { FontAssetId } from "../typography/fontAssetTypes.ts";
import type { HourMarkersConfig, HourMarkersRealizationConfig } from "./topBandHourMarkersTypes.ts";
import { TOP_CHROME_STYLE } from "./topChromeStyle.ts";

/**
 * Font assets exposed in UI for top-band hour disk numerals (must stay aligned with bundled manifest ids).
 */
export const TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS: readonly FontAssetId[] = [
  "computer",
  "dotmatrix-regular",
  "dseg7modern-regular",
  "flip-clock",
  "kremlin",
  "zeroes-one",
  "zeroes-two",
];

/**
 * Explicit enable flags for composable scene layers. This module is the application
 * configuration source; layer modules remain unaware of it.
 */
export interface LayerEnableFlags {
  baseMap: boolean;
  solarShading: boolean;
  grid: boolean;
  utcClock: boolean;
  localClock: boolean;
  cityPins: boolean;
  subsolarMarker: boolean;
  sublunarMarker: boolean;
}

/** Where the display chrome resolves its reference IANA timezone from. */
export type DisplayTimeZoneConfig =
  | { source: "system" }
  | { source: "fixed"; timeZone: string };

/** How the top hour-marker tape labels and day phase are interpreted (see `docs` / ARCHITECTURE). */
export type TopBandTimeMode = "local12" | "local24" | "utc24";

/**
 * **Longitude anchor** for the time-phased top tape (horizontal alignment), separate from civil-time semantics.
 * The top band is anchored by longitude, not by civil timezone. A fixed reference city contributes **its longitude** for
 * tape alignment only — it does not select structural 15° columns via IANA rules.
 *
 * - `auto`: map the effective reference IANA zone to a default reference city id, then use that city’s longitude from
 *   {@link REFERENCE_CITIES}; if unmapped, Greenwich (0°). (The zone string is a lookup key; membership does not define column placement.)
 * - `fixedLongitude`: explicit meridian.
 * - `fixedCity`: longitude from the named reference city id.
 */
export type TopBandAnchorConfig =
  | { mode: "auto" }
  | { mode: "fixedLongitude"; longitudeDeg: number }
  | { mode: "fixedCity"; cityId: string };

/**
 * Controls reference timezone and top-band clock mode for display chrome only (not map layers).
 * Civil time display is derived independently from IANA timezone data ({@link referenceTimeZone}); the top tape’s
 * longitude anchor ({@link topBandAnchor}) is resolved separately — structural longitude sectors and civil timezone
 * membership are intentionally decoupled.
 * Default: system timezone, 12-hour-style top tape labels; bottom bar follows the same resolved zone.
 */
export interface DisplayTimeConfig {
  referenceTimeZone: DisplayTimeZoneConfig;
  topBandMode: TopBandTimeMode;
  /** Longitude anchor for the time-phased circle row (default {@code auto}). */
  topBandAnchor: TopBandAnchorConfig;
}

/**
 * How each phased hour disk encodes civil time: typographic numerals (several text-backed families), procedural
 * analog / radial glyphs, etc. Default `geometric` preserves legacy hour-numeral rendering.
 */
export type NumericRepresentationMode =
  | "geometric"
  | "segment"
  | "dotmatrix"
  | "terminal"
  | "analogClock"
  | "radialLine"
  | "radialWedge";

/** Top-band hour-disk markers: font-backed numerals vs procedural glyphs. */
export type TopBandHourMarkerRepresentationKind = "text" | "glyph";

/** Text-backed hour marker styles (subset of {@link NumericRepresentationMode}). */
export type TopBandHourMarkerTextMode = Extract<
  NumericRepresentationMode,
  "geometric" | "segment" | "dotmatrix" | "terminal"
>;

/** Procedural hour marker styles (subset of {@link NumericRepresentationMode}). */
export type TopBandHourMarkerGlyphMode = Extract<
  NumericRepresentationMode,
  "analogClock" | "radialLine" | "radialWedge"
>;

/** Default procedural glyph when structured authoring or UI needs a fallback value. */
export const DEFAULT_TOP_BAND_GLYPH_MODE: TopBandHourMarkerGlyphMode = "analogClock";

/**
 * Maps text vs glyph “split” fields to the combined {@link NumericRepresentationMode} used by glyph factories
 * and numeric pipelines (independent of `chrome.layout` persistence).
 */
export function numericRepresentationModeFromTopBandSplit(args: {
  kind: TopBandHourMarkerRepresentationKind;
  textMode: TopBandHourMarkerTextMode;
  glyphMode: TopBandHourMarkerGlyphMode;
}): NumericRepresentationMode {
  return args.kind === "text" ? args.textMode : args.glyphMode;
}

/** Inclusive bounds for {@link HourMarkersConfig.layout.sizeMultiplier} after normalization. */
export const TOP_BAND_HOUR_MARKER_SIZE_MULT_MIN = 0.5;
export const TOP_BAND_HOUR_MARKER_SIZE_MULT_MAX = 2;

export function clampTopBandHourMarkerSizeMultiplier(n: number): number {
  return Math.max(
    TOP_BAND_HOUR_MARKER_SIZE_MULT_MIN,
    Math.min(TOP_BAND_HOUR_MARKER_SIZE_MULT_MAX, n),
  );
}

/**
 * Maps historical text-style preset labels to bundled font asset ids (tests/tooling; not persisted on `chrome.layout`).
 */
export const LEGACY_TOP_BAND_TEXT_MODE_TO_FONT_ASSET_ID: Record<
  TopBandHourMarkerTextMode,
  FontAssetId
> = {
  geometric: "zeroes-one",
  segment: "dseg7modern-regular",
  dotmatrix: "dotmatrix-regular",
  terminal: "computer",
};

/** Canonical bundled font for top-band text hour markers when none is stored (truthful default). */
export const DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID: FontAssetId = "zeroes-two";

/**
 * Default authored CSS background for the 24-hour indicator entries row (`hourMarkers.indicatorEntriesAreaBackgroundColor`).
 * The value is copied once from {@link TOP_CHROME_STYLE} so shipped defaults match the reference instrument strip;
 * resolution and render planning use this string (or persisted overrides) only — they do not read `TOP_CHROME_STYLE` at runtime.
 */
export const DEFAULT_INDICATOR_ENTRIES_AREA_BACKGROUND_COLOR: string =
  TOP_CHROME_STYLE.instrument.circleBandBedDeep;

/**
 * Default authored CSS background for the 24-hour tickmarks tape band (`chrome.layout.tickTapeAreaBackgroundColor`).
 * Copied once from {@link TOP_CHROME_STYLE.instrument.tickRailBackground}; resolution uses this string when no override is stored.
 */
export const DEFAULT_TICK_TAPE_AREA_BACKGROUND_COLOR: string =
  TOP_CHROME_STYLE.instrument.tickRailBackground;

/**
 * Default alternating NATO / timezone letter row cell fills (`chrome.layout` optional overrides).
 * Copied once from {@link TOP_CHROME_STYLE.timezoneTab} so defaults match shipped chrome; resolution uses these when no
 * override is stored.
 */
export const DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_EVEN: string =
  TOP_CHROME_STYLE.timezoneTab.fillEven;
export const DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_ODD: string =
  TOP_CHROME_STYLE.timezoneTab.fillOdd;

/** Default NATO zone letter ink when no layout override is stored (same as {@link TOP_CHROME_STYLE.zoneText.letter}). */
export const DEFAULT_TIMEZONE_LETTER_ROW_LETTER_FOREGROUND_COLOR: string = TOP_CHROME_STYLE.zoneText.letter;

/** Default structured hour markers for {@link DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG}. */
export const DEFAULT_HOUR_MARKERS_CONFIG: HourMarkersConfig = {
  indicatorEntriesAreaVisible: true,
  indicatorEntriesAreaBackgroundColor: DEFAULT_INDICATOR_ENTRIES_AREA_BACKGROUND_COLOR,
  realization: {
    kind: "text",
    fontAssetId: DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
    appearance: {},
  },
  layout: {
    sizeMultiplier: 1.25,
    contentPaddingTopPx: 5,
    contentPaddingBottomPx: 5,
  },
  noonMidnightCustomization: { enabled: true, expressionMode: "boxedNumber" },
};

/**
 * Effective authored background for the indicator entries row: trimmed string or
 * {@link DEFAULT_INDICATOR_ENTRIES_AREA_BACKGROUND_COLOR} when absent/blank.
 */
export function resolvedAuthoredIndicatorEntriesAreaBackgroundColor(hm: HourMarkersConfig): string {
  const raw = hm.indicatorEntriesAreaBackgroundColor;
  if (typeof raw !== "string") {
    return DEFAULT_INDICATOR_ENTRIES_AREA_BACKGROUND_COLOR;
  }
  const t = raw.trim();
  return t === "" ? DEFAULT_INDICATOR_ENTRIES_AREA_BACKGROUND_COLOR : t;
}

/**
 * Deep-clone {@link HourMarkersConfig} for snapshots and layout cloning.
 */
export function cloneHourMarkersConfig(h: HourMarkersConfig): HourMarkersConfig {
  const r = h.realization;
  let realization: HourMarkersRealizationConfig;
  if (r.kind === "text") {
    realization = {
      kind: "text",
      fontAssetId: r.fontAssetId,
      appearance: { ...r.appearance },
    };
  } else if (r.kind === "analogClock") {
    realization = {
      kind: "analogClock",
      appearance: { ...r.appearance },
    };
  } else if (r.kind === "radialLine") {
    realization = {
      kind: "radialLine",
      appearance: { ...r.appearance },
    };
  } else {
    realization = {
      kind: "radialWedge",
      appearance: { ...r.appearance },
    };
  }
  const layout: HourMarkersConfig["layout"] = { sizeMultiplier: h.layout.sizeMultiplier };
  if (h.layout.contentPaddingTopPx !== undefined) {
    layout.contentPaddingTopPx = h.layout.contentPaddingTopPx;
  }
  if (h.layout.contentPaddingBottomPx !== undefined) {
    layout.contentPaddingBottomPx = h.layout.contentPaddingBottomPx;
  }
  return {
    indicatorEntriesAreaVisible: h.indicatorEntriesAreaVisible !== false,
    ...(h.indicatorEntriesAreaBackgroundColor !== undefined
      ? { indicatorEntriesAreaBackgroundColor: h.indicatorEntriesAreaBackgroundColor }
      : {}),
    realization,
    layout,
    ...(h.noonMidnightCustomization !== undefined
      ? {
          noonMidnightCustomization: {
            ...(h.noonMidnightCustomization.enabled !== undefined
              ? { enabled: h.noonMidnightCustomization.enabled }
              : {}),
            ...(h.noonMidnightCustomization.expressionMode !== undefined
              ? { expressionMode: h.noonMidnightCustomization.expressionMode }
              : {}),
          },
        }
      : {}),
  };
}

/**
 * Authoritative runtime intent for top-band hour markers (font-first text, glyph-first procedural).
 * Optional per-realization colors live on {@link HourMarkersRealizationConfig.appearance} and resolved models.
 */
export type EffectiveTopBandHourMarkerSelection =
  | {
      kind: "text";
      /** Bundled font override; omitted for the canonical default text realization (typography role only). */
      fontAssetId?: FontAssetId;
      sizeMultiplier: number;
    }
  | {
      kind: "glyph";
      glyphMode: TopBandHourMarkerGlyphMode;
      sizeMultiplier: number;
    };

/**
 * Single source of truth for what top-band hour markers intend to render. Reads
 * {@link DisplayChromeLayoutConfig.hourMarkers} only.
 *
 * Layered contract: {@link resolveEffectiveTopBandHourMarkers} in `topBandHourMarkersResolver.ts` mirrors this intent
 * with behavior/content/realization; the render stack uses both selection and that resolved model.
 */
export function effectiveTopBandHourMarkerSelection(
  layout: DisplayChromeLayoutConfig,
): EffectiveTopBandHourMarkerSelection {
  const hm = layout.hourMarkers;
  const sizeMultiplier = resolvedHourMarkerLayoutSizeMultiplier(layout);

  if (hm.realization.kind !== "text") {
    return {
      kind: "glyph",
      glyphMode: hm.realization.kind,
      sizeMultiplier,
    };
  }
  if (isBaselineDefaultTopBandHourMarkerSelectionInput(layout)) {
    return { kind: "text", fontAssetId: undefined, sizeMultiplier };
  }
  return {
    kind: "text",
    fontAssetId: hm.realization.fontAssetId ?? DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
    sizeMultiplier,
  };
}

/**
 * Layout / visibility for fixed display chrome (instrument strips around the map).
 * Independent of civil-time semantics in {@link DisplayTimeConfig}.
 */
export interface DisplayChromeLayoutConfig {
  /** Lower floating civil-time + date readouts. */
  bottomInformationBarVisible: boolean;
  /** Center tickmark tape (baseline + ticks) between the circle band and NATO row. */
  tickTapeVisible: boolean;
  /**
   * Authored CSS background for the tickmarks tape band only (middle strip).
   * When omitted, the default from {@link DEFAULT_TICK_TAPE_AREA_BACKGROUND_COLOR} is used at resolve time and
   * generic tape tick/baseline ink follow the built-in chrome style unchanged.
   */
  tickTapeAreaBackgroundColor?: string;
  /**
   * Alternating NATO / timezone letter row cell background (even structural column index). When omitted, default from
   * {@link DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_EVEN} is used at resolve time.
   */
  timezoneLetterRowCellBackgroundColorEven?: string;
  /**
   * Alternating cell background (odd structural column index). When omitted, default from
   * {@link DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_ODD} is used at resolve time.
   */
  timezoneLetterRowCellBackgroundColorOdd?: string;
  /**
   * NATO zone letter ink override. When omitted, effective ink is either the shipped default letter color (no cell
   * overrides) or automatic black/white contrast vs the resolved alternating backgrounds (when either cell override is set).
   */
  timezoneLetterRowLetterForegroundColor?: string;
  /** NATO structural letter row under the tick rail on the top strip. */
  timezoneLetterRowVisible: boolean;
  /**
   * Sole persistence model for top-band hour markers (realization, layout).
   * Legacy flat `chrome.layout` hour-marker keys have been removed; normalization reads only this object.
   */
  hourMarkers: HourMarkersConfig;
}

export const DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG: DisplayChromeLayoutConfig = {
  bottomInformationBarVisible: true,
  tickTapeVisible: true,
  timezoneLetterRowVisible: true,
  hourMarkers: cloneHourMarkersConfig(DEFAULT_HOUR_MARKERS_CONFIG),
};

/**
 * Runtime size for top-band hour markers from {@link DisplayChromeLayoutConfig.hourMarkers.layout.sizeMultiplier}
 * (finite check, default from {@link DEFAULT_HOUR_MARKERS_CONFIG}, then {@link clampTopBandHourMarkerSizeMultiplier}).
 */
export function resolvedHourMarkerLayoutSizeMultiplier(layout: DisplayChromeLayoutConfig): number {
  const raw = layout.hourMarkers.layout.sizeMultiplier;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return (
      DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers.layout.sizeMultiplier ?? 1.0
    );
  }
  return clampTopBandHourMarkerSizeMultiplier(raw);
}

/** Matches {@link DEFAULT_HOUR_MARKERS_CONFIG} for typography selection (undefined font → role-only path). */
function isBaselineDefaultTopBandHourMarkerSelectionInput(layout: DisplayChromeLayoutConfig): boolean {
  const dm = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers;
  const hm = layout.hourMarkers;
  if (resolvedHourMarkerLayoutSizeMultiplier(layout) !== dm.layout.sizeMultiplier) {
    return false;
  }
  if (hm.realization.kind !== "text") {
    return false;
  }
  const r = hm.realization;
  const font = r.fontAssetId ?? DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID;
  if (font !== DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID) {
    return false;
  }
  if (Object.keys(r.appearance).length !== 0) {
    return false;
  }
  if (
    resolvedAuthoredIndicatorEntriesAreaBackgroundColor(hm) !==
    resolvedAuthoredIndicatorEntriesAreaBackgroundColor(dm)
  ) {
    return false;
  }
  return true;
}

/**
 * User-defined map pin authored in v2 `pins.custom` and derived into {@link AppConfig}.
 * Renderer sees only the merged city-pin payload shape, not this type.
 */
export interface CustomPinConfig {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  enabled: boolean;
}

/** How text labels are composed for reference-city pins (custom pins never show local time). */
export type PinLabelMode = "city" | "cityAndTime";

/** Pin marker and label sizing relative to the default layout. */
export type PinScale = "small" | "medium" | "large";

/**
 * Map pin presentation derived from v2 `pins.presentation` (bootstrap passes this into the city pins layer).
 */
export interface PinPresentationConfig {
  showLabels: boolean;
  labelMode: PinLabelMode;
  scale: PinScale;
}

export const DEFAULT_PIN_PRESENTATION: PinPresentationConfig = {
  showLabels: true,
  labelMode: "cityAndTime",
  scale: "medium",
};

/** Geographic reference for product semantics (v2 `geography` domain); independent of display-chrome anchor controls. */
export type GeographyReferenceMode = "greenwich" | "fixedCoordinate";

export interface GeographyFixedCoordinate {
  latitude: number;
  longitude: number;
  label: string;
}

export interface GeographyConfig {
  referenceMode: GeographyReferenceMode;
  fixedCoordinate: GeographyFixedCoordinate;
  /**
   * When true, and the top-band meridian is currently driven by this fixed coordinate (Chrome anchor is
   * {@code auto} — see {@link resolveTopBandAnchorLongitudeDeg}), the non-empty trimmed {@link GeographyFixedCoordinate.label}
   * is drawn as a caption on the active structural timezone tab. Off by default; Chrome explicit anchor modes still take precedence.
   */
  showFixedCoordinateLabelInTimezoneStrip: boolean;
}

export const DEFAULT_GEOGRAPHY_CONFIG: GeographyConfig = {
  referenceMode: "greenwich",
  fixedCoordinate: { latitude: 0, longitude: 0, label: "" },
  showFixedCoordinateLabelInTimezoneStrip: false,
};

/**
 * Product data domain (v2 `data`): local, config-authoritative only — no live network in current phases.
 */
export type DataMode = "static" | "demo";

/** Fixed fictional UTC instant used when `startIsoUtc` is missing or invalid after normalization. */
export const DEFAULT_DEMO_TIME_START_ISO_UTC = "2030-06-15T12:00:00.000Z";

/** Inclusive bounds applied when coercing `speedMultiplier` (seconds of demo clock per real second). */
export const DEMO_TIME_SPEED_MIN = 1;
/** Prior cap was 86400 (one demo-day per real second); raised for faster fast-forward demos. */
export const DEMO_TIME_SPEED_MAX = 604800;

/**
 * Parameters for deterministic accelerated “demo now” playback (v2 `data.demoTime`).
 * Effective render time is derived at the app/runtime boundary, not by mutating config each frame.
 */
export interface DemoTimeConfig {
  enabled: boolean;
  /** Initial synthetic UTC instant; invalid values normalize to {@link DEFAULT_DEMO_TIME_START_ISO_UTC}. */
  startIsoUtc: string;
  /** Demo elapsed-time multiplier relative to real wall time (coerced to {@link DEMO_TIME_SPEED_MIN}…{@link DEMO_TIME_SPEED_MAX}). */
  speedMultiplier: number;
}

export const DEFAULT_DEMO_TIME_CONFIG: DemoTimeConfig = {
  enabled: false,
  startIsoUtc: DEFAULT_DEMO_TIME_START_ISO_UTC,
  speedMultiplier: 60,
};

export interface DataConfig {
  /** Offline / built-in sources vs illustrative demo sequences (still non-networked). */
  mode: DataMode;
  /** Reserved for future on-map or chrome captions sourced from the data domain (no live feeds yet). */
  showDataAnnotations: boolean;
  /** Demo playback parameters; ignored at runtime unless {@link mode} is `"demo"` and `enabled` is true. */
  demoTime: DemoTimeConfig;
}

export const DEFAULT_DATA_CONFIG: DataConfig = {
  mode: "static",
  showDataAnnotations: false,
  demoTime: { ...DEFAULT_DEMO_TIME_CONFIG },
};

/**
 * Authoritative runtime configuration (Phase 1). Portable LibrationConfig v2 maps to this shape in
 * `config/v2/librationConfig.ts`; production code does not load v2 yet.
 */
export interface AppConfig {
  layers: LayerEnableFlags;
  /**
   * Subset of {@link REFERENCE_CITIES} to show when city pins are enabled.
   * Order in payloads follows the reference dataset order, not this array's order.
   */
  visibleCityIds: readonly string[];
  /** User pins from v2 `pins.custom` (normalized); disabled entries are kept for editing. */
  customPins: readonly CustomPinConfig[];
  /** Reference/custom city pin labels and sizing on the map. */
  pinPresentation: PinPresentationConfig;
  /** Display chrome time source and top instrument strip mode. */
  displayTime: DisplayTimeConfig;
  /** Which fixed chrome elements are shown (geometry still allocated in the top band when rows are hidden). */
  displayChromeLayout: DisplayChromeLayoutConfig;
  /** Normalized geographic reference (v2 `geography`); see {@link resolveTopBandAnchorLongitudeDeg} for chrome interaction. */
  geography: GeographyConfig;
  /** Normalized data-domain settings (v2 `data`). */
  data: DataConfig;
}

/** Every reference city id, for default config and callers that want “all cities”. */
export const ALL_REFERENCE_CITY_IDS: readonly string[] = REFERENCE_CITIES.map(
  (c) => c.id,
);

export const DEFAULT_DISPLAY_TIME_CONFIG: DisplayTimeConfig = {
  referenceTimeZone: { source: "system" },
  topBandMode: "local12",
  topBandAnchor: { mode: "fixedCity", cityId: "city.knoxville" },
};

export const DEFAULT_APP_CONFIG: AppConfig = {
  layers: {
    baseMap: true,
    solarShading: true,
    grid: true,
    utcClock: false,
    localClock: true,
    cityPins: true,
    subsolarMarker: true,
    sublunarMarker: true,
  },
  visibleCityIds: ALL_REFERENCE_CITY_IDS,
  customPins: [],
  pinPresentation: DEFAULT_PIN_PRESENTATION,
  displayTime: DEFAULT_DISPLAY_TIME_CONFIG,
  displayChromeLayout: DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
  geography: DEFAULT_GEOGRAPHY_CONFIG,
  data: DEFAULT_DATA_CONFIG,
};

/**
 * Resolves which reference cities to pass into the city pins layer.
 * Unknown ids are ignored; result order matches {@link REFERENCE_CITIES}.
 */
export function resolveCitiesForPins(config: AppConfig): ReferenceCity[] {
  const selected = new Set(config.visibleCityIds);
  return REFERENCE_CITIES.filter((c) => selected.has(c.id));
}

/** Custom pins that are enabled and passed into the city pins layer (merged with reference cities). */
export function resolveEnabledCustomPinsForMap(
  config: AppConfig,
): readonly Pick<CustomPinConfig, "id" | "label" | "latitude" | "longitude">[] {
  return config.customPins.filter((p) => p.enabled);
}
