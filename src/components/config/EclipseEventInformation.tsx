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
import type { DisplayTimeMode } from "../../core/chromeTimeDomain";
import type { EclipseEventInformationView } from "../../core/eclipse/eclipseEventInformation";
import type { ReferenceCityEclipseCircumstances } from "../../core/eclipse/referenceCityEclipseTypes";
import { ConfigControlRow } from "./ConfigControlRow";
import { EclipseCircumstancesDetails } from "./EclipseCircumstancesDetails";

function Row({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="config-control-row" data-eclipse-info-row={label}>
      <span className="config-control-row__label">{label}</span>
      <div className="config-control-row__slot">{value}</div>
    </div>
  );
}

export function EclipseEventInformation(props: {
  view: EclipseEventInformationView;
  circumstances: ReferenceCityEclipseCircumstances | null;
  observerUnavailable: boolean;
  cityName: string;
  timeZone: string;
  displayTimeMode: DisplayTimeMode;
  detailsEnabled: boolean;
  eventInformationEnabled: boolean;
}): ReactElement | null {
  if (!props.eventInformationEnabled && !props.detailsEnabled) {
    return null;
  }
  if (props.eventInformationEnabled && props.view.unsupported && props.view.unsupportedCopy) {
    return (
      <div data-testid="eclipse-event-information">
        <Row label="Eclipse data" value={props.view.unsupportedCopy} />
      </div>
    );
  }
  const showGlobal = props.eventInformationEnabled && props.view.title !== null;
  if (!showGlobal && !props.detailsEnabled) {
    return null;
  }
  return (
    <div data-testid="eclipse-event-information">
      {showGlobal ? (
        <>
          {props.view.rows.map((row) => (
            <Row key={row.label} label={row.label} value={row.value} />
          ))}
          {props.view.upcomingCount > 1 ? (
            <Row
              label="Events in horizon"
              value={`${props.view.upcomingCount} upcoming solar eclipses`}
            />
          ) : null}
          {props.view.legend.length > 0 ? (
            <ConfigControlRow label="Map geography">
              <span>{props.view.legend.map((item) => item.label).join(" · ")}</span>
            </ConfigControlRow>
          ) : null}
        </>
      ) : null}
      <EclipseCircumstancesDetails
        circumstances={props.circumstances}
        observerUnavailable={props.observerUnavailable}
        cityName={props.cityName}
        timeZone={props.timeZone}
        displayTimeMode={props.displayTimeMode}
        enabled={props.detailsEnabled}
      />
    </div>
  );
}
