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
  ALL_REFERENCE_CITY_IDS,
  PIN_DATE_TIME_DISPLAY_MODES,
  PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
  PRODUCT_TEXT_RENDERER_DEFAULT_SELECT_LABEL,
  TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS,
  type CustomPinConfig,
  type PinDateTimeDisplayMode,
  type PinLabelMode,
  type PinScale,
} from "../../config/appConfig";
import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import { REFERENCE_CITIES } from "../../data/referenceCities";
import type { FontAssetId } from "../../typography/fontAssetTypes";
import { defaultFontAssetRegistry } from "../../typography/fontAssetRegistry";
import { ConfigControlRow } from "./ConfigControlRow";

const PIN_LABEL_MODES: readonly PinLabelMode[] = ["city", "cityAndTime"];
const PIN_SCALES: readonly PinScale[] = ["small", "medium", "large"];

function labelForPinDateTimeDisplayMode(mode: PinDateTimeDisplayMode): string {
  switch (mode) {
    case "time":
      return "Time only";
    case "timeWithSeconds":
      return "Time with seconds";
    case "timeAndDate":
      return "Time and date";
    case "dateAndTime":
      return "Date and time";
    case "dateOnly":
      return "Date only";
    case "hidden":
      return "Hidden";
    default: {
      const _x: never = mode;
      return String(_x);
    }
  }
}

export type PinsTabProps = {
  config: LibrationConfigV2;
  /** When set, reference-city checkboxes call into App’s guarded update path. */
  updateConfig?: (updater: (draft: LibrationConfigV2) => void) => void;
};

function newCustomPinId(): string {
  try {
    if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.randomUUID) {
      return `custom.${globalThis.crypto.randomUUID()}`;
    }
  } catch {
    /* ignore */
  }
  return `custom.${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function setVisibleReferenceCityIds(
  draft: LibrationConfigV2,
  cityId: string,
  visible: boolean,
): void {
  const selected = new Set(draft.pins.reference.visibleCityIds);
  if (visible) {
    selected.add(cityId);
  } else {
    selected.delete(cityId);
  }
  draft.pins.reference.visibleCityIds = ALL_REFERENCE_CITY_IDS.filter((id) =>
    selected.has(id),
  );
}

function updateCustomPin(
  draft: LibrationConfigV2,
  id: string,
  patch: Partial<Pick<CustomPinConfig, "label" | "latitude" | "longitude" | "enabled">>,
): void {
  draft.pins.custom = draft.pins.custom.map((p) => (p.id === id ? { ...p, ...patch } : p));
}

export function PinsTab({ config, updateConfig }: PinsTabProps) {
  const visible = new Set(config.pins.reference.visibleCityIds);
  const wired = Boolean(updateConfig);

  return (
    <div className="config-tab-stack">
      <section
        className="config-section"
        data-testid="pins-section-viewpoint"
        aria-labelledby="config-pins-reference-heading"
      >
        <h2 id="config-pins-reference-heading" className="config-section__title">
          Viewpoint &amp; visible cities
        </h2>
        <p className="config-section__hint">
          Map context only: which bundled reference cities render as pins when the City pins layer is
          on. This is independent of the Chrome tab&apos;s tape &quot;anchor city&quot;, which only
          supplies longitude for the instrument strip. (If City pins are off, choices here still apply
          when you turn the layer back on.)
        </p>
        <fieldset className="config-fieldset config-fieldset--plain">
          <legend className="config-fieldset__legend">Visible reference cities</legend>
          <div className="config-checkbox-grid" role="group" aria-label="Visible reference cities">
            {REFERENCE_CITIES.map((city) => (
              <ConfigControlRow key={city.id} label={city.name}>
                <input
                  type="checkbox"
                  className="config-input config-input--checkbox"
                  checked={visible.has(city.id)}
                  readOnly={!wired}
                  disabled={!wired}
                  tabIndex={wired ? 0 : -1}
                  aria-label={`Show pin for ${city.name}`}
                  onChange={
                    wired && updateConfig
                      ? (e) => {
                          const checked = e.currentTarget.checked;
                          updateConfig((draft) => {
                            setVisibleReferenceCityIds(draft, city.id, checked);
                          });
                        }
                      : undefined
                  }
                />
              </ConfigControlRow>
            ))}
          </div>
        </fieldset>
      </section>

      <section
        className="config-section"
        aria-labelledby="config-pins-custom-heading"
      >
        <h2 id="config-pins-custom-heading" className="config-section__title">
          Custom pins
        </h2>
        <p className="config-section__hint">
          Add named markers at latitude and longitude. They are drawn when the City pins layer is on
          and the pin is enabled.
        </p>
        <div className="config-custom-pins">
          {config.pins.custom.map((pin) => (
            <div
              key={pin.id}
              className="config-custom-pins__row"
              role="group"
              aria-label={`Custom pin ${pin.label || pin.id}`}
            >
              <ConfigControlRow label="Label">
                <input
                  type="text"
                  className="config-input"
                  value={pin.label}
                  readOnly={!wired}
                  disabled={!wired}
                  aria-label={`Custom pin ${pin.id} label`}
                  onChange={
                    wired && updateConfig
                      ? (e) => {
                          const v = e.currentTarget.value;
                          updateConfig((draft) => {
                            updateCustomPin(draft, pin.id, { label: v });
                          });
                        }
                      : undefined
                  }
                />
              </ConfigControlRow>
              <ConfigControlRow label="Latitude">
                <input
                  type="number"
                  className="config-input"
                  value={Number.isFinite(pin.latitude) ? String(pin.latitude) : ""}
                  readOnly={!wired}
                  disabled={!wired}
                  step="any"
                  aria-label={`Custom pin ${pin.id} latitude in degrees`}
                  onChange={
                    wired && updateConfig
                      ? (e) => {
                          const n = Number(e.currentTarget.value);
                          if (!Number.isFinite(n)) {
                            return;
                          }
                          updateConfig((draft) => {
                            updateCustomPin(draft, pin.id, { latitude: n });
                          });
                        }
                      : undefined
                  }
                />
              </ConfigControlRow>
              <ConfigControlRow label="Longitude">
                <input
                  type="number"
                  className="config-input"
                  value={Number.isFinite(pin.longitude) ? String(pin.longitude) : ""}
                  readOnly={!wired}
                  disabled={!wired}
                  step="any"
                  aria-label={`Custom pin ${pin.id} longitude in degrees`}
                  onChange={
                    wired && updateConfig
                      ? (e) => {
                          const n = Number(e.currentTarget.value);
                          if (!Number.isFinite(n)) {
                            return;
                          }
                          updateConfig((draft) => {
                            updateCustomPin(draft, pin.id, { longitude: n });
                          });
                        }
                      : undefined
                  }
                />
              </ConfigControlRow>
              <ConfigControlRow label="Enabled">
                <input
                  type="checkbox"
                  className="config-input config-input--checkbox"
                  checked={pin.enabled}
                  readOnly={!wired}
                  disabled={!wired}
                  tabIndex={wired ? 0 : -1}
                  aria-label={`Show custom pin ${pin.id} on map`}
                  onChange={
                    wired && updateConfig
                      ? (e) => {
                          const checked = e.currentTarget.checked;
                          updateConfig((draft) => {
                            updateCustomPin(draft, pin.id, { enabled: checked });
                          });
                        }
                      : undefined
                  }
                />
              </ConfigControlRow>
              <div className="config-custom-pins__actions">
                <button
                  type="button"
                  className="config-button"
                  disabled={!wired}
                  aria-label={`Remove custom pin ${pin.id}`}
                  onClick={
                    wired && updateConfig
                      ? () => {
                          updateConfig((draft) => {
                            draft.pins.custom = draft.pins.custom.filter((p) => p.id !== pin.id);
                          });
                        }
                      : undefined
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="config-section__actions">
          <button
            type="button"
            className="config-button"
            disabled={!wired}
            aria-label="Add custom pin"
            onClick={
              wired && updateConfig
                ? () => {
                    const id = newCustomPinId();
                    updateConfig((draft) => {
                      draft.pins.custom = [
                        ...draft.pins.custom,
                        {
                          id,
                          label: "",
                          latitude: 0,
                          longitude: 0,
                          enabled: true,
                        },
                      ];
                    });
                  }
                : undefined
            }
          >
            Add custom pin
          </button>
        </p>
      </section>

      <section
        className="config-section"
        aria-labelledby="config-pins-appearance-heading"
      >
        <h2 id="config-pins-appearance-heading" className="config-section__title">
          Pin appearance
        </h2>
        <p className="config-section__hint">
          Marker and text size on the map when the City pins layer is on.
        </p>
        <ConfigControlRow label="Scale">
          <select
            className="config-input"
            value={config.pins.presentation.scale}
            disabled={!wired}
            aria-label="Pin scale"
            onChange={
              wired && updateConfig
                ? (e) => {
                    const scale = e.currentTarget.value as PinScale;
                    updateConfig((draft) => {
                      draft.pins.presentation.scale = scale;
                    });
                  }
                : undefined
            }
          >
            {PIN_SCALES.map((s) => (
              <option key={s} value={s}>
                {s === "small" ? "Small" : s === "medium" ? "Medium" : "Large"}
              </option>
            ))}
          </select>
        </ConfigControlRow>
      </section>

      <section
        className="config-section"
        aria-labelledby="config-pins-labels-heading"
      >
        <h2 id="config-pins-labels-heading" className="config-section__title">
          Pin labels
        </h2>
        <p className="config-section__hint">
          Reference cities can show local time next to the name; custom pins use the label only. City name and
          date/time lines can use different fonts; the secondary line format is chosen below (not font or
          layout).
        </p>
        <ConfigControlRow label="Show labels">
          <input
            type="checkbox"
            className="config-input config-input--checkbox"
            checked={config.pins.presentation.showLabels}
            readOnly={!wired}
            disabled={!wired}
            tabIndex={wired ? 0 : -1}
            aria-label="Show pin labels on map"
            onChange={
              wired && updateConfig
                ? (e) => {
                    const checked = e.currentTarget.checked;
                    updateConfig((draft) => {
                      draft.pins.presentation.showLabels = checked;
                    });
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Label content">
          <select
            className="config-input"
            value={config.pins.presentation.labelMode}
            disabled={!wired || !config.pins.presentation.showLabels}
            aria-label="Pin label content mode"
            onChange={
              wired && updateConfig
                ? (e) => {
                    const labelMode = e.currentTarget.value as PinLabelMode;
                    updateConfig((draft) => {
                      draft.pins.presentation.labelMode = labelMode;
                    });
                  }
                : undefined
            }
          >
            {PIN_LABEL_MODES.map((m) => (
              <option key={m} value={m}>
                {m === "city" ? "City name only" : "City name and local time"}
              </option>
            ))}
          </select>
        </ConfigControlRow>
        <ConfigControlRow label="City name font">
          <select
            className="config-input"
            data-testid="pins-pin-city-name-font-select"
            value={config.pins.presentation.pinCityNameFontAssetId ?? ""}
            disabled={!wired}
            aria-label="Font for city pin name line"
            onChange={
              wired && updateConfig
                ? (e) => {
                    const v = e.currentTarget.value;
                    updateConfig((draft) => {
                      if (v === "") {
                        delete (draft.pins.presentation as { pinCityNameFontAssetId?: FontAssetId })
                          .pinCityNameFontAssetId;
                      } else {
                        draft.pins.presentation.pinCityNameFontAssetId = v as FontAssetId;
                      }
                    });
                  }
                : undefined
            }
          >
            <option value="">Default (typography role)</option>
            <option value={PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID}>
              {PRODUCT_TEXT_RENDERER_DEFAULT_SELECT_LABEL}
            </option>
            {TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS.map((id) => {
              const rec = defaultFontAssetRegistry.getById(id);
              return rec ? (
                <option key={id} value={id}>
                  {rec.displayName}
                </option>
              ) : null;
            })}
          </select>
        </ConfigControlRow>
        <ConfigControlRow label="Date/time font">
          <select
            className="config-input"
            data-testid="pins-pin-datetime-font-select"
            value={config.pins.presentation.pinDateTimeFontAssetId ?? ""}
            disabled={!wired}
            aria-label="Font for city pin date and time line"
            onChange={
              wired && updateConfig
                ? (e) => {
                    const v = e.currentTarget.value;
                    updateConfig((draft) => {
                      if (v === "") {
                        delete (draft.pins.presentation as { pinDateTimeFontAssetId?: FontAssetId })
                          .pinDateTimeFontAssetId;
                      } else {
                        draft.pins.presentation.pinDateTimeFontAssetId = v as FontAssetId;
                      }
                    });
                  }
                : undefined
            }
          >
            <option value="">Default (typography role)</option>
            <option value={PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID}>
              {PRODUCT_TEXT_RENDERER_DEFAULT_SELECT_LABEL}
            </option>
            {TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS.map((id) => {
              const rec = defaultFontAssetRegistry.getById(id);
              return rec ? (
                <option key={id} value={id}>
                  {rec.displayName}
                </option>
              ) : null;
            })}
          </select>
        </ConfigControlRow>
        <ConfigControlRow label="Date/time display">
          <select
            className="config-input"
            data-testid="pins-pin-datetime-display-mode-select"
            value={config.pins.presentation.pinDateTimeDisplayMode}
            disabled={!wired}
            aria-label="Format for city pin date and time line"
            onChange={
              wired && updateConfig
                ? (e) => {
                    const pinDateTimeDisplayMode = e.currentTarget.value as PinDateTimeDisplayMode;
                    updateConfig((draft) => {
                      draft.pins.presentation.pinDateTimeDisplayMode = pinDateTimeDisplayMode;
                    });
                  }
                : undefined
            }
          >
            {PIN_DATE_TIME_DISPLAY_MODES.map((m) => (
              <option key={m} value={m}>
                {labelForPinDateTimeDisplayMode(m)}
              </option>
            ))}
          </select>
        </ConfigControlRow>
      </section>
    </div>
  );
}
