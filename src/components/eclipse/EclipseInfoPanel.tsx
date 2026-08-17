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

import { useEffect, useMemo, useState, type ReactElement } from "react";
import {
  buildDefaultSceneConfigFromLayerFlags,
  eclipseInfoPresentationFromScene,
  lunarEclipsePresentationFromScene,
  referenceCityEclipsePresentationFromScene,
  solarEclipsePresentationFromScene,
} from "../../config/v2/sceneConfig";
import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import { displayTimeModeFromTopBandTimeMode } from "../../core/displayTimeMode";
import { resolveReferenceFrameCivilTimeZone } from "../../core/displayTimeReference";
import {
  buildEclipseEventInformation,
  type EclipseEventInformationView,
} from "../../core/eclipse/eclipseEventInformation";
import { resolveEclipseFrame } from "../../core/eclipse/eclipseEventService";
import { resolveReferenceCityEclipseCircumstances } from "../../core/eclipse/referenceCityEclipseCircumstances";
import { forecastHorizonMsFromDays } from "../../core/eclipse/solarEclipseAppearance";
import { resolveReferenceCityObserverLocation } from "../../core/referenceCityObserver";
import { REFERENCE_CITIES } from "../../data/referenceCities";
import { EclipseCircumstancesDetails } from "../config/EclipseCircumstancesDetails";
import "./EclipseInfoPanel.css";

export type EclipseInfoPanelModel = {
  readonly eventInformationEnabled: boolean;
  readonly detailsEnabled: boolean;
  readonly view: EclipseEventInformationView;
  readonly cityName: string;
  readonly timeZone: string;
  readonly displayTimeMode: ReturnType<typeof displayTimeModeFromTopBandTimeMode>;
  readonly observerUnavailable: boolean;
};

export function eclipseInfoPanelHasContent(view: EclipseEventInformationView): boolean {
  return view.unsupported || view.title !== null;
}

export function buildEclipseInfoPanelModel(
  config: LibrationConfigV2,
  productInstantMs: number,
): EclipseInfoPanelModel {
  const scene = config.scene ?? buildDefaultSceneConfigFromLayerFlags(config.layers);
  const solar = solarEclipsePresentationFromScene(scene);
  const lunar = lunarEclipsePresentationFromScene(scene);
  const info = eclipseInfoPresentationFromScene(scene);
  const circumstancesPres = referenceCityEclipsePresentationFromScene(scene);
  const solarOn = config.layers.solarEclipse;
  const lunarOn = config.layers.lunarEclipse;
  const horizonMs = solarOn ? forecastHorizonMsFromDays(solar.forecastHorizonDays) : 0;
  const lunarHorizonMs = lunarOn ? forecastHorizonMsFromDays(lunar.forecastHorizonDays) : 0;
  const frame = resolveEclipseFrame(productInstantMs, { horizonMs, lunarHorizonMs });
  const observer = resolveReferenceCityObserverLocation(config.chrome.displayTime);
  const circumstances = circumstancesPres.detailsEnabled
    ? resolveReferenceCityEclipseCircumstances(frame, observer)
    : null;
  const hasEclipseEvent = Boolean(
    frame.activeSolar ||
      frame.activeLunar ||
      frame.upcomingSolar.length > 0 ||
      frame.upcomingLunar.length > 0,
  );
  const view = buildEclipseEventInformation({
    frame,
    solarEnabled: solarOn,
    lunarEnabled: lunarOn,
    solar,
    lunar,
    info,
    circumstances,
    cityName:
      observer !== null
        ? (REFERENCE_CITIES.find((c) => c.id === observer.cityId)?.name ?? observer.cityId)
        : "",
  });
  return {
    eventInformationEnabled: info.eventInformationEnabled,
    detailsEnabled: circumstancesPres.detailsEnabled,
    view,
    cityName:
      observer !== null
        ? (REFERENCE_CITIES.find((c) => c.id === observer.cityId)?.name ?? observer.cityId)
        : "",
    timeZone: resolveReferenceFrameCivilTimeZone(config.chrome.displayTime),
    displayTimeMode: displayTimeModeFromTopBandTimeMode(config.chrome.displayTime.topBandMode),
    observerUnavailable: observer === null && hasEclipseEvent,
  };
}

function panelEventKey(view: EclipseEventInformationView): string | null {
  if (view.unsupported) {
    return "unsupported";
  }
  if (!view.title || !view.kind || !view.lifecycle) {
    return null;
  }
  return `${view.kind}:${view.lifecycle}:${view.title}`;
}

export function EclipseInfoPanel(props: {
  config: LibrationConfigV2;
  productInstantMs: number;
  configOpen: boolean;
}): ReactElement | null {
  const model = useMemo(
    () => buildEclipseInfoPanelModel(props.config, props.productInstantMs),
    [props.config, props.productInstantMs],
  );
  const content = eclipseInfoPanelHasContent(model.view);
  const available = model.eventInformationEnabled && content;
  const eventKey = panelEventKey(model.view);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!available || eventKey === null) {
      return;
    }
    if (dismissedKey !== eventKey) {
      setOpen(true);
    }
  }, [available, eventKey, dismissedKey]);

  if (!available || eventKey === null) {
    return null;
  }

  const expanded = open && dismissedKey !== eventKey;

  return (
    <div
      className={
        props.configOpen
          ? "eclipse-info-overlay eclipse-info-overlay--config-open"
          : "eclipse-info-overlay"
      }
      data-testid="eclipse-info-overlay"
    >
      {expanded ? (
        <section
          className="eclipse-info-panel"
          data-testid="eclipse-event-information"
          aria-label="Eclipse information"
        >
          <header className="eclipse-info-panel__header">
            <h2 className="eclipse-info-panel__title">{model.view.title ?? "Eclipse data"}</h2>
            <button
              type="button"
              className="eclipse-info-panel__close"
              aria-label="Hide eclipse information"
              onClick={() => {
                setDismissedKey(eventKey);
                setOpen(false);
              }}
            >
              Hide
            </button>
          </header>
          {model.view.unsupported && model.view.unsupportedCopy ? (
            <p className="eclipse-info-panel__unsupported">{model.view.unsupportedCopy}</p>
          ) : (
            <dl className="eclipse-info-panel__rows">
              {model.view.rows.map((row) => (
                <div key={row.label} className="eclipse-info-panel__row" data-eclipse-info-row={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
              {model.view.upcomingCount > 1 ? (
                <div className="eclipse-info-panel__row" data-eclipse-info-row="Events in horizon">
                  <dt>Events in horizon</dt>
                  <dd>
                    {model.view.kind === "lunar"
                      ? `${model.view.upcomingCount} upcoming lunar eclipses`
                      : `${model.view.upcomingCount} upcoming solar eclipses`}
                  </dd>
                </div>
              ) : null}
              {model.view.legend.length > 0 ? (
                <div className="eclipse-info-panel__row" data-eclipse-info-row="Map geography">
                  <dt>Map geography</dt>
                  <dd>{model.view.legend.map((item) => item.label).join(" · ")}</dd>
                </div>
              ) : null}
            </dl>
          )}
          <EclipseCircumstancesDetails
            circumstances={model.view.circumstances}
            observerUnavailable={model.observerUnavailable}
            cityName={model.cityName}
            timeZone={model.timeZone}
            displayTimeMode={model.displayTimeMode}
            enabled={model.detailsEnabled}
          />
        </section>
      ) : (
        <button
          type="button"
          className="eclipse-info-chip"
          data-testid="eclipse-info-chip"
          aria-label="Show eclipse information"
          onClick={() => {
            setDismissedKey(null);
            setOpen(true);
          }}
        >
          Eclipse info
        </button>
      )}
    </div>
  );
}
