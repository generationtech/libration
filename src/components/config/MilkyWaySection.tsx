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

import { useMemo, type ReactElement } from "react";
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
import { displayTimeModeFromTopBandTimeMode } from "../../core/displayTimeMode";
import {
  isPlanetaryEphemerisSupportedUtc,
} from "../../core/planetaryEphemeris";
import { MILKY_WAY_UNAVAILABLE_COPY } from "../../core/milkyWayGalactic";
import {
  MILKY_WAY_BAND_WIDTH_IDS,
  milkyWayBandWidthLabel,
  milkyWayEventLabelHorizonLabel,
  MILKY_WAY_EVENT_LABEL_HORIZON_IDS,
  type MilkyWayBandWidthId,
  type MilkyWayEventLabelHorizonId,
  type MilkyWayPresentationPatch,
} from "../../core/milkyWayPresentation";
import {
  formatMilkyWayViewingActiveLines,
  milkyWayViewingFeasibilityCopy,
  MILKY_WAY_VIEWING_FOOTPRINT_HONEST_COPY,
  MILKY_WAY_VIEWING_WINDOW_HONEST_COPY,
  resolveMilkyWayViewingStatus,
} from "../../core/milkyWayViewingStatus";
import {
  listMilkyWayViewingWindows,
  milkyWayViewingConditionsAt,
} from "../../core/milkyWayViewingWindows";
import { resolveReferenceCityObserverLocation } from "../../core/referenceCityObserver";
import { REFERENCE_CITIES } from "../../data/referenceCities";
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

  const observer = resolveReferenceCityObserverLocation(config.chrome.displayTime);
  const city = observer
    ? (REFERENCE_CITIES.find((c) => c.id === observer.cityId) ?? null)
    : null;
  const displayTimeMode = displayTimeModeFromTopBandTimeMode(
    config.chrome.displayTime.topBandMode,
  );
  const dayBucket =
    productInstantMs !== undefined ? Math.floor(productInstantMs / 86_400_000) : null;
  const viewingSearch = useMemo(() => {
    if (!pres.viewingEventsEnabled || !observer || productInstantMs === undefined || dayBucket === null) {
      return null;
    }
    const startUtcMs = dayBucket * 86_400_000 - 86_400_000;
    const endUtcMs = startUtcMs + 46 * 86_400_000;
    return listMilkyWayViewingWindows({
      observer,
      startUtcMs,
      endUtcMs,
    });
  }, [
    pres.viewingEventsEnabled,
    observer?.cityId,
    observer?.latitudeDeg,
    observer?.longitudeDeg,
    dayBucket,
    productInstantMs === undefined,
  ]);
  const viewingStatus =
    viewingSearch && productInstantMs !== undefined
      ? resolveMilkyWayViewingStatus(viewingSearch.windows, productInstantMs)
      : null;
  const instant =
    pres.viewingEventsEnabled && observer && productInstantMs !== undefined
      ? milkyWayViewingConditionsAt(productInstantMs, observer)
      : null;

  return (
    <>
      <h3 className="config-section__title config-section__title--sub">Milky Way</h3>
      <p className="config-section__hint">
        The Milky Way ribbon shows where directions along the Galactic plane and its approximate
        bright band are directly overhead at the selected time. Galactic-center altitude contours
        show how high the bright central Milky Way is above the geometric horizon from each
        location. Much larger areas of Earth can see portions of the Milky Way above their
        horizons.
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

      <p className="config-section__hint">Reference geometry</p>
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

      <p className="config-section__hint">Visibility</p>
      <p className="config-section__hint">
        Contours show the Galactic center’s altitude above the geometric horizon. They are not a
        brightness, seeing, or light-pollution score.
      </p>
      <ConfigControlRow label="Show Galactic-center altitude contours">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.visibilityContoursEnabled}
          readOnly={!mutable}
          disabled={!mutable || childOff}
          tabIndex={mutable && !childOff ? 0 : -1}
          aria-label="Show Galactic-center altitude contours"
          title="Small circles of constant Galactic-center altitude around the current zenith subpoint."
          onChange={
            mutable
              ? (e) => {
                  apply({ visibilityContoursEnabled: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Show contour values">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.showVisibilityContourLabels}
          readOnly={!mutable}
          disabled={!mutable || childOff || !pres.visibilityContoursEnabled}
          tabIndex={mutable && !childOff && pres.visibilityContoursEnabled ? 0 : -1}
          aria-label="Show contour values"
          title="Numeric altitude labels on Galactic-center contours. Lines stay visible when this is off."
          onChange={
            mutable
              ? (e) => {
                  apply({ showVisibilityContourLabels: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Show 30° contour">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.contour30Enabled}
          readOnly={!mutable}
          disabled={!mutable || childOff || !pres.visibilityContoursEnabled}
          tabIndex={mutable && !childOff && pres.visibilityContoursEnabled ? 0 : -1}
          aria-label="Show 30° contour"
          title="Locations where the Galactic center is 30° above the geometric horizon."
          onChange={
            mutable
              ? (e) => {
                  apply({ contour30Enabled: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Show 45° contour">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.contour45Enabled}
          readOnly={!mutable}
          disabled={!mutable || childOff || !pres.visibilityContoursEnabled}
          tabIndex={mutable && !childOff && pres.visibilityContoursEnabled ? 0 : -1}
          aria-label="Show 45° contour"
          title="Locations where the Galactic center is 45° above the geometric horizon."
          onChange={
            mutable
              ? (e) => {
                  apply({ contour45Enabled: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Show 60° contour">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.contour60Enabled}
          readOnly={!mutable}
          disabled={!mutable || childOff || !pres.visibilityContoursEnabled}
          tabIndex={mutable && !childOff && pres.visibilityContoursEnabled ? 0 : -1}
          aria-label="Show 60° contour"
          title="Locations where the Galactic center is 60° above the geometric horizon."
          onChange={
            mutable
              ? (e) => {
                  apply({ contour60Enabled: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Show 75° contour">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.contour75Enabled}
          readOnly={!mutable}
          disabled={!mutable || childOff || !pres.visibilityContoursEnabled}
          tabIndex={mutable && !childOff && pres.visibilityContoursEnabled ? 0 : -1}
          aria-label="Show 75° contour"
          title="Locations where the Galactic center is 75° above the geometric horizon."
          onChange={
            mutable
              ? (e) => {
                  apply({ contour75Enabled: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Show horizon / 0°">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.contour0Enabled}
          readOnly={!mutable}
          disabled={!mutable || childOff || !pres.visibilityContoursEnabled}
          tabIndex={mutable && !childOff && pres.visibilityContoursEnabled ? 0 : -1}
          aria-label="Show horizon / 0°"
          title="Geometric horizon for the Galactic center. Off by default to reduce clutter."
          onChange={
            mutable
              ? (e) => {
                  apply({ contour0Enabled: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Emphasize astronomical night">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.emphasizeAstronomicalNight}
          readOnly={!mutable}
          disabled={!mutable || childOff || !pres.visibilityContoursEnabled}
          tabIndex={mutable && !childOff && pres.visibilityContoursEnabled ? 0 : -1}
          aria-label="Emphasize astronomical night"
          title="Stronger segments indicate astronomical darkness (Sun ≤ −18°). Not a visibility forecast."
          onChange={
            mutable
              ? (e) => {
                  apply({ emphasizeAstronomicalNight: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <p className="config-section__hint">
        Stronger segments indicate astronomical darkness (Sun ≤ −18°).
      </p>
      <ConfigControlRow label="De-emphasize moonlight">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.deemphasizeMoonlight}
          readOnly={!mutable}
          disabled={!mutable || childOff || !pres.visibilityContoursEnabled}
          tabIndex={mutable && !childOff && pres.visibilityContoursEnabled ? 0 : -1}
          aria-label="De-emphasize moonlight"
          title="Moonlit segments are quieter using the existing moonlight model. Geometry is not removed."
          onChange={
            mutable
              ? (e) => {
                  apply({ deemphasizeMoonlight: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <p className="config-section__hint">
        Moonlit segments are de-emphasized using the existing moonlight model.
      </p>
      <ConfigControlRow label="Visibility color">
        <input
          type="color"
          className="config-input"
          disabled={!mutable || childOff || !pres.visibilityContoursEnabled}
          aria-label="Visibility color"
          title="Stroke color of Galactic-center altitude contours."
          value={pres.visibilityColor}
          onChange={
            mutable
              ? (e) => {
                  apply({ visibilityColor: e.currentTarget.value });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Visibility thickness">
        <select
          className="config-input"
          disabled={!mutable || childOff || !pres.visibilityContoursEnabled}
          aria-label="Visibility thickness"
          title="Stroke thickness of Galactic-center altitude contours."
          value={pres.visibilityThickness}
          onChange={
            mutable
              ? (e) => {
                  apply({
                    visibilityThickness: e.currentTarget
                      .value as (typeof ASTRONOMY_PATH_THICKNESS_IDS)[number],
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

      <p className="config-section__hint">Viewing events</p>
      <p className="config-section__hint">{MILKY_WAY_VIEWING_WINDOW_HONEST_COPY}</p>
      <ConfigControlRow label="Enable Milky Way viewing events">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.viewingEventsEnabled}
          readOnly={!mutable}
          disabled={!mutable}
          tabIndex={mutable ? 0 : -1}
          aria-label="Enable Milky Way viewing events"
          title="Compute reference-city Milky Way viewing windows. Does not enable the ribbon or contours."
          onChange={
            mutable
              ? (e) => {
                  apply({ viewingEventsEnabled: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Show viewing-event labels">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.showViewingEventLabels}
          readOnly={!mutable}
          disabled={!mutable || !pres.viewingEventsEnabled}
          tabIndex={mutable && pres.viewingEventsEnabled ? 0 : -1}
          aria-label="Show viewing-event labels"
          title="Upcoming and active map labels near the Galactic-center subpoint. Independent of ribbon and contours."
          onChange={
            mutable
              ? (e) => {
                  apply({ showViewingEventLabels: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Show viewing footprint">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.showViewingFootprint}
          readOnly={!mutable}
          disabled={!mutable || !pres.viewingEventsEnabled}
          tabIndex={mutable && pres.viewingEventsEnabled ? 0 : -1}
          aria-label="Show viewing footprint"
          title={MILKY_WAY_VIEWING_FOOTPRINT_HONEST_COPY}
          onChange={
            mutable
              ? (e) => {
                  apply({ showViewingFootprint: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Viewing footprint color">
        <input
          type="color"
          className="config-input"
          disabled={!mutable || !pres.viewingEventsEnabled || !pres.showViewingFootprint}
          aria-label="Viewing footprint color"
          value={pres.viewingFootprintColor}
          onChange={
            mutable
              ? (e) => {
                  apply({ viewingFootprintColor: e.currentTarget.value });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Viewing footprint thickness">
        <select
          className="config-input"
          disabled={!mutable || !pres.viewingEventsEnabled || !pres.showViewingFootprint}
          aria-label="Viewing footprint thickness"
          value={pres.viewingFootprintThickness}
          onChange={
            mutable
              ? (e) => {
                  apply({
                    viewingFootprintThickness: e.currentTarget
                      .value as (typeof ASTRONOMY_PATH_THICKNESS_IDS)[number],
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
      <ConfigControlRow label="Event label advance notice">
        <select
          className="config-input"
          disabled={
            !mutable ||
            !pres.viewingEventsEnabled ||
            !(pres.showViewingEventLabels || pres.showViewingFootprint)
          }
          aria-label="Event label advance notice"
          title="How far ahead of a selected window the upcoming map label and footprint appear."
          value={pres.eventLabelAdvanceHorizonId}
          onChange={
            mutable
              ? (e) => {
                  apply({
                    eventLabelAdvanceHorizonId: e.currentTarget.value as MilkyWayEventLabelHorizonId,
                  });
                }
              : undefined
          }
        >
          {MILKY_WAY_EVENT_LABEL_HORIZON_IDS.map((id) => (
            <option key={id} value={id}>
              {milkyWayEventLabelHorizonLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>
      {pres.viewingEventsEnabled ? (
        <div role="status">
          {!observer ? (
            <p className="config-section__hint">
              Select a reference city to evaluate Milky Way viewing windows.
            </p>
          ) : viewingSearch?.feasibility && viewingSearch.feasibility !== "ok" ? (
            <p className="config-section__hint">
              {milkyWayViewingFeasibilityCopy(viewingSearch.feasibility)}
            </p>
          ) : viewingStatus?.active && city ? (
            <p className="config-section__hint">
              {formatMilkyWayViewingActiveLines(
                viewingStatus.active,
                productInstantMs ?? viewingStatus.active.startUtcMs,
                city.timeZone,
                displayTimeMode,
                instant?.gcAltitudeDeg ?? null,
              )[0] ?? "Active viewing window"}
            </p>
          ) : (
            <p className="config-section__hint">
              Map labels use the next selected window within the advance notice. Time navigation is
              under Data → Event playback.
            </p>
          )}
        </div>
      ) : null}
    </>
  );
}
