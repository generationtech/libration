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

import {
  DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
  DEFAULT_DISPLAY_TIME_CONFIG,
  effectiveTopBandHourMarkerSelection,
  resolvedHourMarkerLayoutSizeMultiplier,
  type DisplayChromeLayoutConfig,
  type DisplayTimeConfig,
  type EffectiveTopBandHourMarkerSelection,
  type GeographyConfig,
  type TopBandAnchorConfig,
  type TopBandTimeMode,
} from "../config/appConfig";
import {
  resolveEffectiveTopBandHourMarkers,
} from "../config/topBandHourMarkersResolver.ts";
import {
  resolveBottomReadoutTextFontAssetId,
  resolveEffectiveProductTextFontAssetId,
} from "../config/productTextFont.ts";
import {
  resolveEffectiveTickTapeArea,
  type EffectiveTickTapeArea,
} from "../config/topBandTickTapeResolver.ts";
import {
  resolveEffectiveTimezoneLetterRowArea,
  type EffectiveTimezoneLetterRowArea,
} from "../config/topBandTimezoneLetterRowResolver.ts";
import type {
  EffectiveTopBandHourMarkerLayout,
  EffectiveTopBandHourMarkers,
} from "../config/topBandHourMarkersTypes.ts";
import { CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST } from "../config/structuralZoneLetters";
import {
  longitudeDegFromMapX,
  mapXFromLongitudeDeg,
} from "../core/equirectangularProjection";
import { resolveChromeTimeFromResolvedTopBand, resolveTapeAnchorFraction } from "../core/chromeTimeResolver.ts";
import type { CivilProjection, ReadPoint } from "../core/chromeTimeDomain.ts";
import { deriveCivilProjection } from "../core/civilProjection.ts";
import { roundedStructuralMeridianUtcOffsetHours } from "../core/structuralMeridianUtcOffsetHours.ts";
import { displayTimeModeFromTopBandTimeMode } from "../core/displayTimeMode.ts";
import {
  resolveDisplayTimeReferenceZone,
  resolveReferenceFrameCivilTimeZone,
} from "../core/displayTimeReference";
import { readPointXFromReferenceLongitudeDeg } from "../core/readPointLongitude.ts";
import { tapeHourToX, wrapFraction01 } from "../core/tapeRegistration.ts";
import { formatWallClockInTimeZone } from "../core/timeFormat";
export {
  resolveDisplayTimeReferenceZone,
  resolveReferenceFrameCivilTimeZone,
  isValidIanaTimeZone,
} from "../core/displayTimeReference";
export { zonedCalendarDayStartMs } from "../core/wallTimeInZone";

export { longitudeDegFromMapX, mapXFromLongitudeDeg };
import { renderBottomChrome } from "./bottomChrome";
import type { BottomInformationBarState } from "./bottomChromeTypes";
import { alignCrispLineX } from "./crispLines";
import { BOTTOM_CHROME_STYLE } from "../config/bottomChromeStyle";
import {
  computeBottomChromeBandHeightPx,
  computeBottomChromeLayout,
  computeBottomChromeOverlayBottomMarginPx,
} from "./bottomChromeLayout";
import { resolveTopBandAnchorLongitudeDeg, type TopBandAnchorLongitudeSource } from "./topBandAnchorLongitude";
import { defaultFontAssetRegistry } from "../config/chromeTypography";
import {
  computeHourMarkerContentRowVerticalMetrics,
  HOUR_MARKER_DISK_ROW_NUMERAL_Y_TWEAK_CAP_PX,
  HOUR_MARKER_DISK_ROW_NUMERAL_Y_TWEAK_FRAC_OF_HEAD_D,
  resolveHourMarkerContentRowPaddingPx,
  resolveHourMarkerDiskRowIntrinsicContentHeightPx,
} from "../config/topBandHourMarkerContentRowVerticalMetrics.ts";
import {
  computeHourDiskLabelSizePx,
  TOP_CHROME_CIRCLE_STACK_LAYOUT,
  TOP_CHROME_STYLE,
  type TopChromeHourDiskLabelTokens,
  type TopChromeStyle,
} from "../config/topChromeStyle";
import { hourCircleHeadMetrics } from "../config/topBandHourMarkersLayout.ts";
import type { FontAssetRegistry } from "../typography/fontAssetRegistry.ts";
import { resolveTopBandTextDiskRowIntrinsicContentHeightPxForProductPath } from "./topBandTextDiskRowIntrinsicProductPath.ts";
import type { TimeContext } from "../layers/types";
import type { FrameContext, Viewport } from "./types";
import { executeRenderPlanOnCanvas } from "./renderPlan/canvasRenderPlanExecutor";
import { buildTopBandPresentTimeTickRenderPlan } from "./renderPlan/topBandPresentTimeTickPlan";
import { buildTopBandTickRailRenderPlan } from "./renderPlan/topBandTickRailPlan";
import { buildTimezoneLetterRowRenderPlan } from "./renderPlan/timezoneLetterRowPlan";
import { buildTopBandCircleBandHourStackRenderPlan } from "./renderPlan/topBandCircleBandHourStackPlan";
import {
  buildTopBandChromeBackgroundRenderPlan,
  buildTopBandInterBandSeamLinesRenderPlan,
  buildTopBandVerticalEdgeBezelRenderPlan,
} from "./renderPlan/topBandFixedFramingPlan";
import { buildChromeMapTransitionRenderPlan } from "./renderPlan/chromeMapTransitionPlan";
import { buildBottomHudMapFadeRenderPlan } from "./renderPlan/bottomHudMapFadePlan";
import { LON_PER_UTC_STRUCTURAL_HOUR, structuralHourIndexFromReferenceLongitudeDeg } from "./structuralLongitudeGrid";
export type { BottomBarDayCell, BottomInformationBarState } from "./bottomChromeTypes";

export {
  TOP_BAND_DISK_WRAP_HALO_PAD_PX,
  topBandAnnotationWrapHalfExtentPx,
  topBandDiskWrapHalfExtentPx,
  topBandUpperNumeralWrapHalfExtentPx,
} from "./topBandHourDiskWrapExtents";

export {
  LON_PER_UTC_STRUCTURAL_HOUR,
  structuralBlockCenterLongitudeDegFromReferenceLongitudeDeg,
  structuralHourIndexFromReferenceLongitudeDeg,
} from "./structuralLongitudeGrid";
export { topBandWrapOffsetsForCenteredExtent, topBandWrapOffsetsForSpan } from "./topBandWrapOffsets";

export { utcOffsetHoursForTimeZone } from "../core/timeZoneOffset";

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

/** UTC epoch ms at 00:00:00.000 on the UTC calendar day containing {@code nowMs}. */
export function utcDayStartMs(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * East longitude of the subsolar point (anti-meridian of the Sun) for {@code nowMs}, matching the equirectangular
 * map basis: 12:00 UTC → 0° (Greenwich at strip center); 00:00 UTC → −180° (date line at the left edge).
 */
export function computeUtcSubsolarLongitudeDeg(nowMs: number): number {
  const d = new Date(nowMs);
  const utcHours =
    d.getUTCHours() +
    d.getUTCMinutes() / 60 +
    d.getUTCSeconds() / 3600 +
    d.getUTCMilliseconds() / 3600000;

  const utcFraction = utcHours / 24;

  // 12:00 UTC → 0° (Greenwich at center)
  return (utcFraction - 0.5) * 360;
}

export interface DisplayChromeBandRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * One UTC column on the top instrument scale (structural index 0–23, left to right), CSS pixel geometry from
 * {@link mapXFromLongitudeDeg} on −180° + 15°·[h, h+1].
 * {@link label} is a **meridian-offset grid hour** at this column’s center (UTC day + lon/15, wrapped) — structural
 * overlay only; not the reference IANA civil clock.
 */
export interface UtcTopScaleHourSegment {
  /** Column index 0–23; used for alternating band fill in the timezone band. */
  hour: number;
  x0: number;
  x1: number;
  centerX: number;
  /** Longitude (°) at column center; structural, from the UTC 15° grid. */
  centerLongitudeDeg: number;
  /**
   * Hour 0–23 from UTC ms-of-day + longitude/15 (structural equirect grid). Used for NATO-row numerals only — not civil
   * wall time in the reference zone.
   */
  structuralMeridianHour0To23: number;
  label: string;
  /**
   * Libration-modeled **structural** zone letter for this 15° column (west→east index {@link hour}): NATO letter from
   * {@link militaryTimeZoneLetterFromLongitudeDeg} at the sector’s **west edge** (same `lon0` as this segment’s span start),
   * not civil TZ. Independent of the top-band longitude anchor (tape alignment).
   */
  timezoneLetter: string;
  /** Meridian nominal UTC offset in hours ∈ [−12, 12] for {@link centerLongitudeDeg} (structural 15° grid, not civil IANA). */
  nominalUtcOffsetHours: number;
  /** Compact longitude label at column center, e.g. `172°W`. */
  longitudeLabel: string;
}

/**
 * Vertical slice of the top chrome strip (CSS px, y relative to the top edge of the top band).
 */
export interface TopBandVerticalSlice {
  y0: number;
  y1: number;
  height: number;
}

/**
 * Three-band top tape: circle band (dual-hour stack + disks + annotations) → tick rail → timezone (24 UTC columns).
 * Heights sum to {@link totalHeightPx}; y ranges are [0, totalHeightPx) relative to the top band origin.
 */
export interface TopBandLayout {
  widthPx: number;
  totalHeightPx: number;
  circleBand: TopBandVerticalSlice;
  tickBand: TopBandVerticalSlice;
  timezoneBand: TopBandVerticalSlice;
}

/**
 * Explicit vertical model for the circle band: pads + three rows + gaps (sums to {@link UtcTopScaleRowMetrics.circleBandH}).
 */
export interface TopBandCircleStackMetrics {
  padTopPx: number;
  upperNumeralH: number;
  gapNumeralToDiskPx: number;
  diskBandH: number;
  gapDiskToAnnotationPx: number;
  annotationH: number;
  padBottomPx: number;
}

/**
 * Tick positions for the top tape: same phased band as {@link topBandHourMarkerCenterX} (longitude anchor + reference
 * fractional hour), not raw equirectangular longitude. Intra-hour cadence: three majors per hour at 1/4, 1/2, 3/4;
 * two minors per quarter-hour at 1/3 and 2/3 along each quarter (8 minors per hour).
 */
export interface TopTapeTickHierarchy {
  /** Hour boundaries at integer band hours 0 … 24 (length 25; 0 and 24 coincide on the wrap). */
  hour: readonly number[];
  /** Major ticks at 1/4, 1/2, 3/4 within each civil hour; length 72. */
  quarterMajor: readonly number[];
  /** Minor ticks inside each quarter-hour segment at 1/3 and 2/3 of that segment; length 192. */
  quarterMinor: readonly number[];
}

/**
 * Row stacking inside the fixed top chrome band (CSS px, heights sum to {@link topBandHeightPx}).
 * Order top → bottom: {@link circleBandH} | {@link tickBandH} | {@link timezoneBandH}.
 */
export interface UtcTopScaleRowMetrics {
  topBandHeightPx: number;
  /** Top: circular hour markers (labels from {@link topBandMode}; x from {@link topBandHourMarkerCenterX}). */
  circleBandH: number;
  /** Middle: hour boundary + quarter-major + quarter-minor ticks (x from {@link TopTapeTickHierarchy}). */
  tickBandH: number;
  /** Bottom: 24 UTC column segments (alternating fill). */
  timezoneBandH: number;
}

/** Noon/midnight label beneath a 12-hour–interpretable “12” / “00” disk when applicable. */
export type TopBandMarkerAnnotationKind = "none" | "noon" | "midnight";

/**
 * One circular hour marker. {@link centerX} is **not** tied to {@link UtcTopScaleHourSegment.centerX};
 * it follows the time-phased band ({@link topBandHourMarkerCenterX}) anchored in longitude (see {@link TopBandLongitudeAnchor}).
 */
export interface UtcTopScaleCircleMarker {
  centerX: number;
  radiusPx: number;
  /** Structural hour index 0–23 for this marker (reference-zone civil day for local modes, UTC for utc24). */
  utcHour: number;
  /** Disk numeral — current hour marker (same as {@link currentHourLabel}). */
  label: string;
  /** Civil hour shown in the disk ({@link topBandCircleLabel}). */
  currentHourLabel: string;
  /** Plain numeral above the disk — next civil hour in the phased sequence (12 → 1 in local12; wraps in 24h modes). */
  nextHourLabel: string;
  /** Derived from structural hour and {@link TopBandTimeMode} (noon at 12, midnight at 0). */
  annotationKind: TopBandMarkerAnnotationKind;
  /** Set when {@link annotationKind} is noon/midnight; render-only copy for glyph content. */
  annotationLabel?: string;
}

/**
 * Longitude anchoring for the top tape: resolved **read-point meridian** plus exact meridian x on the strip.
 * Civil date/time and phased tape positions come from the reference IANA zone ({@link deriveCivilProjection}); the anchor
 * only fixes **where** on the strip that civil hour is read (exact reference longitude on the equirectangular grid). A
 * reference city contributes longitude for spatial registration only. {@link anchorX} and the authoritative read-point tick
 * both use {@link mapXFromLongitudeDeg}({@link referenceLongitudeDeg}) — same x as map pins. Phased tape registration uses
 * {@link UtcTopScaleLayout.phasedTapeAnchorFrac} from that exact-meridian read point. The NATO letter row stays on fixed
 * structural sectors underneath (non-authoritative for civil time placement).
 */
export interface TopBandLongitudeAnchor {
  /** `Intl` offset hours (fractional) for the reference IANA zone (DST-aware). Not used to place structural columns; echoed for debugging. */
  referenceOffsetHours: number;
  /** Resolved reference meridian (from {@link resolveTopBandAnchorLongitudeDeg}); unchanged for map/selection semantics. */
  referenceLongitudeDeg: number;
  /** Horizontal position of the reference meridian on the top strip [0, widthPx] (same x as map pins for that lon). */
  anchorX: number;
  /** {@link anchorX} / widthPx — exact meridian; matches phased tape anchor when the read point uses the same longitude. */
  anchorFrac: number;
  /** How {@link referenceLongitudeDeg} was chosen (Chrome explicit modes vs geography vs zone fallback). */
  anchorSource: TopBandAnchorLongitudeSource;
}

/**
 * Deterministic layout for the Libration-style top scale: 24 **structural longitude** segments (equirectangular x from longitude),
 * tick hierarchy (hour / quarter-major / quarter-minor), read-point indicator x ({@link UtcTopScaleLayout.nowX}), and a **time-phased** circle row whose positions drift with
 * the configured band fractional day and a **longitude anchor** for phased placement. Civil time display is derived independently from IANA timezone data
 * ({@link referenceFractionalHour}); structural longitude sectors and civil timezone membership are intentionally decoupled. Labels and phase calendar follow {@link UtcTopScaleLayout.topBandMode}.
 */
export interface UtcTopScaleLayout {
  widthPx: number;
  segments: readonly UtcTopScaleHourSegment[];
  /** UTC midnight at the start of the UTC calendar day that contains {@link referenceNowMs}; used for meridian-grid NATO row labels. */
  utcDayStartMs: number;
  /**
   * Start of the calendar day used to phase the moving circle row (UTC day for {@link TopBandTimeMode}
   * `utc24`, otherwise the configured reference zone’s midnight).
   */
  bandPhaseDayStartMs: number;
  /** Wall-time instant used to phase the circle band (matches `now` in {@link buildUtcTopScaleLayout}). */
  referenceNowMs: number;
  /** Civil fractional hour-of-day in the band frame; drives {@link topBandHourMarkerCenterX}. For {@link TopBandTimeMode} `utc24`, use UTC fractional hour ({@code referenceFractionalHour} = UTC hours 0–24 float); for `local12` / `local24`, the reference zone’s wall time. */
  referenceFractionalHour: number;
  /** Longitude anchor (resolved meridian + exact-longitude x / {@link TopBandLongitudeAnchor.anchorFrac} for map registration). Not a civil-TZ selector. */
  topBandAnchor: TopBandLongitudeAnchor;
  /**
   * Normalized x [0,1) for tape registration: {@link ReadPoint.x} / width (reference civil hour sits at the read point).
   */
  phasedTapeAnchorFrac: number;
  /** Explicit read location; {@link nowX} matches {@link ReadPoint.x}. */
  readPoint: ReadPoint;
  /** Resolver-only civil projection for the reference zone (same instant as {@link referenceNowMs}). */
  civilProjection: CivilProjection;
  /** Same as {@link tickHierarchy.hour}; phased hour boundaries (length 25). */
  majorBoundaryXs: readonly number[];
  /** Same as {@link tickHierarchy.quarterMajor}; phased quarter-hour majors (length 72). */
  quarterMajorTickXs: readonly number[];
  /** Same as {@link tickHierarchy.quarterMinor}; phased quarter-segment minors (length 192). */
  quarterMinorTickXs: readonly number[];
  /** Hour / quarter-major / quarter-minor tick x positions (phased like {@link topBandHourMarkerCenterX}). Omitted when {@link widthPx} is 0. */
  tickHierarchy?: TopTapeTickHierarchy;
  /**
   * Horizontal position of the **read-point** tick on the strip [0, widthPx]: exact resolved reference longitude
   * ({@link mapXFromLongitudeDeg} of {@link TopBandLongitudeAnchor.referenceLongitudeDeg}), same as
   * {@link TopBandLongitudeAnchor.anchorX}. Structural 15° {@link UtcTopScaleHourSegment.centerX} values are for NATO/grid
   * overlays only. Phased civil tape placement uses {@link phasedTapeAnchorFrac} (= {@link ReadPoint.x}/width). Authoritative
   * civil instant is the resolver’s `nowUtcInstant`, not this geometry alone.
   */
  nowX: number;
  /** Multi-row header metrics; omitted when width is 0 or {@link topBandHeightPx} was not provided. */
  rows?: UtcTopScaleRowMetrics;
  /** Vertical 3-band split (circle → tick → timezone); omitted when {@link rows} is omitted. */
  topBandLayout?: TopBandLayout;
  /**
   * One marker per UTC hour index when {@link widthPx} &gt; 0 and row metrics are present; empty otherwise.
   * {@link UtcTopScaleCircleMarker.centerX} is phased by time, not by {@link UtcTopScaleHourSegment.centerX}.
   */
  circleMarkers: readonly UtcTopScaleCircleMarker[];
  /** Vertical split of {@link UtcTopScaleRowMetrics.circleBandH}: upper next-hour numerals, disks, noon/midnight strip. */
  circleStack?: TopBandCircleStackMetrics;
  /**
   * Product path: intrinsic hour-marker content height used with {@link computeUtcCircleMarkerRadius} (independent of
   * content-row padding). Omitted when radius is sized from {@link TopBandCircleStackMetrics.diskBandH} alone.
   */
  hourMarkerDiskRowIntrinsicContentHeightPx?: number;
  /** Mode used for circle labels when the render path synthesizes markers. */
  topBandMode: TopBandTimeMode;
}

/**
 * Screen-space layout and copy for fixed header/footer chrome.
 * Built from {@link TimeContext}, {@link Viewport}, and frame metadata — not from map projection.
 */
export interface DisplayChromeState {
  viewport: Viewport;
  topBand: DisplayChromeBandRect;
  bottomBand: DisplayChromeBandRect;
  utcTopScale: UtcTopScaleLayout;
  informationBar: BottomInformationBarState;
  /** Mirrors derived {@link AppConfig.displayChromeLayout} for the render pass. */
  displayChromeLayout: DisplayChromeLayoutConfig;
  /**
   * Resolved hour-marker contract from {@link displayChromeLayout.hourMarkers} (carried for semantic planners and tests).
   */
  effectiveTopBandHourMarkers: EffectiveTopBandHourMarkers;
  /**
   * Tickmarks tape band fill plus generic tick/baseline strokes (from {@link displayChromeLayout} via
   * {@link resolveEffectiveTickTapeArea}).
   */
  effectiveTickTapeArea: EffectiveTickTapeArea;
  /**
   * NATO / timezone letter row fills plus letter ink (from {@link displayChromeLayout} via
   * {@link resolveEffectiveTimezoneLetterRowArea}).
   */
  effectiveTimezoneLetterRowArea: EffectiveTimezoneLetterRowArea;
  /** Same object as {@link AppConfig.geography} from the authoritative config pipeline; optional for tests. */
  geography?: GeographyConfig;
  frameNumber: number;
}

function resolveChromeTimeZone(explicit?: string): string {
  return explicit ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Resolved display-time inputs for the top band and bottom bar: IANA civil zone + formatting mode + read-point meridian policy.
 * The resolver combines these into a single {@link ReferenceFrame} (zone + anchor meridian + label).
 */
export interface ResolvedTopBandTime {
  referenceTimeZone: string;
  topBandMode: TopBandTimeMode;
  topBandAnchor: TopBandAnchorConfig;
}

/** Maps {@link DisplayTimeConfig} to resolved zone + mode for layout and the bottom information bar. */
export function resolveTopBandTimeFromConfig(config: DisplayTimeConfig): ResolvedTopBandTime {
  return {
    referenceTimeZone: resolveReferenceFrameCivilTimeZone(config),
    topBandMode: config.topBandMode,
    topBandAnchor: config.topBandAnchor ?? { mode: "auto" },
  };
}

/**
 * Civil fractional hour-of-day ∈ [0, 24) in the reference IANA zone (`hour + min/60 + sec/3600 + ms/3600000`).
 * Used for top-tape geometry; display mode does not affect this value.
 */
export function referenceFractionalHourOfDay(nowMs: number, referenceTimeZone: string): number {
  return deriveCivilProjection(nowMs, referenceTimeZone).fractionalHour;
}

function formatTopBandLocal12Label(hour0To23: number): string {
  const h = ((hour0To23 % 24) + 24) % 24;
  const mod = h % 12;
  return mod === 0 ? "12" : String(mod);
}

/** Label for one circle marker given structural hour index 0–23 and mode (formatting only). */
export function topBandCircleLabel(hourIndex: number, mode: TopBandTimeMode): string {
  const dm = displayTimeModeFromTopBandTimeMode(mode);
  if (dm === "12hr") {
    return formatTopBandLocal12Label(hourIndex);
  }
  return hourIndex.toString().padStart(2, "0");
}

/** Next civil hour label for the plain numeral row above the disk (same sequence as {@link topBandCircleLabel}, wrapping). */
export function topBandNextHourLabel(utcHour: number, mode: TopBandTimeMode): string {
  return topBandCircleLabel((utcHour + 1) % 24, mode);
}

/**
 * Noon/midnight annotation for structural hour `utcHour` in the band’s civil frame.
 * Hour 0 → midnight; hour 12 → noon (local12, local24, utc24).
 */
export function topBandMarkerAnnotationKind(
  utcHour: number,
  /** Reserved for future per-mode noon/midnight policy; currently structural hour 0/12 only. */
  _mode: TopBandTimeMode,
): TopBandMarkerAnnotationKind {
  if (utcHour === 0) {
    return "midnight";
  }
  if (utcHour === 12) {
    return "noon";
  }
  return "none";
}

/** Planner-resolved crown label for {@link topBandMarkerAnnotationKind} (undefined when none). */
export function topBandMarkerAnnotationLabel(kind: TopBandMarkerAnnotationKind): string | undefined {
  if (kind === "noon") {
    return "NOON";
  }
  if (kind === "midnight") {
    return "MIDNIGHT";
  }
  return undefined;
}

function formatLocalDateLine(nowMs: number, timeZone?: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  if (timeZone !== undefined) {
    return new Intl.DateTimeFormat("en-US", { ...opts, timeZone }).format(new Date(nowMs));
  }
  return new Intl.DateTimeFormat("en-US", opts).format(new Date(nowMs));
}

/** Right panel: one line, e.g. `April 4 2026` — same zone as {@link formatLocalDateLine}. */
function formatRightPanelDateLine(nowMs: number, timeZone: string): string {
  const d = new Date(nowMs);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).formatToParts(d);
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  return `${month} ${day} ${year}`.trim();
}

/** Bottom-left clock: reference-frame civil wall time (display mode is formatting only; tape geometry is independent). */
function bottomTimeReadoutPresentation(
  nowMs: number,
  referenceWallClockZone: string,
  mode: TopBandTimeMode,
): { microLabel: string; timeLine: string } {
  const dm = displayTimeModeFromTopBandTimeMode(mode);
  const hour12 = dm === "12hr";
  return {
    microLabel: "REFERENCE TIME",
    timeLine: formatWallClockInTimeZone(nowMs, referenceWallClockZone, hour12),
  };
}

export function buildBottomInformationBarState(options: {
  nowMs: number;
  bottomBandWidthPx: number;
  /** Resolved IANA zone for wall clock and calendar (system local when omitted). */
  chromeTimeZone?: string;
  /** When omitted, {@link DEFAULT_DISPLAY_TIME_CONFIG} `topBandMode` is used. */
  topBandMode?: TopBandTimeMode;
}): BottomInformationBarState {
  const tz = resolveChromeTimeZone(options.chromeTimeZone);
  const mode = options.topBandMode ?? DEFAULT_DISPLAY_TIME_CONFIG.topBandMode;
  const { microLabel, timeLine: referenceTimeLine } = bottomTimeReadoutPresentation(options.nowMs, tz, mode);
  const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let systemLocalLine: string | undefined;
  if (systemTz !== tz) {
    const dm = displayTimeModeFromTopBandTimeMode(mode);
    const hour12 = dm === "12hr";
    systemLocalLine = `THIS DEVICE · ${formatWallClockInTimeZone(options.nowMs, systemTz, hour12)}`;
  }

  return {
    referenceMicroLabel: microLabel,
    referenceTimeLine,
    referenceDateLine: formatLocalDateLine(options.nowMs, tz),
    rightPanelDateLine: formatRightPanelDateLine(options.nowMs, tz),
    systemLocalLine,
    bottomChromeLayout: computeBottomChromeLayout(options.bottomBandWidthPx),
  };
}

export { wrapFraction01 } from "../core/tapeRegistration.ts";

/**
 * Half-extent for {@link topBandWrapOffsetsForCenteredExtent} when tiling the reference-meridian indicator: must cover the
 * wider halo stroke so seam-adjacent duplicates stay visually continuous.
 */
export function presentTimeIndicatorWrapHalfExtentPx(
  primaryLineWidthPx: number,
  secondaryLineWidthPx?: number,
): number {
  const a = Math.max(0, primaryLineWidthPx);
  const b = Math.max(a, secondaryLineWidthPx ?? 0);
  return b * 0.5 + 2.5;
}

/**
 * Horizontal position (CSS px) on the phased top band for civil time `hourIndex` hours into the band day on a strip of
 * width {@link widthPx}. For **circle markers**, pass an integer structural hour 0–23. For **tick geometry**, pass a
 * fractional band hour (e.g. `h + 1/4` for a quarter-hour tick) — same formula.
 * {@link referenceFractionalHour} is civil fractional hour-of-day in the reference zone ({@link deriveCivilProjection}).
 * {@code anchorFrac} is {@link resolveTapeAnchorFraction}({@link ReadPoint}, width) — registration targets the read point.
 */
export function topBandHourMarkerCenterX(
  hourIndex: number,
  referenceFractionalHour: number,
  widthPx: number,
  anchorFrac: number,
): number {
  return tapeHourToX(hourIndex, referenceFractionalHour, widthPx, anchorFrac);
}

/**
 * Horizontal x-coordinate of the midpoint of each column’s padded tab span (structural letter placement).
 * The reference-meridian “now” indicator uses {@link UtcTopScaleLayout.nowX}, not this value.
 */
export function topBandTimezoneTabPaddedCenterX(
  seg: { x0: number; x1: number },
  segGapX: number,
): number {
  const x0 = seg.x0 + segGapX;
  const x1 = seg.x1 - segGapX;
  return (x0 + x1) * 0.5;
}

/** Builds {@link TopBandLongitudeAnchor} from config: resolved meridian x on the strip (longitude-first; civil IANA zone is for phasing elsewhere). */
function computeTopBandLongitudeAnchor(
  nowMs: number,
  widthPx: number,
  referenceTimeZone: string,
  topBandAnchor: TopBandAnchorConfig,
  geography?: GeographyConfig,
): TopBandLongitudeAnchor {
  const w = Math.max(0, widthPx);
  const { referenceLongitudeDeg, referenceOffsetHours, anchorSource } = resolveTopBandAnchorLongitudeDeg({
    nowMs,
    referenceTimeZone,
    topBandAnchor,
    geography,
  });
  const anchorX = w === 0 ? 0 : mapXFromLongitudeDeg(referenceLongitudeDeg, w);
  return {
    referenceOffsetHours,
    referenceLongitudeDeg,
    anchorX,
    anchorFrac: w === 0 ? 0.5 : wrapFraction01(anchorX / w),
    anchorSource,
  };
}

/**
 * Structural meridian-grid hour 0–23 at `lonDeg` for the given UTC time-of-day within the calendar day:
 * `floor(((utcMsOfDay + lon/15·h in ms) mod 24h) / 1h)`. No DST or political boundaries.
 * Equirect / NATO-style overlay — not IANA civil wall time.
 */
export function structuralMeridianHour0To23FromUtcMsOfDay(utcMsOfDay: number, lonDeg: number): number {
  const offsetMs = (lonDeg / 15) * MS_PER_HOUR;
  const localMs = ((utcMsOfDay + offsetMs) % MS_PER_DAY + MS_PER_DAY) % MS_PER_DAY;
  return Math.floor(localMs / MS_PER_HOUR);
}

const EAST_OF_ZULU_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "K", "L", "M"] as const;
/** West of Zulu −1h…−12h; −12h uses **M** (Libration), not Y. */
const WEST_OF_ZULU_LETTERS = ["N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "M"] as const;

export {
  CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST,
  STRUCTURAL_ZONE_LETTERS_WEST_TO_EAST,
  canonicalMilitaryZoneIndexFromLetter,
  structuralZoneLetterFromIndex,
  visibleTimezoneStripLabelsWestToEast,
} from "../config/structuralZoneLetters";

/** Alias of {@link CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST} — retained for existing imports. */
export const MILITARY_ZONE_LETTERS_WEST_TO_EAST = CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST;

/**
 * NATO military time-zone letter from meridian nominal UTC offset {@code lonDeg}/15 hours (J omitted east of Zulu; west −12h uses M per Libration, not Y).
 * Purely geometric; independent of frame time except through caller-supplied longitude.
 * **Top-strip tab letters** use this at each column’s **west-edge** longitude −180° + 15°·`h` (see
 * {@link militaryTimeZoneLetterFromStructuralColumnIndex}), not the anchor meridian.
 */
export function militaryTimeZoneLetterFromLongitudeDeg(lonDeg: number): string {
  const o = roundedStructuralMeridianUtcOffsetHours(lonDeg);
  if (o === 0) return "Z";
  if (o > 0) return EAST_OF_ZULU_LETTERS[o - 1]!;
  return WEST_OF_ZULU_LETTERS[-o - 1]!;
}

/**
 * NATO letter for structural column `h` (`0…23`): {@link militaryTimeZoneLetterFromLongitudeDeg} at the sector’s west-edge
 * longitude −180° + 15°·`h` (same `lon0` as {@link UtcTopScaleHourSegment} `x0`/`lon0` in {@link buildUtcTopScaleLayout}).
 */
export function militaryTimeZoneLetterFromStructuralColumnIndex(h: number): string {
  const hh = Math.max(0, Math.min(23, Math.floor(h)));
  const lon0 = -180 + LON_PER_UTC_STRUCTURAL_HOUR * hh;
  return militaryTimeZoneLetterFromLongitudeDeg(lon0);
}

/** Retained alias for fixed sector→letter mapping (see {@link militaryTimeZoneLetterFromStructuralColumnIndex}). */
export function militaryZoneLetterFromStructuralHourIndex(structuralHourIndex: number): string {
  return militaryTimeZoneLetterFromStructuralColumnIndex(structuralHourIndex);
}

/** Read-point tick x: same as {@link readPointXFromReferenceLongitudeDeg}. */
export const presentTimeIndicatorXFromReferenceLongitudeDeg = readPointXFromReferenceLongitudeDeg;

function formatLongitudeLabelAtCenter(lonDeg: number): string {
  const rounded = Math.round(lonDeg);
  const abs = Math.abs(rounded);
  const hemi = rounded >= 0 ? "E" : "W";
  return `${abs}°${hemi}`;
}

/**
 * Maximum circle radius (CSS px) that fits the circle row height and hourly column width without overlap.
 */
export function computeUtcCircleMarkerRadius(circleRowH: number, segmentWidthPx: number): number {
  const ch = Math.max(0, circleRowH);
  const sw = Math.max(0, segmentWidthPx);
  if (ch === 0 || sw === 0) {
    return 0;
  }
  /** Tuned for enlarged dual-hour stack — disks remain the dominant hour readout without column overlap. */
  const fromHeight = ch * 0.535;
  const fromWidth = sw * 0.52;
  const rRaw = Math.min(fromHeight, fromWidth);
  const r = rRaw * 0.955;
  return Math.max(5.5, Math.round(r * 10) / 10);
}

/**
 * Proportional split of the fixed top band: circle stack → tick rail → longitude / timezone tabs.
 * Timezone strip height follows {@link TOP_BAND_THREE_ROW_ALLOC} (NATO row uses a smaller height fraction than legacy ~34.5%);
 * tick rail keeps a usable floor via {@link TOP_BAND_THREE_ROW_ALLOC.minTickBandPx}.
 */
export const TOP_BAND_THREE_ROW_ALLOC = {
  circleFracOfH: 0.55,
  /**
   * NATO / timezone letter row slice of the fixed top-band height (remainder is tick rail after circle allocation).
   * Was 0.27; 0.216 yields ~20% less NATO band height at typical top-band sizes (difference flows to the tick rail).
   */
  timezoneFracOfH: 0.216,
  minCirclePx: 36,
  minTimezonePx: 15,
  minTickBandPx: 13,
} as const;

/**
 * Splits the top band into circle → tick → timezone (Libration-like vertical rhythm).
 * Uses the same height budget as the legacy circle / annotation / tick-rail split: middle band receives the former
 * tick-rail slice, bottom band the former annotation slice (bands swapped top-to-bottom so ticks sit above the zone strip).
 * Pure geometry; safe to snapshot in tests.
 */
export function computeUtcTopScaleRowMetrics(
  topBandHeightPx: number,
  chromeRowLayout?: Partial<
    Pick<DisplayChromeLayoutConfig, "timezoneLetterRowVisible" | "tickTapeVisible">
  >,
): UtcTopScaleRowMetrics {
  const h = Math.max(0, Math.round(topBandHeightPx));
  if (h === 0) {
    return { topBandHeightPx: 0, circleBandH: 0, tickBandH: 0, timezoneBandH: 0 };
  }
  const showTz = chromeRowLayout?.timezoneLetterRowVisible !== false;
  const showTick = chromeRowLayout?.tickTapeVisible !== false;
  const A = TOP_BAND_THREE_ROW_ALLOC;

  if (!showTick && !showTz) {
    return { topBandHeightPx: h, circleBandH: h, tickBandH: 0, timezoneBandH: 0 };
  }

  if (!showTick && showTz) {
    const fracSum = A.circleFracOfH + A.timezoneFracOfH;
    let circleBandH = Math.max(A.minCirclePx, Math.round((h * A.circleFracOfH) / fracSum));
    let timezoneBandH = Math.max(A.minTimezonePx, Math.round((h * A.timezoneFracOfH) / fracSum));
    let sum = circleBandH + timezoneBandH;
    if (sum > h) {
      const over = sum - h;
      const trimC = Math.min(over, Math.max(0, circleBandH - A.minCirclePx));
      circleBandH -= trimC;
      sum = circleBandH + timezoneBandH;
      if (sum > h) {
        timezoneBandH -= Math.min(sum - h, Math.max(0, timezoneBandH - A.minTimezonePx));
      }
    } else if (sum < h) {
      circleBandH += h - sum;
    }
    return {
      topBandHeightPx: h,
      circleBandH,
      tickBandH: 0,
      timezoneBandH,
    };
  }

  if (!showTz) {
    const combinedFrac = A.circleFracOfH + A.timezoneFracOfH;
    let circleBandH = Math.max(A.minCirclePx, Math.round(h * combinedFrac));
    const timezoneBandH = 0;
    let tickBandH = h - circleBandH;
    if (tickBandH < A.minTickBandPx) {
      const deficit = A.minTickBandPx - tickBandH;
      const trim = Math.min(deficit, Math.max(0, circleBandH - A.minCirclePx));
      circleBandH -= trim;
      tickBandH += trim;
    }
    if (tickBandH < A.minTickBandPx) {
      const tickBandH2 = A.minTickBandPx;
      const circleBandH2 = Math.max(A.minCirclePx, h - tickBandH2);
      return {
        topBandHeightPx: h,
        circleBandH: circleBandH2,
        tickBandH: tickBandH2,
        timezoneBandH: 0,
      };
    }
    return { topBandHeightPx: h, circleBandH, tickBandH, timezoneBandH };
  }
  let circleBandH = Math.max(A.minCirclePx, Math.round(h * A.circleFracOfH));
  let timezoneBandH = Math.max(A.minTimezonePx, Math.round(h * A.timezoneFracOfH));
  let tickBandH = h - circleBandH - timezoneBandH;
  if (tickBandH < A.minTickBandPx) {
    const deficit = A.minTickBandPx - tickBandH;
    const trim = Math.min(deficit, Math.max(0, circleBandH - A.minCirclePx));
    circleBandH -= trim;
    tickBandH += trim;
  }
  if (tickBandH < A.minTickBandPx) {
    const deficit = A.minTickBandPx - tickBandH;
    const trim = Math.min(deficit, Math.max(0, timezoneBandH - A.minTimezonePx));
    timezoneBandH -= trim;
    tickBandH += trim;
  }
  tickBandH = h - circleBandH - timezoneBandH;
  return { topBandHeightPx: h, circleBandH, tickBandH, timezoneBandH };
}

/**
 * Vertical split of the circle band: explicit top/bottom padding, two inter-row gaps, and three content rows.
 * Sums to {@code circleBandH}; shrinks gaps before rows when the band is short.
 */
export function computeTopBandCircleStackMetrics(circleBandH: number): TopBandCircleStackMetrics {
  const L = TOP_CHROME_CIRCLE_STACK_LAYOUT;
  const h = Math.max(0, Math.round(circleBandH));
  if (h === 0) {
    return {
      padTopPx: 0,
      upperNumeralH: 0,
      gapNumeralToDiskPx: 0,
      diskBandH: 0,
      gapDiskToAnnotationPx: 0,
      annotationH: 0,
      padBottomPx: 0,
    };
  }

  let padTop = Math.max(L.padTopMinPx, Math.round(h * L.padTopFracOfBandH));
  let padBottom = Math.max(L.padBottomMinPx, Math.round(h * L.padBottomFracOfBandH));
  let g1 = Math.max(L.gapNumeralToDiskMinPx, Math.round(h * L.gapNumeralToDiskFracOfBandH));
  let g2 = Math.max(L.gapDiskToAnnotationMinPx, Math.round(h * L.gapDiskToAnnotationFracOfBandH));

  let fixed = padTop + padBottom + g1 + g2;
  let rem = h - fixed;

  let upper = L.upperRowMinPx;
  let disk = L.diskRowMinPx;
  let ann = L.annotationRowMinPx;

  const shrinkFixed = (): boolean => {
    if (g1 > L.gapNumeralToDiskMinPx) {
      g1 -= 1;
      return true;
    }
    if (g2 > L.gapDiskToAnnotationMinPx) {
      g2 -= 1;
      return true;
    }
    if (padTop > L.padTopMinPx) {
      padTop -= 1;
      return true;
    }
    if (padBottom > L.padBottomMinPx) {
      padBottom -= 1;
      return true;
    }
    return false;
  };

  const shrinkRows = (): boolean => {
    if (ann > L.annotationRowFloorPx) {
      ann -= 1;
      return true;
    }
    if (upper > L.upperRowFloorPx) {
      upper -= 1;
      return true;
    }
    if (disk > L.diskRowFloorPx) {
      disk -= 1;
      return true;
    }
    return false;
  };

  fixed = padTop + padBottom + g1 + g2;
  rem = h - fixed;
  while (upper + disk + ann > rem) {
    if (!shrinkFixed() && !shrinkRows()) {
      break;
    }
    fixed = padTop + padBottom + g1 + g2;
    rem = h - fixed;
  }

  let rowSum = upper + disk + ann;
  let extra = rem - rowSum;
  if (extra > 0) {
    const su = L.surplusUpperFrac;
    const sd = L.surplusDiskFrac;
    const sa = L.surplusAnnotationFrac;
    const uAdd = Math.floor((extra * su) / (su + sd + sa));
    const dAdd = Math.floor((extra * sd) / (su + sd + sa));
    const aAdd = extra - uAdd - dAdd;
    upper += uAdd;
    disk += dAdd;
    ann += aAdd;
  }

  fixed = padTop + padBottom + g1 + g2;
  rowSum = upper + disk + ann;
  let total = fixed + rowSum;
  let delta = h - total;
  if (delta > 0) {
    ann += delta;
  } else if (delta < 0) {
    let over = -delta;
    while (over > 0) {
      if (ann > 5) {
        ann--;
        over--;
      } else if (upper > 8) {
        upper--;
        over--;
      } else if (disk > 12) {
        disk--;
        over--;
      } else if (g1 > 0) {
        g1--;
        over--;
      } else if (g2 > 0) {
        g2--;
        over--;
      } else if (padTop > L.padTopMinPx) {
        padTop--;
        over--;
      } else if (padBottom > L.padBottomMinPx) {
        padBottom--;
        over--;
      } else {
        break;
      }
    }
    fixed = padTop + padBottom + g1 + g2;
    total = fixed + upper + disk + ann;
    if (total !== h) {
      ann += h - total;
    }
  }

  return {
    padTopPx: padTop,
    upperNumeralH: upper,
    gapNumeralToDiskPx: g1,
    diskBandH: disk,
    gapDiskToAnnotationPx: g2,
    annotationH: ann,
    padBottomPx: padBottom,
  };
}

/** Default procedural glyph disk readout is larger than the legacy baseline at 1× sizing. */
export const TOP_BAND_GLYPH_DISK_CONTENT_SCALE = 1.32 as const;

/**
 * Adds height only to the circle band; tick rail and NATO row keep their prior pixel heights.
 */
export function expandTopBandCircleBandPreservingLowerBands(
  rows: UtcTopScaleRowMetrics,
  addCirclePx: number,
): UtcTopScaleRowMetrics {
  const d = Math.max(0, Math.round(addCirclePx));
  if (d === 0) {
    return rows;
  }
  return {
    topBandHeightPx: rows.topBandHeightPx + d,
    circleBandH: rows.circleBandH + d,
    tickBandH: rows.tickBandH,
    timezoneBandH: rows.timezoneBandH,
  };
}

/**
 * Sums the circle-band stack (pads, gaps, rows). Must match {@link UtcTopScaleRowMetrics.circleBandH} when the stack
 * is authoritative for the indicator band.
 */
export function sumTopBandCircleStackHeightPx(stack: TopBandCircleStackMetrics): number {
  return (
    stack.padTopPx +
    stack.upperNumeralH +
    stack.gapNumeralToDiskPx +
    stack.diskBandH +
    stack.gapDiskToAnnotationPx +
    stack.annotationH +
    stack.padBottomPx
  );
}

/**
 * Builds the circle-band vertical stack using a **fixed** canonical disk-row height (`diskBandH`).
 * Non-disk slices are zero: the visible circle band is exactly the 24-hour indicator row (intrinsic + content padding),
 * with no extra stack padding, gaps, or annotation slice folded into the painted band (product path).
 */
export function computeTopBandCircleStackMetricsForCanonicalDiskRow(
  diskBandH: number,
): TopBandCircleStackMetrics {
  const d = Math.max(0, Math.round(diskBandH));
  return {
    padTopPx: 0,
    upperNumeralH: 0,
    gapNumeralToDiskPx: 0,
    diskBandH: d,
    gapDiskToAnnotationPx: 0,
    annotationH: 0,
    padBottomPx: 0,
  };
}

/** Result of {@link solveCanonicalHourMarkerDiskBandHeightPx}: allocated disk row height and intrinsic content height for radius/label sizing. */
export type CanonicalHourMarkerDiskBandSolveResult = {
  diskBandHeightPx: number;
  /** Intrinsic marker content height (text ink/typography or glyph head), independent of row padding — use for {@link computeUtcCircleMarkerRadius}. */
  intrinsicContentHeightPx: number;
};

/**
 * Fixed-point solve for the hour-marker **disk strip** height: intrinsic content (text typography/ink model or glyph head
 * diameter) plus resolved {@link EffectiveTopBandHourMarkerLayout} padding — the visible 24-hour indicator row band.
 * Omitted (Auto) padding is proportional to intrinsic height, so row height tracks content when size or font changes.
 *
 * Marker scale (radius, labels, glyphs) is driven only by {@link CanonicalHourMarkerDiskBandSolveResult.intrinsicContentHeightPx},
 * not by padding-inclusive row height, so changing top/bottom padding does not change numeral/glyph size.
 *
 * Intrinsic height is iterated to a fixed point (measure ↔ radius ↔ label box) until stable; **disk band height** is then
 * derived as intrinsic + resolved padding. Row-height matching must not terminate the loop — that previously let padding
 * change how many iterations ran and returned different intrinsics near ~1px thresholds.
 */
export function solveCanonicalHourMarkerDiskBandHeightPx(args: {
  viewportWidthPx: number;
  hourDiskLabelTokens: TopChromeHourDiskLabelTokens;
  layout: DisplayChromeLayoutConfig;
  selection: EffectiveTopBandHourMarkerSelection;
  hourMarkerLayout: EffectiveTopBandHourMarkerLayout;
  fontRegistry: FontAssetRegistry;
  /** Tape label mode for text intrinsic (max ink across {@link topBandCircleLabel} columns). */
  topBandMode: TopBandTimeMode;
  /**
   * Retained for call-site compatibility; intrinsic fixed-point solve no longer uses this value (padding-inclusive row
   * height must not gate convergence — see loop below).
   */
  baseDiskBandGuessPx: number;
}): CanonicalHourMarkerDiskBandSolveResult {
  const vw = args.viewportWidthPx;
  if (!(vw > 0)) {
    return { diskBandHeightPx: 0, intrinsicContentHeightPx: 0 };
  }
  void args.baseDiskBandGuessPx;
  const sw = vw / 24;
  const sm = resolvedHourMarkerLayoutSizeMultiplier(args.layout);
  const glyphBoost = args.selection.kind === "glyph" ? TOP_BAND_GLYPH_DISK_CONTENT_SCALE : 1;

  /**
   * Seed intrinsic height for the first radius pass: must **not** be the disk strip height from the circle stack.
   * Bootstrap from a width-limited radius (tall nominal row height so the height term in
   * {@link computeUtcCircleMarkerRadius} does not bind) so the fixed point depends only on intrinsic sizing + column width.
   */
  const ROW_H_SEED_FOR_WIDTH_LIMITED_RADIUS_PX = 1e6;
  const rWidthSeed = computeUtcCircleMarkerRadius(ROW_H_SEED_FOR_WIDTH_LIMITED_RADIUS_PX, sw);
  const baseLabelSeed = computeHourDiskLabelSizePx(rWidthSeed, vw, args.hourDiskLabelTokens);
  const markerContentSeed = baseLabelSeed * sm * glyphBoost;
  const hourLabelsWestToEast = Array.from({ length: 24 }, (_, h) =>
    topBandCircleLabel(h, args.topBandMode),
  );
  let intrinsicPx: number;
  if (args.selection.kind === "text") {
    intrinsicPx = resolveTopBandTextDiskRowIntrinsicContentHeightPxForProductPath({
      fontRegistry: args.fontRegistry,
      selection: args.selection,
      markerLayoutBoxSizePx: markerContentSeed,
      hourDiskLabelsWestToEast: hourLabelsWestToEast,
    });
  } else {
    const headD0 = hourCircleHeadMetrics(rWidthSeed, ROW_H_SEED_FOR_WIDTH_LIMITED_RADIUS_PX, vw).headD;
    intrinsicPx = resolveHourMarkerDiskRowIntrinsicContentHeightPx({ headDiameterPx: headD0 });
  }

  /** Converge **intrinsic** content height only; row height (padding) must not terminate the loop early. */
  const INTRINSIC_SOLVE_EPS_PX = 1e-3;
  const MAX_INTRINSIC_ITERS = 28;

  for (let iter = 0; iter < MAX_INTRINSIC_ITERS; iter += 1) {
    const prevIntrinsic = intrinsicPx;
    const r = computeUtcCircleMarkerRadius(prevIntrinsic, sw);
    const baseLabel = computeHourDiskLabelSizePx(r, vw, args.hourDiskLabelTokens);
    const markerContentSizePx = baseLabel * sm * glyphBoost;

    let measuredIntrinsic: number;
    if (args.selection.kind === "text") {
      measuredIntrinsic = resolveTopBandTextDiskRowIntrinsicContentHeightPxForProductPath({
        fontRegistry: args.fontRegistry,
        selection: args.selection,
        markerLayoutBoxSizePx: markerContentSizePx,
        hourDiskLabelsWestToEast: hourLabelsWestToEast,
      });
    } else {
      const headD = hourCircleHeadMetrics(r, prevIntrinsic, vw).headD;
      measuredIntrinsic = resolveHourMarkerDiskRowIntrinsicContentHeightPx({ headDiameterPx: headD });
    }

    intrinsicPx = measuredIntrinsic;
    if (Math.abs(measuredIntrinsic - prevIntrinsic) <= INTRINSIC_SOLVE_EPS_PX) {
      break;
    }
  }

  const finalIntrinsic = intrinsicPx;
  const { contentPaddingTopPx: pt, contentPaddingBottomPx: pb } = resolveHourMarkerContentRowPaddingPx({
    layout: args.hourMarkerLayout,
    intrinsicContentHeightPx: finalIntrinsic,
  });

  const tweak = Math.min(
    HOUR_MARKER_DISK_ROW_NUMERAL_Y_TWEAK_CAP_PX,
    finalIntrinsic * HOUR_MARKER_DISK_ROW_NUMERAL_Y_TWEAK_FRAC_OF_HEAD_D,
  );

  const row = computeHourMarkerContentRowVerticalMetrics({
    intrinsicContentHeightPx: finalIntrinsic,
    contentPaddingTopPx: pt,
    contentPaddingBottomPx: pb,
    contentCenterYOffsetFromIntrinsicMidPx: -tweak,
  });

  const diskBandHeightPx = Math.max(1, Math.round(row.allocatedContentRowHeightPx));
  return { diskBandHeightPx, intrinsicContentHeightPx: finalIntrinsic };
}

function buildTopBandLayoutFromRows(widthPx: number, rows: UtcTopScaleRowMetrics): TopBandLayout {
  const h = rows.topBandHeightPx;
  const c = rows.circleBandH;
  const t = rows.tickBandH;
  const z = rows.timezoneBandH;
  return {
    widthPx,
    totalHeightPx: h,
    circleBand: { y0: 0, y1: c, height: c },
    tickBand: { y0: c, y1: c + t, height: t },
    timezoneBand: { y0: c + t, y1: h, height: z },
  };
}

/**
 * Builds hour columns, boundary/tick positions, and read-point indicator x ({@link UtcTopScaleLayout.nowX}) for the top instrument scale.
 * Segments carry **meridian-grid** metadata per structural column (NATO row labels). The **circle row** and **tick rail**
 * share phased x from {@link topBandHourMarkerCenterX} using {@link UtcTopScaleLayout.phasedTapeAnchorFrac}; civil labels and
 * phase follow {@link ResolvedTopBandTime}.
 * Pure geometry for tests; {@link buildDisplayChromeState} embeds the same result for the top band width.
 * Pass {@link topBandHeightPx} to attach {@link UtcTopScaleRowMetrics} for multi-row chrome.
 * When {@link rowMetricsOverride} is set, it replaces {@link computeUtcTopScaleRowMetrics} (e.g. product chrome derives
 * the circle band from canonical hour-marker metrics). Optional {@link circleStackOverride} must match
 * {@link rowMetricsOverride.circleBandH} via {@link sumTopBandCircleStackHeightPx}; when omitted, the stack is split from
 * {@link computeTopBandCircleStackMetrics}({@link UtcTopScaleRowMetrics.circleBandH}) (tests and generic callers).
 * @param hourMarkerDiskRowIntrinsicContentHeightPx When set (product chrome), {@link UtcTopScaleCircleMarker.radiusPx} uses
 * this height for {@link computeUtcCircleMarkerRadius} instead of {@link TopBandCircleStackMetrics.diskBandH} so padding
 * does not affect disk scale.
 */
export function buildUtcTopScaleLayout(
  nowMs: number,
  widthPx: number,
  topBandHeightPx?: number,
  resolved?: ResolvedTopBandTime,
  geography?: GeographyConfig,
  chromeRowLayout?: Partial<
    Pick<DisplayChromeLayoutConfig, "timezoneLetterRowVisible" | "tickTapeVisible">
  >,
  rowMetricsOverride?: UtcTopScaleRowMetrics,
  circleStackOverride?: TopBandCircleStackMetrics,
  hourMarkerDiskRowIntrinsicContentHeightPx?: number,
): UtcTopScaleLayout {
  const w = Math.max(0, widthPx);
  const rt = resolved ?? resolveTopBandTimeFromConfig(DEFAULT_DISPLAY_TIME_CONFIG);
  const dayStart = utcDayStartMs(nowMs);
  const utcMsOfDay = nowMs - dayStart;
  const chromeTime = resolveChromeTimeFromResolvedTopBand({
    timeBasis: { nowUtcInstant: nowMs },
    referenceTimeZone: rt.referenceTimeZone,
    topBandMode: rt.topBandMode,
    topBandAnchor: rt.topBandAnchor,
    geography,
    viewportWidthPx: w,
  });
  const civilProjection = chromeTime.civilProjection;
  const readPoint = chromeTime.readPoint;
  const bandPhaseDayStartMs = civilProjection.dayStartMs;
  const referenceFractionalHour = civilProjection.fractionalHour;
  const topBandAnchor = computeTopBandLongitudeAnchor(
    nowMs,
    w,
    rt.referenceTimeZone,
    rt.topBandAnchor,
    geography,
  );
  const phasedTapeAnchorFrac = resolveTapeAnchorFraction(readPoint, w);
  const nowX = readPoint.x;

  if (w === 0) {
    return {
      widthPx: 0,
      segments: [],
      utcDayStartMs: dayStart,
      bandPhaseDayStartMs,
      referenceNowMs: nowMs,
      referenceFractionalHour,
      topBandAnchor,
      phasedTapeAnchorFrac: 0.5,
      readPoint,
      civilProjection,
      majorBoundaryXs: [],
      quarterMajorTickXs: [],
      quarterMinorTickXs: [],
      nowX: 0,
      circleMarkers: [],
      topBandMode: rt.topBandMode,
    };
  }

  const sw = w / 24;
  const segments: UtcTopScaleHourSegment[] = [];
  for (let h = 0; h < 24; h += 1) {
    const lon0 = -180 + LON_PER_UTC_STRUCTURAL_HOUR * h;
    const lon1 = -180 + LON_PER_UTC_STRUCTURAL_HOUR * (h + 1);
    const lonCenter = lon0 + LON_PER_UTC_STRUCTURAL_HOUR / 2;
    const x0 = mapXFromLongitudeDeg(lon0, w);
    const x1 = mapXFromLongitudeDeg(lon1, w);
    const centerX = mapXFromLongitudeDeg(lonCenter, w);
    const structuralMeridianHour0To23 = structuralMeridianHour0To23FromUtcMsOfDay(utcMsOfDay, lonCenter);
    const nominalUtcOffsetHours = roundedStructuralMeridianUtcOffsetHours(lonCenter);
    segments.push({
      hour: h,
      x0,
      x1,
      centerX,
      centerLongitudeDeg: lonCenter,
      structuralMeridianHour0To23,
      label: structuralMeridianHour0To23.toString().padStart(2, "0"),
      timezoneLetter: militaryTimeZoneLetterFromStructuralColumnIndex(h),
      nominalUtcOffsetHours,
      longitudeLabel: formatLongitudeLabelAtCenter(lonCenter),
    });
  }

  const ref = referenceFractionalHour;
  const tapeAf = phasedTapeAnchorFrac;

  const majorBoundaryXs: number[] = [];
  for (let i = 0; i <= 24; i += 1) {
    majorBoundaryXs.push(topBandHourMarkerCenterX(i, ref, w, tapeAf));
  }

  const quarterMajorTickXs: number[] = [];
  const quarterMinorTickXs: number[] = [];
  for (let h = 0; h < 24; h += 1) {
    for (const q of [1, 2, 3] as const) {
      quarterMajorTickXs.push(topBandHourMarkerCenterX(h + q / 4, ref, w, tapeAf));
    }
    for (let q = 0; q < 4; q += 1) {
      const base = h + q / 4;
      quarterMinorTickXs.push(
        topBandHourMarkerCenterX(base + 1 / 12, ref, w, tapeAf),
        topBandHourMarkerCenterX(base + 2 / 12, ref, w, tapeAf),
      );
    }
  }

  const tickHierarchy: TopTapeTickHierarchy = {
    hour: majorBoundaryXs,
    quarterMajor: quarterMajorTickXs,
    quarterMinor: quarterMinorTickXs,
  };

  const rows =
    rowMetricsOverride !== undefined
      ? rowMetricsOverride
      : topBandHeightPx !== undefined && topBandHeightPx > 0
        ? computeUtcTopScaleRowMetrics(topBandHeightPx, chromeRowLayout)
        : undefined;

  const topBandLayout = rows !== undefined ? buildTopBandLayoutFromRows(w, rows) : undefined;

  let circleStack: TopBandCircleStackMetrics | undefined;
  if (rows !== undefined) {
    if (circleStackOverride !== undefined) {
      if (rowMetricsOverride === undefined) {
        throw new Error("buildUtcTopScaleLayout: circleStackOverride requires rowMetricsOverride");
      }
      const sum = sumTopBandCircleStackHeightPx(circleStackOverride);
      if (sum !== rows.circleBandH) {
        throw new Error(
          `buildUtcTopScaleLayout: circle stack height ${sum} does not match rows.circleBandH ${rows.circleBandH}`,
        );
      }
      circleStack = circleStackOverride;
    } else {
      circleStack = computeTopBandCircleStackMetrics(rows.circleBandH);
    }
  } else {
    circleStack = undefined;
  }

  const radiusContentH =
    hourMarkerDiskRowIntrinsicContentHeightPx !== undefined && hourMarkerDiskRowIntrinsicContentHeightPx > 0
      ? hourMarkerDiskRowIntrinsicContentHeightPx
      : circleStack !== undefined
        ? circleStack.diskBandH
        : 0;

  const circleMarkers: UtcTopScaleCircleMarker[] =
    rows !== undefined && circleStack !== undefined
      ? (() => {
          const cr = computeUtcCircleMarkerRadius(radiusContentH, sw);
          const out: UtcTopScaleCircleMarker[] = [];
          for (let h = 0; h < 24; h += 1) {
            const cur = topBandCircleLabel(h, rt.topBandMode);
            const ak = topBandMarkerAnnotationKind(h, rt.topBandMode);
            out.push({
              centerX: topBandHourMarkerCenterX(h, referenceFractionalHour, w, phasedTapeAnchorFrac),
              radiusPx: cr,
              utcHour: h,
              label: cur,
              currentHourLabel: cur,
              nextHourLabel: topBandNextHourLabel(h, rt.topBandMode),
              annotationKind: ak,
              annotationLabel: topBandMarkerAnnotationLabel(ak),
            });
          }
          return out;
        })()
      : [];

  return {
    widthPx: w,
    segments,
    utcDayStartMs: dayStart,
    bandPhaseDayStartMs,
    referenceNowMs: nowMs,
    referenceFractionalHour,
    topBandAnchor,
    phasedTapeAnchorFrac,
    readPoint,
    civilProjection,
    majorBoundaryXs,
    quarterMajorTickXs,
    quarterMinorTickXs,
    tickHierarchy,
    nowX,
    rows,
    topBandLayout,
    circleMarkers,
    circleStack,
    hourMarkerDiskRowIntrinsicContentHeightPx:
      hourMarkerDiskRowIntrinsicContentHeightPx !== undefined && hourMarkerDiskRowIntrinsicContentHeightPx > 0
        ? hourMarkerDiskRowIntrinsicContentHeightPx
        : undefined,
    topBandMode: rt.topBandMode,
  };
}

function computeBandHeights(
  heightPx: number,
  layout?: Pick<DisplayChromeLayoutConfig, "bottomInformationBarVisible">,
): { top: number; bottom: number } {
  const h = heightPx > 0 ? heightPx : 1;
  /** Taller top strip so the enlarged hour stack + denser tick rail fit without crowding the map. */
  const top = Math.max(56, Math.min(118, Math.round(h * 0.102)));
  const bottom =
    layout?.bottomInformationBarVisible === false ? 0 : computeBottomChromeBandHeightPx(h);
  return { top, bottom };
}

export function buildDisplayChromeState(options: {
  time: TimeContext;
  viewport: Viewport;
  frame: FrameContext;
  /** When omitted, {@link DEFAULT_DISPLAY_TIME_CONFIG} is used. */
  displayTime?: DisplayTimeConfig;
  /** Product geography reference; affects auto-mode top-band meridian when {@code referenceMode === "fixedCoordinate"}. */
  geography?: GeographyConfig;
  /** Merged with {@link DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG} (visibility fields optional). */
  displayChromeLayout?: Partial<DisplayChromeLayoutConfig>;
}): DisplayChromeState {
  const { time, viewport, frame } = options;
  const resolved = resolveTopBandTimeFromConfig(options.displayTime ?? DEFAULT_DISPLAY_TIME_CONFIG);
  const layout = {
    ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
    ...options.displayChromeLayout,
  };
  const w = Math.max(0, viewport.width);
  const h = Math.max(0, viewport.height);
  const { top: baseTop, bottom } = computeBandHeights(h, layout);
  const bottomOverlayMarginPx =
    layout.bottomInformationBarVisible === false
      ? 0
      : computeBottomChromeOverlayBottomMarginPx(h);
  const stForRows = TOP_CHROME_STYLE;
  const hourMarkerSel = effectiveTopBandHourMarkerSelection(layout);
  const effectiveTopBandHourMarkers = resolveEffectiveTopBandHourMarkers(layout);
  const effectiveTickTapeArea = resolveEffectiveTickTapeArea(layout);
  const effectiveTimezoneLetterRowArea = resolveEffectiveTimezoneLetterRowArea(layout);
  const baseRows = computeUtcTopScaleRowMetrics(baseTop, layout);
  const baseCircleStack = computeTopBandCircleStackMetrics(baseRows.circleBandH);
  const canonicalSolve =
    w > 0 && effectiveTopBandHourMarkers.areaVisible
      ? solveCanonicalHourMarkerDiskBandHeightPx({
          viewportWidthPx: w,
          hourDiskLabelTokens: stForRows.hourDiskLabel,
          layout,
          selection: hourMarkerSel,
          hourMarkerLayout: effectiveTopBandHourMarkers.layout,
          fontRegistry: defaultFontAssetRegistry,
          topBandMode: resolved.topBandMode,
          baseDiskBandGuessPx: baseCircleStack.diskBandH,
        })
      : { diskBandHeightPx: 0, intrinsicContentHeightPx: 0 };
  const canonicalDiskBandH = canonicalSolve.diskBandHeightPx;
  const circleStackForChrome = computeTopBandCircleStackMetricsForCanonicalDiskRow(canonicalDiskBandH);
  const circleBandH = sumTopBandCircleStackHeightPx(circleStackForChrome);
  const rowMetrics: UtcTopScaleRowMetrics = {
    topBandHeightPx: circleBandH + baseRows.tickBandH + baseRows.timezoneBandH,
    circleBandH,
    tickBandH: baseRows.tickBandH,
    timezoneBandH: baseRows.timezoneBandH,
  };
  const top = rowMetrics.topBandHeightPx;
  const utcTopScale = buildUtcTopScaleLayout(
    time.now,
    w,
    top,
    resolved,
    options.geography,
    layout,
    rowMetrics,
    circleStackForChrome,
    canonicalSolve.intrinsicContentHeightPx,
  );
  const bottomBand: DisplayChromeBandRect = {
    x: 0,
    y: Math.max(0, h - bottomOverlayMarginPx - bottom),
    width: w,
    height: bottom,
  };

  return {
    viewport,
    topBand: { x: 0, y: 0, width: w, height: top },
    bottomBand,
    utcTopScale,
    informationBar: buildBottomInformationBarState({
      nowMs: time.now,
      bottomBandWidthPx: bottomBand.width,
      chromeTimeZone: resolved.referenceTimeZone,
      topBandMode: resolved.topBandMode,
    }),
    displayChromeLayout: layout,
    effectiveTopBandHourMarkers,
    effectiveTickTapeArea,
    effectiveTimezoneLetterRowArea,
    geography: options.geography,
    frameNumber: frame.frameNumber,
  };
}

/**
 * Tick-rail baseline Y and major-tick top Y (same geometry as {@link renderDisplayChrome} hour boundaries).
 * Used with {@link UtcTopScaleLayout.nowX} for the present-time “now” tick segment.
 */
export function topBandTickRailMajorTickVerticalSpan(
  yCircleBottom: number,
  tickBandHeightPx: number,
): { tickBaselineY: number; majorTickTopY: number } {
  const yTickBottom = yCircleBottom + tickBandHeightPx;
  const tickBaselineY = yTickBottom - Math.max(1.5, Math.min(2.5, tickBandHeightPx * 0.12));
  const majorTickTopY = tickBaselineY - tickBandHeightPx * 0.92;
  return { tickBaselineY, majorTickTopY };
}

/**
 * Vertical span for subtle viewport side bezels on the map strip: below the top chrome through either the viewport
 * bottom or the top of the bottom HUD layout box (when the information bar is visible).
 */
export function computeChromeMapSideBezelVerticalSpan(options: {
  viewportHeightPx: number;
  topBandHeightPx: number;
  bottomInformationBarVisible: boolean;
  bottomHudTopYPx: number;
}): { y0: number; y1: number } {
  const h = Math.max(0, options.viewportHeightPx);
  const y0 = Math.max(0, options.topBandHeightPx);
  const y1 = options.bottomInformationBarVisible
    ? Math.min(h, Math.max(y0, options.bottomHudTopYPx))
    : h;
  return { y0, y1 };
}

/**
 * Crisp pixel X positions for the map-strip side bezel strokes: viewport left/right edges only
 * (`topBandOriginXPx + 0.5` and `topBandOriginXPx + viewportWidthPx - 0.5` after the same rounding used in
 * {@link renderDisplayChrome}). Independent of reference-meridian position, structural columns, and wrap tiling.
 */
export function chromeMapSideBezelCrispXs(
  topBandOriginXPx: number,
  viewportWidthPx: number,
): [number, number] | null {
  const vw = viewportWidthPx;
  if (!(vw > 0)) {
    return null;
  }
  return [alignCrispLineX(topBandOriginXPx + 0.5), alignCrispLineX(topBandOriginXPx + vw - 0.5)];
}

/**
 * Second compositing pass: draws fixed screen bands over the scene. Caller should run this after
 * {@link CanvasRenderBackend.render} (or equivalent) on the same 2D context.
 *
 * Phased top-band items (hour disks, tick rail) and structural timezone tabs are drawn with
 * period-{@code viewport.width} tiling so content that would straddle x=0 or x=width remains partially visible (circular
 * band through a fixed window), without changing layout math in {@link buildUtcTopScaleLayout}.
 */
export function renderDisplayChrome(
  ctx: CanvasRenderingContext2D,
  chrome: DisplayChromeState,
  viewport: Viewport,
): void {
  const dpr = viewport.devicePixelRatio > 0 ? viewport.devicePixelRatio : 1;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  const { topBand, bottomBand, utcTopScale } = chrome;
  const scale = utcTopScale;
  const tb = topBand;
  const rows = scale.rows ?? computeUtcTopScaleRowMetrics(tb.height, chrome.displayChromeLayout);
  const y0 = tb.y;
  const circleH = rows.circleBandH;
  const tickH = rows.tickBandH;
  const yCircleBottom = y0 + circleH;
  const yTickBottom = yCircleBottom + tickH;
  const bandBottom = y0 + tb.height;
  const showTickTape = chrome.displayChromeLayout.tickTapeVisible !== false;
  const { tickBaselineY, majorTickTopY } = topBandTickRailMajorTickVerticalSpan(yCircleBottom, tickH);
  const zoneTop = yTickBottom;
  const zoneH = bandBottom - zoneTop;
  const stBase = TOP_CHROME_STYLE;
  const tape = chrome.effectiveTickTapeArea;
  const tzEff = chrome.effectiveTimezoneLetterRowArea;
  const st = {
    ...stBase,
    timezoneTab: {
      ...stBase.timezoneTab,
      fillEven: tzEff.effectiveBackgroundColorEven,
      fillOdd: tzEff.effectiveBackgroundColorOdd,
      fillActive: tzEff.effectiveBackgroundColorActive,
    },
    zoneText: {
      ...stBase.zoneText,
      letter: tzEff.effectiveLetterForegroundColor,
    },
  } as TopChromeStyle;
  const tzTab = st.timezoneTab;
  const zonePadY = Math.max(
    0,
    Math.min(tzTab.zoneFillPadMaxPx, Math.round(zoneH * tzTab.zoneFillPadFracOfZone)),
  );
  /** Narrow gutter between structural tabs — tightens column rhythm without changing sector geometry. */
  const segGapX = 0.4;
  const tabBottomR = Math.min(8, Math.max(4, Math.round(Math.min(zoneH * 0.32, 7))));
  const circleStack = scale.circleStack ?? computeTopBandCircleStackMetrics(rows.circleBandH);
  const vw = viewport.width;
  const sw = vw > 0 ? vw / 24 : 0;
  const radiusContentH =
    scale.hourMarkerDiskRowIntrinsicContentHeightPx !== undefined &&
    scale.hourMarkerDiskRowIntrinsicContentHeightPx > 0
      ? scale.hourMarkerDiskRowIntrinsicContentHeightPx
      : circleStack.diskBandH;
  const markerRadiusPx = computeUtcCircleMarkerRadius(radiusContentH, sw);
  const diskLabelSizePx = computeHourDiskLabelSizePx(markerRadiusPx, vw, st.hourDiskLabel);
  const hourMarkerSel = effectiveTopBandHourMarkerSelection(chrome.displayChromeLayout);
  const hourMarkerSizeMult = resolvedHourMarkerLayoutSizeMultiplier(chrome.displayChromeLayout);
  const glyphDiskBoost = hourMarkerSel.kind === "glyph" ? TOP_BAND_GLYPH_DISK_CONTENT_SCALE : 1;
  const markerDiskContentSizePx = diskLabelSizePx * hourMarkerSizeMult * glyphDiskBoost;

  const nowTickLineWidth = st.ticks.lineWidth * st.ticks.presentTimeTickWidthMulTapeTick;
  const tickHaloW = nowTickLineWidth * st.ticks.presentTimeHaloWidthMul;
  const mapCoreW = st.ticks.lineWidth * st.ticks.referenceMeridianMapLineWidthMulTapeTick;
  const mapHaloW = mapCoreW * st.ticks.referenceMeridianMapHaloWidthMul;
  const refMeridianWrapHalf = presentTimeIndicatorWrapHalfExtentPx(
    Math.max(nowTickLineWidth, mapCoreW),
    Math.max(tickHaloW, mapHaloW),
  );

  // Thick present-time tape tick: core uses effective tape tick ink under a tape background override (same family as
  // ordinary ticks); halo stays on the dedicated present-time token (separate instrumentation layer).
  const presentTimeTickStroke = {
    nowX: scale.nowX,
    viewportWidthPx: vw,
    wrapHalfExtentPx: refMeridianWrapHalf,
    coreLineWidthPx: nowTickLineWidth,
    haloLineWidthPx: tickHaloW,
    coreStroke: tape.usesAuthoredTapeBackgroundOverride ? tape.tapeTickStroke : st.ticks.presentTimeStroke,
    haloStroke: st.ticks.presentTimeHaloStroke,
  } as const;

  executeRenderPlanOnCanvas(
    ctx,
    buildTopBandChromeBackgroundRenderPlan({
      topBandOriginXPx: tb.x,
      topBandYPx: y0,
      topBandWidthPx: tb.width,
      topBandHeightPx: tb.height,
      circleBandBottomYPx: yCircleBottom,
      tickBandHeightPx: tickH,
      stripBackgroundFill: stBase.instrument.stripBackground,
      tickRailBackgroundFill: tape.effectiveBackgroundColor,
    }),
  );

  const drawTimezoneLetterRow =
    chrome.displayChromeLayout.timezoneLetterRowVisible && zoneH > 0;

  if (drawTimezoneLetterRow) {
    const resolvedTimezoneLetterFontAssetId = resolveEffectiveProductTextFontAssetId(
      chrome.displayChromeLayout,
      chrome.displayChromeLayout.timezoneLetterRowFontAssetId,
    );
    const zonePlan = buildTimezoneLetterRowRenderPlan({
      viewportWidthPx: vw,
      segments: scale.segments,
      majorBoundaryXs: scale.majorBoundaryXs,
      zoneTop,
      zoneH,
      bandBottom,
      segGapX,
      zonePadY,
      tabBottomR,
      diskLabelSizePx,
      referenceLongitudeDeg: scale.topBandAnchor.referenceLongitudeDeg,
      geography: chrome.geography,
      anchorSource: scale.topBandAnchor.anchorSource,
      timezoneLetterRowVisible: chrome.displayChromeLayout.timezoneLetterRowVisible,
      activeCellLetterForeground: tzEff.effectiveLetterForegroundColorActiveCell,
      chromeStyle: st,
      glyphRenderContext: { fontRegistry: defaultFontAssetRegistry },
      resolvedTimezoneLetterFontAssetId,
    });
    executeRenderPlanOnCanvas(ctx, zonePlan);
  }

  const minorTickTopY = tickBaselineY - tickH * 0.28;
  const quarterTickTopY = tickBaselineY - tickH * 0.67;

  if (showTickTape && tickH > 0) {
    executeRenderPlanOnCanvas(
      ctx,
      buildTopBandTickRailRenderPlan({
        viewportWidthPx: vw,
        baselineX0: 0,
        baselineX1: viewport.width,
        tickBaselineY,
        minorTickTopY,
        quarterMajorTickTopY: quarterTickTopY,
        majorTickTopY,
        quarterMinorTickXs: scale.quarterMinorTickXs,
        quarterMajorTickXs: scale.quarterMajorTickXs,
        majorBoundaryXs: scale.majorBoundaryXs,
        baselineStroke: tape.tapeBaselineStroke,
        baselineStrokeWidthPx: st.ticks.baselineLineWidth,
        tickStroke: tape.tapeTickStroke,
        tickStrokeWidthPx: st.ticks.lineWidth,
      }),
    );

    // Read-point tick (authoritative instant from resolver; horizontal position = exact reference meridian x).
    // Halo + core; seam tiling uses {@link refMeridianWrapHalf} so thick strokes stay continuous at x≈0 / x≈width.
    executeRenderPlanOnCanvas(
      ctx,
      buildTopBandPresentTimeTickRenderPlan({
        ...presentTimeTickStroke,
        verticalSpans: [{ yTop: majorTickTopY, yBottom: tickBaselineY }],
      }),
    );
  }

  executeRenderPlanOnCanvas(
    ctx,
    buildTopBandInterBandSeamLinesRenderPlan({
      viewportWidthPx: vw,
      topBandOriginXPx: tb.x,
      circleBandBottomYPx: yCircleBottom,
      tickZoneBoundaryYPx: yTickBottom,
      drawCircleToTickSeam: showTickTape && tickH > 0,
      drawTickToZoneSeam: zoneH > 0,
      circleToTickStroke: st.bandSeams.circleToTick,
      tickToZoneStroke: st.bandSeams.tickToZone,
      seamLineWidthPx: 1,
    }),
  );

  const tapeAnchorFrac = scale.phasedTapeAnchorFrac;
  const markers: readonly UtcTopScaleCircleMarker[] =
    scale.circleMarkers.length > 0
      ? scale.circleMarkers
      : scale.segments.length === 24 && sw > 0
        ? Array.from({ length: 24 }, (_, h) => {
            const ak = topBandMarkerAnnotationKind(h, scale.topBandMode);
            return {
              centerX: topBandHourMarkerCenterX(h, scale.referenceFractionalHour, vw, tapeAnchorFrac),
              radiusPx: markerRadiusPx,
              utcHour: h,
              label: topBandCircleLabel(h, scale.topBandMode),
              currentHourLabel: topBandCircleLabel(h, scale.topBandMode),
              nextHourLabel: topBandNextHourLabel(h, scale.topBandMode),
              annotationKind: ak,
              annotationLabel: topBandMarkerAnnotationLabel(ak),
            };
          })
        : [];

  executeRenderPlanOnCanvas(
    ctx,
    buildTopBandCircleBandHourStackRenderPlan({
      viewportWidthPx: vw,
      topBandOriginXPx: tb.x,
      topBandYPx: y0,
      circleBandHeightPx: circleH,
      circleStack,
      markers: markers.map((m) => ({
        centerX: m.centerX,
        radiusPx: m.radiusPx,
        nextHourLabel: m.nextHourLabel,
        currentHourLabel: m.currentHourLabel,
        annotationKind: m.annotationKind,
        annotationLabel: m.annotationLabel,
        structuralHour0To23: m.utcHour,
      })),
      diskLabelSizePx,
      markerDiskContentSizePx,
      tickBandHeightPx: tickH,
      chromeStyle: st,
      effectiveTopBandHourMarkerSelection: effectiveTopBandHourMarkerSelection(
        chrome.displayChromeLayout,
      ),
      effectiveTopBandHourMarkers: chrome.effectiveTopBandHourMarkers,
      glyphRenderContext: { fontRegistry: defaultFontAssetRegistry },
      referenceFractionalHour: scale.referenceFractionalHour,
      structuralZoneCenterXPx:
        scale.segments.length === 24 ? scale.segments.map((s) => s.centerX) : undefined,
      presentTimeStructuralHour0To23:
        scale.segments.length === 24
          ? structuralHourIndexFromReferenceLongitudeDeg(scale.topBandAnchor.referenceLongitudeDeg)
          : undefined,
    }),
  );

  executeRenderPlanOnCanvas(
    ctx,
    buildTopBandVerticalEdgeBezelRenderPlan({
      viewportWidthPx: vw,
      topBandOriginXPx: tb.x,
      topBandTopYPx: y0,
      topBandBottomYPx: bandBottom,
      verticalEdgeStroke: st.instrument.verticalEdgeBezel,
      bezelLineWidthPx: 1,
    }),
  );

  const seamY = topBand.y + topBand.height;
  const sideSpan = computeChromeMapSideBezelVerticalSpan({
    viewportHeightPx: viewport.height,
    topBandHeightPx: topBand.height,
    bottomInformationBarVisible: chrome.displayChromeLayout.bottomInformationBarVisible,
    bottomHudTopYPx: bottomBand.y,
  });
  const sideBezelXs = chromeMapSideBezelCrispXs(tb.x, vw);
  const sideBezels =
    sideSpan.y1 > sideSpan.y0 + 0.5 && sideBezelXs
      ? {
          stroke: st.instrument.viewportSideBezelOnMap,
          leftX: sideBezelXs[0],
          rightX: sideBezelXs[1],
          y0: sideSpan.y0,
          y1: sideSpan.y1,
        }
      : null;

  executeRenderPlanOnCanvas(
    ctx,
    buildChromeMapTransitionRenderPlan({
      viewportWidthPx: vw,
      seamYPx: seamY,
      bottomShadowFill: st.seams.bottomShadow,
      bottomHighlightStroke: st.seams.bottomHighlight,
      mapFaceBezelDepthPx: st.seams.mapFaceBezelDepthPx,
      mapFaceBezelColorTop: st.seams.mapFaceBezelColorTop,
      mapFaceBezelColorBottom: st.seams.mapFaceBezelColorBottom,
      sideBezels,
    }),
  );

  if (chrome.displayChromeLayout.bottomInformationBarVisible && vw > 0) {
    const hudTop = bottomBand.y;
    const overlayStyle = BOTTOM_CHROME_STYLE.overlay;
    executeRenderPlanOnCanvas(
      ctx,
      buildBottomHudMapFadeRenderPlan({
        seamYPx: seamY,
        hudTopYPx: hudTop,
        viewportWidthPx: vw,
        viewportHeightPx: viewport.height,
        fadeColorTop: overlayStyle.mapHudBoundaryFadeColorTop,
        fadeColorBottom: overlayStyle.mapHudBoundaryFadeColorBottom,
      }),
    );
    renderBottomChrome(
      ctx,
      viewport,
      bottomBand,
      chrome.informationBar,
      resolveBottomReadoutTextFontAssetId(chrome.displayChromeLayout),
    );
  }

  ctx.restore();
}
