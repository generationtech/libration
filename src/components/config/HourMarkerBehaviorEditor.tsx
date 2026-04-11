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
} from "../../config/appConfig";
import { defaultBehaviorFor } from "../../config/topBandHourMarkersResolver";
import type { EffectiveTopBandHourMarkerBehavior, HourMarkersConfig } from "../../config/topBandHourMarkersTypes";
import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import { ConfigControlRow } from "./ConfigControlRow";

const HOUR_MARKER_BEHAVIOR_OPTIONS: readonly EffectiveTopBandHourMarkerBehavior[] = [
  "tapeAdvected",
  "staticZoneAnchored",
];

export type HourMarkerBehaviorEditorProps = {
  hourMarkers: HourMarkersConfig;
  wired: boolean;
  updateConfig?: (updater: (draft: LibrationConfigV2) => void) => void;
};

function commitHourMarkers(
  updateConfig: HourMarkerBehaviorEditorProps["updateConfig"],
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

export function HourMarkerBehaviorEditor({ hourMarkers, wired, updateConfig }: HourMarkerBehaviorEditorProps) {
  const selectValue = hourMarkers.behavior ?? defaultBehaviorFor(hourMarkers.realization.kind);
  return (
    <>
      <ConfigControlRow label="Custom top-band hour marker style">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={hourMarkers.customRepresentationEnabled}
          readOnly={!wired}
          disabled={!wired}
          tabIndex={wired ? 0 : -1}
          aria-label="Use custom font or glyph style for top-band 24 hour markers"
          onChange={
            wired && updateConfig
              ? (e) => {
                  const checked = e.currentTarget.checked;
                  commitHourMarkers(updateConfig, (hm) => {
                    if (!checked) {
                      return {
                        customRepresentationEnabled: false,
                        realization: {
                          kind: "text",
                          fontAssetId: DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
                          appearance: {},
                        },
                        layout: { sizeMultiplier: hm.layout.sizeMultiplier },
                      };
                    }
                    return {
                      ...hm,
                      customRepresentationEnabled: true,
                    };
                  });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      {hourMarkers.customRepresentationEnabled ? (
        <ConfigControlRow label="Hour marker behavior">
          <select
            className="config-input"
            value={selectValue}
            disabled={!wired}
            aria-label="Top-band hour marker placement behavior"
            onChange={
              wired && updateConfig
                ? (e) => {
                    const v = e.currentTarget.value as EffectiveTopBandHourMarkerBehavior;
                    commitHourMarkers(updateConfig, (hm) => ({
                      ...hm,
                      behavior: v,
                    }));
                  }
                : undefined
            }
          >
            {HOUR_MARKER_BEHAVIOR_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </ConfigControlRow>
      ) : null}
    </>
  );
}
