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
import type { EffectiveTopBandHourMarkers } from "../config/topBandHourMarkersTypes.ts";
import { CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST } from "../config/structuralZoneLetters";
import {
  longitudeDegFromMapX,
  mapXFromLongitudeDeg,
} from "../core/equirectangularProjection";
import { resolveDisplayTimeReferenceZone } from "../core/displayTimeReference";
import { formatWallClockInTimeZone } from "../core/timeFormat";
import { zonedCalendarDayStartMs } from "../core/wallTimeInZone";
export { resolveDisplayTimeReferenceZone, isValidIanaTimeZone } from "../core/displayTimeReference";
export { solarLocalWallClockStateFromUtcMs } from "../core/solarLocalWallClock.ts";
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
  computeHourDiskLabelSizePx,
  TOP_CHROME_CIRCLE_STACK_LAYOUT,
  getTopChromeStyle,
  type TopChromeHourDiskLabelTokens,
} from "../config/topChromeStyle";
import {
  computeTextModeDiskBandVerticalMetrics,
  hourCircleHeadMetrics,
} from "../config/topBandHourMarkersLayout.ts";
import type { TimeContext } from "../layers/types";
import type { FrameContext, Viewport } from "./types";
import { executeRenderPlanOnCanvas } from "./renderPlan/canvasRenderPlanExecutor";
import { buildTopBandPresentTimeTickRenderPlan } from "./renderPlan/topBandPresentTimeTickPlan";
import {
  buildTopBandTickRailRenderPlan,
  topBandTickRailVerticalTickBottomY,
} from "./renderPlan/topBandTickRailPlan";
import { buildTimezoneLetterRowRenderPlan } from "./renderPlan/timezoneLetterRowPlan";
import { buildTopBandCircleBandHourStackRenderPlan } from "./renderPlan/topBandCircleBandHourStackPlan";
import { buildTopBandTapeHourNumberOverlayRenderPlan } from "./renderPlan/topBandTapeHourNumberOverlayPlan.ts";
import {
  buildTopBandChromeBackgroundRenderPlan,
  buildTopBandInterBandSeamLinesRenderPlan,
  buildTopBandVerticalEdgeBezelRenderPlan,
} from "./renderPlan/topBandFixedFramingPlan";
import { buildChromeMapTransitionRenderPlan } from "./renderPlan/chromeMapTransitionPlan";
import { buildBottomHudMapFadeRenderPlan } from "./renderPlan/bottomHudMapFadePlan";
import {
  LON_PER_UTC_STRUCTURAL_HOUR,
  structuralBlockCenterLongitudeDegFromReferenceLongitudeDeg,
  structuralHourIndexFromReferenceLongitudeDeg,
} from "./structuralLongitudeGrid";
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
 * {@link label} is the **longitude solar hour** numeral at this column’s center (not a fixed UTC 00–23 strip).
 */
export interface UtcTopScaleHourSegment {
  /** Column index 0–23; used for alternating band fill in the timezone band. */
  hour: number;
  x0: number;
  x1: number;
  centerX: number;
  /** Longitude (°) at column center; structural, from the UTC 15° grid. */
  centerLongitudeDeg: number;
  /** Local solar hour 0–23: UTC time-of-day + longitude/15, wrapped into the civil day. */
  solarHour: number;
  label: string;
  /**
   * Libration-modeled **structural** zone letter for this 15° column (west→east index {@link hour}): NATO letter from
   * {@link militaryTimeZoneLetterFromLongitudeDeg} at the sector’s **west edge** (same `lon0` as this segment’s span start),
   * not civil TZ. Independent of the top-band longitude anchor (tape alignment).
   */
  timezoneLetter: string;
  /** Rounded mean solar UTC offset in hours ∈ [−12, 12] for {@link centerLongitudeDeg}. */
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
 * Longitude anchoring for the top tape circle row: resolved **anchor meridian** plus the tape’s horizontal anchor x.
 * The top band is anchored by longitude, not by civil timezone. A reference city used as an anchor contributes its
 * longitude for band alignment only. {@link anchorX} is {@link mapXFromLongitudeDeg}({@link referenceLongitudeDeg}) —
 * continuous meridian position for map/scene registration. The present-time tick uses
 * {@link presentTimeIndicatorXFromReferenceLongitudeDeg} (center of the containing 15° column). In `local12` / `local24`, the phased
 * upper tape uses that same column-center basis via {@link UtcTopScaleLayout.phasedTapeAnchorFrac}. Letter boxes remain fixed structural
 * sectors underneath.
 */
export interface TopBandLongitudeAnchor {
  /** `Intl` offset hours (fractional) for the reference IANA zone (DST-aware). Not used to place structural columns; echoed for debugging. */
  referenceOffsetHours: number;
  /** Resolved reference meridian (from {@link resolveTopBandAnchorLongitudeDeg}); unchanged for map/selection semantics. */
  referenceLongitudeDeg: number;
  /** Horizontal position of the reference meridian on the top strip [0, widthPx] (same x as map pins for that lon). */
  anchorX: number;
  /** {@link anchorX} / widthPx — exact meridian. Used as the phased-tape anchor only for {@link TopBandTimeMode} `utc24`; local modes use {@link UtcTopScaleLayout.phasedTapeAnchorFrac} (structural column center). */
  anchorFrac: number;
  /** How {@link referenceLongitudeDeg} was chosen (Chrome explicit modes vs geography vs zone fallback). */
  anchorSource: TopBandAnchorLongitudeSource;
}

/**
 * Deterministic layout for the Libration-style top scale: 24 **structural longitude** segments (equirectangular x from longitude),
 * tick hierarchy (hour / quarter-major / quarter-minor), present-time indicator x ({@link UtcTopScaleLayout.nowX}), and a **time-phased** circle row whose positions drift with
 * the configured band fractional day and a **longitude anchor** for phased placement. Civil time display is derived independently from IANA timezone data
 * ({@link referenceFractionalHour}); structural longitude sectors and civil timezone membership are intentionally decoupled. Labels and phase calendar follow {@link UtcTopScaleLayout.topBandMode}.
 */
export interface UtcTopScaleLayout {
  widthPx: number;
  segments: readonly UtcTopScaleHourSegment[];
  /** UTC midnight at the start of the UTC calendar day that contains {@link referenceNowMs}; used for structural solar-hour segments. */
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
   * Normalized x [0,1) passed to {@link topBandHourMarkerCenterX} for the phased circle row and tick rail.
   * For {@link TopBandTimeMode} `utc24`, equals {@link TopBandLongitudeAnchor.anchorFrac} (exact meridian).
   * For `local12` / `local24`, equals the structural 15° column center for the resolved anchor meridian (same basis as {@link nowX}),
   * so the upper hour tape aligns with the timezone letterbox centerline and the present-time tick.
   */
  phasedTapeAnchorFrac: number;
  /** Same as {@link tickHierarchy.hour}; phased hour boundaries (length 25). */
  majorBoundaryXs: readonly number[];
  /** Same as {@link tickHierarchy.quarterMajor}; phased quarter-hour majors (length 72). */
  quarterMajorTickXs: readonly number[];
  /** Same as {@link tickHierarchy.quarterMinor}; phased quarter-segment minors (length 192). */
  quarterMinorTickXs: readonly number[];
  /** Hour / quarter-major / quarter-minor tick x positions (phased like {@link topBandHourMarkerCenterX}). Omitted when {@link widthPx} is 0. */
  tickHierarchy?: TopTapeTickHierarchy;
  /**
   * Horizontal position of the present-time (“now”) tick on the strip [0, widthPx]: **center** of the structural 15°
   * longitude column containing {@link TopBandLongitudeAnchor.referenceLongitudeDeg} (same x as that column’s
   * {@link UtcTopScaleHourSegment.centerX}). {@link TopBandLongitudeAnchor.anchorX} stays on the exact meridian for map/scene
   * registration; phased tape placement uses {@link phasedTapeAnchorFrac}.
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
  /** Same object as {@link AppConfig.geography} from the authoritative config pipeline; optional for tests. */
  geography?: GeographyConfig;
  frameNumber: number;
}

function resolveChromeTimeZone(explicit?: string): string {
  return explicit ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Resolved display-time inputs for the top band and bottom bar: IANA **civil** zone string + mode + longitude-anchor policy.
 * The reference zone drives wall-clock phasing and the bottom bar; the top tape’s horizontal alignment uses {@link resolveTopBandAnchorLongitudeDeg} (longitude), not civil-TZ boundaries.
 */
export interface ResolvedTopBandTime {
  referenceTimeZone: string;
  topBandMode: TopBandTimeMode;
  topBandAnchor: TopBandAnchorConfig;
}

/** Maps {@link DisplayTimeConfig} to resolved zone + mode for layout and the bottom information bar. */
export function resolveTopBandTimeFromConfig(config: DisplayTimeConfig): ResolvedTopBandTime {
  return {
    referenceTimeZone: resolveDisplayTimeReferenceZone(config.referenceTimeZone),
    topBandMode: config.topBandMode,
    topBandAnchor: config.topBandAnchor ?? { mode: "auto" },
  };
}

function bandPhaseFraction(
  nowMs: number,
  mode: TopBandTimeMode,
  referenceTimeZone: string,
): { bandPhaseDayStartMs: number; fracDay: number } {
  if (mode === "utc24") {
    const bandPhaseDayStartMs = utcDayStartMs(nowMs);
    return {
      bandPhaseDayStartMs,
      fracDay: (nowMs - bandPhaseDayStartMs) / MS_PER_DAY,
    };
  }
  const bandPhaseDayStartMs = zonedCalendarDayStartMs(nowMs, referenceTimeZone);
  return {
    bandPhaseDayStartMs,
    fracDay: (nowMs - bandPhaseDayStartMs) / MS_PER_DAY,
  };
}

/**
 * Civil fractional hour-of-day ∈ [0, 24) in the band’s reference frame: `hour + min/60 + sec/3600 + ms/3600000`.
 * For {@link TopBandTimeMode} `utc24`, components are UTC; for `local12` / `local24`, the resolved reference IANA zone.
 * Used for top-tape geometry so hour markers track **wall time** smoothly (including sub-second motion) and stay consistent
 * when a calendar day is not exactly 86_400_000 ms (DST). The present-time indicator x is derived separately from the
 * structural column center (see {@link presentTimeIndicatorXFromReferenceLongitudeDeg}); this value supplies civil
 * fractional time-of-day for phased tape motion only.
 */
export function referenceFractionalHourOfDay(
  nowMs: number,
  mode: TopBandTimeMode,
  /** Used only for `local12` / `local24`; ignored when {@code mode} is {@code utc24}. */
  referenceTimeZone: string,
): number {
  if (mode === "utc24") {
    const d = new Date(nowMs);
    const h = d.getUTCHours();
    const m = d.getUTCMinutes();
    const s = d.getUTCSeconds();
    const ms = d.getUTCMilliseconds();
    return h + m / 60 + s / 3600 + ms / 3600000;
  }
  const d = new Date(nowMs);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: referenceTimeZone,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
    hourCycle: "h23",
    fractionalSecondDigits: 3,
  } as Intl.DateTimeFormatOptions).formatToParts(d) as ReadonlyArray<{ type: string; value: string }>;
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const secondWhole = Number(parts.find((p) => p.type === "second")?.value ?? 0);
  const fracSec = parts.find((p) => p.type === "fractionalSecond")?.value;
  const second = secondWhole + (fracSec !== undefined ? Number(fracSec) / 1000 : 0);
  return hour + minute / 60 + second / 3600;
}

function formatTopBandLocal12Label(hour0To23: number): string {
  const h = ((hour0To23 % 24) + 24) % 24;
  const mod = h % 12;
  return mod === 0 ? "12" : String(mod);
}

/** Label for one circle marker given structural hour index 0–23 and mode. */
export function topBandCircleLabel(hourIndex: number, mode: TopBandTimeMode): string {
  if (mode === "local12") {
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

/** Bottom-left clock: label + wall time string, keyed to {@link TopBandTimeMode} (same policy as the top band). */
function bottomTimeReadoutPresentation(
  nowMs: number,
  referenceWallClockZone: string,
  mode: TopBandTimeMode,
): { microLabel: string; timeLine: string } {
  if (mode === "utc24") {
    return {
      microLabel: "UTC TIME",
      timeLine: formatWallClockInTimeZone(nowMs, "UTC", false),
    };
  }
  return {
    microLabel: "LOCAL TIME",
    timeLine: formatWallClockInTimeZone(nowMs, referenceWallClockZone, mode === "local12"),
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
  const { microLabel, timeLine: localTimeLine } = bottomTimeReadoutPresentation(options.nowMs, tz, mode);

  return {
    localMicroLabel: microLabel,
    localTimeLine,
    localDateLine: formatLocalDateLine(options.nowMs, tz),
    rightPanelDateLine: formatRightPanelDateLine(options.nowMs, tz),
    bottomChromeLayout: computeBottomChromeLayout(options.bottomBandWidthPx),
  };
}

/** Maps a real value to its fractional part in [0, 1) (stable for negative inputs). */
export function wrapFraction01(x: number): number {
  const u = x % 1;
  return u < 0 ? u + 1 : u;
}

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
 * {@link referenceFractionalHour} is civil fractional hour-of-day in the band frame ({@link referenceFractionalHourOfDay}).
 * {@code anchorFrac} is the phased-band anchor in normalized strip coordinates: for `utc24`, {@link TopBandLongitudeAnchor.anchorFrac}
 * (exact meridian); for `local12` / `local24`, {@link UtcTopScaleLayout.phasedTapeAnchorFrac} (structural column centerline).
 * Alignment: when civil time equals `hourIndex` (integer hour), marker `hourIndex` sits on that anchor; the band drifts
 * so fractional time-of-day straddles hour markers continuously (`anchorFrac + (hourIndex − referenceFractionalHour) / 24`, wrapped).
 */
export function topBandHourMarkerCenterX(
  hourIndex: number,
  referenceFractionalHour: number,
  widthPx: number,
  anchorFrac: number,
): number {
  const w = Math.max(0, widthPx);
  if (w === 0) {
    return 0;
  }
  return wrapFraction01(anchorFrac + (hourIndex - referenceFractionalHour) / 24) * w;
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
  mode: TopBandTimeMode,
  referenceTimeZone: string,
  topBandAnchor: TopBandAnchorConfig,
  geography?: GeographyConfig,
): TopBandLongitudeAnchor {
  const w = Math.max(0, widthPx);
  const { referenceLongitudeDeg, referenceOffsetHours, anchorSource } = resolveTopBandAnchorLongitudeDeg({
    nowMs,
    referenceTimeZone,
    topBandMode: mode,
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
 * Local solar hour 0–23 at `lonDeg` for the given UTC time-of-day within the calendar day:
 * `floor(((utcMsOfDay + lon/15·h in ms) mod 24h) / 1h)`. No DST or political boundaries.
 */
export function solarLocalHour0To23FromUtcMsOfDay(utcMsOfDay: number, lonDeg: number): number {
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
 * Nearest integer mean-solar UTC offset for {@code lonDeg}/15, with half-hour ties resolved away from 0
 * (so ±11.5°/h → ±12, matching edge columns on the 24×15° strip).
 */
export function roundedMeanSolarUtcOffsetHours(lonDeg: number): number {
  const q = lonDeg / 15;
  const o = q >= 0 ? Math.floor(q + 0.5) : Math.ceil(q - 0.5);
  return Math.max(-12, Math.min(12, o));
}

/**
 * NATO military time-zone letter from mean solar UTC offset {@code lonDeg}/15 hours (J omitted east of Zulu; west −12h uses M per Libration, not Y).
 * Purely geometric; independent of frame time except through caller-supplied longitude.
 * **Top-strip tab letters** use this at each column’s **west-edge** longitude −180° + 15°·`h` (see
 * {@link militaryTimeZoneLetterFromStructuralColumnIndex}), not the anchor meridian.
 */
export function militaryTimeZoneLetterFromLongitudeDeg(lonDeg: number): string {
  const o = roundedMeanSolarUtcOffsetHours(lonDeg);
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

/** Rounded mean solar UTC offset hours ∈ [−12, 12] for {@code lonDeg}. */
export function nominalUtcOffsetHoursFromLongitudeDeg(lonDeg: number): number {
  return roundedMeanSolarUtcOffsetHours(lonDeg);
}

/**
 * Horizontal x for the present-time tick on the top tape: **center** of the structural 15° column whose sector contains
 * {@code referenceLongitudeDeg} (same {@link UtcTopScaleHourSegment.centerX} as that column). Distinct from
 * {@link mapXFromLongitudeDeg}({@code referenceLongitudeDeg}) / {@link TopBandLongitudeAnchor.anchorX}, which remain the
 * exact resolved meridian for map registration. Phased hour-tape alignment in local modes uses {@link UtcTopScaleLayout.phasedTapeAnchorFrac}
 * (this x / width).
 */
export function presentTimeIndicatorXFromReferenceLongitudeDeg(
  referenceLongitudeDeg: number,
  widthPx: number,
): number {
  const w = Math.max(0, widthPx);
  if (w === 0) {
    return 0;
  }
  const lonCenter = structuralBlockCenterLongitudeDegFromReferenceLongitudeDeg(referenceLongitudeDeg);
  return mapXFromLongitudeDeg(lonCenter, w);
}

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
 * Timezone strip height follows {@link TOP_BAND_THREE_ROW_ALLOC} (shorter NATO row vs the prior ~34.5% fraction);
 * tick rail keeps a usable floor via {@link TOP_BAND_THREE_ROW_ALLOC.minTickBandPx}.
 */
export const TOP_BAND_THREE_ROW_ALLOC = {
  circleFracOfH: 0.55,
  /** Shorter NATO strip vs prior ~34.5%; remainder flows to tick rail. */
  timezoneFracOfH: 0.27,
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
  chromeRowLayout?: Pick<DisplayChromeLayoutConfig, "timezoneLetterRowVisible">,
): UtcTopScaleRowMetrics {
  const h = Math.max(0, Math.round(topBandHeightPx));
  if (h === 0) {
    return { topBandHeightPx: 0, circleBandH: 0, tickBandH: 0, timezoneBandH: 0 };
  }
  const showTz = chromeRowLayout?.timezoneLetterRowVisible !== false;
  const A = TOP_BAND_THREE_ROW_ALLOC;
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
export function computeTopBandCircleStackMetrics(
  circleBandH: number,
  profile: TopBandCircleStackLayoutProfile = "default",
): TopBandCircleStackMetrics {
  const L = circleStackLayoutForProfile(profile);
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

const HOUR_MARKER_DISK_PAD_FRAC = 0.38 as const;

/** Profile for {@link computeTopBandCircleStackMetrics}: text vs glyph vertical models. */
export type TopBandCircleStackLayoutProfile = "default" | "textTight" | "textLed";

/**
 * Overrides merged with {@link TOP_CHROME_CIRCLE_STACK_LAYOUT} when {@link TopBandCircleStackLayoutProfile} is
 * {@code "textTight"} — reduces headroom so the 24h text row tracks realized glyph size more closely.
 */
const TEXT_TIGHT_CIRCLE_STACK_OVERRIDES = {
  padTopMinPx: 4,
  padBottomMinPx: 3,
  gapNumeralToDiskMinPx: 3,
  gapDiskToAnnotationMinPx: 4,
  padTopFracOfBandH: 0.042,
  padBottomFracOfBandH: 0.028,
  gapNumeralToDiskFracOfBandH: 0.042,
  gapDiskToAnnotationFracOfBandH: 0.048,
  diskRowMinPx: 24,
  diskRowFloorPx: 19,
} as const;

/**
 * Text-led 24h numerals: lower disk-row floors so row height can follow {@link computeTextModeDiskBandVerticalMetrics} instead of
 * glyph disk minima (still uses the same stack solver as {@code "textTight"}).
 */
const TEXT_LED_CIRCLE_STACK_OVERRIDES = {
  ...TEXT_TIGHT_CIRCLE_STACK_OVERRIDES,
  diskRowMinPx: 11,
  diskRowFloorPx: 9,
  annotationRowMinPx: 10,
  annotationRowFloorPx: 8,
} as const;

function circleStackLayoutForProfile(
  profile: TopBandCircleStackLayoutProfile,
): typeof TOP_CHROME_CIRCLE_STACK_LAYOUT {
  if (profile === "textTight") {
    return {
      ...TOP_CHROME_CIRCLE_STACK_LAYOUT,
      ...TEXT_TIGHT_CIRCLE_STACK_OVERRIDES,
    } as unknown as typeof TOP_CHROME_CIRCLE_STACK_LAYOUT;
  }
  if (profile === "textLed") {
    return {
      ...TOP_CHROME_CIRCLE_STACK_LAYOUT,
      ...TEXT_LED_CIRCLE_STACK_OVERRIDES,
    } as unknown as typeof TOP_CHROME_CIRCLE_STACK_LAYOUT;
  }
  return TOP_CHROME_CIRCLE_STACK_LAYOUT;
}

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
 * Sets {@link UtcTopScaleRowMetrics.circleBandH} to an exact pixel height and adjusts {@link UtcTopScaleRowMetrics.topBandHeightPx}
 * by the same delta so tick + NATO band heights stay fixed (text-mode stack sum snap).
 */
export function alignTopBandRowsToExactCircleBandH(
  rows: UtcTopScaleRowMetrics,
  exactCircleBandHeightPx: number,
): UtcTopScaleRowMetrics {
  const h = Math.max(0, Math.round(exactCircleBandHeightPx));
  const delta = h - rows.circleBandH;
  return {
    ...rows,
    circleBandH: h,
    topBandHeightPx: rows.topBandHeightPx + delta,
  };
}

function hourMarkerDiskContentNominalPx(args: {
  diskBandH: number;
  viewportWidthPx: number;
  segmentWidthPx: number;
  hourDiskLabelTokens: TopChromeHourDiskLabelTokens;
  sizeMultiplier: number;
  selection: EffectiveTopBandHourMarkerSelection;
}): number {
  const r = computeUtcCircleMarkerRadius(args.diskBandH, args.segmentWidthPx);
  const baseLabel = computeHourDiskLabelSizePx(r, args.viewportWidthPx, args.hourDiskLabelTokens);
  const boost = args.selection.kind === "glyph" ? TOP_BAND_GLYPH_DISK_CONTENT_SCALE : 1;
  return baseLabel * args.sizeMultiplier * boost;
}

function minimumDiskBandHeightForContentPx(args: {
  contentNominalPx: number;
  segmentWidthPx: number;
  viewportWidthPx: number;
  floorDiskBandH: number;
  diskPadFrac: number;
}): number {
  const targetHeadD = args.contentNominalPx * (1 + args.diskPadFrac);
  const { segmentWidthPx: sw, viewportWidthPx: vw } = args;
  let lo = args.floorDiskBandH;
  let hi = args.floorDiskBandH + 140;
  const headDAt = (diskH: number): number => {
    const r = computeUtcCircleMarkerRadius(diskH, sw);
    return hourCircleHeadMetrics(r, diskH, vw).headD;
  };
  if (headDAt(lo) >= targetHeadD) {
    return lo;
  }
  while (headDAt(hi) < targetHeadD && hi < args.floorDiskBandH + 400) {
    hi += 24;
  }
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) * 0.5;
    const diskH = Math.round(mid);
    const hd = headDAt(diskH);
    if (hd >= targetHeadD) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return Math.max(args.floorDiskBandH, Math.ceil(hi));
}

function resolveMinimumDiskBandHeightPx(args: {
  initialDiskBandH: number;
  segmentWidthPx: number;
  viewportWidthPx: number;
  hourDiskLabelTokens: TopChromeHourDiskLabelTokens;
  layout: DisplayChromeLayoutConfig;
  selection: EffectiveTopBandHourMarkerSelection;
  diskPadFrac: number;
}): number {
  const sm = resolvedHourMarkerLayoutSizeMultiplier(args.layout);
  let diskH = Math.max(0, args.initialDiskBandH);
  for (let iter = 0; iter < 12; iter += 1) {
    const nominal = hourMarkerDiskContentNominalPx({
      diskBandH: diskH,
      viewportWidthPx: args.viewportWidthPx,
      segmentWidthPx: args.segmentWidthPx,
      hourDiskLabelTokens: args.hourDiskLabelTokens,
      sizeMultiplier: sm,
      selection: args.selection,
    });
    const need = minimumDiskBandHeightForContentPx({
      contentNominalPx: nominal,
      segmentWidthPx: args.segmentWidthPx,
      viewportWidthPx: args.viewportWidthPx,
      floorDiskBandH: args.initialDiskBandH,
      diskPadFrac: args.diskPadFrac,
    });
    if (need <= diskH + 0.25) {
      return diskH;
    }
    diskH = need;
  }
  return diskH;
}

/** Matches {@link TEXT_LED_CIRCLE_STACK_OVERRIDES}.diskRowFloorPx — minimum text disk row in the text-led stack. */
const TEXT_LED_DISK_ROW_FLOOR_PX = 9 as const;

/**
 * Sums the vertical slices of a circle-band stack (equals {@link UtcTopScaleRowMetrics.circleBandH} when consistent).
 */
export function sumTopBandCircleStackMetricsPx(m: TopBandCircleStackMetrics): number {
  return (
    m.padTopPx +
    m.upperNumeralH +
    m.gapNumeralToDiskPx +
    m.diskBandH +
    m.gapDiskToAnnotationPx +
    m.annotationH +
    m.padBottomPx
  );
}

/**
 * Text-mode circle stack: disk row height comes from {@link computeTextModeDiskBandVerticalMetrics}; chrome above/below
 * scales with that disk row — not with {@link computeTopBandCircleStackMetrics} band fractions.
 */
export function buildTextLedCircleStackFromDiskBandH(diskBandH: number): TopBandCircleStackMetrics {
  const disk = Math.max(TEXT_LED_DISK_ROW_FLOOR_PX, Math.round(Math.max(1, diskBandH)));
  /** Baseline partition (legacy text-led coefficients); sum is preserved while shifting non-disk space. */
  let padTopPx = Math.max(4, Math.round(disk * 0.048));
  let padBottomPx = Math.max(3, Math.round(disk * 0.032));
  let gapNumeralToDiskPx = Math.max(3, Math.round(disk * 0.038));
  let gapDiskToAnnotationPx = Math.max(4, Math.round(disk * 0.044));
  let annotationH = Math.max(8, Math.min(12, Math.round(disk * 0.17)));

  /**
   * Text-mode polish: move the disk row **down** in the circle band — more margin above the row, less below before the
   * noon/midnight strip + bottom pad (same total stack height; {@link diskBandH} unchanged). Pixels are taken from
   * gap/annotation/bottom first, then added to {@code padTopPx} / {@code gapNumeralToDiskPx} (not from disk slack).
   */
  const wantShiftDownPx = Math.min(5, Math.max(2, Math.round(disk * 0.052)));
  let take = wantShiftDownPx;
  const g2take = Math.min(take, Math.max(0, gapDiskToAnnotationPx - 3));
  gapDiskToAnnotationPx -= g2take;
  take -= g2take;
  const anntake = Math.min(take, Math.max(0, annotationH - 7));
  annotationH -= anntake;
  take -= anntake;
  const pbtake = Math.min(take, Math.max(0, padBottomPx - 3));
  padBottomPx -= pbtake;
  take -= pbtake;

  const shiftedPx = wantShiftDownPx - take;
  if (shiftedPx > 0) {
    const addTop = Math.round(shiftedPx * 0.45);
    padTopPx += addTop;
    gapNumeralToDiskPx += shiftedPx - addTop;
  }

  return {
    padTopPx,
    upperNumeralH: 0,
    gapNumeralToDiskPx,
    diskBandH: disk,
    gapDiskToAnnotationPx,
    annotationH,
    padBottomPx,
  };
}

/**
 * Resolves the authoritative text-led stack and font/disk fixed point: disk row comes from
 * {@link computeTextModeDiskBandVerticalMetrics}, not from inverting the generic circle-band solver.
 */
export function resolveTextIndicatorCircleStackMetrics(args: {
  viewportWidthPx: number;
  hourDiskLabelTokens: TopChromeHourDiskLabelTokens;
  layout: DisplayChromeLayoutConfig;
  /** Seeds disk-radius / font-size iteration (typically {@link UtcTopScaleRowMetrics.circleBandH}). */
  seedCircleBandHeightPx: number;
}): TopBandCircleStackMetrics {
  const vw = args.viewportWidthPx;
  if (!(vw > 0)) {
    return buildTextLedCircleStackFromDiskBandH(1);
  }
  const sw = vw / 24;
  const sm = resolvedHourMarkerLayoutSizeMultiplier(args.layout);
  const seedH = Math.max(0, args.seedCircleBandHeightPx);
  let diskGuess = Math.max(TEXT_LED_DISK_ROW_FLOOR_PX, Math.round(seedH * 0.22));
  let last: TopBandCircleStackMetrics | undefined;
  for (let i = 0; i < 8; i += 1) {
    const r = computeUtcCircleMarkerRadius(diskGuess, sw);
    const fontSizePx = computeHourDiskLabelSizePx(r, vw, args.hourDiskLabelTokens) * sm;
    const vm = computeTextModeDiskBandVerticalMetrics({ fontSizePx, sizeMultiplier: sm });
    const stack = buildTextLedCircleStackFromDiskBandH(vm.diskBandH);
    if (last !== undefined && stack.diskBandH === last.diskBandH) {
      return stack;
    }
    last = stack;
    diskGuess = stack.diskBandH;
  }
  return last ?? buildTextLedCircleStackFromDiskBandH(1);
}

/**
 * Positive pixel delta from {@link UtcTopScaleRowMetrics.circleBandH} to the sum of the resolved text-led stack
 * (diagnostics / legacy callers). Chrome snaps the band to the stack sum via {@link alignTopBandRowsToExactCircleBandH},
 * so this is only the expansion component when {@code need > base}.
 */
export function computeTextIndicatorCircleBandExpansionPx(args: {
  baseRows: UtcTopScaleRowMetrics;
  viewportWidthPx: number;
  hourDiskLabelTokens: TopChromeHourDiskLabelTokens;
  layout: DisplayChromeLayoutConfig;
}): number {
  const vw = args.viewportWidthPx;
  if (!(vw > 0)) {
    return 0;
  }
  const base = args.baseRows;
  if (base.circleBandH <= 0) {
    return 0;
  }
  const stack = resolveTextIndicatorCircleStackMetrics({
    viewportWidthPx: vw,
    hourDiskLabelTokens: args.hourDiskLabelTokens,
    layout: args.layout,
    seedCircleBandHeightPx: base.circleBandH,
  });
  const need = sumTopBandCircleStackMetricsPx(stack);
  return Math.max(0, Math.round(need - base.circleBandH));
}

/**
 * Pixel amount to add to the circle band (and total top band) so the disk row fits **glyph** hour-marker content
 * (analogClock, radialLine, radialWedge). Text mode uses {@link computeTextIndicatorCircleBandExpansionPx} instead.
 */
export function computeHourMarkerCircleBandExpansionPx(args: {
  baseRows: UtcTopScaleRowMetrics;
  viewportWidthPx: number;
  hourDiskLabelTokens: TopChromeHourDiskLabelTokens;
  layout: DisplayChromeLayoutConfig;
  selection: EffectiveTopBandHourMarkerSelection;
}): number {
  const vw = args.viewportWidthPx;
  if (!(vw > 0)) {
    return 0;
  }
  const stack = computeTopBandCircleStackMetrics(args.baseRows.circleBandH, "default");
  const sw = vw / 24;
  const needDiskH = resolveMinimumDiskBandHeightPx({
    initialDiskBandH: stack.diskBandH,
    segmentWidthPx: sw,
    viewportWidthPx: vw,
    hourDiskLabelTokens: args.hourDiskLabelTokens,
    layout: args.layout,
    selection: args.selection,
    diskPadFrac: HOUR_MARKER_DISK_PAD_FRAC,
  });
  return Math.max(0, Math.round(needDiskH - stack.diskBandH));
}

/**
 * When 24-hour indicator entries are hidden, drop the circle band while keeping tick + NATO row heights so the strip
 * reflows upward without a gap.
 */
export function collapseTopBandHourIndicatorAreaRows(rows: UtcTopScaleRowMetrics): UtcTopScaleRowMetrics {
  return {
    topBandHeightPx: rows.tickBandH + rows.timezoneBandH,
    circleBandH: 0,
    tickBandH: rows.tickBandH,
    timezoneBandH: rows.timezoneBandH,
  };
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
 * Builds hour columns, boundary/tick positions, and present-time indicator x ({@link UtcTopScaleLayout.nowX}) for the top instrument scale.
 * Segments still carry **longitude solar** metadata per structural column (for future zone UI). The **circle row** and
 * **tick rail** share phased x from {@link topBandHourMarkerCenterX} using {@link UtcTopScaleLayout.phasedTapeAnchorFrac}; labels and
 * phase follow {@link ResolvedTopBandTime}.
 * Pure geometry for tests; {@link buildDisplayChromeState} embeds the same result for the top band width.
 * Pass {@link topBandHeightPx} to attach {@link UtcTopScaleRowMetrics} for multi-row chrome.
 * When {@link rowMetricsOverride} is set (e.g. after hour-marker disk-row expansion), it replaces
 * {@link computeUtcTopScaleRowMetrics} so tick + NATO band heights stay fixed while the circle band grows.
 * For {@code textLed}, pass {@link textModeCircleStackOverride} from {@link resolveTextIndicatorCircleStackMetrics} so
 * {@link UtcTopScaleLayout.circleStack} matches the text-row-led band height (see {@link buildDisplayChromeState}).
 */
export function buildUtcTopScaleLayout(
  nowMs: number,
  widthPx: number,
  topBandHeightPx?: number,
  resolved?: ResolvedTopBandTime,
  geography?: GeographyConfig,
  chromeRowLayout?: Pick<DisplayChromeLayoutConfig, "timezoneLetterRowVisible">,
  rowMetricsOverride?: UtcTopScaleRowMetrics,
  circleStackProfile: TopBandCircleStackLayoutProfile = "default",
  /** When {@link circleStackProfile} is {@code "textLed"}, replaces {@link computeTopBandCircleStackMetrics} (text row height is authoritative). */
  textModeCircleStackOverride?: TopBandCircleStackMetrics,
): UtcTopScaleLayout {
  const w = Math.max(0, widthPx);
  const rt = resolved ?? resolveTopBandTimeFromConfig(DEFAULT_DISPLAY_TIME_CONFIG);
  const dayStart = utcDayStartMs(nowMs);
  const utcMsOfDay = nowMs - dayStart;
  const { bandPhaseDayStartMs } = bandPhaseFraction(
    nowMs,
    rt.topBandMode,
    rt.referenceTimeZone,
  );
  const referenceFractionalHour = referenceFractionalHourOfDay(nowMs, rt.topBandMode, rt.referenceTimeZone);
  const topBandAnchor = computeTopBandLongitudeAnchor(
    nowMs,
    w,
    rt.topBandMode,
    rt.referenceTimeZone,
    rt.topBandAnchor,
    geography,
  );

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
    const solarHour = solarLocalHour0To23FromUtcMsOfDay(utcMsOfDay, lonCenter);
    const nominalUtcOffsetHours = roundedMeanSolarUtcOffsetHours(lonCenter);
    segments.push({
      hour: h,
      x0,
      x1,
      centerX,
      centerLongitudeDeg: lonCenter,
      solarHour,
      label: solarHour.toString().padStart(2, "0"),
      timezoneLetter: militaryTimeZoneLetterFromStructuralColumnIndex(h),
      nominalUtcOffsetHours,
      longitudeLabel: formatLongitudeLabelAtCenter(lonCenter),
    });
  }

  const phasedTapeAnchorFrac =
    rt.topBandMode === "utc24"
      ? topBandAnchor.anchorFrac
      : wrapFraction01(
          presentTimeIndicatorXFromReferenceLongitudeDeg(topBandAnchor.referenceLongitudeDeg, w) / w,
        );

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

  const structuralIdxForPresentTime = structuralHourIndexFromReferenceLongitudeDeg(topBandAnchor.referenceLongitudeDeg);
  const nowX = segments[structuralIdxForPresentTime]!.centerX;

  const rows =
    rowMetricsOverride !== undefined
      ? rowMetricsOverride
      : topBandHeightPx !== undefined && topBandHeightPx > 0
        ? computeUtcTopScaleRowMetrics(topBandHeightPx, chromeRowLayout)
        : undefined;

  const topBandLayout = rows !== undefined ? buildTopBandLayoutFromRows(w, rows) : undefined;
  const circleStack =
    rows !== undefined
      ? circleStackProfile === "textLed" && textModeCircleStackOverride !== undefined
        ? textModeCircleStackOverride
        : computeTopBandCircleStackMetrics(rows.circleBandH, circleStackProfile)
      : undefined;

  const circleMarkers: UtcTopScaleCircleMarker[] =
    rows !== undefined && circleStack !== undefined
      ? (() => {
          const cr = computeUtcCircleMarkerRadius(circleStack.diskBandH, sw);
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
    majorBoundaryXs,
    quarterMajorTickXs,
    quarterMinorTickXs,
    tickHierarchy,
    nowX,
    rows,
    topBandLayout,
    circleMarkers,
    circleStack,
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
  /** Merged with {@link DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG} (palette and visibility fields optional). */
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
  const stForRows = getTopChromeStyle(layout.topChromePalette);
  const hourMarkerSel = effectiveTopBandHourMarkerSelection(layout);
  const hourIndicatorAreaVisible = layout.hourMarkers.visible !== false;
  const baseRows = computeUtcTopScaleRowMetrics(baseTop, layout);
  const rowsForExpansion = hourIndicatorAreaVisible
    ? baseRows
    : collapseTopBandHourIndicatorAreaRows(baseRows);

  let rowMetrics: UtcTopScaleRowMetrics;
  let textModeCircleStackOverride: TopBandCircleStackMetrics | undefined;

  if (!hourIndicatorAreaVisible) {
    rowMetrics = rowsForExpansion;
    textModeCircleStackOverride = undefined;
  } else if (hourMarkerSel.kind === "text" && w > 0) {
    const textStack = resolveTextIndicatorCircleStackMetrics({
      viewportWidthPx: w,
      hourDiskLabelTokens: stForRows.hourDiskLabel,
      layout,
      seedCircleBandHeightPx: rowsForExpansion.circleBandH,
    });
    const needCircleBandH = sumTopBandCircleStackMetricsPx(textStack);
    rowMetrics = alignTopBandRowsToExactCircleBandH(rowsForExpansion, needCircleBandH);
    textModeCircleStackOverride = textStack;
  } else {
    const circleExpansionPx =
      hourMarkerSel.kind === "text"
        ? 0
        : computeHourMarkerCircleBandExpansionPx({
            baseRows: rowsForExpansion,
            viewportWidthPx: w,
            hourDiskLabelTokens: stForRows.hourDiskLabel,
            layout,
            selection: hourMarkerSel,
          });
    rowMetrics =
      circleExpansionPx > 0
        ? expandTopBandCircleBandPreservingLowerBands(rowsForExpansion, circleExpansionPx)
        : rowsForExpansion;
    textModeCircleStackOverride = undefined;
  }

  const top = rowMetrics.topBandHeightPx;
  const utcTopScale = buildUtcTopScaleLayout(
    time.now,
    w,
    top,
    resolved,
    options.geography,
    layout,
    rowMetrics,
    hourMarkerSel.kind === "text" ? "textLed" : "default",
    textModeCircleStackOverride,
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
    effectiveTopBandHourMarkers: resolveEffectiveTopBandHourMarkers(layout),
    geography: options.geography,
    frameNumber: frame.frameNumber,
  };
}

/**
 * Tick-rail baseline Y and major-tick top Y (same geometry as {@link renderDisplayChrome} hour boundaries).
 * Used with {@link UtcTopScaleLayout.nowX} for the present-time “now” tick segment.
 *
 * Vertical tick marks resolve their bottom Y via {@link topBandTickRailVerticalTickBottomY} so hour ticks and the
 * present-time stroke share the same endpoint as the horizontal baseline stroke.
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
  const rows = scale.rows ?? computeUtcTopScaleRowMetrics(tb.height);
  const hourMarkerSel = effectiveTopBandHourMarkerSelection(chrome.displayChromeLayout);
  const y0 = tb.y;
  const circleH = rows.circleBandH;
  const tickH = rows.tickBandH;
  const yCircleBottom = y0 + circleH;
  const yTickBottom = yCircleBottom + tickH;
  const bandBottom = y0 + tb.height;
  const { tickBaselineY, majorTickTopY } = topBandTickRailMajorTickVerticalSpan(yCircleBottom, tickH);
  const tickRailVerticalBottomY = topBandTickRailVerticalTickBottomY(tickBaselineY);
  const zoneTop = yTickBottom;
  const zoneH = bandBottom - zoneTop;
  const st = getTopChromeStyle(chrome.displayChromeLayout.topChromePalette);
  const tzTab = st.timezoneTab;
  const zonePadY = Math.max(
    0,
    Math.min(tzTab.zoneFillPadMaxPx, Math.round(zoneH * tzTab.zoneFillPadFracOfZone)),
  );
  /** Narrow gutter between structural tabs — tightens column rhythm without changing sector geometry. */
  const segGapX = 0.4;
  const tabBottomR = Math.min(8, Math.max(4, Math.round(Math.min(zoneH * 0.32, 7))));
  const circleStack =
    scale.circleStack ??
    computeTopBandCircleStackMetrics(
      rows.circleBandH,
      hourMarkerSel.kind === "text" ? "textLed" : "default",
    );
  const vw = viewport.width;
  const sw = vw > 0 ? vw / 24 : 0;
  const markerRadiusPx = computeUtcCircleMarkerRadius(circleStack.diskBandH, sw);
  const diskLabelSizePx = computeHourDiskLabelSizePx(markerRadiusPx, vw, st.hourDiskLabel);
  const hourMarkerSizeMult = resolvedHourMarkerLayoutSizeMultiplier(chrome.displayChromeLayout);
  const glyphDiskBoost = hourMarkerSel.kind === "glyph" ? TOP_BAND_GLYPH_DISK_CONTENT_SCALE : 1;
  const markerDiskContentSizePx = diskLabelSizePx * hourMarkerSizeMult * glyphDiskBoost;
  const hourIndicatorsVisible = chrome.effectiveTopBandHourMarkers.enabled;

  const nowTickLineWidth = st.ticks.lineWidth * st.ticks.presentTimeTickWidthMulTapeTick;
  const tickHaloW = nowTickLineWidth * st.ticks.presentTimeHaloWidthMul;
  const mapCoreW = st.ticks.lineWidth * st.ticks.referenceMeridianMapLineWidthMulTapeTick;
  const mapHaloW = mapCoreW * st.ticks.referenceMeridianMapHaloWidthMul;
  const refMeridianWrapHalf = presentTimeIndicatorWrapHalfExtentPx(
    Math.max(nowTickLineWidth, mapCoreW),
    Math.max(tickHaloW, mapHaloW),
  );

  const presentTimeTickStroke = {
    nowX: scale.nowX,
    viewportWidthPx: vw,
    wrapHalfExtentPx: refMeridianWrapHalf,
    coreLineWidthPx: nowTickLineWidth,
    haloLineWidthPx: tickHaloW,
    coreStroke: st.ticks.presentTimeStroke,
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
      stripBackgroundFill: st.instrument.stripBackground,
      tickRailBackgroundFill: st.instrument.tickRailBackground,
    }),
  );

  const drawTimezoneLetterRow =
    chrome.displayChromeLayout.timezoneLetterRowVisible && zoneH > 0;

  if (drawTimezoneLetterRow) {
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
      chromeStyle: st,
      glyphRenderContext: { fontRegistry: defaultFontAssetRegistry },
    });
    executeRenderPlanOnCanvas(ctx, zonePlan);
  }

  const minorTickTopY = tickBaselineY - tickH * 0.28;
  const quarterTickTopY = tickBaselineY - tickH * 0.67;

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
      baselineStroke: st.ticks.baseline,
      baselineStrokeWidthPx: st.ticks.baselineLineWidth,
      tickStroke: st.ticks.stroke,
      tickStrokeWidthPx: st.ticks.lineWidth,
    }),
  );

  // Present-time “now” tick: structural column center for the resolved anchor meridian (presentTimeIndicatorXFromReferenceLongitudeDeg), tick rail only;
  // Halo + core; seam tiling uses {@link refMeridianWrapHalf} so thick strokes stay continuous at x≈0 / x≈width.
  executeRenderPlanOnCanvas(
    ctx,
    buildTopBandPresentTimeTickRenderPlan({
      ...presentTimeTickStroke,
      verticalSpans: [{ yTop: majorTickTopY, yBottom: tickRailVerticalBottomY }],
    }),
  );

  executeRenderPlanOnCanvas(
    ctx,
    buildTopBandInterBandSeamLinesRenderPlan({
      viewportWidthPx: vw,
      topBandOriginXPx: tb.x,
      circleBandBottomYPx: yCircleBottom,
      tickZoneBoundaryYPx: yTickBottom,
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
              radiusPx: computeUtcCircleMarkerRadius(circleStack.diskBandH, sw),
              utcHour: h,
              label: topBandCircleLabel(h, scale.topBandMode),
              currentHourLabel: topBandCircleLabel(h, scale.topBandMode),
              nextHourLabel: topBandNextHourLabel(h, scale.topBandMode),
              annotationKind: ak,
              annotationLabel: topBandMarkerAnnotationLabel(ak),
            };
          })
        : [];

  if (chrome.effectiveTopBandHourMarkers.tapeHourNumberOverlay?.enabled === true) {
    executeRenderPlanOnCanvas(
      ctx,
      buildTopBandTapeHourNumberOverlayRenderPlan({
        viewportWidthPx: vw,
        tickBaselineY,
        tickBandHeightPx: tickH,
        markers: markers.map((m) => ({
          centerX: m.centerX,
          structuralHour0To23: m.utcHour,
        })),
        topBandMode: scale.topBandMode,
        textFill: st.ticks.stroke,
        boxFill: "rgba(6, 26, 54, 0.94)",
        boxStroke: "rgba(130, 188, 228, 0.42)",
        fontSizePx: Math.max(6, diskLabelSizePx * 0.48),
        glyphRenderContext: { fontRegistry: defaultFontAssetRegistry },
      }),
    );
  }

  if (hourIndicatorsVisible && circleH > 0) {
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
        effectiveTopBandHourMarkerSelection: hourMarkerSel,
        effectiveTopBandHourMarkers: chrome.effectiveTopBandHourMarkers,
        glyphRenderContext: { fontRegistry: defaultFontAssetRegistry },
        referenceNowMs: scale.referenceNowMs,
        structuralZoneCenterXPx:
          scale.segments.length === 24 ? scale.segments.map((s) => s.centerX) : undefined,
      }),
    );
  }

  const capPx = Math.max(0, st.ticks.referenceMeridianCircleCapPx);
  if (capPx > 0 && vw > 0 && circleH > 0) {
    executeRenderPlanOnCanvas(
      ctx,
      buildTopBandPresentTimeTickRenderPlan({
        ...presentTimeTickStroke,
        verticalSpans: [{ yTop: yCircleBottom - capPx, yBottom: yCircleBottom }],
      }),
    );
  }

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
    renderBottomChrome(ctx, viewport, bottomBand, chrome.informationBar);
  }

  ctx.restore();
}
