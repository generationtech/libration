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
import type { ReferenceCityEclipseCircumstances } from "../../core/eclipse/referenceCityEclipseTypes";
import { formatReferenceCityEclipseTime } from "../../core/referenceCityEclipseStatus";

function fmt(
  utcMs: number | null | undefined,
  timeZone: string,
  mode: DisplayTimeMode,
): string {
  if (utcMs === null || utcMs === undefined) {
    return "—";
  }
  return formatReferenceCityEclipseTime(utcMs, timeZone, mode, true);
}

function kindLabel(kind: string): string {
  if (kind === "total") {
    return "Total";
  }
  if (kind === "annular") {
    return "Annular";
  }
  if (kind === "partial") {
    return "Partial";
  }
  if (kind === "penumbral") {
    return "Penumbral";
  }
  return kind;
}

function Row({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="config-control-row" data-eclipse-detail-row={label}>
      <span className="config-control-row__label">{label}</span>
      <div className="config-control-row__slot">{value}</div>
    </div>
  );
}

export function EclipseCircumstancesDetails(props: {
  circumstances: ReferenceCityEclipseCircumstances | null;
  observerUnavailable: boolean;
  cityName: string;
  timeZone: string;
  displayTimeMode: DisplayTimeMode;
  enabled: boolean;
}): ReactElement | null {
  if (!props.enabled) {
    return null;
  }
  if (props.observerUnavailable) {
    return (
      <div data-testid="eclipse-circumstances-details">
        <Row label="Reference-city eclipse" value="Circumstances unavailable (no catalog city)" />
      </div>
    );
  }
  const c = props.circumstances;
  if (!c || (!c.solar && !c.lunar)) {
    return null;
  }
  const solar = c.solar;
  const lunar = c.lunar;
  return (
    <div data-testid="eclipse-circumstances-details">
      <Row label="Reference city" value={props.cityName} />
      {solar ? (
        <>
          <Row label="Global solar event" value={kindLabel(solar.globalSubtype)} />
          <Row
            label="Local type"
            value={
              solar.locallyVisible
                ? kindLabel(solar.observableKind)
                : solar.notVisibleReason === "below_horizon"
                  ? `Not visible from ${props.cityName} (below horizon)`
                  : `Not visible from ${props.cityName}`
            }
          />
          {solar.c1 ? <Row label="C1" value={fmt(solar.c1.utcMs, props.timeZone, props.displayTimeMode)} /> : null}
          {solar.c2 ? <Row label="C2" value={fmt(solar.c2.utcMs, props.timeZone, props.displayTimeMode)} /> : null}
          {solar.maximum ? (
            <Row label="Maximum" value={fmt(solar.maximum.utcMs, props.timeZone, props.displayTimeMode)} />
          ) : null}
          {solar.c3 ? <Row label="C3" value={fmt(solar.c3.utcMs, props.timeZone, props.displayTimeMode)} /> : null}
          {solar.c4 ? <Row label="C4" value={fmt(solar.c4.utcMs, props.timeZone, props.displayTimeMode)} /> : null}
          {solar.magnitude !== null ? (
            <Row label="Magnitude" value={solar.magnitude.toFixed(3)} />
          ) : null}
          {solar.obscuration !== null ? (
            <Row label="Obscuration" value={`${(solar.obscuration * 100).toFixed(1)}%`} />
          ) : null}
          {solar.maximum ? (
            <Row
              label="Sun altitude"
              value={`${solar.maximum.altitudeDeg.toFixed(1)}° (${solar.maximum.aboveHorizon ? "above horizon" : "below horizon"})`}
            />
          ) : null}
        </>
      ) : null}
      {lunar ? (
        <>
          <Row label="Global lunar event" value={kindLabel(lunar.globalSubtype)} />
          <Row
            label="Local lunar visibility"
            value={
              lunar.locallyVisible
                ? lunar.totalityVisible
                  ? "Totality visible"
                  : "Visible"
                : `Not visible from ${props.cityName}`
            }
          />
          {lunar.localMaximum ? (
            <Row
              label="Local maximum"
              value={fmt(lunar.localMaximum.utcMs, props.timeZone, props.displayTimeMode)}
            />
          ) : null}
          {lunar.contacts
            .filter((ct) => ct.aboveHorizon)
            .map((ct) => (
              <Row
                key={ct.id}
                label={`Moon ${ct.id.toUpperCase()}`}
                value={`${fmt(ct.utcMs, props.timeZone, props.displayTimeMode)} · ${ct.altitudeDeg.toFixed(0)}°`}
              />
            ))}
          {lunar.inProgressAtMoonrise ? (
            <Row label="Moonrise" value="Eclipse already in progress at moonrise" />
          ) : null}
          {lunar.endsAfterMoonset ? (
            <Row label="Moonset" value="Eclipse continues after moonset" />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
