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

/**
 * Canonical eclipse presentation projection (LIB-042).
 * Formats HUD, placard, and map-label copy from EclipseFrame + circumstances.
 * Does not move astronomy into presentation or invent events.
 */

import { lunarEclipseMapLabel, solarEclipseMapLabel } from "./eclipseEventLabels";
import {
  formatEclipseRelativeTime,
  lunarEclipseTypeTitle,
  solarEclipseTypeTitle,
} from "./eclipseEventCopy";
import {
  presentedActiveLunar,
  presentedActiveSolar,
  presentedPrimaryEclipse,
  presentedPrimaryLunar,
  presentedPrimarySolar,
} from "./eclipsePresentedEvents";
import type { LunarEclipsePresentation } from "./lunarEclipseAppearance";
import type { SolarEclipsePresentation } from "./solarEclipseAppearance";
import type { EclipseFrame } from "./solarEclipseTypes";
import type { ReferenceCityEclipseCircumstances } from "./referenceCityEclipseTypes";

export type EclipsePresentationLifecycle = "upcoming" | "active";

export type EclipsePresentationLocal = {
  readonly cityName: string;
  readonly visible: boolean;
  readonly kindLabel: string | null;
  readonly obscuration: number | null;
  readonly magnitude: number | null;
  readonly c1UtcMs: number | null;
  readonly maximumUtcMs: number | null;
  readonly c4UtcMs: number | null;
};

export type EclipsePresentationState = {
  readonly kind: "solar" | "lunar";
  readonly lifecycle: EclipsePresentationLifecycle;
  readonly eventId: string;
  readonly globalTitle: string;
  readonly currentShadow: string | null;
  readonly relativeTime: string | null;
  readonly productUtcMs: number;
  readonly startUtcMs: number;
  readonly local: EclipsePresentationLocal | null;
  readonly mapLabelText: string;
};

export type BuildEclipsePresentationStateInput = {
  readonly frame: EclipseFrame | null;
  readonly solarEnabled: boolean;
  readonly lunarEnabled: boolean;
  readonly solar: SolarEclipsePresentation;
  readonly lunar: LunarEclipsePresentation;
  readonly circumstances: ReferenceCityEclipseCircumstances | null;
  readonly cityName: string;
};

function solarPresentationOrHidden(
  enabled: boolean,
  solar: SolarEclipsePresentation,
): SolarEclipsePresentation {
  return enabled
    ? solar
    : {
        ...solar,
        showTypeTotal: false,
        showTypeAnnular: false,
        showTypePartial: false,
        showTypeHybrid: false,
      };
}

function lunarPresentationOrHidden(
  enabled: boolean,
  lunar: LunarEclipsePresentation,
): LunarEclipsePresentation {
  return enabled
    ? lunar
    : {
        ...lunar,
        showTypeTotal: false,
        showTypePartial: false,
        showTypePenumbral: false,
      };
}

function solarKindLabel(kind: string): string | null {
  if (kind === "total") return "Total";
  if (kind === "annular") return "Annular";
  if (kind === "partial") return "Partial";
  return null;
}

function lunarKindLabel(kind: string): string {
  if (kind === "partial") return "Partial";
  if (kind === "penumbral") return "Penumbral";
  return "Total";
}

function solarCurrentShadow(frame: EclipseFrame): string | null {
  const geom = frame.solarGeometry;
  if (!geom) {
    return "Partial";
  }
  if (geom.centralShadowKind === "antumbra") {
    return "Annularity (central shadow)";
  }
  if (geom.centralShadowKind === "umbra") {
    return "Totality (central shadow)";
  }
  return "Partial";
}

function lunarCurrentPhase(frame: EclipseFrame): string | null {
  const geom = frame.lunarGeometry;
  if (!geom) {
    return null;
  }
  if (geom.phase === "total-umbral") {
    return "Total";
  }
  if (geom.phase === "partial-umbral") {
    return "Partial umbral";
  }
  if (geom.phase === "penumbral") {
    return "Penumbral";
  }
  return null;
}

function localFromCircumstances(
  circumstances: ReferenceCityEclipseCircumstances | null,
  cityName: string,
  eventId: string,
  kind: "solar" | "lunar",
): EclipsePresentationLocal | null {
  if (!circumstances || !cityName) {
    return null;
  }
  if (kind === "solar") {
    if (circumstances.globalSolarEventId !== eventId || !circumstances.solar) {
      return null;
    }
    const solar = circumstances.solar;
    return {
      cityName,
      visible: solar.locallyVisible,
      kindLabel: solar.locallyVisible ? solarKindLabel(solar.observableKind) : null,
      obscuration: solar.obscuration,
      magnitude: solar.magnitude,
      c1UtcMs: solar.c1?.utcMs ?? null,
      maximumUtcMs: solar.maximum?.utcMs ?? null,
      c4UtcMs: solar.c4?.utcMs ?? null,
    };
  }
  if (circumstances.globalLunarEventId !== eventId || !circumstances.lunar) {
    return null;
  }
  const lunar = circumstances.lunar;
  return {
    cityName,
    visible: lunar.locallyVisible,
    kindLabel: lunarKindLabel(lunar.globalSubtype),
    obscuration: null,
    magnitude: null,
    c1UtcMs: lunar.contacts.find((c) => c.id === "p1" && c.aboveHorizon)?.utcMs ?? null,
    maximumUtcMs: lunar.localMaximum?.utcMs ?? null,
    c4UtcMs: lunar.contacts.find((c) => c.id === "p4" && c.aboveHorizon)?.utcMs ?? null,
  };
}

export function buildSolarEclipsePresentationState(
  input: BuildEclipsePresentationStateInput,
): EclipsePresentationState | null {
  if (!input.frame || !input.solarEnabled || !input.frame.support.supported) {
    return null;
  }
  const solar = solarPresentationOrHidden(true, input.solar);
  const event = presentedPrimarySolar(input.frame, solar);
  if (!event) {
    return null;
  }
  const productUtcMs = input.frame.productUtcMs;
  const active = presentedActiveSolar(input.frame, solar);
  const lifecycle = active && active.id === event.id ? "active" : "upcoming";
  const relative =
    lifecycle === "upcoming" ? formatEclipseRelativeTime(productUtcMs, event.globalStartMs) : null;
  const map = solarEclipseMapLabel({
    event,
    lifecycle,
    productUtcMs,
    latDeg: 0,
    lonDeg: 0,
  });
  return {
    kind: "solar",
    lifecycle,
    eventId: event.id,
    globalTitle: solarEclipseTypeTitle(event.subtype),
    currentShadow: lifecycle === "active" && active ? solarCurrentShadow(input.frame) : null,
    relativeTime: relative && relative !== "now" ? relative : null,
    productUtcMs,
    startUtcMs: event.globalStartMs,
    local: localFromCircumstances(input.circumstances, input.cityName, event.id, "solar"),
    mapLabelText: map.text,
  };
}

export function buildLunarEclipsePresentationState(
  input: BuildEclipsePresentationStateInput,
): EclipsePresentationState | null {
  if (!input.frame || !input.lunarEnabled || !input.frame.support.supported) {
    return null;
  }
  const lunar = lunarPresentationOrHidden(true, input.lunar);
  const event = presentedPrimaryLunar(input.frame, lunar);
  if (!event) {
    return null;
  }
  const productUtcMs = input.frame.productUtcMs;
  const activeLunar = presentedActiveLunar(input.frame, lunar);
  const lifecycle = activeLunar && activeLunar.id === event.id ? "active" : "upcoming";
  const relative =
    lifecycle === "upcoming" ? formatEclipseRelativeTime(productUtcMs, event.globalStartMs) : null;
  const map = lunarEclipseMapLabel({
    event,
    lifecycle,
    productUtcMs,
    latDeg: 0,
    lonDeg: 0,
  });
  return {
    kind: "lunar",
    lifecycle,
    eventId: event.id,
    globalTitle: lunarEclipseTypeTitle(event.subtype),
    currentShadow: lifecycle === "active" && activeLunar ? lunarCurrentPhase(input.frame) : null,
    relativeTime: relative && relative !== "now" ? relative : null,
    productUtcMs,
    startUtcMs: event.globalStartMs,
    local: localFromCircumstances(input.circumstances, input.cityName, event.id, "lunar"),
    mapLabelText: map.text,
  };
}

export function buildEclipsePresentationState(
  input: BuildEclipsePresentationStateInput,
): EclipsePresentationState | null {
  if (!input.frame || !(input.solarEnabled || input.lunarEnabled)) {
    return null;
  }
  if (!input.frame.support.supported) {
    return null;
  }
  const solar = solarPresentationOrHidden(input.solarEnabled, input.solar);
  const lunar = lunarPresentationOrHidden(input.lunarEnabled, input.lunar);
  const primary = presentedPrimaryEclipse(input.frame, solar, lunar);
  if (!primary) {
    return null;
  }
  const productUtcMs = input.frame.productUtcMs;
  if (primary.kind === "solar") {
    const active = presentedActiveSolar(input.frame, solar);
    const event = primary.event;
    const lifecycle = primary.lifecycle;
    const relative =
      lifecycle === "upcoming"
        ? formatEclipseRelativeTime(productUtcMs, event.globalStartMs)
        : null;
    const map = solarEclipseMapLabel({
      event,
      lifecycle,
      productUtcMs,
      latDeg: 0,
      lonDeg: 0,
    });
    return {
      kind: "solar",
      lifecycle,
      eventId: event.id,
      globalTitle: solarEclipseTypeTitle(event.subtype),
      currentShadow: lifecycle === "active" && active ? solarCurrentShadow(input.frame) : null,
      relativeTime: relative && relative !== "now" ? relative : null,
      productUtcMs,
      startUtcMs: event.globalStartMs,
      local: localFromCircumstances(input.circumstances, input.cityName, event.id, "solar"),
      mapLabelText: map.text,
    };
  }
  const activeLunar = presentedActiveLunar(input.frame, lunar);
  const event = primary.event;
  const lifecycle = primary.lifecycle;
  const relative =
    lifecycle === "upcoming"
      ? formatEclipseRelativeTime(productUtcMs, event.globalStartMs)
      : null;
  const map = lunarEclipseMapLabel({
    event,
    lifecycle,
    productUtcMs,
    latDeg: 0,
    lonDeg: 0,
  });
  return {
    kind: "lunar",
    lifecycle,
    eventId: event.id,
    globalTitle: lunarEclipseTypeTitle(event.subtype),
    currentShadow: lifecycle === "active" && activeLunar ? lunarCurrentPhase(input.frame) : null,
    relativeTime: relative && relative !== "now" ? relative : null,
    productUtcMs,
    startUtcMs: event.globalStartMs,
    local: localFromCircumstances(input.circumstances, input.cityName, event.id, "lunar"),
    mapLabelText: map.text,
  };
}
