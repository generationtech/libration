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

import { useEffect, useState } from "react";
import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import {
  anchorCitySelectOptions,
  CURATED_ANCHOR_REFERENCE_CITY_OPTIONS,
} from "./curatedAnchorReferenceCities";
import {
  CURATED_FIXED_IANA_TIME_ZONES,
  fixedZoneSelectOptions,
  labelForCuratedFixedZone,
} from "./curatedFixedTimeZones";
import {
  PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
  PRODUCT_TEXT_RENDERER_DEFAULT_SELECT_LABEL,
  TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS,
  type TopBandAnchorConfig,
  type TopBandTimeMode,
} from "../../config/appConfig";
import type { FontAssetId } from "../../typography/fontAssetTypes";
import { defaultFontAssetRegistry } from "../../typography/fontAssetRegistry";
import { clampLongitudeDegForAnchor } from "./topBandAnchorClamp";
import { ChromeMajorAreaSelector } from "./ChromeMajorAreaSelector";
import { ConfigControlRow } from "./ConfigControlRow";
import { DEFAULT_CHROME_MAJOR_AREA, type ChromeMajorAreaId } from "./chromeMajorAreaTypes";
import { HourIndicatorsEditor } from "./HourIndicatorsEditor";
import { NatoTimezoneEditor } from "./NatoTimezoneEditor";
import { TickTapeEditor } from "./TickTapeEditor";

const DEFAULT_FIXED_ZONE_WHEN_ENABLING = "UTC";
const TOP_BAND_MODES: readonly TopBandTimeMode[] = ["local12", "local24", "utc24"];

const ANCHOR_MODES: readonly TopBandAnchorConfig["mode"][] = ["auto", "fixedCity", "fixedLongitude"];

const DEFAULT_FIXED_CITY_ID =
  CURATED_ANCHOR_REFERENCE_CITY_OPTIONS.find((c) => c.id === "city.knoxville")?.id ??
  CURATED_ANCHOR_REFERENCE_CITY_OPTIONS[0]!.id;

function defaultAnchorForMode(
  mode: TopBandAnchorConfig["mode"],
  previous: TopBandAnchorConfig,
): TopBandAnchorConfig {
  if (mode === "auto") {
    return { mode: "auto" };
  }
  if (mode === "fixedCity") {
    const cityId =
      previous.mode === "fixedCity" ? previous.cityId : DEFAULT_FIXED_CITY_ID;
    return { mode: "fixedCity", cityId };
  }
  const longitudeDeg =
    previous.mode === "fixedLongitude"
      ? clampLongitudeDegForAnchor(previous.longitudeDeg)
      : 0;
  return { mode: "fixedLongitude", longitudeDeg };
}

export type ChromeTabProps = {
  config: LibrationConfigV2;
  /** When set, wired display-time controls call into the guarded update path. */
  updateConfig?: (updater: (draft: LibrationConfigV2) => void) => void;
};

export function ChromeTab({ config, updateConfig }: ChromeTabProps) {
  const dt = config.chrome.displayTime;
  const lay = config.chrome.layout;
  const wired = Boolean(updateConfig);
  const tz = dt.referenceTimeZone;
  const anchor = dt.topBandAnchor;
  const fixedZoneList =
    tz.source === "fixed" ? fixedZoneSelectOptions(tz.timeZone) : CURATED_FIXED_IANA_TIME_ZONES;

  const [lonDraft, setLonDraft] = useState<string | null>(null);
  const [chromeMajorArea, setChromeMajorArea] = useState<ChromeMajorAreaId>(DEFAULT_CHROME_MAJOR_AREA);

  const anchorResetKey =
    anchor.mode === "auto"
      ? "auto"
      : anchor.mode === "fixedCity"
        ? `city:${anchor.cityId}`
        : `lon:${anchor.longitudeDeg}`;

  useEffect(() => {
    setLonDraft(null);
  }, [anchorResetKey]);

  const cityOptions =
    anchor.mode === "fixedCity"
      ? anchorCitySelectOptions(anchor.cityId)
      : CURATED_ANCHOR_REFERENCE_CITY_OPTIONS;

  return (
    <div className="config-tab-stack">
      <section
        className="config-section"
        aria-labelledby="config-chrome-display-heading"
      >
        <h2 id="config-chrome-display-heading" className="config-section__title">
          Display time
        </h2>
        <p className="config-section__hint">
          Wired: top band mode, reference timezone source, fixed zone when applicable, and top band
          anchor.
        </p>
        <ConfigControlRow label="Top band mode">
          <select
            className="config-input"
            value={dt.topBandMode}
            disabled={!wired}
            aria-label="Top band mode"
            onChange={
              wired && updateConfig
                ? (e) => {
                    const mode = e.currentTarget.value as TopBandTimeMode;
                    updateConfig((draft) => {
                      draft.chrome.displayTime.topBandMode = mode;
                    });
                  }
                : undefined
            }
          >
            {TOP_BAND_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </ConfigControlRow>
        <ConfigControlRow label="Reference timezone source">
          <select
            className="config-input"
            value={tz.source}
            disabled={!wired}
            aria-label="Reference timezone source"
            onChange={
              wired && updateConfig
                ? (e) => {
                    const source = e.currentTarget.value as "system" | "fixed";
                    updateConfig((draft) => {
                      if (source === "system") {
                        draft.chrome.displayTime.referenceTimeZone = { source: "system" };
                      } else {
                        const prev = draft.chrome.displayTime.referenceTimeZone;
                        const zone =
                          prev.source === "fixed"
                            ? prev.timeZone
                            : DEFAULT_FIXED_ZONE_WHEN_ENABLING;
                        draft.chrome.displayTime.referenceTimeZone = {
                          source: "fixed",
                          timeZone: zone,
                        };
                      }
                    });
                  }
                : undefined
            }
          >
            <option value="system">System</option>
            <option value="fixed">Fixed (IANA)</option>
          </select>
        </ConfigControlRow>
        {tz.source === "fixed" ? (
          <ConfigControlRow label="Fixed IANA time zone">
            <select
              className="config-input"
              value={tz.timeZone}
              disabled={!wired}
              aria-label="Fixed IANA time zone"
              onChange={
                wired && updateConfig
                  ? (e) => {
                      const timeZone = e.currentTarget.value;
                      updateConfig((draft) => {
                        draft.chrome.displayTime.referenceTimeZone = {
                          source: "fixed",
                          timeZone,
                        };
                      });
                    }
                  : undefined
              }
            >
              {fixedZoneList.map((z) => (
                <option key={z} value={z}>
                  {labelForCuratedFixedZone(z)}
                </option>
              ))}
            </select>
          </ConfigControlRow>
        ) : null}
        <ConfigControlRow label="Top band anchor mode">
          <select
            className="config-input"
            value={anchor.mode}
            disabled={!wired}
            aria-label="Top band anchor mode"
            onChange={
              wired && updateConfig
                ? (e) => {
                    const mode = e.currentTarget.value as TopBandAnchorConfig["mode"];
                    updateConfig((draft) => {
                      const prev = draft.chrome.displayTime.topBandAnchor;
                      draft.chrome.displayTime.topBandAnchor = defaultAnchorForMode(mode, prev);
                    });
                  }
                : undefined
            }
          >
            {ANCHOR_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </ConfigControlRow>
        {anchor.mode === "fixedCity" ? (
          <ConfigControlRow label="Anchor reference city">
            <select
              className="config-input"
              value={anchor.cityId}
              disabled={!wired}
              aria-label="Top band anchor reference city"
              onChange={
                wired && updateConfig
                  ? (e) => {
                      const cityId = e.currentTarget.value;
                      updateConfig((draft) => {
                        draft.chrome.displayTime.topBandAnchor = {
                          mode: "fixedCity",
                          cityId,
                        };
                      });
                    }
                  : undefined
              }
            >
              {cityOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </ConfigControlRow>
        ) : null}
        {anchor.mode === "fixedLongitude" ? (
          <ConfigControlRow label="Anchor longitude (°)">
            <input
              type="text"
              className="config-input"
              inputMode="decimal"
              disabled={!wired}
              aria-label="Top band anchor longitude in degrees"
              value={lonDraft !== null ? lonDraft : String(anchor.longitudeDeg)}
              onChange={(e) => {
                setLonDraft(e.currentTarget.value);
              }}
              onFocus={
                wired && anchor.mode === "fixedLongitude"
                  ? () => {
                      setLonDraft(String(anchor.longitudeDeg));
                    }
                  : undefined
              }
              onBlur={
                wired && updateConfig
                  ? (e) => {
                      const raw = e.currentTarget.value;
                      setLonDraft(null);
                      const trimmed = raw.trim();
                      if (trimmed === "") {
                        return;
                      }
                      const n = parseFloat(trimmed);
                      if (!Number.isFinite(n)) {
                        return;
                      }
                      const longitudeDeg = clampLongitudeDegForAnchor(n);
                      updateConfig((draft) => {
                        if (draft.chrome.displayTime.topBandAnchor.mode !== "fixedLongitude") {
                          return;
                        }
                        draft.chrome.displayTime.topBandAnchor = {
                          mode: "fixedLongitude",
                          longitudeDeg,
                        };
                      });
                    }
                  : undefined
              }
            />
          </ConfigControlRow>
        ) : null}
      </section>
      <section
        className="config-section"
        aria-labelledby="config-chrome-more-heading"
      >
        <h2 id="config-chrome-more-heading" className="config-section__title">
          Layout chrome
        </h2>
        <p className="config-section__hint">
          Fixed instrument chrome around the map. Choose an area to edit; settings are grouped by where
          they apply on the strip (does not change civil-time or anchor semantics).
        </p>
        <ConfigControlRow label="Bottom time &amp; date readout">
          <input
            type="checkbox"
            className="config-input config-input--checkbox"
            checked={lay.bottomInformationBarVisible}
            readOnly={!wired}
            disabled={!wired}
            tabIndex={wired ? 0 : -1}
            aria-label="Show bottom time and date readout"
            onChange={
              wired && updateConfig
                ? (e) => {
                    const checked = e.currentTarget.checked;
                    updateConfig((draft) => {
                      draft.chrome.layout.bottomInformationBarVisible = checked;
                    });
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Bottom readout font">
          <select
            className="config-input"
            data-testid="chrome-bottom-readout-font-select"
            value={lay.bottomReadoutFontAssetId ?? ""}
            disabled={!wired}
            aria-label="Font for lower-left bottom time and date readout"
            onChange={
              wired && updateConfig
                ? (e) => {
                    const v = e.currentTarget.value;
                    updateConfig((draft) => {
                      if (v === "") {
                        delete (draft.chrome.layout as { bottomReadoutFontAssetId?: FontAssetId })
                          .bottomReadoutFontAssetId;
                      } else {
                        draft.chrome.layout.bottomReadoutFontAssetId = v as FontAssetId;
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
        <ConfigControlRow label="Default font for product text">
          <select
            className="config-input"
            data-testid="chrome-global-text-font-select"
            disabled={!wired}
            aria-label="Global default font for instrument text, map labels, and configuration panel"
            value={lay.defaultTextFontAssetId ?? PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID}
            onChange={
              wired && updateConfig
                ? (e) => {
                    const v = e.currentTarget.value as FontAssetId;
                    updateConfig((draft) => {
                      if (v === PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID) {
                        delete (draft.chrome.layout as { defaultTextFontAssetId?: FontAssetId })
                          .defaultTextFontAssetId;
                      } else {
                        draft.chrome.layout.defaultTextFontAssetId = v;
                      }
                    });
                  }
                : undefined
            }
          >
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
        <ChromeMajorAreaSelector value={chromeMajorArea} onChange={setChromeMajorArea} />
        {chromeMajorArea === "hourIndicators" ? (
          <HourIndicatorsEditor config={config} updateConfig={updateConfig} />
        ) : null}
        {chromeMajorArea === "tickTape" ? (
          <TickTapeEditor config={config} updateConfig={updateConfig} />
        ) : null}
        {chromeMajorArea === "natoTimezone" ? (
          <NatoTimezoneEditor config={config} updateConfig={updateConfig} />
        ) : null}
      </section>
    </div>
  );
}
