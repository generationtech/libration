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
 * LibrationConfig v2 — portable, render-engine-agnostic product configuration (Phase 1).
 *
 * Dependency boundary (Phase 1): this module must not import renderer shells, app bootstrap,
 * layer implementations, render bridges, or backends. Only the shared {@link AppConfig} contract
 * in `../appConfig` (and future sibling pure-config modules) is allowed.
 */
import type {
  AppConfig,
  CustomPinConfig,
  DataConfig,
  DisplayChromeLayoutConfig,
  DisplayTimeConfig,
  GeographyConfig,
  GeographyFixedCoordinate,
  LayerEnableFlags,
  PinLabelMode,
  PinPresentationConfig,
  PinScale,
  PinDateTimeDisplayMode,
} from "../appConfig";
import {
  cloneHourMarkersConfig,
  DEFAULT_APP_CONFIG,
  DEFAULT_DATA_CONFIG,
  DEFAULT_DEMO_TIME_CONFIG,
  DEFAULT_DEMO_TIME_START_ISO_UTC,
  DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
  DEFAULT_GEOGRAPHY_CONFIG,
  DEMO_TIME_SPEED_MAX,
  DEMO_TIME_SPEED_MIN,
  DEFAULT_PIN_PRESENTATION,
  PIN_DATE_TIME_DISPLAY_MODE_SET,
  TOP_BAND_HOUR_MARKER_SIZE_MULT_MAX,
  TOP_BAND_HOUR_MARKER_SIZE_MULT_MIN,
  type DemoTimeConfig,
  type FontAssetId,
} from "../appConfig";
import {
  PRODUCT_TEXT_FONT_VALID_ID_SET,
  PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
} from "../productFontConstants.ts";
import { normalizeHourMarkersInput } from "../topBandHourMarkersPersistenceAdapter.ts";

/** v2 document identity; numeric `2` matches Phase 0 contract. */
export type LibrationConfigV2Meta = {
  schemaVersion: 2;
} & Record<string, unknown>;

/**
 * Normalized LibrationConfig v2: all top-level domains from Phase 0 are always present.
 * Stub domains use empty objects / empty arrays as specified.
 */
export interface LibrationConfigV2 {
  meta: LibrationConfigV2Meta;
  layers: LayerEnableFlags;
  pins: {
    reference: { visibleCityIds: readonly string[] };
    /** User-defined pins; normalized to stable {@link CustomPinConfig} records. */
    custom: readonly CustomPinConfig[];
    /** Label visibility, content mode, and scale for city pins (normalized). */
    presentation: PinPresentationConfig;
  };
  chrome: {
    displayTime: DisplayTimeConfig;
    layout: DisplayChromeLayoutConfig;
  };
  geography: GeographyConfig;
  data: DataConfig;
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}


function tryParseCustomPinRecord(item: unknown): CustomPinConfig | null {
  if (!isPlainObject(item)) {
    return null;
  }
  const id = item.id;
  const labelRaw = item.label;
  const lat = item.latitude;
  const lon = item.longitude;
  const en = item.enabled;
  if (typeof id !== "string" || id.trim() === "") {
    return null;
  }
  const label = typeof labelRaw === "string" ? labelRaw : "";
  if (typeof lat !== "number" || !Number.isFinite(lat)) {
    return null;
  }
  if (typeof lon !== "number" || !Number.isFinite(lon)) {
    return null;
  }
  if (typeof en !== "boolean") {
    return null;
  }
  return {
    id: id.trim(),
    label,
    latitude: lat,
    longitude: lon,
    enabled: en,
  };
}

/**
 * Sanitizes unknown v2 `pins.custom` input: drops invalid entries and duplicate ids (first wins).
 */
export function normalizeCustomPinsArray(input: unknown): CustomPinConfig[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const seen = new Set<string>();
  const out: CustomPinConfig[] = [];
  for (const item of input) {
    const pin = tryParseCustomPinRecord(item);
    if (!pin) {
      continue;
    }
    if (seen.has(pin.id)) {
      continue;
    }
    seen.add(pin.id);
    out.push(pin);
  }
  return out;
}

/**
 * Coerces unknown v2 `chrome.layout` input to a stable {@link DisplayChromeLayoutConfig}.
 * Hour markers are normalized only from `hourMarkers`; there are no alternate flat hour-marker fields on `chrome.layout`.
 */
export function normalizeDisplayChromeLayout(input: unknown): DisplayChromeLayoutConfig {
  if (!isPlainObject(input)) {
    return normalizeDisplayChromeLayout({});
  }
  const bottom =
    typeof input.bottomInformationBarVisible === "boolean"
      ? input.bottomInformationBarVisible
      : DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.bottomInformationBarVisible;
  const tz =
    typeof input.timezoneLetterRowVisible === "boolean"
      ? input.timezoneLetterRowVisible
      : DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.timezoneLetterRowVisible;
  const tickTape =
    typeof input.tickTapeVisible === "boolean"
      ? input.tickTapeVisible
      : DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.tickTapeVisible;

  const hourMarkers = normalizeHourMarkersInput(input.hourMarkers);

  let tickTapeAreaBackgroundColor: string | undefined;
  const ttBgRaw = (input as { tickTapeAreaBackgroundColor?: unknown }).tickTapeAreaBackgroundColor;
  if (typeof ttBgRaw === "string") {
    const t = ttBgRaw.trim();
    if (t !== "") {
      tickTapeAreaBackgroundColor = t;
    }
  }

  let timezoneLetterRowCellBackgroundColorEven: string | undefined;
  const tzEvenRaw = (input as { timezoneLetterRowCellBackgroundColorEven?: unknown })
    .timezoneLetterRowCellBackgroundColorEven;
  if (typeof tzEvenRaw === "string") {
    const t = tzEvenRaw.trim();
    if (t !== "") {
      timezoneLetterRowCellBackgroundColorEven = t;
    }
  }

  let timezoneLetterRowCellBackgroundColorOdd: string | undefined;
  const tzOddRaw = (input as { timezoneLetterRowCellBackgroundColorOdd?: unknown })
    .timezoneLetterRowCellBackgroundColorOdd;
  if (typeof tzOddRaw === "string") {
    const t = tzOddRaw.trim();
    if (t !== "") {
      timezoneLetterRowCellBackgroundColorOdd = t;
    }
  }

  let timezoneLetterRowLetterForegroundColor: string | undefined;
  const tzFgRaw = (input as { timezoneLetterRowLetterForegroundColor?: unknown })
    .timezoneLetterRowLetterForegroundColor;
  if (typeof tzFgRaw === "string") {
    const t = tzFgRaw.trim();
    if (t !== "") {
      timezoneLetterRowLetterForegroundColor = t;
    }
  }

  let timezoneLetterRowActiveCellBackgroundColor: string | undefined;
  const tzActRaw = (input as { timezoneLetterRowActiveCellBackgroundColor?: unknown })
    .timezoneLetterRowActiveCellBackgroundColor;
  if (typeof tzActRaw === "string") {
    const t = tzActRaw.trim();
    if (t !== "") {
      timezoneLetterRowActiveCellBackgroundColor = t;
    }
  }

  let timezoneLetterRowFontAssetId: FontAssetId | undefined;
  const tzFontRaw = (input as { timezoneLetterRowFontAssetId?: unknown }).timezoneLetterRowFontAssetId;
  if (typeof tzFontRaw === "string") {
    const t = tzFontRaw.trim();
    if (t !== "" && PRODUCT_TEXT_FONT_VALID_ID_SET.has(t)) {
      timezoneLetterRowFontAssetId = t as FontAssetId;
    }
  }

  let defaultTextFontAssetId: FontAssetId | undefined;
  const newGlobalRaw = (input as { defaultTextFontAssetId?: unknown }).defaultTextFontAssetId;
  const legacyGlobalRaw = (input as { topBandTextChromeDefaultFontAssetId?: unknown })
    .topBandTextChromeDefaultFontAssetId;
  const pickGlobal = (raw: unknown): void => {
    if (typeof raw !== "string") {
      return;
    }
    const t = raw.trim();
    if (t !== "" && PRODUCT_TEXT_FONT_VALID_ID_SET.has(t)) {
      defaultTextFontAssetId = t as FontAssetId;
    }
  };
  pickGlobal(newGlobalRaw);
  if (defaultTextFontAssetId === undefined) {
    pickGlobal(legacyGlobalRaw);
  }
  /** Canonical storage: omit explicit renderer-default sentinel — same effective semantics as absent field. */
  if (defaultTextFontAssetId === PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID) {
    defaultTextFontAssetId = undefined;
  }

  let bottomReadoutFontAssetId: FontAssetId | undefined;
  const brRaw = (input as { bottomReadoutFontAssetId?: unknown }).bottomReadoutFontAssetId;
  if (typeof brRaw === "string") {
    const t = brRaw.trim();
    if (t !== "" && PRODUCT_TEXT_FONT_VALID_ID_SET.has(t)) {
      bottomReadoutFontAssetId = t as FontAssetId;
    }
  }

  let configUiFontAssetId: FontAssetId | undefined;
  const cuRaw = (input as { configUiFontAssetId?: unknown }).configUiFontAssetId;
  if (typeof cuRaw === "string") {
    const t = cuRaw.trim();
    if (t !== "" && PRODUCT_TEXT_FONT_VALID_ID_SET.has(t)) {
      configUiFontAssetId = t as FontAssetId;
    }
  }

  return {
    bottomInformationBarVisible: bottom,
    tickTapeVisible: tickTape,
    timezoneLetterRowVisible: tz,
    hourMarkers,
    ...(tickTapeAreaBackgroundColor !== undefined ? { tickTapeAreaBackgroundColor } : {}),
    ...(timezoneLetterRowCellBackgroundColorEven !== undefined
      ? { timezoneLetterRowCellBackgroundColorEven }
      : {}),
    ...(timezoneLetterRowCellBackgroundColorOdd !== undefined
      ? { timezoneLetterRowCellBackgroundColorOdd }
      : {}),
    ...(timezoneLetterRowLetterForegroundColor !== undefined
      ? { timezoneLetterRowLetterForegroundColor }
      : {}),
    ...(timezoneLetterRowActiveCellBackgroundColor !== undefined
      ? { timezoneLetterRowActiveCellBackgroundColor }
      : {}),
    ...(timezoneLetterRowFontAssetId !== undefined ? { timezoneLetterRowFontAssetId } : {}),
    ...(defaultTextFontAssetId !== undefined ? { defaultTextFontAssetId } : {}),
    ...(bottomReadoutFontAssetId !== undefined ? { bottomReadoutFontAssetId } : {}),
    ...(configUiFontAssetId !== undefined ? { configUiFontAssetId } : {}),
  };
}

function parseOptionalProductTextFontId(raw: unknown): FontAssetId | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const t = raw.trim();
  if (t === "" || !PRODUCT_TEXT_FONT_VALID_ID_SET.has(t)) {
    return undefined;
  }
  return t as FontAssetId;
}

/**
 * Coerces unknown v2 `pins.presentation` input to a stable {@link PinPresentationConfig}.
 * Legacy `pinTextFontAssetId` is read once: if both split font fields are absent, it seeds both surfaces.
 */
export function normalizePinPresentation(input: unknown): PinPresentationConfig {
  if (!isPlainObject(input)) {
    return { ...DEFAULT_PIN_PRESENTATION };
  }
  const showLabels =
    typeof input.showLabels === "boolean" ? input.showLabels : DEFAULT_PIN_PRESENTATION.showLabels;
  const lm = input.labelMode;
  const labelMode: PinLabelMode =
    lm === "city" || lm === "cityAndTime" ? lm : DEFAULT_PIN_PRESENTATION.labelMode;
  const sc = input.scale;
  const scale: PinScale =
    sc === "small" || sc === "medium" || sc === "large" ? sc : DEFAULT_PIN_PRESENTATION.scale;

  let pinCityNameFontAssetId = parseOptionalProductTextFontId(
    (input as { pinCityNameFontAssetId?: unknown }).pinCityNameFontAssetId,
  );
  let pinDateTimeFontAssetId = parseOptionalProductTextFontId(
    (input as { pinDateTimeFontAssetId?: unknown }).pinDateTimeFontAssetId,
  );
  const legacyPinText = parseOptionalProductTextFontId(
    (input as { pinTextFontAssetId?: unknown }).pinTextFontAssetId,
  );
  if (legacyPinText !== undefined && pinCityNameFontAssetId === undefined && pinDateTimeFontAssetId === undefined) {
    pinCityNameFontAssetId = legacyPinText;
    pinDateTimeFontAssetId = legacyPinText;
  }

  const dmRaw = (input as { pinDateTimeDisplayMode?: unknown }).pinDateTimeDisplayMode;
  const pinDateTimeDisplayMode: PinDateTimeDisplayMode =
    typeof dmRaw === "string" && PIN_DATE_TIME_DISPLAY_MODE_SET.has(dmRaw)
      ? (dmRaw as PinDateTimeDisplayMode)
      : DEFAULT_PIN_PRESENTATION.pinDateTimeDisplayMode;

  return {
    showLabels,
    labelMode,
    scale,
    pinDateTimeDisplayMode,
    ...(pinCityNameFontAssetId !== undefined ? { pinCityNameFontAssetId } : {}),
    ...(pinDateTimeFontAssetId !== undefined ? { pinDateTimeFontAssetId } : {}),
  };
}

function clampLongitudeDegGeography(lon: number): number {
  if (!Number.isFinite(lon)) {
    return 0;
  }
  return Math.max(-180, Math.min(180, lon));
}

function clampLatitudeDegGeography(lat: number): number {
  if (!Number.isFinite(lat)) {
    return 0;
  }
  return Math.max(-90, Math.min(90, lat));
}

/**
 * Coerces unknown v2 `geography` input to a stable {@link GeographyConfig}.
 */
export function normalizeGeography(input: unknown): GeographyConfig {
  if (!isPlainObject(input)) {
    return { ...DEFAULT_GEOGRAPHY_CONFIG, fixedCoordinate: { ...DEFAULT_GEOGRAPHY_CONFIG.fixedCoordinate } };
  }
  const rm = input.referenceMode;
  const referenceMode =
    rm === "greenwich" || rm === "fixedCoordinate" ? rm : DEFAULT_GEOGRAPHY_CONFIG.referenceMode;
  const fcRaw = input.fixedCoordinate;
  let fixedCoordinate: GeographyFixedCoordinate;
  if (!isPlainObject(fcRaw)) {
    fixedCoordinate = { ...DEFAULT_GEOGRAPHY_CONFIG.fixedCoordinate };
  } else {
    const lat = fcRaw.latitude;
    const lon = fcRaw.longitude;
    const labelRaw = fcRaw.label;
    fixedCoordinate = {
      latitude: clampLatitudeDegGeography(typeof lat === "number" ? lat : Number.NaN),
      longitude: clampLongitudeDegGeography(typeof lon === "number" ? lon : Number.NaN),
      label: typeof labelRaw === "string" ? labelRaw : "",
    };
  }
  const showRaw = input.showFixedCoordinateLabelInTimezoneStrip;
  const showFixedCoordinateLabelInTimezoneStrip =
    typeof showRaw === "boolean"
      ? showRaw
      : DEFAULT_GEOGRAPHY_CONFIG.showFixedCoordinateLabelInTimezoneStrip;
  return { referenceMode, fixedCoordinate, showFixedCoordinateLabelInTimezoneStrip };
}

function normalizeDemoTime(input: unknown): DemoTimeConfig {
  if (!isPlainObject(input)) {
    return { ...DEFAULT_DEMO_TIME_CONFIG };
  }
  const en = input.enabled;
  const enabled =
    typeof en === "boolean" ? en : DEFAULT_DEMO_TIME_CONFIG.enabled;
  const startRaw = input.startIsoUtc;
  let startIsoUtc: string;
  if (typeof startRaw === "string" && startRaw.trim() !== "") {
    const trimmed = startRaw.trim();
    const t = Date.parse(trimmed);
    startIsoUtc = Number.isFinite(t) ? trimmed : DEFAULT_DEMO_TIME_START_ISO_UTC;
  } else {
    startIsoUtc = DEFAULT_DEMO_TIME_START_ISO_UTC;
  }
  const sp = input.speedMultiplier;
  let speedMultiplier: number;
  if (typeof sp === "number" && Number.isFinite(sp) && sp > 0) {
    speedMultiplier = Math.max(DEMO_TIME_SPEED_MIN, Math.min(DEMO_TIME_SPEED_MAX, sp));
  } else {
    speedMultiplier = DEFAULT_DEMO_TIME_CONFIG.speedMultiplier;
  }
  return { enabled, startIsoUtc, speedMultiplier };
}

/**
 * Coerces unknown v2 `data` input to a stable {@link DataConfig}.
 */
export function normalizeData(input: unknown): DataConfig {
  if (!isPlainObject(input)) {
    return {
      ...DEFAULT_DATA_CONFIG,
      demoTime: { ...DEFAULT_DATA_CONFIG.demoTime },
    };
  }
  const m = input.mode;
  const mode =
    m === "static" || m === "demo" ? m : DEFAULT_DATA_CONFIG.mode;
  const showRaw = input.showDataAnnotations;
  const showDataAnnotations =
    typeof showRaw === "boolean"
      ? showRaw
      : DEFAULT_DATA_CONFIG.showDataAnnotations;
  const demoTime = normalizeDemoTime(
    isPlainObject(input.demoTime) ? input.demoTime : {},
  );
  return { mode, showDataAnnotations, demoTime };
}

function cloneData(d: DataConfig): DataConfig {
  return {
    mode: d.mode,
    showDataAnnotations: d.showDataAnnotations,
    demoTime: {
      enabled: d.demoTime.enabled,
      startIsoUtc: d.demoTime.startIsoUtc,
      speedMultiplier: d.demoTime.speedMultiplier,
    },
  };
}

function cloneGeography(g: GeographyConfig): GeographyConfig {
  return {
    referenceMode: g.referenceMode,
    fixedCoordinate: {
      latitude: g.fixedCoordinate.latitude,
      longitude: g.fixedCoordinate.longitude,
      label: g.fixedCoordinate.label,
    },
    showFixedCoordinateLabelInTimezoneStrip: g.showFixedCoordinateLabelInTimezoneStrip,
  };
}

function cloneDisplayTime(dt: DisplayTimeConfig): DisplayTimeConfig {
  const tz = dt.referenceTimeZone;
  const anchor = dt.topBandAnchor;
  return {
    referenceTimeZone:
      tz.source === "fixed"
        ? { source: "fixed", timeZone: tz.timeZone }
        : { source: "system" },
    topBandMode: dt.topBandMode,
    topBandAnchor:
      anchor.mode === "fixedLongitude"
        ? { mode: "fixedLongitude", longitudeDeg: anchor.longitudeDeg }
        : anchor.mode === "fixedCity"
          ? { mode: "fixedCity", cityId: anchor.cityId }
          : { mode: "auto" },
  };
}

function cloneDisplayChromeLayout(l: DisplayChromeLayoutConfig): DisplayChromeLayoutConfig {
  return {
    bottomInformationBarVisible: l.bottomInformationBarVisible,
    tickTapeVisible: l.tickTapeVisible,
    timezoneLetterRowVisible: l.timezoneLetterRowVisible,
    hourMarkers: cloneHourMarkersConfig(l.hourMarkers),
    ...(l.tickTapeAreaBackgroundColor !== undefined
      ? { tickTapeAreaBackgroundColor: l.tickTapeAreaBackgroundColor }
      : {}),
    ...(l.timezoneLetterRowCellBackgroundColorEven !== undefined
      ? { timezoneLetterRowCellBackgroundColorEven: l.timezoneLetterRowCellBackgroundColorEven }
      : {}),
    ...(l.timezoneLetterRowCellBackgroundColorOdd !== undefined
      ? { timezoneLetterRowCellBackgroundColorOdd: l.timezoneLetterRowCellBackgroundColorOdd }
      : {}),
    ...(l.timezoneLetterRowLetterForegroundColor !== undefined
      ? { timezoneLetterRowLetterForegroundColor: l.timezoneLetterRowLetterForegroundColor }
      : {}),
    ...(l.timezoneLetterRowActiveCellBackgroundColor !== undefined
      ? { timezoneLetterRowActiveCellBackgroundColor: l.timezoneLetterRowActiveCellBackgroundColor }
      : {}),
    ...(l.timezoneLetterRowFontAssetId !== undefined
      ? { timezoneLetterRowFontAssetId: l.timezoneLetterRowFontAssetId }
      : {}),
    ...(l.defaultTextFontAssetId !== undefined ? { defaultTextFontAssetId: l.defaultTextFontAssetId } : {}),
    ...(l.bottomReadoutFontAssetId !== undefined
      ? { bottomReadoutFontAssetId: l.bottomReadoutFontAssetId }
      : {}),
    ...(l.configUiFontAssetId !== undefined ? { configUiFontAssetId: l.configUiFontAssetId } : {}),
  };
}

/**
 * Deep clone of a v2 document in normalized form. Equivalent to {@link normalizeLibrationConfig}
 * for snapshot safety (presets, persistence round-trips).
 */
export function cloneV2(config: LibrationConfigV2): LibrationConfigV2 {
  return normalizeLibrationConfig(config);
}

/**
 * Returns a canonical deep clone with every Phase 0 domain populated and `meta.schemaVersion === 2`.
 * Safe to call on outputs of {@link appConfigToV2}; idempotent for normalized documents.
 */
export function normalizeLibrationConfig(config: LibrationConfigV2): LibrationConfigV2 {
  return {
    meta: {
      ...config.meta,
      schemaVersion: 2,
    },
    layers: { ...config.layers },
    pins: {
      reference: {
        visibleCityIds: [...config.pins.reference.visibleCityIds],
      },
      custom: normalizeCustomPinsArray(config.pins.custom),
      presentation: normalizePinPresentation(config.pins.presentation),
    },
    chrome: {
      displayTime: cloneDisplayTime(config.chrome.displayTime),
      layout: normalizeDisplayChromeLayout(config.chrome.layout),
    },
    geography: normalizeGeography(config.geography),
    data: normalizeData(config.data),
  };
}

/**
 * Throws if the value is not a normalized v2 document (all domains, schema version 2).
 * For tests and config-layer validation only — not wired to production runtime in Phase 1.
 */
export function assertIsNormalizedLibrationConfig(
  c: LibrationConfigV2,
): asserts c is LibrationConfigV2 {
  if (c.meta.schemaVersion !== 2) {
    throw new Error(
      `assertIsNormalizedLibrationConfig: expected meta.schemaVersion === 2, got ${String(c.meta.schemaVersion)}`,
    );
  }
  const top = ["meta", "layers", "pins", "chrome", "geography", "data"] as const;
  const asRecord = c as unknown as Record<string, unknown>;
  for (const k of top) {
    if (!(k in c) || asRecord[k] === undefined) {
      throw new Error(`assertIsNormalizedLibrationConfig: missing top-level domain "${k}"`);
    }
  }
  if (!c.pins.reference || !Array.isArray(c.pins.reference.visibleCityIds)) {
    throw new Error(
      "assertIsNormalizedLibrationConfig: pins.reference.visibleCityIds must be an array",
    );
  }
  if (!Array.isArray(c.pins.custom)) {
    throw new Error("assertIsNormalizedLibrationConfig: pins.custom must be an array");
  }
  for (const p of c.pins.custom) {
    if (
      typeof p !== "object" ||
      p === null ||
      typeof (p as CustomPinConfig).id !== "string" ||
      (p as CustomPinConfig).id.trim() === "" ||
      typeof (p as CustomPinConfig).label !== "string" ||
      typeof (p as CustomPinConfig).latitude !== "number" ||
      !Number.isFinite((p as CustomPinConfig).latitude) ||
      typeof (p as CustomPinConfig).longitude !== "number" ||
      !Number.isFinite((p as CustomPinConfig).longitude) ||
      typeof (p as CustomPinConfig).enabled !== "boolean"
    ) {
      throw new Error("assertIsNormalizedLibrationConfig: invalid pins.custom entry");
    }
  }
  const pres = c.pins.presentation;
  if (
    typeof pres !== "object" ||
    pres === null ||
    typeof pres.showLabels !== "boolean" ||
    (pres.labelMode !== "city" && pres.labelMode !== "cityAndTime") ||
    (pres.scale !== "small" && pres.scale !== "medium" && pres.scale !== "large")
  ) {
    throw new Error("assertIsNormalizedLibrationConfig: invalid pins.presentation");
  }
  const pinCityNameFont = (pres as { pinCityNameFontAssetId?: unknown }).pinCityNameFontAssetId;
  if (
    pinCityNameFont !== undefined &&
    (typeof pinCityNameFont !== "string" || !PRODUCT_TEXT_FONT_VALID_ID_SET.has(pinCityNameFont))
  ) {
    throw new Error("assertIsNormalizedLibrationConfig: invalid pins.presentation.pinCityNameFontAssetId");
  }
  const pinDtFont = (pres as { pinDateTimeFontAssetId?: unknown }).pinDateTimeFontAssetId;
  if (
    pinDtFont !== undefined &&
    (typeof pinDtFont !== "string" || !PRODUCT_TEXT_FONT_VALID_ID_SET.has(pinDtFont))
  ) {
    throw new Error("assertIsNormalizedLibrationConfig: invalid pins.presentation.pinDateTimeFontAssetId");
  }
  const pdtm = (pres as { pinDateTimeDisplayMode?: unknown }).pinDateTimeDisplayMode;
  if (
    typeof pdtm !== "string" ||
    !PIN_DATE_TIME_DISPLAY_MODE_SET.has(pdtm)
  ) {
    throw new Error("assertIsNormalizedLibrationConfig: invalid pins.presentation.pinDateTimeDisplayMode");
  }
  if (typeof c.geography !== "object" || c.geography === null) {
    throw new Error("assertIsNormalizedLibrationConfig: geography must be an object");
  }
  if (typeof c.data !== "object" || c.data === null) {
    throw new Error("assertIsNormalizedLibrationConfig: data must be an object");
  }
  const dat = c.data;
  if (
    (dat.mode !== "static" && dat.mode !== "demo") ||
    typeof dat.showDataAnnotations !== "boolean" ||
    typeof dat.demoTime !== "object" ||
    dat.demoTime === null ||
    typeof dat.demoTime.enabled !== "boolean" ||
    typeof dat.demoTime.startIsoUtc !== "string" ||
    typeof dat.demoTime.speedMultiplier !== "number" ||
    !Number.isFinite(dat.demoTime.speedMultiplier)
  ) {
    throw new Error("assertIsNormalizedLibrationConfig: invalid data");
  }
  const lay = c.chrome.layout;
  if (
    typeof lay !== "object" ||
    lay === null ||
    typeof lay.bottomInformationBarVisible !== "boolean" ||
    typeof lay.tickTapeVisible !== "boolean" ||
    typeof lay.timezoneLetterRowVisible !== "boolean"
  ) {
    throw new Error("assertIsNormalizedLibrationConfig: invalid chrome.layout");
  }
  const ttTapeBg = (lay as { tickTapeAreaBackgroundColor?: unknown }).tickTapeAreaBackgroundColor;
  if (ttTapeBg !== undefined && (typeof ttTapeBg !== "string" || ttTapeBg.trim() === "")) {
    throw new Error("assertIsNormalizedLibrationConfig: invalid chrome.layout.tickTapeAreaBackgroundColor");
  }
  const tzEven = (lay as { timezoneLetterRowCellBackgroundColorEven?: unknown })
    .timezoneLetterRowCellBackgroundColorEven;
  if (tzEven !== undefined && (typeof tzEven !== "string" || tzEven.trim() === "")) {
    throw new Error(
      "assertIsNormalizedLibrationConfig: invalid chrome.layout.timezoneLetterRowCellBackgroundColorEven",
    );
  }
  const tzOdd = (lay as { timezoneLetterRowCellBackgroundColorOdd?: unknown })
    .timezoneLetterRowCellBackgroundColorOdd;
  if (tzOdd !== undefined && (typeof tzOdd !== "string" || tzOdd.trim() === "")) {
    throw new Error(
      "assertIsNormalizedLibrationConfig: invalid chrome.layout.timezoneLetterRowCellBackgroundColorOdd",
    );
  }
  const tzLetFg = (lay as { timezoneLetterRowLetterForegroundColor?: unknown })
    .timezoneLetterRowLetterForegroundColor;
  if (tzLetFg !== undefined && (typeof tzLetFg !== "string" || tzLetFg.trim() === "")) {
    throw new Error(
      "assertIsNormalizedLibrationConfig: invalid chrome.layout.timezoneLetterRowLetterForegroundColor",
    );
  }
  const tzActBg = (lay as { timezoneLetterRowActiveCellBackgroundColor?: unknown })
    .timezoneLetterRowActiveCellBackgroundColor;
  if (tzActBg !== undefined && (typeof tzActBg !== "string" || tzActBg.trim() === "")) {
    throw new Error(
      "assertIsNormalizedLibrationConfig: invalid chrome.layout.timezoneLetterRowActiveCellBackgroundColor",
    );
  }
  const tzFont = (lay as { timezoneLetterRowFontAssetId?: unknown }).timezoneLetterRowFontAssetId;
  if (
    tzFont !== undefined &&
    (typeof tzFont !== "string" || !PRODUCT_TEXT_FONT_VALID_ID_SET.has(tzFont))
  ) {
    throw new Error("assertIsNormalizedLibrationConfig: invalid chrome.layout.timezoneLetterRowFontAssetId");
  }
  const globalTextFont = (lay as { defaultTextFontAssetId?: unknown }).defaultTextFontAssetId;
  if (
    globalTextFont !== undefined &&
    (typeof globalTextFont !== "string" || !PRODUCT_TEXT_FONT_VALID_ID_SET.has(globalTextFont))
  ) {
    throw new Error("assertIsNormalizedLibrationConfig: invalid chrome.layout.defaultTextFontAssetId");
  }
  const bottomReadoutFont = (lay as { bottomReadoutFontAssetId?: unknown }).bottomReadoutFontAssetId;
  if (
    bottomReadoutFont !== undefined &&
    (typeof bottomReadoutFont !== "string" || !PRODUCT_TEXT_FONT_VALID_ID_SET.has(bottomReadoutFont))
  ) {
    throw new Error("assertIsNormalizedLibrationConfig: invalid chrome.layout.bottomReadoutFontAssetId");
  }
  const configUiFont = (lay as { configUiFontAssetId?: unknown }).configUiFontAssetId;
  if (
    configUiFont !== undefined &&
    (typeof configUiFont !== "string" || !PRODUCT_TEXT_FONT_VALID_ID_SET.has(configUiFont))
  ) {
    throw new Error("assertIsNormalizedLibrationConfig: invalid chrome.layout.configUiFontAssetId");
  }
  const hm = lay.hourMarkers;
  if (
    typeof hm !== "object" ||
    hm === null ||
    typeof (hm as { indicatorEntriesAreaVisible?: unknown }).indicatorEntriesAreaVisible !== "boolean" ||
    typeof hm.layout !== "object" ||
    hm.layout === null ||
    typeof hm.layout.sizeMultiplier !== "number" ||
    !Number.isFinite(hm.layout.sizeMultiplier) ||
    hm.layout.sizeMultiplier < TOP_BAND_HOUR_MARKER_SIZE_MULT_MIN ||
    hm.layout.sizeMultiplier > TOP_BAND_HOUR_MARKER_SIZE_MULT_MAX ||
    typeof hm.realization !== "object" ||
    hm.realization === null ||
    typeof (hm.realization as { kind?: unknown }).kind !== "string"
  ) {
    throw new Error("assertIsNormalizedLibrationConfig: invalid chrome.layout.hourMarkers");
  }
  const hmBg = (hm as { indicatorEntriesAreaBackgroundColor?: unknown }).indicatorEntriesAreaBackgroundColor;
  if (hmBg !== undefined && typeof hmBg !== "string") {
    throw new Error(
      "assertIsNormalizedLibrationConfig: invalid chrome.layout.hourMarkers.indicatorEntriesAreaBackgroundColor",
    );
  }
  const hmLayout = hm.layout as {
    contentPaddingTopPx?: unknown;
    contentPaddingBottomPx?: unknown;
  };
  if (
    hmLayout.contentPaddingTopPx !== undefined &&
    (typeof hmLayout.contentPaddingTopPx !== "number" || !Number.isFinite(hmLayout.contentPaddingTopPx))
  ) {
    throw new Error("assertIsNormalizedLibrationConfig: invalid hourMarkers layout.contentPaddingTopPx");
  }
  if (
    hmLayout.contentPaddingBottomPx !== undefined &&
    (typeof hmLayout.contentPaddingBottomPx !== "number" || !Number.isFinite(hmLayout.contentPaddingBottomPx))
  ) {
    throw new Error("assertIsNormalizedLibrationConfig: invalid hourMarkers layout.contentPaddingBottomPx");
  }
  const rk = (hm.realization as { kind: string }).kind;
  if (Object.prototype.hasOwnProperty.call(hm.realization, "color")) {
    throw new Error("assertIsNormalizedLibrationConfig: hourMarkers realization must not use legacy color");
  }
  if (rk === "text") {
    const fontAssetId = (hm.realization as { fontAssetId?: unknown }).fontAssetId;
    if (
      fontAssetId !== undefined &&
      (typeof fontAssetId !== "string" || !PRODUCT_TEXT_FONT_VALID_ID_SET.has(fontAssetId))
    ) {
      throw new Error("assertIsNormalizedLibrationConfig: invalid hourMarkers text fontAssetId");
    }
    const app = (hm.realization as { appearance?: unknown }).appearance;
    if (typeof app !== "object" || app === null || Array.isArray(app)) {
      throw new Error("assertIsNormalizedLibrationConfig: invalid hourMarkers text appearance");
    }
    const o = app as { color?: unknown };
    if (o.color !== undefined && typeof o.color !== "string") {
      throw new Error("assertIsNormalizedLibrationConfig: invalid hourMarkers text appearance.color");
    }
  } else if (rk !== "analogClock" && rk !== "radialLine" && rk !== "radialWedge") {
    throw new Error("assertIsNormalizedLibrationConfig: invalid hourMarkers realization kind");
  }
  if (rk === "analogClock") {
    const app = (hm.realization as { appearance?: unknown }).appearance;
    if (typeof app !== "object" || app === null || Array.isArray(app)) {
      throw new Error("assertIsNormalizedLibrationConfig: invalid hourMarkers analogClock appearance");
    }
    const o = app as { handColor?: unknown; faceColor?: unknown };
    if (o.handColor !== undefined && typeof o.handColor !== "string") {
      throw new Error("assertIsNormalizedLibrationConfig: invalid hourMarkers analogClock appearance.handColor");
    }
    if (o.faceColor !== undefined && typeof o.faceColor !== "string") {
      throw new Error("assertIsNormalizedLibrationConfig: invalid hourMarkers analogClock appearance.faceColor");
    }
  } else if (rk === "radialLine") {
    const app = (hm.realization as { appearance?: unknown }).appearance;
    if (typeof app !== "object" || app === null || Array.isArray(app)) {
      throw new Error("assertIsNormalizedLibrationConfig: invalid hourMarkers radialLine appearance");
    }
    const o = app as { lineColor?: unknown; faceColor?: unknown };
    if (o.lineColor !== undefined && typeof o.lineColor !== "string") {
      throw new Error("assertIsNormalizedLibrationConfig: invalid hourMarkers radialLine appearance.lineColor");
    }
    if (o.faceColor !== undefined && typeof o.faceColor !== "string") {
      throw new Error("assertIsNormalizedLibrationConfig: invalid hourMarkers radialLine appearance.faceColor");
    }
  } else if (rk === "radialWedge") {
    const app = (hm.realization as { appearance?: unknown }).appearance;
    if (typeof app !== "object" || app === null || Array.isArray(app)) {
      throw new Error("assertIsNormalizedLibrationConfig: invalid hourMarkers radialWedge appearance");
    }
    const o = app as { fillColor?: unknown; faceColor?: unknown; edgeColor?: unknown };
    if (o.fillColor !== undefined && typeof o.fillColor !== "string") {
      throw new Error("assertIsNormalizedLibrationConfig: invalid hourMarkers radialWedge appearance.fillColor");
    }
    if (o.faceColor !== undefined && typeof o.faceColor !== "string") {
      throw new Error("assertIsNormalizedLibrationConfig: invalid hourMarkers radialWedge appearance.faceColor");
    }
    if (o.edgeColor !== undefined && typeof o.edgeColor !== "string") {
      throw new Error("assertIsNormalizedLibrationConfig: invalid hourMarkers radialWedge appearance.edgeColor");
    }
  }
  const hmBehavior = (hm as { behavior?: unknown }).behavior;
  if (hmBehavior !== undefined) {
    throw new Error("assertIsNormalizedLibrationConfig: hourMarkers.behavior must not be present on normalized config");
  }
  const nm = (hm as { noonMidnightCustomization?: unknown }).noonMidnightCustomization;
  if (nm !== undefined) {
    if (typeof nm !== "object" || nm === null || Array.isArray(nm)) {
      throw new Error("assertIsNormalizedLibrationConfig: invalid hourMarkers.noonMidnightCustomization");
    }
    const nmo = nm as { enabled?: unknown; expressionMode?: unknown };
    if (nmo.enabled !== true) {
      throw new Error("assertIsNormalizedLibrationConfig: hourMarkers.noonMidnightCustomization must be enabled when present");
    }
    const em = nmo.expressionMode;
    if (
      em !== "textWords" &&
      em !== "boxedNumber" &&
      em !== "solarLunarPictogram" &&
      em !== "semanticGlyph"
    ) {
      throw new Error("assertIsNormalizedLibrationConfig: invalid hourMarkers.noonMidnightCustomization.expressionMode");
    }
  }
  const geo = c.geography;
  if (
    typeof geo !== "object" ||
    geo === null ||
    (geo.referenceMode !== "greenwich" && geo.referenceMode !== "fixedCoordinate") ||
    typeof geo.fixedCoordinate !== "object" ||
    geo.fixedCoordinate === null ||
    typeof geo.fixedCoordinate.label !== "string" ||
    typeof geo.fixedCoordinate.latitude !== "number" ||
    !Number.isFinite(geo.fixedCoordinate.latitude) ||
    typeof geo.fixedCoordinate.longitude !== "number" ||
    !Number.isFinite(geo.fixedCoordinate.longitude) ||
    typeof geo.showFixedCoordinateLabelInTimezoneStrip !== "boolean"
  ) {
    throw new Error("assertIsNormalizedLibrationConfig: invalid geography");
  }
}

/** Default v2 snapshot aligned with {@link DEFAULT_APP_CONFIG} (derived, not a divergent literal). */
export function defaultLibrationConfigV2(): LibrationConfigV2 {
  return appConfigToV2(DEFAULT_APP_CONFIG);
}

/** Maps the runtime {@link AppConfig} into a normalized v2 document (Phase 0 mapping table). */
export function appConfigToV2(config: AppConfig): LibrationConfigV2 {
  return normalizeLibrationConfig({
    meta: { schemaVersion: 2 },
    layers: { ...config.layers },
    pins: {
      reference: { visibleCityIds: [...config.visibleCityIds] },
      custom: normalizeCustomPinsArray(config.customPins),
      presentation: normalizePinPresentation(config.pinPresentation),
    },
    chrome: {
      displayTime: cloneDisplayTime(config.displayTime),
      layout: cloneDisplayChromeLayout(config.displayChromeLayout),
    },
    geography: normalizeGeography(config.geography),
    data: normalizeData(config.data),
  });
}

/** Maps a normalized v2 document back to the runtime {@link AppConfig} shape. */
export function v2ToAppConfig(v2: LibrationConfigV2): AppConfig {
  const n = normalizeLibrationConfig(v2);
  return {
    layers: { ...n.layers },
    visibleCityIds: [...n.pins.reference.visibleCityIds],
    customPins: n.pins.custom.map((p) => ({ ...p })),
    pinPresentation: { ...n.pins.presentation },
    displayTime: cloneDisplayTime(n.chrome.displayTime),
    displayChromeLayout: cloneDisplayChromeLayout(n.chrome.layout),
    geography: cloneGeography(n.geography),
    data: cloneData(n.data),
  };
}
