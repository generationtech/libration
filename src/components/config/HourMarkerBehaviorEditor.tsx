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
  );
}
