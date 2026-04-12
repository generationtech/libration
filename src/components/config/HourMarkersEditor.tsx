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
  cloneHourMarkersConfig,
  DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
  TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS,
  TOP_BAND_HOUR_MARKER_TEXT_MARGIN_MAX,
} from "../../config/appConfig";
import type {
  HourMarkersAnalogClockAppearance,
  HourMarkersConfig,
  HourMarkersRealizationConfig,
} from "../../config/topBandHourMarkersTypes";
import type { FontAssetId } from "../../typography/fontAssetTypes";
import { defaultFontAssetRegistry } from "../../typography/fontAssetRegistry";
import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import { ConfigControlRow } from "./ConfigControlRow";
import { HourMarkerBehaviorEditor } from "./HourMarkerBehaviorEditor";

const HOUR_MARKER_REALIZATION_KINDS = [
  "text",
  "analogClock",
  "radialLine",
  "radialWedge",
] as const satisfies readonly HourMarkersRealizationConfig["kind"][];

/** Placeholder for the native color input when no override is stored (not persisted). */
const TOP_BAND_HOUR_MARKER_COLOR_INPUT_PLACEHOLDER = "#335577";

type HourMarkerEditorBaseProps = {
  hourMarkers: HourMarkersConfig;
  wired: boolean;
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
        fontAssetId:
          hm.realization.kind === "text"
            ? hm.realization.fontAssetId
            : DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
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

/** Commits a realization kind change and drops glyph-only fields invalid for the new kind (e.g. tape overlay for text). */
function hourMarkersAfterRealizationKindChange(
  nextKind: HourMarkersRealizationConfig["kind"],
  hm: HourMarkersConfig,
): HourMarkersConfig {
  const next: HourMarkersConfig = {
    ...hm,
    behavior: hm.behavior,
    realization: realizationConfigForKind(nextKind, hm),
  };
  if (nextKind === "text") {
    const { tapeHourNumberOverlay: _omit, ...rest } = next;
    void _omit;
    return rest;
  }
  return next;
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

function VisibilitySection({ hourMarkers, wired, updateConfig }: HourMarkerEditorBaseProps) {
  const visible = hourMarkers.visible !== false;
  return (
    <ConfigControlRow label="Show 24-hour indicator entries">
      <label className="config-control-row__checkbox">
        <input
          type="checkbox"
          checked={visible}
          disabled={!wired}
          aria-label="Show 24-hour indicator entries in the top band"
          onChange={
            wired && updateConfig
              ? (e) => {
                  const on = e.currentTarget.checked;
                  commitHourMarkers(updateConfig, (hm) => ({
                    ...hm,
                    visible: on,
                  }));
                }
              : undefined
          }
        />
        <span>Indicator row and circle-band background</span>
      </label>
    </ConfigControlRow>
  );
}

function BehaviorSection(props: HourMarkerEditorBaseProps) {
  const areaOn = props.hourMarkers.visible !== false;
  return <HourMarkerBehaviorEditor {...props} controlsDisabled={!areaOn} />;
}

function RealizationSection({ hourMarkers, wired, updateConfig }: HourMarkerEditorBaseProps) {
  const kind = hourMarkers.realization.kind;
  const areaOn = hourMarkers.visible !== false;
  return (
    <ConfigControlRow label="Realization kind">
      <select
        className="config-input"
        value={kind}
        disabled={!wired || !areaOn}
        aria-label="Top-band hour marker realization kind"
        onChange={
          wired && updateConfig
            ? (e) => {
                const next = e.currentTarget.value as HourMarkersRealizationConfig["kind"];
                commitHourMarkers(updateConfig, (hm) => hourMarkersAfterRealizationKindChange(next, hm));
              }
            : undefined
        }
      >
        {HOUR_MARKER_REALIZATION_KINDS.map((k) => (
          <option key={k} value={k}>
            {labelForRealizationKind(k)}
          </option>
        ))}
      </select>
    </ConfigControlRow>
  );
}

type AppearanceSectionProps = HourMarkerEditorBaseProps & {
  hourMarkerFontOptions: readonly { id: FontAssetId; label: string }[];
};

function AppearanceSection({ hourMarkers, wired, updateConfig, hourMarkerFontOptions }: AppearanceSectionProps) {
  const rk = hourMarkers.realization.kind;
  const areaOn = hourMarkers.visible !== false;

  if (rk === "text") {
    const r = hourMarkers.realization;
    const fontId = r.fontAssetId;
    const textColor = r.appearance.color;
    return (
      <>
        <ConfigControlRow label="Hour marker font">
          <select
            className="config-input"
            value={fontId}
            disabled={!wired || !areaOn}
            aria-label="Font for top-band hour disk numerals"
            onChange={
              wired && updateConfig
                ? (e) => {
                    const v = e.currentTarget.value;
                    commitHourMarkers(updateConfig, (hm) => {
                      if (hm.realization.kind !== "text") {
                        return hm;
                      }
                      const nextFont: FontAssetId =
                        v === "" ? DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID : (v as FontAssetId);
                      return {
                        ...hm,
                        realization: {
                          kind: "text",
                          fontAssetId: nextFont,
                          appearance:
                            hm.realization.kind === "text" ? { ...hm.realization.appearance } : {},
                        },
                      };
                    });
                  }
                : undefined
            }
          >
            <option value="">Default (typography role)</option>
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
            disabled={!wired || !areaOn}
            onChange={
              wired && updateConfig
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
            disabled={!wired || !areaOn || textColor === undefined}
            onClick={
              wired && updateConfig
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

  if (rk === "analogClock") {
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
            disabled={!wired || !areaOn}
            onChange={
              wired && updateConfig
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
            disabled={!wired || !areaOn || hand === undefined}
            onClick={
              wired && updateConfig
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
            disabled={!wired || !areaOn}
            onChange={
              wired && updateConfig
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
            disabled={!wired || !areaOn || face === undefined}
            onClick={
              wired && updateConfig
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

  if (rk === "radialLine") {
    const r = hourMarkers.realization;
    const line = r.appearance.lineColor;
    return (
      <ConfigControlRow label="Line color (optional)">
        <input
          type="color"
          className="config-input"
          aria-label="Top-band radial line hour marker color"
          title={line === undefined ? "No line color override" : "Radial line stroke color"}
          value={line ?? TOP_BAND_HOUR_MARKER_COLOR_INPUT_PLACEHOLDER}
          disabled={!wired || !areaOn}
          onChange={
            wired && updateConfig
              ? (e) => {
                  const v = e.currentTarget.value;
                  commitHourMarkers(updateConfig, (hm) => {
                    if (hm.realization.kind !== "radialLine") {
                      return hm;
                    }
                    const realization: HourMarkersRealizationConfig = {
                      kind: "radialLine",
                      appearance: { lineColor: v },
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
          aria-label="Clear radial line color override"
          disabled={!wired || !areaOn || line === undefined}
          onClick={
            wired && updateConfig
              ? () => {
                  commitHourMarkers(updateConfig, (hm) => {
                    if (hm.realization.kind !== "radialLine") {
                      return hm;
                    }
                    const realization: HourMarkersRealizationConfig = {
                      kind: "radialLine",
                      appearance: {},
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
    );
  }

  if (rk === "radialWedge") {
    const r = hourMarkers.realization;
    const fill = r.appearance.fillColor;
    return (
      <ConfigControlRow label="Fill color (optional)">
        <input
          type="color"
          className="config-input"
          aria-label="Top-band radial wedge hour marker fill color"
          title={fill === undefined ? "No fill color override" : "Wedge fill color"}
          value={fill ?? TOP_BAND_HOUR_MARKER_COLOR_INPUT_PLACEHOLDER}
          disabled={!wired || !areaOn}
          onChange={
            wired && updateConfig
              ? (e) => {
                  const v = e.currentTarget.value;
                  commitHourMarkers(updateConfig, (hm) => {
                    if (hm.realization.kind !== "radialWedge") {
                      return hm;
                    }
                    const realization: HourMarkersRealizationConfig = {
                      kind: "radialWedge",
                      appearance: { fillColor: v },
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
          aria-label="Clear radial wedge fill color override"
          disabled={!wired || !areaOn || fill === undefined}
          onClick={
            wired && updateConfig
              ? () => {
                  commitHourMarkers(updateConfig, (hm) => {
                    if (hm.realization.kind !== "radialWedge") {
                      return hm;
                    }
                    const realization: HourMarkersRealizationConfig = {
                      kind: "radialWedge",
                      appearance: {},
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
    );
  }

  throw new Error(`Unhandled hour marker realization kind: ${String(rk)}`);
}

function LayoutSection({ hourMarkers, wired, updateConfig }: HourMarkerEditorBaseProps) {
  const sm = hourMarkers.layout.sizeMultiplier;
  const textTopMarginPx = hourMarkers.layout.textTopMarginPx;
  const textBottomMarginPx = hourMarkers.layout.textBottomMarginPx;
  const rk = hourMarkers.realization.kind;
  const tapeOn = hourMarkers.tapeHourNumberOverlay?.enabled === true;
  const areaOn = hourMarkers.visible !== false;
  return (
    <>
      <ConfigControlRow label="Hour marker size">
        <input
          type="range"
          className="config-input"
          min={0.5}
          max={2}
          step={0.05}
          disabled={!wired || !areaOn}
          aria-label="Hour marker size multiplier"
          value={sm}
          onChange={
            wired && updateConfig
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
      {rk === "text" ? (
        <>
          <ConfigControlRow label="Top margin (text row)">
            <input
              type="number"
              className="config-input"
              min={0}
              max={TOP_BAND_HOUR_MARKER_TEXT_MARGIN_MAX}
              step={1}
              disabled={!wired || !areaOn}
              aria-label="Extra space above 24-hour numerals inside the indicator row"
              value={textTopMarginPx}
              onChange={
                wired && updateConfig
                  ? (e) => {
                      const n = Number(e.currentTarget.value);
                      if (!Number.isFinite(n)) {
                        return;
                      }
                      commitHourMarkers(updateConfig, (hm) => ({
                        ...hm,
                        layout: { ...hm.layout, textTopMarginPx: n },
                      }));
                    }
                  : undefined
              }
            />
            <span className="config-section__hint" style={{ marginLeft: "0.5rem" }}>
              px above numerals
            </span>
          </ConfigControlRow>
          <ConfigControlRow label="Bottom margin (text row)">
            <input
              type="number"
              className="config-input"
              min={0}
              max={TOP_BAND_HOUR_MARKER_TEXT_MARGIN_MAX}
              step={1}
              disabled={!wired || !areaOn}
              aria-label="Extra space below 24-hour numerals inside the indicator row"
              value={textBottomMarginPx}
              onChange={
                wired && updateConfig
                  ? (e) => {
                      const n = Number(e.currentTarget.value);
                      if (!Number.isFinite(n)) {
                        return;
                      }
                      commitHourMarkers(updateConfig, (hm) => ({
                        ...hm,
                        layout: { ...hm.layout, textBottomMarginPx: n },
                      }));
                    }
                  : undefined
              }
            />
            <span className="config-section__hint" style={{ marginLeft: "0.5rem" }}>
              px below numerals
            </span>
          </ConfigControlRow>
        </>
      ) : null}
      {rk !== "text" ? (
        <ConfigControlRow label="Tape hour numbers">
          <label className="config-control-row__checkbox">
            <input
              type="checkbox"
              disabled={!wired || !areaOn}
              aria-label="Show boxed hour numerals on the tick tape (glyph mode)"
              checked={tapeOn}
              onChange={
                wired && updateConfig
                  ? (e) => {
                      const on = e.currentTarget.checked;
                      commitHourMarkers(updateConfig, (hm) => ({
                        ...hm,
                        tapeHourNumberOverlay: on ? { enabled: true } : undefined,
                      }));
                    }
                  : undefined
              }
            />
            <span>Boxed numerals on tick tape</span>
          </label>
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
  const wired = Boolean(updateConfig);
  const hourMarkerFontOptions = TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS.map((id) => {
    const rec = defaultFontAssetRegistry.getById(id);
    return rec ? { id: rec.id as FontAssetId, label: rec.displayName } : null;
  }).filter((x): x is { id: FontAssetId; label: string } => x !== null);

  const baseProps: HourMarkerEditorBaseProps = { hourMarkers, wired, updateConfig };

  return (
    <>
      <fieldset className="config-fieldset config-fieldset--plain">
        <legend className="config-fieldset__legend">Visibility</legend>
        <VisibilitySection {...baseProps} />
      </fieldset>
      <fieldset className="config-fieldset config-fieldset--plain">
        <legend className="config-fieldset__legend">Behavior</legend>
        <BehaviorSection {...baseProps} />
      </fieldset>
      <fieldset className="config-fieldset config-fieldset--plain">
        <legend className="config-fieldset__legend">Realization</legend>
        <RealizationSection {...baseProps} />
      </fieldset>
      <fieldset className="config-fieldset config-fieldset--plain">
        <legend className="config-fieldset__legend">Appearance</legend>
        <AppearanceSection {...baseProps} hourMarkerFontOptions={hourMarkerFontOptions} />
      </fieldset>
      <fieldset className="config-fieldset config-fieldset--plain">
        <legend className="config-fieldset__legend">Layout</legend>
        <LayoutSection {...baseProps} />
      </fieldset>
    </>
  );
}
