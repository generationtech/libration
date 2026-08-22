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
  applyCloudsLayerOpacityToScene,
  buildDefaultSceneConfigFromLayerFlags,
  cloudsLayerOpacityFromScene,
  deriveLayerEnableFlagsFromScene,
  DEFAULT_CLOUDS_LAYER_OPACITY,
} from "../../config/v2/sceneConfig";
import {
  cloudsConfigStatusHintCopy,
  cloudsComponentObservationLines,
  type CloudsConfigStatusHint,
  type CloudsProvenance,
} from "../../lifecycle/cloudProvenance";
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

export function WeatherSection(props: {
  config: LibrationConfigV2;
  updateConfig?: UpdateConfig;
  cloudsConfigStatusHint?: CloudsConfigStatusHint | null;
  cloudsProvenance?: CloudsProvenance | null;
  productTimeLiveEnough?: boolean;
}): ReactElement {
  const {
    config,
    updateConfig,
    cloudsConfigStatusHint,
    cloudsProvenance,
    productTimeLiveEnough,
  } = props;
  const mutable = Boolean(updateConfig);
  const scene = config.scene ?? buildDefaultSceneConfigFromLayerFlags(config.layers);
  const opacity = cloudsLayerOpacityFromScene(scene);

  const statusText =
    cloudsConfigStatusHint !== undefined && cloudsConfigStatusHint !== null
      ? cloudsConfigStatusHintCopy(cloudsConfigStatusHint, cloudsProvenance ?? null)
      : null;
  const componentLines =
    cloudsProvenance != null ? cloudsComponentObservationLines(cloudsProvenance) : [];

  return (
    <>
      <h3 className="config-section__title config-section__title--sub">Clouds</h3>
      <ConfigControlRow label="Cloud opacity">
        <div className="config-tab-stack" style={{ gap: "0.35rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
              width: "100%",
            }}
          >
            <input
              type="range"
              className="config-input"
              min={0}
              max={1}
              step={0.05}
              disabled={!mutable}
              aria-label="Cloud opacity"
              title="User opacity multiplies the IR-derived cloud-highlight alpha. Does not persist observation time."
              value={opacity}
              onChange={
                mutable
                  ? (e) => {
                      patchScene(updateConfig, (base) =>
                        applyCloudsLayerOpacityToScene(base, Number(e.currentTarget.value)),
                      );
                    }
                  : undefined
              }
            />
            <span className="config-section__hint" style={{ margin: 0 }}>
              {opacity.toFixed(2)}
            </span>
          </div>
          <button
            type="button"
            className="config-input"
            disabled={!mutable}
            title="Reset Cloud opacity to the factory value."
            onClick={
              mutable
                ? () => {
                    patchScene(updateConfig, (base) =>
                      applyCloudsLayerOpacityToScene(base, DEFAULT_CLOUDS_LAYER_OPACITY),
                    );
                  }
                : undefined
            }
          >
            Reset cloud opacity
          </button>
        </div>
      </ConfigControlRow>
      <h3 className="config-section__title config-section__title--sub">Status</h3>
      {statusText !== null ? (
        <p className="config-section__hint" data-testid="clouds-topic-status">
          {statusText}
        </p>
      ) : config.layers.globalCloudsIr && productTimeLiveEnough === false ? (
        <p className="config-section__hint" data-testid="clouds-topic-status">
          Live-only data is hidden while viewing another product time.
        </p>
      ) : (
        <p className="config-section__hint" data-testid="clouds-topic-status">
          Enable Clouds under Layer masters to acquire a best-current satellite
          mosaic. Polar gaps stay transparent. Observation times may differ by
          sector.
        </p>
      )}
      {componentLines.length > 1 ? (
        <details data-testid="clouds-observation-components">
          <summary className="config-section__hint">Observation times</summary>
          {componentLines.map((line) => (
            <p key={line} className="config-section__hint" style={{ margin: "0.15rem 0 0" }}>
              {line}
            </p>
          ))}
        </details>
      ) : null}
      <p className="config-section__hint">
        Contains modified EUMETSAT Meteosat FES IR 10.8 µm and Geostationary Ring
        IR 10.8 µm data. NASA GIBS GOES-East, GOES-West, and Himawari Band 13.
      </p>
    </>
  );
}
