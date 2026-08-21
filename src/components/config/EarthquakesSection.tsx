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

import type { ReactElement } from "react";
import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import {
  applyEarthquakePresentationToScene,
  buildDefaultSceneConfigFromLayerFlags,
  deriveLayerEnableFlagsFromScene,
  earthquakePresentationFromScene,
} from "../../config/v2/sceneConfig";
import {
  EARTHQUAKE_LABEL_MIN_MAGNITUDE_IDS,
  EARTHQUAKE_MAX_AGE_IDS,
  EARTHQUAKE_MIN_MAGNITUDE_IDS,
  earthquakeLabelMinMagnitudeLabel,
  earthquakeMaxAgeLabel,
  earthquakeMinMagnitudeLabel,
  type EarthquakeLabelMinMagnitudeId,
  type EarthquakeMaxAgeId,
  type EarthquakeMinMagnitudeId,
  type EarthquakePresentation,
} from "../../core/earthquakePresentation";
import {
  earthquakeConfigStatusHintCopy,
  type EarthquakeConfigStatusHint,
  type EarthquakeProvenance,
} from "../../lifecycle/earthquakeProvenance";
import { ConfigControlRow } from "./ConfigControlRow";

type UpdateConfig = (updater: (draft: LibrationConfigV2) => void) => void;

function patchScene(
  updateConfig: UpdateConfig | undefined,
  mutate: (scene: NonNullable<LibrationConfigV2["scene"]>) => NonNullable<LibrationConfigV2["scene"]>,
): void {
  if (!updateConfig) {
    return;
  }
  updateConfig((draft) => {
    const baseScene = draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
    draft.scene = mutate(baseScene);
    draft.layers = deriveLayerEnableFlagsFromScene(draft.scene);
  });
}

export function EarthquakesSection(props: {
  config: LibrationConfigV2;
  updateConfig?: UpdateConfig;
  earthquakeConfigStatusHint?: EarthquakeConfigStatusHint | null;
  earthquakeProvenance?: EarthquakeProvenance | null;
  productTimeLiveEnough?: boolean;
}): ReactElement {
  const {
    config,
    updateConfig,
    earthquakeConfigStatusHint,
    earthquakeProvenance,
    productTimeLiveEnough,
  } = props;
  const mutable = Boolean(updateConfig);
  const scene = config.scene ?? buildDefaultSceneConfigFromLayerFlags(config.layers);
  const pres = earthquakePresentationFromScene(scene);

  const apply = (patch: Partial<EarthquakePresentation>): void => {
    patchScene(updateConfig, (base) => applyEarthquakePresentationToScene(base, patch));
  };

  const statusText =
    earthquakeConfigStatusHint !== undefined && earthquakeConfigStatusHint !== null
      ? earthquakeConfigStatusHintCopy(earthquakeConfigStatusHint, earthquakeProvenance ?? null)
      : null;

  return (
    <>
      <h3 className="config-section__title config-section__title--sub">Data</h3>
      <ConfigControlRow label="Minimum magnitude">
        <select
          className="config-input"
          disabled={!mutable}
          aria-label="Minimum magnitude"
          title="Hide earthquakes smaller than this magnitude. Applied locally to the already-fetched USGS all-day feed."
          value={pres.minMagnitude}
          onChange={
            mutable
              ? (e) => {
                  apply({
                    minMagnitude: e.currentTarget.value as EarthquakeMinMagnitudeId,
                  });
                }
              : undefined
          }
        >
          {EARTHQUAKE_MIN_MAGNITUDE_IDS.map((id) => (
            <option key={id} value={id}>
              {earthquakeMinMagnitudeLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>
      <ConfigControlRow label="Maximum age">
        <select
          className="config-input"
          disabled={!mutable}
          aria-label="Maximum age"
          title="Hide earthquakes older than this relative to current product time. Applied locally; no refetch."
          value={pres.maxAge}
          onChange={
            mutable
              ? (e) => {
                  apply({ maxAge: e.currentTarget.value as EarthquakeMaxAgeId });
                }
              : undefined
          }
        >
          {EARTHQUAKE_MAX_AGE_IDS.map((id) => (
            <option key={id} value={id}>
              {earthquakeMaxAgeLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>
      <ConfigControlRow label="Earthquakes only">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.earthquakesOnly}
          readOnly={!mutable}
          disabled={!mutable}
          tabIndex={mutable ? 0 : -1}
          aria-label="Earthquakes only"
          title="Exclude quarry blasts, explosions, and other non-earthquake USGS event types."
          onChange={
            mutable
              ? (e) => {
                  apply({ earthquakesOnly: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <h3 className="config-section__title config-section__title--sub">Labels</h3>
      <ConfigControlRow label="Show labels">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.showLabels}
          readOnly={!mutable}
          disabled={!mutable}
          tabIndex={mutable ? 0 : -1}
          aria-label="Show earthquake labels"
          title="Draw text labels next to eligible earthquake markers. Markers stay visible when labels are off."
          onChange={
            mutable
              ? (e) => {
                  apply({ showLabels: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Label minimum magnitude">
        <select
          className="config-input"
          disabled={!mutable || !pres.showLabels}
          aria-label="Label minimum magnitude"
          title="Only label earthquakes at or above this magnitude. Does not hide markers."
          value={pres.labelMinMagnitude}
          onChange={
            mutable
              ? (e) => {
                  apply({
                    labelMinMagnitude: e.currentTarget
                      .value as EarthquakeLabelMinMagnitudeId,
                  });
                }
              : undefined
          }
        >
          {EARTHQUAKE_LABEL_MIN_MAGNITUDE_IDS.map((id) => (
            <option key={id} value={id}>
              {earthquakeLabelMinMagnitudeLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>
      <h3 className="config-section__title config-section__title--sub">Status</h3>
      {statusText !== null ? (
        <p className="config-section__hint" data-testid="earthquake-topic-status">
          {statusText}
        </p>
      ) : config.layers.earthquakes && productTimeLiveEnough === false ? (
        <p className="config-section__hint" data-testid="earthquake-topic-status">
          Live-only data is hidden while viewing another product time.
        </p>
      ) : (
        <p className="config-section__hint" data-testid="earthquake-topic-status">
          Enable Earthquakes under Layer masters to acquire live USGS data.
        </p>
      )}
    </>
  );
}
