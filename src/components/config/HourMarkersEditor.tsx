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

import type {
  TopBandHourMarkerGlyphMode,
  TopBandHourMarkerRepresentationKind,
} from "../../config/appConfig";
import {
  cloneHourMarkersConfig,
  DEFAULT_TOP_BAND_GLYPH_MODE,
  DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
  TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS,
} from "../../config/appConfig";
import type { HourMarkersConfig, HourMarkersRealizationConfig } from "../../config/topBandHourMarkersTypes";
import type { FontAssetId } from "../../typography/fontAssetTypes";
import { defaultFontAssetRegistry } from "../../typography/fontAssetRegistry";
import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import { ConfigControlRow } from "./ConfigControlRow";
import { HourMarkerBehaviorEditor } from "./HourMarkerBehaviorEditor";

const TOP_BAND_HOUR_MARKER_KINDS: readonly TopBandHourMarkerRepresentationKind[] = [
  "text",
  "glyph",
];

const TOP_BAND_HOUR_MARKER_GLYPH_MODES: readonly TopBandHourMarkerGlyphMode[] = [
  "analogClock",
  "radialLine",
  "radialWedge",
];

/** Placeholder for the native color input when no override is stored (not persisted). */
const TOP_BAND_HOUR_MARKER_COLOR_INPUT_PLACEHOLDER = "#335577";

type HourMarkerEditorBaseProps = {
  hourMarkers: HourMarkersConfig;
  wired: boolean;
  updateConfig?: (updater: (draft: LibrationConfigV2) => void) => void;
};

function labelForHourMarkerKind(kind: TopBandHourMarkerRepresentationKind): string {
  return kind === "text" ? "Text" : "Glyph";
}

function uiRepresentationKind(hm: HourMarkersConfig): TopBandHourMarkerRepresentationKind {
  if (!hm.customRepresentationEnabled) {
    return "text";
  }
  return hm.realization.kind === "text" ? "text" : "glyph";
}

function uiGlyphMode(hm: HourMarkersConfig): TopBandHourMarkerGlyphMode {
  if (hm.realization.kind === "text") {
    return DEFAULT_TOP_BAND_GLYPH_MODE;
  }
  return hm.realization.kind;
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

// -----------------------------------------------------------------------------
// Shared optional color (structured realization.color)
// -----------------------------------------------------------------------------

function HourMarkerOptionalColorEditor({ hourMarkers, wired, updateConfig }: HourMarkerEditorBaseProps) {
  const color = hourMarkers.realization.color;
  return (
    <ConfigControlRow label="Hour marker color (optional)">
      <input
        type="color"
        className="config-input"
        aria-label="Top-band hour marker color"
        title={
          color === undefined
            ? "No color override — picker shows a neutral placeholder"
            : "Custom color for top-band hour markers"
        }
        value={color ?? TOP_BAND_HOUR_MARKER_COLOR_INPUT_PLACEHOLDER}
        disabled={!wired || !hourMarkers.customRepresentationEnabled}
        onChange={
          wired && updateConfig
            ? (e) => {
                const v = e.currentTarget.value;
                commitHourMarkers(updateConfig, (hm) => {
                  const r = hm.realization;
                  let realization: HourMarkersRealizationConfig;
                  if (r.kind === "text") {
                    realization = {
                      kind: "text",
                      fontAssetId: r.fontAssetId,
                      color: v,
                    };
                  } else {
                    realization = {
                      kind: r.kind,
                      color: v,
                    };
                  }
                  return { ...hm, realization };
                });
              }
            : undefined
        }
      />
      <button
        type="button"
        className="config-input"
        aria-label="Clear hour marker color override"
        disabled={!wired || !hourMarkers.customRepresentationEnabled || color === undefined}
        onClick={
          wired && updateConfig
            ? () => {
                commitHourMarkers(updateConfig, (hm) => {
                  const r = hm.realization;
                  let realization: HourMarkersRealizationConfig;
                  if (r.kind === "text") {
                    realization = { kind: "text", fontAssetId: r.fontAssetId };
                  } else {
                    realization = { kind: r.kind };
                  }
                  return { ...hm, realization };
                });
              }
            : undefined
        }
      >
        Use default colors
      </button>
    </ConfigControlRow>
  );
}

// -----------------------------------------------------------------------------
// Realization axis (text vs glyph)
// -----------------------------------------------------------------------------

export function HourMarkerRealizationEditor({ hourMarkers, wired, updateConfig }: HourMarkerEditorBaseProps) {
  return (
    <ConfigControlRow label="Hour marker rendering">
      <select
        className="config-input"
        value={uiRepresentationKind(hourMarkers)}
        disabled={!wired || !hourMarkers.customRepresentationEnabled}
        aria-label="Top-band hour marker rendering kind"
        onChange={
          wired && updateConfig
            ? (e) => {
                const kind = e.currentTarget.value as TopBandHourMarkerRepresentationKind;
                commitHourMarkers(updateConfig, (hm) => {
                  const prevColor = hm.realization.color;
                  if (kind === "text") {
                    const fontAssetId =
                      hm.realization.kind === "text"
                        ? hm.realization.fontAssetId
                        : DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID;
                    return {
                      ...hm,
                      realization: {
                        kind: "text",
                        fontAssetId,
                        ...(prevColor !== undefined ? { color: prevColor } : {}),
                      },
                    };
                  }
                  const glyphMode: TopBandHourMarkerGlyphMode =
                    hm.realization.kind !== "text"
                      ? hm.realization.kind
                      : DEFAULT_TOP_BAND_GLYPH_MODE;
                  return {
                    ...hm,
                    realization: {
                      kind: glyphMode,
                      ...(prevColor !== undefined ? { color: prevColor } : {}),
                    },
                  };
                });
              }
            : undefined
        }
      >
        {TOP_BAND_HOUR_MARKER_KINDS.map((k) => (
          <option key={k} value={k}>
            {labelForHourMarkerKind(k)}
          </option>
        ))}
      </select>
    </ConfigControlRow>
  );
}

// -----------------------------------------------------------------------------
// Content axis (text font selection)
// -----------------------------------------------------------------------------

export type HourMarkerContentEditorProps = HourMarkerEditorBaseProps & {
  hourMarkerTextControlsActive: boolean;
  hourMarkerFontOptions: readonly { id: FontAssetId; label: string }[];
};

export function HourMarkerContentEditor({
  hourMarkers,
  wired,
  updateConfig,
  hourMarkerTextControlsActive,
  hourMarkerFontOptions,
}: HourMarkerContentEditorProps) {
  const fontId =
    hourMarkers.realization.kind === "text"
      ? hourMarkers.realization.fontAssetId
      : DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID;
  return (
    <ConfigControlRow label="Hour marker font">
      <select
        className="config-input"
        value={fontId}
        disabled={!wired || !hourMarkerTextControlsActive}
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
                      ...(hm.realization.color !== undefined ? { color: hm.realization.color } : {}),
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
  );
}

// -----------------------------------------------------------------------------
// Text appearance axis (structured layout + text realization color)
// -----------------------------------------------------------------------------

export type TextHourMarkerAppearanceEditorProps = HourMarkerEditorBaseProps & {
  hourMarkerTextControlsActive: boolean;
};

export function TextHourMarkerAppearanceEditor({
  hourMarkers,
  wired,
  updateConfig,
  hourMarkerTextControlsActive,
}: TextHourMarkerAppearanceEditorProps) {
  const sm = hourMarkers.layout.sizeMultiplier;
  return (
    <ConfigControlRow label="Hour marker size">
      <input
        type="range"
        className="config-input"
        min={0.5}
        max={2}
        step={0.05}
        disabled={!wired || !hourMarkerTextControlsActive}
        aria-label="Hour marker text size multiplier"
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
                  layout: { sizeMultiplier: n },
                }));
              }
            : undefined
        }
      />
      <span className="config-section__hint" style={{ marginLeft: "0.5rem" }}>
        {sm.toFixed(2)}×
      </span>
    </ConfigControlRow>
  );
}

// -----------------------------------------------------------------------------
// Glyph appearance axis (glyph realization kind + per-mode presentation)
// -----------------------------------------------------------------------------

function GlyphHourMarkerModeSelector({ hourMarkers, wired, updateConfig }: HourMarkerEditorBaseProps) {
  return (
    <ConfigControlRow label="Hour marker glyph style">
      <select
        className="config-input"
        value={uiGlyphMode(hourMarkers)}
        disabled={!wired || !hourMarkers.customRepresentationEnabled}
        aria-label="Top-band hour marker glyph style"
        onChange={
          wired && updateConfig
            ? (e) => {
                const glyphMode = e.currentTarget.value as TopBandHourMarkerGlyphMode;
                commitHourMarkers(updateConfig, (hm) => ({
                  ...hm,
                  realization: {
                    kind: glyphMode,
                    ...(hm.realization.color !== undefined ? { color: hm.realization.color } : {}),
                  },
                }));
              }
            : undefined
        }
      >
        {TOP_BAND_HOUR_MARKER_GLYPH_MODES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </ConfigControlRow>
  );
}

/** analogClock-specific top-band hour marker controls (none yet). */
function GlyphHourMarkerAnalogClockAppearance(_props: HourMarkerEditorBaseProps) {
  return null;
}

/** radialLine-specific top-band hour marker controls (none yet). */
function GlyphHourMarkerRadialLineAppearance(_props: HourMarkerEditorBaseProps) {
  return null;
}

/** radialWedge-specific top-band hour marker controls (none yet). */
function GlyphHourMarkerRadialWedgeAppearance(_props: HourMarkerEditorBaseProps) {
  return null;
}

export function GlyphHourMarkerAppearanceEditor(props: HourMarkerEditorBaseProps) {
  const { hourMarkers } = props;
  const mode = uiGlyphMode(hourMarkers);
  return (
    <>
      <GlyphHourMarkerModeSelector {...props} />
      {mode === "analogClock" ? <GlyphHourMarkerAnalogClockAppearance {...props} /> : null}
      {mode === "radialLine" ? <GlyphHourMarkerRadialLineAppearance {...props} /> : null}
      {mode === "radialWedge" ? <GlyphHourMarkerRadialWedgeAppearance {...props} /> : null}
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
  const hourMarkerTextControlsActive =
    hourMarkers.customRepresentationEnabled && hourMarkers.realization.kind === "text";
  const hourMarkerFontOptions = TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS.map((id) => {
    const rec = defaultFontAssetRegistry.getById(id);
    return rec ? { id: rec.id as FontAssetId, label: rec.displayName } : null;
  }).filter((x): x is { id: FontAssetId; label: string } => x !== null);

  const baseProps: HourMarkerEditorBaseProps = { hourMarkers, wired, updateConfig };

  return (
    <>
      <HourMarkerBehaviorEditor {...baseProps} />
      <HourMarkerOptionalColorEditor {...baseProps} />
      <HourMarkerRealizationEditor {...baseProps} />
      {uiRepresentationKind(hourMarkers) === "text" ? (
        <>
          <HourMarkerContentEditor
            {...baseProps}
            hourMarkerTextControlsActive={hourMarkerTextControlsActive}
            hourMarkerFontOptions={hourMarkerFontOptions}
          />
          <TextHourMarkerAppearanceEditor {...baseProps} hourMarkerTextControlsActive={hourMarkerTextControlsActive} />
        </>
      ) : (
        <GlyphHourMarkerAppearanceEditor {...baseProps} />
      )}
    </>
  );
}
