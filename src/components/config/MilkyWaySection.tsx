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
import type { LayerEnableFlags } from "../../config/appConfig";
import {
  applyLayerEnableFlagsToScene,
  applyMilkyWayPresentationToScene,
  buildDefaultSceneConfigFromLayerFlags,
  deriveLayerEnableFlagsFromScene,
  milkyWayPresentationFromScene,
} from "../../config/v2/sceneConfig";
import { ASTRONOMY_PATH_THICKNESS_IDS } from "../../core/astronomyOverlayStrokeAppearance";
import {
  isPlanetaryEphemerisSupportedUtc,
} from "../../core/planetaryEphemeris";
import { MILKY_WAY_UNAVAILABLE_COPY } from "../../core/milkyWayGalactic";
import {
  MILKY_WAY_BAND_WIDTH_IDS,
  milkyWayBandWidthLabel,
  type MilkyWayBandWidthId,
  type MilkyWayPresentationPatch,
} from "../../core/milkyWayPresentation";
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

function thicknessLabel(id: string): string {
  return id[0]!.toUpperCase() + id.slice(1);
}

export function MilkyWaySection(props: {
  config: LibrationConfigV2;
  updateConfig?: UpdateConfig;
  productInstantMs?: number;
}): ReactElement {
  const { config, updateConfig, productInstantMs } = props;
  const mutable = Boolean(updateConfig);
  const scene = config.scene ?? buildDefaultSceneConfigFromLayerFlags(config.layers);
  const pres = milkyWayPresentationFromScene(scene);
  const masterOn = config.layers.milkyWay;
  const childOff = !masterOn;
  const unsupported =
    productInstantMs !== undefined && !isPlanetaryEphemerisSupportedUtc(productInstantMs);

  const apply = (patch: MilkyWayPresentationPatch): void => {
    patchScene(updateConfig, (base) => applyMilkyWayPresentationToScene(base, patch));
  };

  const setMaster = (checked: boolean): void => {
    if (!updateConfig) {
      return;
    }
    updateConfig((draft) => {
      const next: LayerEnableFlags = { ...draft.layers, milkyWay: checked };
      const baseScene = draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
      const nextScene = applyLayerEnableFlagsToScene(baseScene, next);
      draft.scene = nextScene;
      draft.layers = deriveLayerEnableFlagsFromScene(nextScene);
    });
  };

  return (
    <>
      <h3 className="config-section__title config-section__title--sub">Milky Way</h3>
      <p className="config-section__hint">
        The Milky Way ribbon shows where directions along the Galactic plane and its approximate
        bright band are directly overhead at the selected time. Much larger areas of Earth can see
        portions of the Milky Way above their horizons.
      </p>
      {unsupported ? (
        <p className="config-section__hint" role="status">
          {MILKY_WAY_UNAVAILABLE_COPY}
        </p>
      ) : null}

      <ConfigControlRow label="Show Milky Way">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={masterOn}
          readOnly={!mutable}
          disabled={!mutable}
          tabIndex={mutable ? 0 : -1}
          aria-label="Show Milky Way"
          title="Zenith projection of the Galactic plane and approximate band. Not naked-eye visibility."
          onChange={
            mutable
              ? (e) => {
                  setMaster(e.currentTarget.checked);
                }
              : undefined
          }
        />
      </ConfigControlRow>

      <p className="config-section__hint">Structure</p>
      <ConfigControlRow label="Show Galactic plane">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.planeEnabled}
          readOnly={!mutable}
          disabled={!mutable || childOff}
          tabIndex={mutable && !childOff ? 0 : -1}
          aria-label="Show Galactic plane"
          title="IAU Galactic latitude b = 0°, projected to where that direction is overhead."
          onChange={
            mutable
              ? (e) => {
                  apply({ planeEnabled: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Show Milky Way band">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.bandEnabled}
          readOnly={!mutable}
          disabled={!mutable || childOff}
          tabIndex={mutable && !childOff ? 0 : -1}
          aria-label="Show Milky Way band"
          title="Approximate celestial envelope around the Galactic plane. Not a photometric model."
          onChange={
            mutable
              ? (e) => {
                  apply({ bandEnabled: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Band width">
        <select
          className="config-input"
          disabled={!mutable || childOff || !pres.bandEnabled}
          aria-label="Band width"
          title="Conservative Galactic-latitude half-width of the approximate band."
          value={pres.bandWidth}
          onChange={
            mutable
              ? (e) => {
                  apply({ bandWidth: e.currentTarget.value as MilkyWayBandWidthId });
                }
              : undefined
          }
        >
          {MILKY_WAY_BAND_WIDTH_IDS.map((id) => (
            <option key={id} value={id}>
              {milkyWayBandWidthLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>
      <ConfigControlRow label="Show band ribs">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.ribsEnabled}
          readOnly={!mutable}
          disabled={!mutable || childOff || !pres.bandEnabled}
          tabIndex={mutable && !childOff && pres.bandEnabled ? 0 : -1}
          aria-label="Show band ribs"
          title="Sparse cross-connectors that communicate band width and orientation."
          onChange={
            mutable
              ? (e) => {
                  apply({ ribsEnabled: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>

      <p className="config-section__hint">Appearance</p>
      <ConfigControlRow label="Galactic plane color">
        <input
          type="color"
          className="config-input"
          disabled={!mutable || childOff}
          aria-label="Galactic plane color"
          title="Stroke color of the Galactic plane centerline."
          value={pres.planeColor}
          onChange={
            mutable
              ? (e) => {
                  apply({ planeColor: e.currentTarget.value });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Band color">
        <input
          type="color"
          className="config-input"
          disabled={!mutable || childOff}
          aria-label="Band color"
          title="Stroke color of band edges and ribs."
          value={pres.bandColor}
          onChange={
            mutable
              ? (e) => {
                  apply({ bandColor: e.currentTarget.value });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Plane thickness">
        <select
          className="config-input"
          disabled={!mutable || childOff}
          aria-label="Plane thickness"
          title="Stroke thickness of the Galactic plane."
          value={pres.planeThickness}
          onChange={
            mutable
              ? (e) => {
                  apply({
                    planeThickness: e.currentTarget.value as (typeof ASTRONOMY_PATH_THICKNESS_IDS)[number],
                  });
                }
              : undefined
          }
        >
          {ASTRONOMY_PATH_THICKNESS_IDS.map((id) => (
            <option key={id} value={id}>
              {thicknessLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>
      <ConfigControlRow label="Band thickness">
        <select
          className="config-input"
          disabled={!mutable || childOff}
          aria-label="Band thickness"
          title="Stroke thickness of band edges and ribs."
          value={pres.bandThickness}
          onChange={
            mutable
              ? (e) => {
                  apply({
                    bandThickness: e.currentTarget.value as (typeof ASTRONOMY_PATH_THICKNESS_IDS)[number],
                  });
                }
              : undefined
          }
        >
          {ASTRONOMY_PATH_THICKNESS_IDS.map((id) => (
            <option key={id} value={id}>
              {thicknessLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>

      <p className="config-section__hint">Landmarks</p>
      <ConfigControlRow label="Show Galactic center">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.galacticCenterEnabled}
          readOnly={!mutable}
          disabled={!mutable || childOff}
          tabIndex={mutable && !childOff ? 0 : -1}
          aria-label="Show Galactic center"
          title="Terrestrial subpoint where the Galactic center (l = 0°, b = 0°) is at zenith."
          onChange={
            mutable
              ? (e) => {
                  apply({ galacticCenterEnabled: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Show Galactic center label">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.galacticCenterLabelEnabled}
          readOnly={!mutable}
          disabled={!mutable || childOff || !pres.galacticCenterEnabled}
          tabIndex={mutable && !childOff && pres.galacticCenterEnabled ? 0 : -1}
          aria-label="Show Galactic center label"
          title="Map label for the Galactic center zenith subpoint."
          onChange={
            mutable
              ? (e) => {
                  apply({ galacticCenterLabelEnabled: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Show Galactic anticenter">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.galacticAnticenterEnabled}
          readOnly={!mutable}
          disabled={!mutable || childOff}
          tabIndex={mutable && !childOff ? 0 : -1}
          aria-label="Show Galactic anticenter"
          title="Optional quieter marker where the Galactic anticenter (l = 180°, b = 0°) is at zenith."
          onChange={
            mutable
              ? (e) => {
                  apply({ galacticAnticenterEnabled: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>

      <p className="config-section__hint">Context</p>
      <ConfigControlRow label="Emphasize night-side portion">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.emphasizeNightSide}
          readOnly={!mutable}
          disabled={!mutable || childOff}
          tabIndex={mutable && !childOff ? 0 : -1}
          aria-label="Emphasize night-side portion"
          title="Emphasize portions currently over Earth's night side. Not an observing-quality forecast."
          onChange={
            mutable
              ? (e) => {
                  apply({ emphasizeNightSide: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <p className="config-section__hint">
        Brighter segments indicate portions of the overhead projection currently on Earth’s night
        side; this is not an observing-quality forecast.
      </p>
    </>
  );
}
