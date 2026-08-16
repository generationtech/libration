/*
 * Libration
 * Copyright (C) 2026 Ken McDonald
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, version 3.
 */

import { describe, expect, it } from "vitest";
import { getSolarEclipseEventById } from "./eclipseAuthority";
import {
  resolveSolarEclipsePresentationPhase,
  solarEclipseCorridorRemainsVisible,
  solarEclipseForecastCenterlineRemainsVisible,
  solarEclipseForecastPartialRemainsVisible,
  solarEclipseLiveCenterlineRemainsVisible,
  solarEclipsePartialFieldRemainsVisible,
  solarEclipseTargetedBeamRemainsVisible,
} from "./solarEclipsePresentationLifecycle";

function requireEvent(id: string) {
  const event = getSolarEclipseEventById(id);
  if (!event) {
    throw new Error(`missing ${id}`);
  }
  return event;
}

const TOTAL_2017 = "nasa-5mcse-solar-9546";
const PARTIAL_2022 = "nasa-5mcse-solar-9558";

describe("solar eclipse presentation lifecycle", () => {
  it("derives 2017 upcoming / pre-central / central / post-central / completed from existing fields", () => {
    const event = requireEvent(TOTAL_2017);
    expect(
      resolveSolarEclipsePresentationPhase({
        productUtcMs: Date.parse("2017-08-21T14:51:00.000Z"),
        event,
        selectionLifecycle: "upcoming",
        centralPointPresent: false,
      }),
    ).toBe("upcoming");
    expect(
      resolveSolarEclipsePresentationPhase({
        productUtcMs: Date.parse("2017-08-21T15:56:00.000Z"),
        event,
        selectionLifecycle: "active",
        centralPointPresent: false,
      }),
    ).toBe("global-active-pre-central");
    expect(
      resolveSolarEclipsePresentationPhase({
        productUtcMs: event.greatestEclipseUtcMs,
        event,
        selectionLifecycle: "active",
        centralPointPresent: true,
      }),
    ).toBe("central-active");
    expect(
      resolveSolarEclipsePresentationPhase({
        productUtcMs: Date.parse("2017-08-21T20:21:00.000Z"),
        event,
        selectionLifecycle: "active",
        centralPointPresent: false,
      }),
    ).toBe("global-active-post-central");
    expect(
      resolveSolarEclipsePresentationPhase({
        productUtcMs: event.globalEndMs + 60_000,
        event,
        selectionLifecycle: null,
        centralPointPresent: false,
      }),
    ).toBe("completed");
  });

  it("does not force a central-shadow phase onto a partial-only event", () => {
    const event = requireEvent(PARTIAL_2022);
    const active = resolveSolarEclipsePresentationPhase({
      productUtcMs: event.greatestEclipseUtcMs,
      event,
      selectionLifecycle: "active",
      centralPointPresent: false,
    });
    expect(active).toBe("global-active");
    expect(solarEclipseTargetedBeamRemainsVisible(active)).toBe(false);
    expect(solarEclipsePartialFieldRemainsVisible(active)).toBe(true);
    expect(solarEclipseCorridorRemainsVisible(active)).toBe(false);
    expect(solarEclipseForecastPartialRemainsVisible(active)).toBe(false);
  });

  it("keeps corridor independent of central-shadow presence", () => {
    for (const phase of [
      "upcoming",
      "global-active-pre-central",
      "central-active",
      "global-active-post-central",
    ] as const) {
      expect(solarEclipseCorridorRemainsVisible(phase)).toBe(true);
    }
    expect(solarEclipseCorridorRemainsVisible("completed")).toBe(false);
    expect(solarEclipseForecastPartialRemainsVisible("upcoming")).toBe(true);
    expect(solarEclipseForecastPartialRemainsVisible("central-active")).toBe(false);
    expect(solarEclipseForecastCenterlineRemainsVisible("global-active-pre-central")).toBe(true);
    expect(solarEclipseForecastCenterlineRemainsVisible("central-active")).toBe(false);
    expect(solarEclipseLiveCenterlineRemainsVisible("central-active")).toBe(true);
    expect(solarEclipseTargetedBeamRemainsVisible("global-active-pre-central")).toBe(false);
    expect(solarEclipseTargetedBeamRemainsVisible("central-active")).toBe(true);
    expect(solarEclipseTargetedBeamRemainsVisible("global-active-post-central")).toBe(false);
  });
});
