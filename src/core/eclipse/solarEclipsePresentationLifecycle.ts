/*
 * Libration
 * Copyright (C) 2026 Ken McDonald
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, version 3.
 */

/**
 * Presentation-only solar eclipse lifecycle. Derived from existing EclipseFrame
 * fields (global contacts, live central geometry). Not a second authority.
 */

import type { SolarEclipseEvent, SolarEclipseLifecycle } from "./solarEclipseTypes";

export type SolarEclipsePresentationPhase =
  | "upcoming"
  | "global-active-pre-central"
  | "central-active"
  | "global-active-post-central"
  | "global-active"
  | "completed";

export type ResolveSolarEclipsePresentationPhaseInput = {
  readonly productUtcMs: number;
  readonly event: SolarEclipseEvent | null;
  readonly selectionLifecycle: SolarEclipseLifecycle | null;
  readonly centralPointPresent: boolean;
};

export function resolveSolarEclipsePresentationPhase(
  input: ResolveSolarEclipsePresentationPhaseInput,
): SolarEclipsePresentationPhase | null {
  const event = input.event;
  if (!event) {
    return null;
  }
  if (input.productUtcMs > event.globalEndMs) {
    return "completed";
  }
  if (input.selectionLifecycle === "upcoming" || input.productUtcMs < event.globalStartMs) {
    return "upcoming";
  }
  const globallyActive =
    input.selectionLifecycle === "active" ||
    (input.productUtcMs >= event.globalStartMs && input.productUtcMs <= event.globalEndMs);
  if (!globallyActive) {
    return null;
  }
  if (event.subtype === "partial") {
    return "global-active";
  }
  if (input.centralPointPresent) {
    return "central-active";
  }
  return input.productUtcMs < event.greatestEclipseUtcMs
    ? "global-active-pre-central"
    : "global-active-post-central";
}

export function solarEclipseCorridorRemainsVisible(
  phase: SolarEclipsePresentationPhase | null,
): boolean {
  return (
    phase === "upcoming" ||
    phase === "global-active-pre-central" ||
    phase === "central-active" ||
    phase === "global-active-post-central"
  );
}

export function solarEclipseForecastPartialRemainsVisible(
  phase: SolarEclipsePresentationPhase | null,
): boolean {
  return phase === "upcoming";
}

export function solarEclipseForecastCenterlineRemainsVisible(
  phase: SolarEclipsePresentationPhase | null,
): boolean {
  return (
    phase === "upcoming" ||
    phase === "global-active-pre-central" ||
    phase === "global-active-post-central"
  );
}

export function solarEclipseLiveCenterlineRemainsVisible(
  phase: SolarEclipsePresentationPhase | null,
): boolean {
  return phase === "central-active";
}

export function solarEclipseTargetedBeamRemainsVisible(
  phase: SolarEclipsePresentationPhase | null,
): boolean {
  return phase === "central-active";
}

export function solarEclipsePartialFieldRemainsVisible(
  phase: SolarEclipsePresentationPhase | null,
): boolean {
  return phase === "global-active";
}
