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
 * Instantaneous local solar-eclipse obscuration at a geographic point.
 *
 * Physical quantity: fraction of the apparent solar-disc *area* covered by the
 * Moon (0–1). This is presentation-independent. Daylight attenuation mapping
 * lives in {@link solarEclipseVisualTransmission01}.
 *
 * Horizon: geometric solar altitude from the Besselian observer plane; no
 * refraction. Below-horizon samples report obscuration 0 so ordinary night
 * shading retains ownership of the night side.
 */

import { evaluateBesselianElements } from "./besselianElements";
import type { SolarEclipseEvent } from "./solarEclipseTypes";
import {
  SOLAR_OBSERVER_CONE_RADIUS_MIN,
  solarEclipseMagnitudeFromPlane,
  solarEclipseObscurationFromPlane,
  solarObserverFixed,
  solarObserverPlaneInstant,
  solarObserverSunAboveHorizon,
} from "./solarObserverPlane";

export type SolarEclipseObscurationSample = {
  readonly obscuration01: number;
  readonly magnitude: number | null;
  readonly altitudeDeg: number;
  readonly sunAboveHorizon: boolean;
  readonly inPenumbra: boolean;
};

const EMPTY: SolarEclipseObscurationSample = {
  obscuration01: 0,
  magnitude: null,
  altitudeDeg: -90,
  sunAboveHorizon: false,
  inPenumbra: false,
};

export function solarEclipseObscurationAt(
  utcMs: number,
  event: SolarEclipseEvent,
  latitudeDeg: number,
  longitudeDeg: number,
): SolarEclipseObscurationSample {
  if (!Number.isFinite(utcMs) || !Number.isFinite(latitudeDeg) || !Number.isFinite(longitudeDeg)) {
    return EMPTY;
  }
  if (utcMs < event.globalStartMs || utcMs > event.globalEndMs) {
    return EMPTY;
  }
  const el = evaluateBesselianElements(event.besselian, utcMs);
  const obs = solarObserverFixed(latitudeDeg, longitudeDeg);
  return solarEclipseObscurationFromElements(el, obs);
}

export function solarEclipseObscurationFromElements(
  el: ReturnType<typeof evaluateBesselianElements>,
  obs: ReturnType<typeof solarObserverFixed>,
): SolarEclipseObscurationSample {
  const st = solarObserverPlaneInstant(el, obs);
  const sunAboveHorizon = solarObserverSunAboveHorizon(st.altitudeDeg);
  if (!st.insideWindow) {
    return {
      obscuration01: 0,
      magnitude: null,
      altitudeDeg: st.altitudeDeg,
      sunAboveHorizon,
      inPenumbra: false,
    };
  }
  const inPenumbra =
    st.l1p > SOLAR_OBSERVER_CONE_RADIUS_MIN && st.m <= st.l1p + 1e-6;
  if (!sunAboveHorizon || !inPenumbra) {
    return {
      obscuration01: 0,
      magnitude: inPenumbra ? solarEclipseMagnitudeFromPlane(st.l1p, st.l2p, st.m) : null,
      altitudeDeg: st.altitudeDeg,
      sunAboveHorizon,
      inPenumbra,
    };
  }
  const obscuration01 = Math.max(
    0,
    Math.min(1, solarEclipseObscurationFromPlane(st.l1p, st.l2p, st.m)),
  );
  return {
    obscuration01,
    magnitude: solarEclipseMagnitudeFromPlane(st.l1p, st.l2p, st.m),
    altitudeDeg: st.altitudeDeg,
    sunAboveHorizon,
    inPenumbra,
  };
}
