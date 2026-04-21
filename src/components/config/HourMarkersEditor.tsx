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

import { Fragment, useRef } from "react";
import {
  cloneHourMarkersConfig,
  DEFAULT_INDICATOR_ENTRIES_AREA_BACKGROUND_COLOR,
  PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
  PRODUCT_TEXT_RENDERER_DEFAULT_SELECT_LABEL,
  TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS,
  type TopBandTimeMode,
} from "../../config/appConfig";
import type {
  HourMarkersAnalogClockAppearance,
  HourMarkersConfig,
  HourMarkersNoonMidnightExpressionMode,
  HourMarkersRadialLineAppearance,
  HourMarkersRadialWedgeAppearance,
  HourMarkersRealizationConfig,
} from "../../config/topBandHourMarkersTypes";
import type { FontAssetId } from "../../typography/fontAssetTypes";
import { defaultFontAssetRegistry } from "../../typography/fontAssetRegistry";
import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import {
  clampHourMarkerContentRowPaddingPx,
  HOUR_MARKER_CONTENT_ROW_PADDING_MAX_PX,
  HOUR_MARKER_CONTENT_ROW_PADDING_MIN_PX,
} from "../../config/topBandHourMarkerContentRowVerticalMetrics";
import { ConfigControlRow } from "./ConfigControlRow";

const HOUR_MARKER_REALIZATION_KINDS = [
  "text",
  "analogClock",
  "radialLine",
  "radialWedge",
] as const satisfies readonly HourMarkersRealizationConfig["kind"][];

/** Persisted realization kind from config — never overwritten by UTC display mode. */
function authoredHourMarkerRealizationKind(hm: HourMarkersConfig): HourMarkersRealizationConfig["kind"] {
  return hm.realization.kind;
}

/**
 * `utc24` hour-label mode forces text-only tape at resolve time
 * ({@link resolveEffectiveTopBandHourMarkers}); the editor mirrors that with Text-only UI affordances.
 */
function utcLabelModeForcesTextOnlyHourTape(topBandMode: TopBandTimeMode): boolean {
  return topBandMode === "utc24";
}

function hourMarkerRealizationKindOptions(
  topBandMode: TopBandTimeMode,
): readonly HourMarkersRealizationConfig["kind"][] {
  return utcLabelModeForcesTextOnlyHourTape(topBandMode) ? (["text"] as const) : HOUR_MARKER_REALIZATION_KINDS;
}

/**
 * What the realization kind control displays: in UTC, non-text authored kinds show a Text-only proxy (effective
 * runtime is text; authored procedural subtree stays on disk). In non-UTC modes, the selector reflects authored kind.
 */
function displayedHourMarkerRealizationKindInEditor(
  authoredKind: HourMarkersRealizationConfig["kind"],
  topBandMode: TopBandTimeMode,
): HourMarkersRealizationConfig["kind"] {
  return utcLabelModeForcesTextOnlyHourTape(topBandMode) && authoredKind !== "text" ? "text" : authoredKind;
}

/** True when UTC UI must not offer a live kind commit for procedural authoring (strict read-only Text proxy). */
function utcProceduralRealizationUsesReadOnlyTextProxy(
  authoredKind: HourMarkersRealizationConfig["kind"],
  topBandMode: TopBandTimeMode,
): boolean {
  return utcLabelModeForcesTextOnlyHourTape(topBandMode) && authoredKind !== "text";
}

const NOON_MIDNIGHT_EXPRESSION_MODES = [
  "textWords",
  "boxedNumber",
  "solarLunarPictogram",
  "semanticGlyph",
] as const satisfies readonly HourMarkersNoonMidnightExpressionMode[];

function labelForNoonMidnightExpressionMode(mode: HourMarkersNoonMidnightExpressionMode): string {
  switch (mode) {
    case "textWords":
      return "Words (NOON / MIDNIGHT)";
    case "boxedNumber":
      return "Boxed number";
    case "solarLunarPictogram":
      return "Sun / moon pictogram";
    case "semanticGlyph":
      return "Semantic diamond glyph";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

/** Placeholder for the native color input when no override is stored (not persisted). */
const TOP_BAND_HOUR_MARKER_COLOR_INPUT_PLACEHOLDER = "#335577";

type HourMarkerEditorBaseProps = {
  hourMarkers: HourMarkersConfig;
  wired: boolean;
  /** When false, subordinate realization/appearance/layout controls are disabled. */
  entriesAreaEnabled: boolean;
  /** Global hour label mode; `utc24` restricts hour-marker realization UI to text-only. */
  topBandMode: TopBandTimeMode;
  updateConfig?: (updater: (draft: LibrationConfigV2) => void) => void;
};

function labelForRealizationKind(kind: HourMarkersRealizationConfig["kind"]): string {
  switch (kind) {
    case "text":
      return "Text";
    case "analogClock":
      return "Analog clock";
    case "radialLine":
      return "Radial line";
    case "radialWedge":
      return "Radial wedge";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function commitHourMarkers(
  updateConfig: HourMarkerEditorBaseProps["updateConfig"],
  producer: (hm: HourMarkersConfig) => HourMarkersConfig,
): void {
  if (!updateConfig) {
    return;
  }
  updateConfig((draft) => {
    draft.chrome.layout.hourMarkers = cloneHourMarkersConfig(
      producer(cloneHourMarkersConfig(draft.chrome.layout.hourMarkers)),
    );
  });
}

function realizationConfigForKind(
  kind: HourMarkersRealizationConfig["kind"],
  hm: HourMarkersConfig,
): HourMarkersRealizationConfig {
  switch (kind) {
    case "text":
      return {
        kind: "text",
        ...(hm.realization.kind === "text" && hm.realization.fontAssetId !== undefined
          ? { fontAssetId: hm.realization.fontAssetId }
          : {}),
        appearance: {},
      };
    case "analogClock":
      return { kind: "analogClock", appearance: {} };
    case "radialLine":
      return { kind: "radialLine", appearance: {} };
    case "radialWedge":
      return { kind: "radialWedge", appearance: {} };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function hourMarkersAfterRealizationKindChange(
  nextKind: HourMarkersRealizationConfig["kind"],
  hm: HourMarkersConfig,
): HourMarkersConfig {
  /** Redundant same-kind commits must not rebuild realization (would wipe text appearance, font defaults, etc.). */
  if (nextKind === hm.realization.kind) {
    return hm;
  }
  return {
    ...hm,
    realization: realizationConfigForKind(nextKind, hm),
  };
}

function compactAnalogAppearance(a: HourMarkersAnalogClockAppearance): HourMarkersAnalogClockAppearance {
  const out: HourMarkersAnalogClockAppearance = {};
  if (a.handColor !== undefined) {
    out.handColor = a.handColor;
  }
  if (a.faceColor !== undefined) {
    out.faceColor = a.faceColor;
  }
  return out;
}

function compactRadialLineAppearance(a: HourMarkersRadialLineAppearance): HourMarkersRadialLineAppearance {
  const out: HourMarkersRadialLineAppearance = {};
  if (a.lineColor !== undefined) {
    out.lineColor = a.lineColor;
  }
  if (a.faceColor !== undefined) {
    out.faceColor = a.faceColor;
  }
  return out;
}

function compactRadialWedgeAppearance(a: HourMarkersRadialWedgeAppearance): HourMarkersRadialWedgeAppearance {
  const out: HourMarkersRadialWedgeAppearance = {};
  if (a.edgeColor !== undefined) {
    out.edgeColor = a.edgeColor;
  }
  if (a.faceColor !== undefined) {
    out.faceColor = a.faceColor;
  }
  if (a.fillColor !== undefined) {
    out.fillColor = a.fillColor;
  }
  return out;
}

function RealizationSection({
  hourMarkers,
  wired,
  updateConfig,
  entriesAreaEnabled,
  topBandMode,
}: HourMarkerEditorBaseProps) {
  const authoredRealizationKind = authoredHourMarkerRealizationKind(hourMarkers);
  const utcTapeTextOnly = utcLabelModeForcesTextOnlyHourTape(topBandMode);
  const utcReadOnlyTextProxy = utcProceduralRealizationUsesReadOnlyTextProxy(
    authoredRealizationKind,
    topBandMode,
  );
  const displayedSelectorKind = displayedHourMarkerRealizationKindInEditor(authoredRealizationKind, topBandMode);
  const kindOptions = hourMarkerRealizationKindOptions(topBandMode);
  const authoringOff = !wired || !entriesAreaEnabled;
  const realizationSelectDisabled = authoringOff || utcReadOnlyTextProxy;
  return (
    <>
      <ConfigControlRow label="Realization kind">
        <select
          className="config-input"
          data-testid="chrome-hour-marker-realization-kind-select"
          data-utc-procedural-proxy={utcReadOnlyTextProxy ? "true" : undefined}
          value={displayedSelectorKind}
          disabled={realizationSelectDisabled}
          aria-label="Top-band hour marker realization kind"
          title={
            utcReadOnlyTextProxy
              ? "UTC shows text-only hour tape; your original realization kind is kept and returns when you leave UTC."
              : undefined
          }
          onChange={
            wired && entriesAreaEnabled && updateConfig && !utcReadOnlyTextProxy
              ? (e) => {
                  const next = e.currentTarget.value as HourMarkersRealizationConfig["kind"];
                  commitHourMarkers(updateConfig, (hm) => hourMarkersAfterRealizationKindChange(next, hm));
                }
              : undefined
          }
        >
          {kindOptions.map((k) => (
            <option key={k} value={k}>
              {labelForRealizationKind(k)}
            </option>
          ))}
        </select>
      </ConfigControlRow>
      {utcTapeTextOnly ? (
        <p className="config-section__hint" data-testid="chrome-hour-marker-utc-text-only-hint">
          UTC mode uses text-only hour indicators.
        </p>
      ) : null}
    </>
  );
}

type AppearanceSectionProps = HourMarkerEditorBaseProps & {
  hourMarkerFontOptions: readonly { id: FontAssetId; label: string }[];
};

function AppearanceSection({
  hourMarkers,
  wired,
  updateConfig,
  entriesAreaEnabled,
  topBandMode,
  hourMarkerFontOptions,
}: AppearanceSectionProps) {
  const authoredRealizationKind = authoredHourMarkerRealizationKind(hourMarkers);
  const utcReadOnlyTextProxy = utcProceduralRealizationUsesReadOnlyTextProxy(
    authoredRealizationKind,
    topBandMode,
  );
  const authoringOff = !wired || !entriesAreaEnabled;

  if (utcReadOnlyTextProxy) {
    return (
      <p
        className="config-section__hint"
        data-testid="chrome-hour-marker-utc-procedural-preserved-hint"
      >
        Your {labelForRealizationKind(authoredRealizationKind)} settings are preserved; they are not editable in UTC
        mode and are not replaced by text authoring. Switch back to 12-hour or 24-hour labels to edit them again.
      </p>
    );
  }

  if (authoredRealizationKind === "text") {
    const r = hourMarkers.realization;
    const fontId = r.fontAssetId;
    const textColor = r.appearance.color;
    return (
      <>
        <ConfigControlRow label="Hour marker font">
          <select
            className="config-input"
            value={fontId ?? ""}
            disabled={authoringOff}
            aria-label="Font for top-band hour disk numerals"
            onChange={
              wired && entriesAreaEnabled && updateConfig
                ? (e) => {
                    const v = e.currentTarget.value;
                    commitHourMarkers(updateConfig, (hm) => {
                      if (hm.realization.kind !== "text") {
                        return hm;
                      }
                      const appearance =
                        hm.realization.kind === "text" ? { ...hm.realization.appearance } : {};
                      if (v === "") {
                        return {
                          ...hm,
                          realization: {
                            kind: "text",
                            appearance,
                          },
                        };
                      }
                      return {
                        ...hm,
                        realization: {
                          kind: "text",
                          fontAssetId: v as FontAssetId,
                          appearance,
                        },
                      };
                    });
                  }
                : undefined
            }
          >
            <option value="">Default (typography role)</option>
            <option value={PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID}>
              {PRODUCT_TEXT_RENDERER_DEFAULT_SELECT_LABEL}
            </option>
            {hourMarkerFontOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </ConfigControlRow>
        <ConfigControlRow label="Hour marker color (optional)">
          <input
            type="color"
            className="config-input"
            aria-label="Top-band hour marker color"
            title={
              textColor === undefined
                ? "No color override — picker shows a neutral placeholder"
                : "Custom color for top-band hour markers"
            }
            value={textColor ?? TOP_BAND_HOUR_MARKER_COLOR_INPUT_PLACEHOLDER}
            disabled={authoringOff}
            onChange={
              wired && entriesAreaEnabled && updateConfig
                ? (e) => {
                    const v = e.currentTarget.value;
                    commitHourMarkers(updateConfig, (hm) => {
                      if (hm.realization.kind !== "text") {
                        return hm;
                      }
                      return {
                        ...hm,
                        realization: {
                          kind: "text",
                          fontAssetId: hm.realization.fontAssetId,
                          appearance: { ...hm.realization.appearance, color: v },
                        },
                      };
                    });
                  }
                : undefined
            }
          />
          <button
            type="button"
            className="config-input"
            aria-label="Clear hour marker color override"
            disabled={authoringOff || textColor === undefined}
            onClick={
              wired && entriesAreaEnabled && updateConfig
                ? () => {
                    commitHourMarkers(updateConfig, (hm) => {
                      if (hm.realization.kind !== "text") {
                        return hm;
                      }
                      const { color, ...rest } = hm.realization.appearance;
                      void color;
                      return {
                        ...hm,
                        realization: {
                          kind: "text",
                          fontAssetId: hm.realization.fontAssetId,
                          appearance: rest,
                        },
                      };
                    });
                  }
                : undefined
            }
          >
            Use default colors
          </button>
        </ConfigControlRow>
      </>
    );
  }

  if (authoredRealizationKind === "analogClock") {
    const r = hourMarkers.realization;
    const hand = r.appearance.handColor;
    const face = r.appearance.faceColor;
    return (
      <>
        <ConfigControlRow label="Hand color (optional)">
          <input
            type="color"
            className="config-input"
            aria-label="Top-band analog hour marker hand color"
            title={hand === undefined ? "No hand color override" : "Hand stroke color"}
            value={hand ?? TOP_BAND_HOUR_MARKER_COLOR_INPUT_PLACEHOLDER}
            disabled={authoringOff}
            onChange={
              wired && entriesAreaEnabled && updateConfig
                ? (e) => {
                    const v = e.currentTarget.value;
                    commitHourMarkers(updateConfig, (hm) => {
                      if (hm.realization.kind !== "analogClock") {
                        return hm;
                      }
                      const cur = hm.realization;
                      const realization: HourMarkersRealizationConfig = {
                        kind: "analogClock",
                        appearance: compactAnalogAppearance({
                          ...cur.appearance,
                          handColor: v,
                        }),
                      };
                      return { ...hm, realization };
                    });
                  }
                : undefined
            }
          />
          <button
            type="button"
            className="config-input"
            aria-label="Clear analog hand color override"
            disabled={authoringOff || hand === undefined}
            onClick={
              wired && entriesAreaEnabled && updateConfig
                ? () => {
                    commitHourMarkers(updateConfig, (hm) => {
                      if (hm.realization.kind !== "analogClock") {
                        return hm;
                      }
                      const cur = hm.realization;
                      const realization: HourMarkersRealizationConfig = {
                        kind: "analogClock",
                        appearance: compactAnalogAppearance({
                          ...cur.appearance,
                          handColor: undefined,
                        }),
                      };
                      return { ...hm, realization };
                    });
                  }
                : undefined
            }
          >
            Default
          </button>
        </ConfigControlRow>
        <ConfigControlRow label="Face color (optional)">
          <input
            type="color"
            className="config-input"
            aria-label="Top-band analog hour marker face color"
            title={face === undefined ? "No face color override" : "Clock face fill color"}
            value={face ?? TOP_BAND_HOUR_MARKER_COLOR_INPUT_PLACEHOLDER}
            disabled={authoringOff}
            onChange={
              wired && entriesAreaEnabled && updateConfig
                ? (e) => {
                    const v = e.currentTarget.value;
                    commitHourMarkers(updateConfig, (hm) => {
                      if (hm.realization.kind !== "analogClock") {
                        return hm;
                      }
                      const cur = hm.realization;
                      const realization: HourMarkersRealizationConfig = {
                        kind: "analogClock",
                        appearance: compactAnalogAppearance({
                          ...cur.appearance,
                          faceColor: v,
                        }),
                      };
                      return { ...hm, realization };
                    });
                  }
                : undefined
            }
          />
          <button
            type="button"
            className="config-input"
            aria-label="Clear analog face color override"
            disabled={authoringOff || face === undefined}
            onClick={
              wired && entriesAreaEnabled && updateConfig
                ? () => {
                    commitHourMarkers(updateConfig, (hm) => {
                      if (hm.realization.kind !== "analogClock") {
                        return hm;
                      }
                      const cur = hm.realization;
                      const realization: HourMarkersRealizationConfig = {
                        kind: "analogClock",
                        appearance: compactAnalogAppearance({
                          ...cur.appearance,
                          faceColor: undefined,
                        }),
                      };
                      return { ...hm, realization };
                    });
                  }
                : undefined
            }
          >
            Default
          </button>
        </ConfigControlRow>
      </>
    );
  }

  if (authoredRealizationKind === "radialLine") {
    const r = hourMarkers.realization;
    const line = r.appearance.lineColor;
    const face = r.appearance.faceColor;
    return (
      <>
        <ConfigControlRow label="Line color (optional)">
          <input
            type="color"
            className="config-input"
            aria-label="Top-band radial line hour marker line color"
            title={line === undefined ? "No line color override" : "Radial line stroke color"}
            value={line ?? TOP_BAND_HOUR_MARKER_COLOR_INPUT_PLACEHOLDER}
            disabled={authoringOff}
            onChange={
              wired && entriesAreaEnabled && updateConfig
                ? (e) => {
                    const v = e.currentTarget.value;
                    commitHourMarkers(updateConfig, (hm) => {
                      if (hm.realization.kind !== "radialLine") {
                        return hm;
                      }
                      const cur = hm.realization;
                      const realization: HourMarkersRealizationConfig = {
                        kind: "radialLine",
                        appearance: compactRadialLineAppearance({
                          ...cur.appearance,
                          lineColor: v,
                        }),
                      };
                      return { ...hm, realization };
                    });
                  }
                : undefined
            }
          />
          <button
            type="button"
            className="config-input"
            aria-label="Clear radial line stroke color override"
            disabled={authoringOff || line === undefined}
            onClick={
              wired && entriesAreaEnabled && updateConfig
                ? () => {
                    commitHourMarkers(updateConfig, (hm) => {
                      if (hm.realization.kind !== "radialLine") {
                        return hm;
                      }
                      const cur = hm.realization;
                      const realization: HourMarkersRealizationConfig = {
                        kind: "radialLine",
                        appearance: compactRadialLineAppearance({
                          ...cur.appearance,
                          lineColor: undefined,
                        }),
                      };
                      return { ...hm, realization };
                    });
                  }
                : undefined
            }
          >
            Default
          </button>
        </ConfigControlRow>
        <ConfigControlRow label="Face color (optional)">
          <input
            type="color"
            className="config-input"
            aria-label="Top-band radial line hour marker face color"
            title={face === undefined ? "No face color override" : "Disk fill behind the radial line"}
            value={face ?? TOP_BAND_HOUR_MARKER_COLOR_INPUT_PLACEHOLDER}
            disabled={authoringOff}
            onChange={
              wired && entriesAreaEnabled && updateConfig
                ? (e) => {
                    const v = e.currentTarget.value;
                    commitHourMarkers(updateConfig, (hm) => {
                      if (hm.realization.kind !== "radialLine") {
                        return hm;
                      }
                      const cur = hm.realization;
                      const realization: HourMarkersRealizationConfig = {
                        kind: "radialLine",
                        appearance: compactRadialLineAppearance({
                          ...cur.appearance,
                          faceColor: v,
                        }),
                      };
                      return { ...hm, realization };
                    });
                  }
                : undefined
            }
          />
          <button
            type="button"
            className="config-input"
            aria-label="Clear radial line face color override"
            disabled={authoringOff || face === undefined}
            onClick={
              wired && entriesAreaEnabled && updateConfig
                ? () => {
                    commitHourMarkers(updateConfig, (hm) => {
                      if (hm.realization.kind !== "radialLine") {
                        return hm;
                      }
                      const cur = hm.realization;
                      const realization: HourMarkersRealizationConfig = {
                        kind: "radialLine",
                        appearance: compactRadialLineAppearance({
                          ...cur.appearance,
                          faceColor: undefined,
                        }),
                      };
                      return { ...hm, realization };
                    });
                  }
                : undefined
            }
          >
            Default
          </button>
        </ConfigControlRow>
      </>
    );
  }

  if (authoredRealizationKind === "radialWedge") {
    const r = hourMarkers.realization;
    const edge = r.appearance.edgeColor;
    const face = r.appearance.faceColor;
    const fill = r.appearance.fillColor;
    return (
      <>
        <ConfigControlRow label="Edge color (optional)">
          <input
            type="color"
            className="config-input"
            aria-label="Top-band radial wedge hour marker edge color"
            title={edge === undefined ? "No edge color override" : "Wedge outline / edge ink"}
            value={edge ?? TOP_BAND_HOUR_MARKER_COLOR_INPUT_PLACEHOLDER}
            disabled={authoringOff}
            onChange={
              wired && entriesAreaEnabled && updateConfig
                ? (e) => {
                    const v = e.currentTarget.value;
                    commitHourMarkers(updateConfig, (hm) => {
                      if (hm.realization.kind !== "radialWedge") {
                        return hm;
                      }
                      const cur = hm.realization;
                      const realization: HourMarkersRealizationConfig = {
                        kind: "radialWedge",
                        appearance: compactRadialWedgeAppearance({
                          ...cur.appearance,
                          edgeColor: v,
                        }),
                      };
                      return { ...hm, realization };
                    });
                  }
                : undefined
            }
          />
          <button
            type="button"
            className="config-input"
            aria-label="Clear radial wedge edge color override"
            disabled={authoringOff || edge === undefined}
            onClick={
              wired && entriesAreaEnabled && updateConfig
                ? () => {
                    commitHourMarkers(updateConfig, (hm) => {
                      if (hm.realization.kind !== "radialWedge") {
                        return hm;
                      }
                      const cur = hm.realization;
                      const realization: HourMarkersRealizationConfig = {
                        kind: "radialWedge",
                        appearance: compactRadialWedgeAppearance({
                          ...cur.appearance,
                          edgeColor: undefined,
                        }),
                      };
                      return { ...hm, realization };
                    });
                  }
                : undefined
            }
          >
            Default
          </button>
        </ConfigControlRow>
        <ConfigControlRow label="Face color (optional)">
          <input
            type="color"
            className="config-input"
            aria-label="Top-band radial wedge hour marker face color"
            title={face === undefined ? "No face color override" : "Full disk behind the wedge annulus"}
            value={face ?? TOP_BAND_HOUR_MARKER_COLOR_INPUT_PLACEHOLDER}
            disabled={authoringOff}
            onChange={
              wired && entriesAreaEnabled && updateConfig
                ? (e) => {
                    const v = e.currentTarget.value;
                    commitHourMarkers(updateConfig, (hm) => {
                      if (hm.realization.kind !== "radialWedge") {
                        return hm;
                      }
                      const cur = hm.realization;
                      const realization: HourMarkersRealizationConfig = {
                        kind: "radialWedge",
                        appearance: compactRadialWedgeAppearance({
                          ...cur.appearance,
                          faceColor: v,
                        }),
                      };
                      return { ...hm, realization };
                    });
                  }
                : undefined
            }
          />
          <button
            type="button"
            className="config-input"
            aria-label="Clear radial wedge face color override"
            disabled={authoringOff || face === undefined}
            onClick={
              wired && entriesAreaEnabled && updateConfig
                ? () => {
                    commitHourMarkers(updateConfig, (hm) => {
                      if (hm.realization.kind !== "radialWedge") {
                        return hm;
                      }
                      const cur = hm.realization;
                      const realization: HourMarkersRealizationConfig = {
                        kind: "radialWedge",
                        appearance: compactRadialWedgeAppearance({
                          ...cur.appearance,
                          faceColor: undefined,
                        }),
                      };
                      return { ...hm, realization };
                    });
                  }
                : undefined
            }
          >
            Default
          </button>
        </ConfigControlRow>
        <ConfigControlRow label="Wedge fill (optional)">
          <input
            type="color"
            className="config-input"
            aria-label="Top-band radial wedge hour marker wedge fill color"
            title={fill === undefined ? "No wedge fill override" : "Wedge annulus interior fill"}
            value={fill ?? TOP_BAND_HOUR_MARKER_COLOR_INPUT_PLACEHOLDER}
            disabled={authoringOff}
            onChange={
              wired && entriesAreaEnabled && updateConfig
                ? (e) => {
                    const v = e.currentTarget.value;
                    commitHourMarkers(updateConfig, (hm) => {
                      if (hm.realization.kind !== "radialWedge") {
                        return hm;
                      }
                      const cur = hm.realization;
                      const realization: HourMarkersRealizationConfig = {
                        kind: "radialWedge",
                        appearance: compactRadialWedgeAppearance({
                          ...cur.appearance,
                          fillColor: v,
                        }),
                      };
                      return { ...hm, realization };
                    });
                  }
                : undefined
            }
          />
          <button
            type="button"
            className="config-input"
            aria-label="Clear radial wedge annulus fill color override"
            disabled={authoringOff || fill === undefined}
            onClick={
              wired && entriesAreaEnabled && updateConfig
                ? () => {
                    commitHourMarkers(updateConfig, (hm) => {
                      if (hm.realization.kind !== "radialWedge") {
                        return hm;
                      }
                      const cur = hm.realization;
                      const realization: HourMarkersRealizationConfig = {
                        kind: "radialWedge",
                        appearance: compactRadialWedgeAppearance({
                          ...cur.appearance,
                          fillColor: undefined,
                        }),
                      };
                      return { ...hm, realization };
                    });
                  }
                : undefined
            }
          >
            Default
          </button>
        </ConfigControlRow>
      </>
    );
  }

  throw new Error(`Unhandled hour marker realization kind: ${String(authoredRealizationKind)}`);
}

function hourMarkersLayoutOmitPadding(
  layout: HourMarkersConfig["layout"],
  omit: "top" | "bottom",
): HourMarkersConfig["layout"] {
  const out: HourMarkersConfig["layout"] = { sizeMultiplier: layout.sizeMultiplier };
  if (omit !== "top" && layout.contentPaddingTopPx !== undefined) {
    out.contentPaddingTopPx = layout.contentPaddingTopPx;
  }
  if (omit !== "bottom" && layout.contentPaddingBottomPx !== undefined) {
    out.contentPaddingBottomPx = layout.contentPaddingBottomPx;
  }
  return out;
}

function LayoutSection({ hourMarkers, wired, updateConfig, entriesAreaEnabled }: HourMarkerEditorBaseProps) {
  const sm = hourMarkers.layout.sizeMultiplier;
  const padTop = hourMarkers.layout.contentPaddingTopPx;
  const padBottom = hourMarkers.layout.contentPaddingBottomPx;
  const authoringOff = !wired || !entriesAreaEnabled;
  return (
    <>
      <ConfigControlRow label="Hour marker size">
        <input
          type="range"
          className="config-input"
          min={0.5}
          max={2}
          step={0.05}
          disabled={authoringOff}
          aria-label="Hour marker size multiplier"
          value={sm}
          onChange={
            wired && entriesAreaEnabled && updateConfig
              ? (e) => {
                  const n = Number(e.currentTarget.value);
                  if (!Number.isFinite(n)) {
                    return;
                  }
                  commitHourMarkers(updateConfig, (hm) => ({
                    ...hm,
                    layout: { ...hm.layout, sizeMultiplier: n },
                  }));
                }
              : undefined
          }
        />
        <span className="config-section__hint" style={{ marginLeft: "0.5rem" }}>
          {sm.toFixed(2)}×
        </span>
      </ConfigControlRow>
      <ConfigControlRow label="Content row padding (top)">
        <input
          type="number"
          className="config-input"
          min={HOUR_MARKER_CONTENT_ROW_PADDING_MIN_PX}
          max={HOUR_MARKER_CONTENT_ROW_PADDING_MAX_PX}
          step={0.5}
          disabled={authoringOff}
          aria-label="Top padding of the hour-marker content row inside the disk strip, in pixels; leave empty for automatic"
          placeholder="Auto"
          value={padTop ?? ""}
          onChange={
            wired && entriesAreaEnabled && updateConfig
              ? (e) => {
                  const raw = e.currentTarget.value.trim();
                  if (raw === "") {
                    commitHourMarkers(updateConfig, (hm) => ({
                      ...hm,
                      layout: hourMarkersLayoutOmitPadding(hm.layout, "top"),
                    }));
                    return;
                  }
                  const n = Number(raw);
                  if (!Number.isFinite(n)) {
                    return;
                  }
                  commitHourMarkers(updateConfig, (hm) => ({
                    ...hm,
                    layout: {
                      ...hm.layout,
                      contentPaddingTopPx: clampHourMarkerContentRowPaddingPx(n),
                    },
                  }));
                }
              : undefined
          }
        />
        <span className="config-section__hint" style={{ marginLeft: "0.5rem" }}>
          px (empty = auto)
        </span>
      </ConfigControlRow>
      <ConfigControlRow label="Content row padding (bottom)">
        <input
          type="number"
          className="config-input"
          min={HOUR_MARKER_CONTENT_ROW_PADDING_MIN_PX}
          max={HOUR_MARKER_CONTENT_ROW_PADDING_MAX_PX}
          step={0.5}
          disabled={authoringOff}
          aria-label="Bottom padding of the hour-marker content row inside the disk strip, in pixels; leave empty for automatic"
          placeholder="Auto"
          value={padBottom ?? ""}
          onChange={
            wired && entriesAreaEnabled && updateConfig
              ? (e) => {
                  const raw = e.currentTarget.value.trim();
                  if (raw === "") {
                    commitHourMarkers(updateConfig, (hm) => ({
                      ...hm,
                      layout: hourMarkersLayoutOmitPadding(hm.layout, "bottom"),
                    }));
                    return;
                  }
                  const n = Number(raw);
                  if (!Number.isFinite(n)) {
                    return;
                  }
                  commitHourMarkers(updateConfig, (hm) => ({
                    ...hm,
                    layout: {
                      ...hm.layout,
                      contentPaddingBottomPx: clampHourMarkerContentRowPaddingPx(n),
                    },
                  }));
                }
              : undefined
          }
        />
        <span className="config-section__hint" style={{ marginLeft: "0.5rem" }}>
          px (empty = auto)
        </span>
      </ConfigControlRow>
    </>
  );
}

function NoonMidnightSection({ hourMarkers, wired, updateConfig, entriesAreaEnabled }: HourMarkerEditorBaseProps) {
  if (hourMarkers.realization.kind !== "text" || !entriesAreaEnabled) {
    return null;
  }
  const nm = hourMarkers.noonMidnightCustomization;
  const enabled = nm?.enabled === true;
  /** Preserves the last selected expression mode while customization is disabled (not persisted). */
  const lastExpressionModeRef = useRef<HourMarkersNoonMidnightExpressionMode>(
    nm?.expressionMode ?? "boxedNumber",
  );
  if (enabled && nm?.expressionMode !== undefined) {
    lastExpressionModeRef.current = nm.expressionMode;
  }
  const mode: HourMarkersNoonMidnightExpressionMode = enabled
    ? (nm!.expressionMode ?? "boxedNumber")
    : lastExpressionModeRef.current;
  const authoringOff = !wired || !entriesAreaEnabled;

  return (
    <>
      <ConfigControlRow label="Customize noon / midnight">
        <label className="config-control-row__checkbox">
          <input
            type="checkbox"
            disabled={authoringOff}
            aria-label="Customize noon and midnight indicator entries"
            checked={enabled}
            onChange={
              wired && entriesAreaEnabled && updateConfig
                ? (e) => {
                    const on = e.currentTarget.checked;
                    commitHourMarkers(updateConfig, (hm) => {
                      if (!on) {
                        const next = cloneHourMarkersConfig(hm);
                        delete (next as { noonMidnightCustomization?: unknown }).noonMidnightCustomization;
                        return next;
                      }
                      return {
                        ...hm,
                        noonMidnightCustomization: {
                          enabled: true,
                          expressionMode: lastExpressionModeRef.current,
                        },
                      };
                    });
                  }
                : undefined
            }
          />
          <span>Replace noon and midnight entries with the chosen expression</span>
        </label>
      </ConfigControlRow>
      {enabled ? (
        <ConfigControlRow label="Noon / midnight expression">
          <select
            className="config-input"
            disabled={authoringOff}
            aria-label="Noon and midnight expression mode"
            value={mode}
            onChange={
              wired && entriesAreaEnabled && updateConfig
                ? (e) => {
                    const nextMode = e.currentTarget.value as HourMarkersNoonMidnightExpressionMode;
                    commitHourMarkers(updateConfig, (hm) => ({
                      ...hm,
                      noonMidnightCustomization: {
                        enabled: true,
                        expressionMode: nextMode,
                      },
                    }));
                  }
                : undefined
            }
          >
            {NOON_MIDNIGHT_EXPRESSION_MODES.map((m) => (
              <option key={m} value={m}>
                {labelForNoonMidnightExpressionMode(m)}
              </option>
            ))}
          </select>
        </ConfigControlRow>
      ) : null}
    </>
  );
}

export type HourMarkersEditorProps = {
  config: LibrationConfigV2;
  /** When set, wired display-time controls call into the guarded update path. */
  updateConfig?: (updater: (draft: LibrationConfigV2) => void) => void;
};

export function HourMarkersEditor({ config, updateConfig }: HourMarkersEditorProps) {
  const lay = config.chrome.layout;
  const hourMarkers = lay.hourMarkers;
  const topBandMode = config.chrome.displayTime.topBandMode;
  const wired = Boolean(updateConfig);
  const entriesAreaEnabled = hourMarkers.indicatorEntriesAreaVisible !== false;
  const hourMarkerFontOptions: readonly { id: FontAssetId; label: string }[] =
    TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS.map((id) => {
      const rec = defaultFontAssetRegistry.getById(id);
      return rec ? { id: rec.id as FontAssetId, label: rec.displayName } : null;
    }).filter((x): x is { id: FontAssetId; label: string } => x !== null);

  const baseProps: HourMarkerEditorBaseProps = {
    hourMarkers,
    wired,
    entriesAreaEnabled,
    topBandMode,
    updateConfig,
  };

  const realizationUiKey = `${topBandMode}:${authoredHourMarkerRealizationKind(hourMarkers)}`;

  return (
    <>
      <fieldset className="config-fieldset config-fieldset--plain">
        <legend className="config-fieldset__legend">Area visibility</legend>
        <ConfigControlRow label="24-hour indicator entries">
          <label className="config-control-row__checkbox">
            <input
              type="checkbox"
              checked={entriesAreaEnabled}
              disabled={!wired}
              aria-label="Show 24-hour indicator entries area above the tick tape"
              onChange={
                wired && updateConfig
                  ? (e) => {
                      const on = e.currentTarget.checked;
                      commitHourMarkers(updateConfig, (hm) => ({
                        ...hm,
                        indicatorEntriesAreaVisible: on,
                      }));
                    }
                  : undefined
              }
            />
            <span>Show hour-indicator entries strip (layout + rendering)</span>
          </label>
        </ConfigControlRow>
      </fieldset>
      <fieldset className="config-fieldset config-fieldset--plain">
        <legend className="config-fieldset__legend">Indicator entries area</legend>
        <ConfigControlRow label="Background color">
          <input
            type="color"
            className="config-input"
            aria-label="24-hour indicator entries area background color"
            title={
              hourMarkers.indicatorEntriesAreaBackgroundColor === undefined
                ? "Default instrument bed color — pick to override"
                : "Background for the indicator entries row only"
            }
            value={
              hourMarkers.indicatorEntriesAreaBackgroundColor ??
              DEFAULT_INDICATOR_ENTRIES_AREA_BACKGROUND_COLOR
            }
            disabled={!wired || !entriesAreaEnabled}
            onChange={
              wired && entriesAreaEnabled && updateConfig
                ? (e) => {
                    commitHourMarkers(updateConfig, (hm) => ({
                      ...hm,
                      indicatorEntriesAreaBackgroundColor: e.currentTarget.value,
                    }));
                  }
                : undefined
            }
          />
          <button
            type="button"
            className="config-input"
            aria-label="Reset indicator entries area background to default"
            disabled={
              !wired || !entriesAreaEnabled || hourMarkers.indicatorEntriesAreaBackgroundColor === undefined
            }
            onClick={
              wired && entriesAreaEnabled && updateConfig
                ? () => {
                    commitHourMarkers(updateConfig, (hm) => {
                      const next = cloneHourMarkersConfig(hm);
                      delete (next as { indicatorEntriesAreaBackgroundColor?: string })
                        .indicatorEntriesAreaBackgroundColor;
                      return next;
                    });
                  }
                : undefined
            }
          >
            Default
          </button>
        </ConfigControlRow>
      </fieldset>
      <fieldset className="config-fieldset config-fieldset--plain">
        <legend className="config-fieldset__legend">Realization</legend>
        <Fragment key={`hm-realization-${realizationUiKey}`}>
          <RealizationSection {...baseProps} />
          <NoonMidnightSection {...baseProps} />
        </Fragment>
      </fieldset>
      <fieldset className="config-fieldset config-fieldset--plain">
        <legend className="config-fieldset__legend">Appearance</legend>
        <Fragment key={`hm-appearance-${realizationUiKey}`}>
          <AppearanceSection {...baseProps} hourMarkerFontOptions={hourMarkerFontOptions} />
        </Fragment>
      </fieldset>
      <fieldset className="config-fieldset config-fieldset--plain">
        <legend className="config-fieldset__legend">Layout</legend>
        <LayoutSection {...baseProps} />
      </fieldset>
    </>
  );
}
