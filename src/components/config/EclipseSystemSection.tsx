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
  applyEclipseAlignmentPresentationToScene,
  applyEclipseInfoPresentationToScene,
  applyLunarEclipsePresentationToScene,
  applyReferenceCityEclipsePresentationToScene,
  applySolarEclipsePresentationToScene,
  buildDefaultSceneConfigFromLayerFlags,
  deriveLayerEnableFlagsFromScene,
  eclipseAlignmentPresentationFromScene,
  eclipseInfoPresentationFromScene,
  lunarEclipsePresentationFromScene,
  referenceCityEclipsePresentationFromScene,
  solarEclipsePresentationFromScene,
} from "../../config/v2/sceneConfig";
import {
  ASTRONOMY_PATH_THICKNESS_IDS,
  type AstronomyPathThicknessId,
} from "../../core/astronomyOverlayStrokeAppearance";
import type { DisplayTimeMode } from "../../core/chromeTimeDomain";
import {
  ECLIPSE_ALIGNMENT_INTENSITY_IDS,
  eclipseAlignmentIntensityLabel,
} from "../../core/eclipse/eclipseAlignmentAppearance";
import { buildEclipseEventInformation } from "../../core/eclipse/eclipseEventInformation";
import { resolveEclipseFrame } from "../../core/eclipse/eclipseEventService";
import { ECLIPSE_FILL_OPACITY_MAX, ECLIPSE_FILL_OPACITY_MIN } from "../../core/eclipse/eclipseStyle";
import { resolveReferenceCityEclipseCircumstances } from "../../core/eclipse/referenceCityEclipseCircumstances";
import {
  forecastHorizonLabel,
  forecastHorizonMsFromDays,
  SOLAR_ECLIPSE_FORECAST_HORIZON_DAYS,
} from "../../core/eclipse/solarEclipseAppearance";
import type { ReferenceCityObserverLocation } from "../../core/referenceCityObserver";
import { ConfigControlRow } from "./ConfigControlRow";
import { EclipseEventInformation } from "./EclipseEventInformation";

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

export function EclipseSystemSection(props: {
  config: LibrationConfigV2;
  updateConfig?: UpdateConfig;
  productInstantMs?: number;
  observerLocation: ReferenceCityObserverLocation | null;
  cityName: string;
  timeZone: string;
  displayTimeMode: DisplayTimeMode;
}): ReactElement {
  const { config, updateConfig } = props;
  const mutable = Boolean(updateConfig);
  const scene = config.scene ?? buildDefaultSceneConfigFromLayerFlags(config.layers);
  const solar = solarEclipsePresentationFromScene(scene);
  const lunar = lunarEclipsePresentationFromScene(scene);
  const alignment = eclipseAlignmentPresentationFromScene(scene);
  const circumstancesPres = referenceCityEclipsePresentationFromScene(scene);
  const infoPres = eclipseInfoPresentationFromScene(scene);
  const solarOn = config.layers.solarEclipse;
  const lunarOn = config.layers.lunarEclipse;
  const liveOnly = solar.forecastHorizonDays === 0;
  const alignmentChildrenOff = !alignment.enabled;
  const horizonMs = solarOn ? forecastHorizonMsFromDays(solar.forecastHorizonDays) : 0;
  const frame =
    props.productInstantMs !== undefined
      ? resolveEclipseFrame(props.productInstantMs, { horizonMs })
      : null;
  const circumstances =
    frame && circumstancesPres.detailsEnabled
      ? resolveReferenceCityEclipseCircumstances(frame, props.observerLocation)
      : null;
  const hasEclipseEvent = Boolean(
    frame?.activeSolar || frame?.activeLunar || (frame?.upcomingSolar.length ?? 0) > 0,
  );
  const view = buildEclipseEventInformation({
    frame,
    solarEnabled: solarOn,
    lunarEnabled: lunarOn,
    solar,
    lunar,
    info: infoPres,
    circumstances,
  });

  return (
    <>
      <fieldset className="config-fieldset config-fieldset--plain">
        <legend className="config-fieldset__legend">Eclipses</legend>
        <p className="config-section__hint">
          Global eclipse geography is independent of the reference city. Nothing is drawn on
          ordinary dates when no event is relevant.
        </p>
        <ConfigControlRow label="Event information">
          <input
            type="checkbox"
            className="config-input config-input--checkbox"
            checked={infoPres.eventInformationEnabled}
            readOnly={!mutable}
            disabled={!mutable}
            tabIndex={mutable ? 0 : -1}
            aria-label="Event information"
            title="Inspectable description of the current or upcoming eclipse. Does not filter the global map."
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const eventInformationEnabled = e.currentTarget.checked;
                    patchScene(updateConfig, (base) =>
                      applyEclipseInfoPresentationToScene(base, { eventInformationEnabled }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Event labels">
          <input
            type="checkbox"
            className="config-input config-input--checkbox"
            checked={infoPres.labelsEnabled}
            readOnly={!mutable}
            disabled={!mutable}
            tabIndex={mutable ? 0 : -1}
            aria-label="Event labels"
            title="Restrained map label for the nearest upcoming or active eclipse."
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const labelsEnabled = e.currentTarget.checked;
                    patchScene(updateConfig, (base) =>
                      applyEclipseInfoPresentationToScene(base, { labelsEnabled }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
      </fieldset>

      <fieldset className="config-fieldset config-fieldset--plain">
        <legend className="config-fieldset__legend">Solar eclipses</legend>
        <p className="config-section__hint">
          Forecast horizon is how early upcoming solar eclipse geography appears — not the
          duration of the eclipse. Live only keeps the moving footprint while an eclipse is
          happening.
        </p>
        <ConfigControlRow label="Solar forecast horizon">
          <select
            className="config-input"
            disabled={!mutable || !solarOn}
            aria-label="Solar forecast horizon"
            title="How early upcoming solar eclipse geography appears on the map."
            value={String(solar.forecastHorizonDays)}
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const forecastHorizonDays = Number(
                      e.currentTarget.value,
                    ) as (typeof SOLAR_ECLIPSE_FORECAST_HORIZON_DAYS)[number];
                    patchScene(updateConfig, (base) =>
                      applySolarEclipsePresentationToScene(base, { forecastHorizonDays }),
                    );
                  }
                : undefined
            }
          >
            {SOLAR_ECLIPSE_FORECAST_HORIZON_DAYS.map((days) => (
              <option key={`eclipse-horizon-${days}`} value={days}>
                {forecastHorizonLabel(days)}
              </option>
            ))}
          </select>
        </ConfigControlRow>
        <ConfigControlRow label="Show solar types">
          <div>
            {(
              [
                ["showTypeTotal", "Total", solar.showTypeTotal],
                ["showTypeAnnular", "Annular", solar.showTypeAnnular],
                ["showTypePartial", "Partial", solar.showTypePartial],
                ["showTypeHybrid", "Hybrid", solar.showTypeHybrid],
              ] as const
            ).map(([key, label, checked]) => (
              <label key={key} style={{ marginRight: "0.75rem" }}>
                <input
                  type="checkbox"
                  className="config-input config-input--checkbox"
                  checked={checked}
                  disabled={!mutable || !solarOn}
                  aria-label={`Show ${label.toLowerCase()} solar eclipses`}
                  onChange={
                    mutable && updateConfig
                      ? (e) => {
                          const value = e.currentTarget.checked;
                          patchScene(updateConfig, (base) =>
                            applySolarEclipsePresentationToScene(base, { [key]: value }),
                          );
                        }
                      : undefined
                  }
                />{" "}
                {label}
              </label>
            ))}
          </div>
        </ConfigControlRow>
        {(
          [
            ["showForecastCorridor", "Forecast corridor", !solarOn || liveOnly, "Event-long path of totality or annularity. Distinct from the live central shadow."],
            ["showForecastPartialRegion", "Forecast partial region", !solarOn || liveOnly, "Representative partial-visibility region for an upcoming eclipse. Not a swept penumbra."],
            ["showCentralLine", "Live central line", !solarOn, "Live path of totality or annularity. Not drawn for partial-only events."],
            ["showCentralBand", "Live central band", !solarOn, "Live totality or annularity footprint. Not labeled totality for annular events."],
            ["showPartialRegion", "Live partial region", !solarOn, "Live partial-visibility footprint at the current product time."],
          ] as const
        ).map(([key, label, disabled, title]) => (
          <ConfigControlRow key={key} label={label}>
            <input
              type="checkbox"
              className="config-input config-input--checkbox"
              checked={solar[key]}
              readOnly={!mutable}
              disabled={!mutable || disabled}
              tabIndex={mutable && !disabled ? 0 : -1}
              aria-label={label}
              title={title}
              onChange={
                mutable && updateConfig
                  ? (e) => {
                      const value = e.currentTarget.checked;
                      patchScene(updateConfig, (base) =>
                        applySolarEclipsePresentationToScene(base, { [key]: value }),
                      );
                    }
                  : undefined
              }
            />
          </ConfigControlRow>
        ))}
      </fieldset>

      <fieldset className="config-fieldset config-fieldset--plain">
        <legend className="config-fieldset__legend">Lunar eclipses</legend>
        <p className="config-section__hint">
          The map region is where the eclipsed Moon is above the geometric horizon — not a lunar
          path of totality.
        </p>
        <ConfigControlRow label="Show lunar types">
          <div>
            {(
              [
                ["showTypeTotal", "Total", lunar.showTypeTotal],
                ["showTypePartial", "Partial", lunar.showTypePartial],
                ["showTypePenumbral", "Penumbral", lunar.showTypePenumbral],
              ] as const
            ).map(([key, label, checked]) => (
              <label key={key} style={{ marginRight: "0.75rem" }}>
                <input
                  type="checkbox"
                  className="config-input config-input--checkbox"
                  checked={checked}
                  disabled={!mutable || !lunarOn}
                  aria-label={`Show ${label.toLowerCase()} lunar eclipses`}
                  onChange={
                    mutable && updateConfig
                      ? (e) => {
                          const value = e.currentTarget.checked;
                          patchScene(updateConfig, (base) =>
                            applyLunarEclipsePresentationToScene(base, { [key]: value }),
                          );
                        }
                      : undefined
                  }
                />{" "}
                {label}
              </label>
            ))}
          </div>
        </ConfigControlRow>
        {(
          [
            ["showMoonEclipseShadow", "Moon Earth-shadow treatment", "Earth-shadow overlay on the Moon glyph during an active lunar eclipse."],
            ["showVisibilityBoundary", "Moon-visible boundary", "Geometric lunar-horizon contour. Not the solar terminator."],
            ["showVisibilityRegion", "Moon-visible region", "Terrestrial region where the eclipsed Moon is above the geometric horizon."],
          ] as const
        ).map(([key, label, title]) => (
          <ConfigControlRow key={key} label={label}>
            <input
              type="checkbox"
              className="config-input config-input--checkbox"
              checked={lunar[key]}
              readOnly={!mutable}
              disabled={!mutable || !lunarOn}
              tabIndex={mutable && lunarOn ? 0 : -1}
              aria-label={label}
              title={title}
              onChange={
                mutable && updateConfig
                  ? (e) => {
                      const value = e.currentTarget.checked;
                      patchScene(updateConfig, (base) =>
                        applyLunarEclipsePresentationToScene(base, { [key]: value }),
                      );
                    }
                  : undefined
              }
            />
          </ConfigControlRow>
        ))}
      </fieldset>

      <fieldset className="config-fieldset config-fieldset--plain">
        <legend className="config-fieldset__legend">Alignment effects</legend>
        <ConfigControlRow label="Eclipse alignment effects">
          <input
            type="checkbox"
            className="config-input config-input--checkbox"
            checked={alignment.enabled}
            readOnly={!mutable}
            disabled={!mutable}
            tabIndex={mutable ? 0 : -1}
            aria-label="Eclipse alignment effects"
            title="Master switch for the live Sun–Moon–Earth alignment field. Does not disable eclipse geography."
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const enabled = e.currentTarget.checked;
                    patchScene(updateConfig, (base) =>
                      applyEclipseAlignmentPresentationToScene(base, { enabled }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Solar alignment beam">
          <input
            type="checkbox"
            className="config-input config-input--checkbox"
            checked={alignment.solarEnabled}
            readOnly={!mutable}
            disabled={!mutable || alignmentChildrenOff || !solarOn}
            tabIndex={mutable && !alignmentChildrenOff && solarOn ? 0 : -1}
            aria-label="Solar alignment beam"
            title="Solar alignment field during an active solar eclipse. Requires Solar eclipses."
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const solarEnabled = e.currentTarget.checked;
                    patchScene(updateConfig, (base) =>
                      applyEclipseAlignmentPresentationToScene(base, { solarEnabled }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Lunar alignment beam">
          <input
            type="checkbox"
            className="config-input config-input--checkbox"
            checked={alignment.lunarEnabled}
            readOnly={!mutable}
            disabled={!mutable || alignmentChildrenOff || !lunarOn}
            tabIndex={mutable && !alignmentChildrenOff && lunarOn ? 0 : -1}
            aria-label="Lunar alignment beam"
            title="Lunar Earth-shadow axis during an active lunar eclipse. Requires Lunar eclipses."
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const lunarEnabled = e.currentTarget.checked;
                    patchScene(updateConfig, (base) =>
                      applyEclipseAlignmentPresentationToScene(base, { lunarEnabled }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Alignment intensity">
          <select
            className="config-input"
            disabled={!mutable || alignmentChildrenOff}
            aria-label="Alignment intensity"
            title="Width and opacity of the live alignment field."
            value={alignment.intensity}
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const intensity = e.currentTarget.value as typeof alignment.intensity;
                    patchScene(updateConfig, (base) =>
                      applyEclipseAlignmentPresentationToScene(base, { intensity }),
                    );
                  }
                : undefined
            }
          >
            {ECLIPSE_ALIGNMENT_INTENSITY_IDS.map((id) => (
              <option key={`eclipse-alignment-intensity-${id}`} value={id}>
                {eclipseAlignmentIntensityLabel(id)}
              </option>
            ))}
          </select>
        </ConfigControlRow>
      </fieldset>

      <fieldset className="config-fieldset config-fieldset--plain">
        <legend className="config-fieldset__legend">Reference city</legend>
        <p className="config-section__hint">
          Local circumstances never hide a global eclipse. Unavailable when no catalog city is
          selected.
        </p>
        <ConfigControlRow label="Reference-city eclipse details">
          <input
            type="checkbox"
            className="config-input config-input--checkbox"
            checked={circumstancesPres.detailsEnabled}
            readOnly={!mutable}
            disabled={!mutable}
            tabIndex={mutable ? 0 : -1}
            aria-label="Reference-city eclipse details"
            title="Inspectable local eclipse circumstances for the chrome reference city."
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const detailsEnabled = e.currentTarget.checked;
                    patchScene(updateConfig, (base) =>
                      applyReferenceCityEclipsePresentationToScene(base, { detailsEnabled }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Persistent eclipse status">
          <input
            type="checkbox"
            className="config-input config-input--checkbox"
            checked={circumstancesPres.chromeStatusEnabled}
            readOnly={!mutable}
            disabled={!mutable}
            tabIndex={mutable ? 0 : -1}
            aria-label="Persistent eclipse status"
            title="Compact eclipse status on the reference-city chrome."
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const chromeStatusEnabled = e.currentTarget.checked;
                    patchScene(updateConfig, (base) =>
                      applyReferenceCityEclipsePresentationToScene(base, { chromeStatusEnabled }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <EclipseEventInformation
          view={view}
          circumstances={view.circumstances ?? circumstances}
          observerUnavailable={props.observerLocation === null && hasEclipseEvent}
          cityName={props.cityName}
          timeZone={props.timeZone}
          displayTimeMode={props.displayTimeMode}
          detailsEnabled={circumstancesPres.detailsEnabled}
          eventInformationEnabled={infoPres.eventInformationEnabled}
        />
      </fieldset>

      <fieldset className="config-fieldset config-fieldset--plain">
        <legend className="config-fieldset__legend">Eclipse appearance</legend>
        <p className="config-section__hint">
          Colors and opacities are independent for solar forecast, solar live, lunar visibility,
          and alignment. Defaults preserve the verified eclipse look.
        </p>
        <ConfigControlRow label="Solar forecast color">
          <input
            type="color"
            className="config-input"
            disabled={!mutable || !solarOn}
            aria-label="Solar forecast color"
            value={solar.forecastCorridorColor}
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const forecastCorridorColor = e.currentTarget.value;
                    patchScene(updateConfig, (base) =>
                      applySolarEclipsePresentationToScene(base, { forecastCorridorColor }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Solar forecast thickness">
          <select
            className="config-input"
            disabled={!mutable || !solarOn}
            aria-label="Solar forecast thickness"
            value={solar.forecastCorridorThickness}
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const forecastCorridorThickness = e.currentTarget.value as AstronomyPathThicknessId;
                    patchScene(updateConfig, (base) =>
                      applySolarEclipsePresentationToScene(base, { forecastCorridorThickness }),
                    );
                  }
                : undefined
            }
          >
            {ASTRONOMY_PATH_THICKNESS_IDS.map((id) => (
              <option key={`forecast-th-${id}`} value={id}>
                {id[0]!.toUpperCase() + id.slice(1)}
              </option>
            ))}
          </select>
        </ConfigControlRow>
        <ConfigControlRow label="Solar forecast opacity">
          <input
            type="range"
            className="config-input"
            min={ECLIPSE_FILL_OPACITY_MIN}
            max={ECLIPSE_FILL_OPACITY_MAX}
            step={0.01}
            disabled={!mutable || !solarOn}
            aria-label="Solar forecast opacity"
            value={solar.forecastCorridorOpacity}
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const forecastCorridorOpacity = Number(e.currentTarget.value);
                    patchScene(updateConfig, (base) =>
                      applySolarEclipsePresentationToScene(base, { forecastCorridorOpacity }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Solar forecast partial opacity">
          <input
            type="range"
            className="config-input"
            min={ECLIPSE_FILL_OPACITY_MIN}
            max={ECLIPSE_FILL_OPACITY_MAX}
            step={0.01}
            disabled={!mutable || !solarOn}
            aria-label="Solar forecast partial opacity"
            value={solar.forecastPartialOpacity}
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const forecastPartialOpacity = Number(e.currentTarget.value);
                    patchScene(updateConfig, (base) =>
                      applySolarEclipsePresentationToScene(base, { forecastPartialOpacity }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Solar live line color">
          <input
            type="color"
            className="config-input"
            disabled={!mutable || !solarOn}
            aria-label="Solar live line color"
            value={solar.liveCentralLineColor}
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const liveCentralLineColor = e.currentTarget.value;
                    patchScene(updateConfig, (base) =>
                      applySolarEclipsePresentationToScene(base, { liveCentralLineColor }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Solar live line thickness">
          <select
            className="config-input"
            disabled={!mutable || !solarOn}
            aria-label="Solar live line thickness"
            value={solar.liveCentralLineThickness}
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const liveCentralLineThickness = e.currentTarget.value as AstronomyPathThicknessId;
                    patchScene(updateConfig, (base) =>
                      applySolarEclipsePresentationToScene(base, { liveCentralLineThickness }),
                    );
                  }
                : undefined
            }
          >
            {ASTRONOMY_PATH_THICKNESS_IDS.map((id) => (
              <option key={`live-th-${id}`} value={id}>
                {id[0]!.toUpperCase() + id.slice(1)}
              </option>
            ))}
          </select>
        </ConfigControlRow>
        <ConfigControlRow label="Solar live band color">
          <input
            type="color"
            className="config-input"
            disabled={!mutable || !solarOn}
            aria-label="Solar live band color"
            value={solar.liveCentralBandColor}
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const liveCentralBandColor = e.currentTarget.value;
                    patchScene(updateConfig, (base) =>
                      applySolarEclipsePresentationToScene(base, { liveCentralBandColor }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Solar live band opacity">
          <input
            type="range"
            className="config-input"
            min={ECLIPSE_FILL_OPACITY_MIN}
            max={ECLIPSE_FILL_OPACITY_MAX}
            step={0.01}
            disabled={!mutable || !solarOn}
            aria-label="Solar live band opacity"
            value={solar.liveCentralBandOpacity}
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const liveCentralBandOpacity = Number(e.currentTarget.value);
                    patchScene(updateConfig, (base) =>
                      applySolarEclipsePresentationToScene(base, { liveCentralBandOpacity }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Solar partial color">
          <input
            type="color"
            className="config-input"
            disabled={!mutable || !solarOn}
            aria-label="Solar partial color"
            value={solar.livePartialColor}
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const livePartialColor = e.currentTarget.value;
                    patchScene(updateConfig, (base) =>
                      applySolarEclipsePresentationToScene(base, { livePartialColor }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Solar partial opacity">
          <input
            type="range"
            className="config-input"
            min={ECLIPSE_FILL_OPACITY_MIN}
            max={ECLIPSE_FILL_OPACITY_MAX}
            step={0.01}
            disabled={!mutable || !solarOn}
            aria-label="Solar partial opacity"
            value={solar.livePartialOpacity}
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const livePartialOpacity = Number(e.currentTarget.value);
                    patchScene(updateConfig, (base) =>
                      applySolarEclipsePresentationToScene(base, { livePartialOpacity }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Lunar visibility color">
          <input
            type="color"
            className="config-input"
            disabled={!mutable || !lunarOn}
            aria-label="Lunar visibility color"
            value={lunar.visibilityRegionColor}
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const visibilityRegionColor = e.currentTarget.value;
                    patchScene(updateConfig, (base) =>
                      applyLunarEclipsePresentationToScene(base, { visibilityRegionColor }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Lunar visibility thickness">
          <select
            className="config-input"
            disabled={!mutable || !lunarOn}
            aria-label="Lunar visibility thickness"
            value={lunar.visibilityBoundaryThickness}
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const visibilityBoundaryThickness = e.currentTarget
                      .value as AstronomyPathThicknessId;
                    patchScene(updateConfig, (base) =>
                      applyLunarEclipsePresentationToScene(base, { visibilityBoundaryThickness }),
                    );
                  }
                : undefined
            }
          >
            {ASTRONOMY_PATH_THICKNESS_IDS.map((id) => (
              <option key={`lunar-th-${id}`} value={id}>
                {id[0]!.toUpperCase() + id.slice(1)}
              </option>
            ))}
          </select>
        </ConfigControlRow>
        <ConfigControlRow label="Lunar visibility opacity">
          <input
            type="range"
            className="config-input"
            min={ECLIPSE_FILL_OPACITY_MIN}
            max={ECLIPSE_FILL_OPACITY_MAX}
            step={0.01}
            disabled={!mutable || !lunarOn}
            aria-label="Lunar visibility opacity"
            value={lunar.visibilityRegionOpacity}
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const visibilityRegionOpacity = Number(e.currentTarget.value);
                    patchScene(updateConfig, (base) =>
                      applyLunarEclipsePresentationToScene(base, { visibilityRegionOpacity }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Solar alignment color">
          <input
            type="color"
            className="config-input"
            disabled={!mutable || alignmentChildrenOff}
            aria-label="Solar alignment color"
            value={alignment.solarColor}
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const solarColor = e.currentTarget.value;
                    patchScene(updateConfig, (base) =>
                      applyEclipseAlignmentPresentationToScene(base, { solarColor }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Lunar alignment color">
          <input
            type="color"
            className="config-input"
            disabled={!mutable || alignmentChildrenOff}
            aria-label="Lunar alignment color"
            value={alignment.lunarColor}
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const lunarColor = e.currentTarget.value;
                    patchScene(updateConfig, (base) =>
                      applyEclipseAlignmentPresentationToScene(base, { lunarColor }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
      </fieldset>
    </>
  );
}
