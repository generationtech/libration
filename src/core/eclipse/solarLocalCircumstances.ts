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
 * Besselian local solar-eclipse circumstances for a terrestrial observer.
 *
 * Reduction follows Chauvenet / Explanatory Supplement (1974) on the IAU 1976
 * figure already used by E1 geographic conversion. Contact times are roots of
 * the fundamental-plane distance functions, not a wall-clock search and not a
 * distance-from-centerline approximation.
 *
 * Root functions (Earth equatorial radii):
 *   f_pen(t) = m(t)² − L1'(t)²     external contacts C1/C4 when f_pen = 0
 *   f_umb(t) = m(t)² − |L2'(t)|²   internal contacts C2/C3 when f_umb = 0
 *   g(t)     = u u̇ + v v̇           local maximum when g = 0 (minimum m)
 *
 * m = hypot(x−ξ, y−η) is the observer–axis distance in the fundamental plane.
 * L1' = l1 − ζ tan f1 (penumbral radius in the observer plane).
 * L2' = l2 − ζ tan f2 (signed umbral/antumbral radius; negative in the umbra).
 *
 * Solver: 30 s sampling over the Besselian validity ∩ event interval, then
 * bisection (48 iters) with a short Newton polish. Time tolerance 1 ms.
 * Iteration cap: 48 bisection + 8 Newton. Failure → that contact is omitted
 * (never invented). C2/C3 are omitted unless f_umb is negative at some sample
 * (local total or annular). No false roots: a bracket is accepted only when
 * the cone radius is positive and the sampled sign change is real.
 *
 * H = μ + λ_geo − ω ΔT, matching the inverse of {@link geographicFromXiEta}
 * (λ_eph = atan2(ξ, …) − μ; geographic east longitude adds sidereal ΔT).
 *
 * Magnitude (NASA): (L1' − m) / (L1' + L2') at local maximum, signed L2'.
 * Obscuration: circle-overlap area fraction from apparent Sun/Moon radii
 * Rs = (L1'+L2')/2, Rm = (L1'−L2')/2, separation m. Not equal to magnitude.
 */

import {
  evaluateBesselianElementsAndRates,
  utcMsFromBesselianHours,
  type EvaluatedBesselianElementsAndRates,
} from "./besselianElements";
import { EARTH_SIDEREAL_DEG_PER_SECOND } from "./earthFigure";
import type {
  SolarLocalCircumstances,
  SolarLocalContact,
  SolarLocalKind,
} from "./referenceCityEclipseTypes";
import type { SolarEclipseEvent } from "./solarEclipseTypes";
import {
  SOLAR_OBSERVER_CONE_RADIUS_MIN,
  solarEclipseMagnitudeFromPlane,
  solarEclipseObscurationFromPlane,
  solarObserverFixed,
  type SolarObserverFixed,
} from "./solarObserverPlane";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const SAMPLE_STEP_MS = 30_000;
const BISECTION_ITERS = 48;
const NEWTON_ITERS = 8;
const TIME_TOL_MS = 1;
const CONE_RADIUS_MIN = SOLAR_OBSERVER_CONE_RADIUS_MIN;

type ObserverFixed = SolarObserverFixed;

type ObserverPlaneState = {
  readonly utcMs: number;
  readonly u: number;
  readonly v: number;
  readonly uDot: number;
  readonly vDot: number;
  readonly m: number;
  readonly l1p: number;
  readonly l2p: number;
  readonly l1pDot: number;
  readonly l2pDot: number;
  readonly zeta: number;
  readonly altitudeDeg: number;
  readonly azimuthDeg: number;
  readonly fPen: number;
  readonly fUmb: number;
  readonly g: number;
  readonly insideWindow: boolean;
};

function observerFixed(latitudeDeg: number, longitudeDeg: number): ObserverFixed {
  return solarObserverFixed(latitudeDeg, longitudeDeg);
}

function observerState(
  event: SolarEclipseEvent,
  obs: ObserverFixed,
  utcMs: number,
): ObserverPlaneState {
  const el: EvaluatedBesselianElementsAndRates = evaluateBesselianElementsAndRates(
    event.besselian,
    utcMs,
  );
  const d = el.dDeg * DEG;
  const sind = Math.sin(d);
  const cosd = Math.cos(d);
  const hDeg =
    el.muDeg + obs.longitudeDeg - EARTH_SIDEREAL_DEG_PER_SECOND * el.deltaTSeconds;
  const h = hDeg * DEG;
  const sinh = Math.sin(h);
  const cosh = Math.cos(h);
  const xi = obs.rhoCosPhi1 * sinh;
  const eta = obs.rhoSinPhi1 * cosd - obs.rhoCosPhi1 * sind * cosh;
  const zeta = obs.rhoSinPhi1 * sind + obs.rhoCosPhi1 * cosd * cosh;
  const hDot = el.muDegDot * DEG;
  const dDot = el.dDegDot * DEG;
  const xiDot = obs.rhoCosPhi1 * cosh * hDot;
  const etaDot =
    -obs.rhoSinPhi1 * sind * dDot -
    obs.rhoCosPhi1 * (cosd * cosh * dDot - sind * sinh * hDot);
  const zetaDot =
    obs.rhoSinPhi1 * cosd * dDot +
    obs.rhoCosPhi1 * (-sind * cosh * dDot - cosd * sinh * hDot);
  const u = el.x - xi;
  const v = el.y - eta;
  const uDot = el.xDot - xiDot;
  const vDot = el.yDot - etaDot;
  const m = Math.hypot(u, v);
  const l1p = el.l1 - zeta * el.tanF1;
  const l2p = el.l2 - zeta * el.tanF2;
  const l1pDot = el.l1Dot - zetaDot * el.tanF1;
  const l2pDot = el.l2Dot - zetaDot * el.tanF2;
  const fPen = m * m - l1p * l1p;
  const lInt = Math.abs(l2p);
  const fUmb = m * m - lInt * lInt;
  const g = u * uDot + v * vDot;
  const sinAlt = obs.rho > 0 ? zeta / obs.rho : 0;
  const altitudeDeg = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD;
  const cosAlt = Math.cos(altitudeDeg * DEG);
  let azimuthDeg = 0;
  if (cosAlt > 1e-9) {
    const sinA = (-Math.cos(d) * sinh) / Math.max(1e-12, cosAlt);
    const cosA = (obs.cosPhi * Math.sin(d) - obs.sinPhi * Math.cos(d) * cosh) / Math.max(1e-12, cosAlt);
    azimuthDeg = ((Math.atan2(sinA, cosA) * RAD) + 360) % 360;
  }
  return {
    utcMs,
    u,
    v,
    uDot,
    vDot,
    m,
    l1p,
    l2p,
    l1pDot,
    l2pDot,
    zeta,
    altitudeDeg,
    azimuthDeg,
    fPen,
    fUmb,
    g,
    insideWindow: el.insideElementWindow,
  };
}

function aboveHorizon(altitudeDeg: number): boolean {
  return altitudeDeg >= 0;
}

function contactFromState(
  id: SolarLocalContact["id"],
  st: ObserverPlaneState,
): SolarLocalContact {
  return {
    id,
    utcMs: st.utcMs,
    altitudeDeg: st.altitudeDeg,
    azimuthDeg: st.azimuthDeg,
    aboveHorizon: aboveHorizon(st.altitudeDeg),
  };
}

function eventWindowUtc(event: SolarEclipseEvent): { startMs: number; endMs: number } {
  const el = event.besselian;
  const winStart = utcMsFromBesselianHours(el, el.tMinHours);
  const winEnd = utcMsFromBesselianHours(el, el.tMaxHours);
  return {
    startMs: Math.max(event.globalStartMs, winStart),
    endMs: Math.min(event.globalEndMs, winEnd),
  };
}

function bisectRoot(
  event: SolarEclipseEvent,
  obs: ObserverFixed,
  leftMs: number,
  rightMs: number,
  value: (st: ObserverPlaneState) => number,
): number | null {
  let a = leftMs;
  let b = rightMs;
  let fa = value(observerState(event, obs, a));
  let fb = value(observerState(event, obs, b));
  if (!(Number.isFinite(fa) && Number.isFinite(fb)) || fa * fb > 0) {
    return null;
  }
  for (let i = 0; i < BISECTION_ITERS; i += 1) {
    const mid = (a + b) / 2;
    if (b - a <= TIME_TOL_MS) {
      return mid;
    }
    const fm = value(observerState(event, obs, mid));
    if (!Number.isFinite(fm)) {
      return null;
    }
    if (fm === 0) {
      return mid;
    }
    if (fa * fm <= 0) {
      b = mid;
      fb = fm;
    } else {
      a = mid;
      fa = fm;
    }
  }
  return (a + b) / 2;
}

function newtonPolish(
  event: SolarEclipseEvent,
  obs: ObserverFixed,
  utcMs: number,
  value: (st: ObserverPlaneState) => number,
  deriv: (st: ObserverPlaneState) => number,
  lo: number,
  hi: number,
): number {
  let t = utcMs;
  for (let i = 0; i < NEWTON_ITERS; i += 1) {
    const st = observerState(event, obs, t);
    const f = value(st);
    const fp = deriv(st);
    if (!Number.isFinite(f) || !Number.isFinite(fp) || Math.abs(fp) < 1e-18) {
      break;
    }
    const hoursPerMs = 1 / 3_600_000;
    const dtMs = -(f / fp) / hoursPerMs;
    if (!Number.isFinite(dtMs) || Math.abs(dtMs) < TIME_TOL_MS) {
      t = Math.max(lo, Math.min(hi, t + dtMs));
      break;
    }
    t = Math.max(lo, Math.min(hi, t + dtMs));
  }
  return t;
}

function fPen(st: ObserverPlaneState): number {
  return st.fPen;
}

function fPenDeriv(st: ObserverPlaneState): number {
  return 2 * (st.u * st.uDot + st.v * st.vDot - st.l1p * st.l1pDot);
}

function fUmb(st: ObserverPlaneState): number {
  return st.fUmb;
}

function fUmbDeriv(st: ObserverPlaneState): number {
  const sign = st.l2p >= 0 ? 1 : -1;
  const lInt = Math.abs(st.l2p);
  const lIntDot = sign * st.l2pDot;
  return 2 * (st.u * st.uDot + st.v * st.vDot - lInt * lIntDot);
}

function gMax(st: ObserverPlaneState): number {
  return st.g;
}

function refine(
  event: SolarEclipseEvent,
  obs: ObserverFixed,
  leftMs: number,
  rightMs: number,
  value: (st: ObserverPlaneState) => number,
  deriv: (st: ObserverPlaneState) => number,
): ObserverPlaneState | null {
  const root = bisectRoot(event, obs, leftMs, rightMs, value);
  if (root === null) {
    return null;
  }
  const polished = newtonPolish(event, obs, root, value, deriv, leftMs, rightMs);
  return observerState(event, obs, polished);
}

function geographicKindFromState(st: ObserverPlaneState, hasInternal: boolean): SolarLocalKind {
  if (!(st.l1p > CONE_RADIUS_MIN) || st.m > st.l1p + 1e-6) {
    return "none";
  }
  if (!hasInternal) {
    return "partial";
  }
  return st.l2p < 0 ? "total" : "annular";
}

function observableKindFromContacts(
  geographic: SolarLocalKind,
  c1: SolarLocalContact | null,
  c2: SolarLocalContact | null,
  maximum: SolarLocalContact | null,
  c3: SolarLocalContact | null,
  c4: SolarLocalContact | null,
): { kind: SolarLocalKind; visible: boolean; reason: SolarLocalCircumstances["notVisibleReason"] } {
  if (geographic === "none") {
    return { kind: "none", visible: false, reason: "outside_footprint" };
  }
  const anyAbove = [c1, c2, maximum, c3, c4].some((c) => c?.aboveHorizon === true);
  if (!anyAbove) {
    return { kind: "none", visible: false, reason: "below_horizon" };
  }
  const centralVisible =
    (c2?.aboveHorizon === true || c3?.aboveHorizon === true) &&
    (geographic === "total" || geographic === "annular");
  if (centralVisible) {
    return { kind: geographic, visible: true, reason: null };
  }
  return { kind: "partial", visible: true, reason: null };
}

function magnitudeAtMaximum(st: ObserverPlaneState): number | null {
  return solarEclipseMagnitudeFromPlane(st.l1p, st.l2p, st.m);
}

function obscurationAtMaximum(st: ObserverPlaneState): number | null {
  const frac = solarEclipseObscurationFromPlane(st.l1p, st.l2p, st.m);
  const rs = (st.l1p + st.l2p) / 2;
  const rm = (st.l1p - st.l2p) / 2;
  if (!(rs > 0) || !(rm >= 0)) {
    return null;
  }
  return frac;
}

export function solveSolarLocalCircumstances(
  event: SolarEclipseEvent,
  latitudeDeg: number,
  longitudeDeg: number,
): SolarLocalCircumstances {
  const empty = (reason: SolarLocalCircumstances["notVisibleReason"]): SolarLocalCircumstances => ({
    eventId: event.id,
    globalSubtype: event.subtype,
    geographicKind: "none",
    observableKind: "none",
    locallyVisible: false,
    notVisibleReason: reason,
    c1: null,
    c2: null,
    maximum: null,
    c3: null,
    c4: null,
    magnitude: null,
    obscuration: null,
  });
  if (!Number.isFinite(latitudeDeg) || !Number.isFinite(longitudeDeg)) {
    return empty("outside_footprint");
  }
  const obs = observerFixed(latitudeDeg, longitudeDeg);
  const { startMs, endMs } = eventWindowUtc(event);
  if (!(endMs > startMs)) {
    return empty("outside_footprint");
  }
  const samples: ObserverPlaneState[] = [];
  for (let t = startMs; t <= endMs; t += SAMPLE_STEP_MS) {
    samples.push(observerState(event, obs, t));
  }
  if (samples[samples.length - 1]!.utcMs !== endMs) {
    samples.push(observerState(event, obs, endMs));
  }

  const penBrackets: { left: ObserverPlaneState; right: ObserverPlaneState }[] = [];
  const umbBrackets: { left: ObserverPlaneState; right: ObserverPlaneState }[] = [];
  let minM = samples[0]!;
  let daytimeInside = false;
  let sawUmbInside = false;
  for (let i = 0; i < samples.length; i += 1) {
    const st = samples[i]!;
    if (st.m < minM.m) {
      minM = st;
    }
    const sunUp = aboveHorizon(st.altitudeDeg);
    if (sunUp && st.l1p > CONE_RADIUS_MIN && st.m <= st.l1p) {
      daytimeInside = true;
    }
    if (sunUp && st.l1p > CONE_RADIUS_MIN && st.fUmb < 0) {
      sawUmbInside = true;
    }
    if (i === 0) {
      continue;
    }
    const prev = samples[i - 1]!;
    if (prev.l1p > CONE_RADIUS_MIN && st.l1p > CONE_RADIUS_MIN && prev.fPen * st.fPen <= 0) {
      penBrackets.push({ left: prev, right: st });
    }
    if (
      Math.abs(prev.l2p) > CONE_RADIUS_MIN &&
      Math.abs(st.l2p) > CONE_RADIUS_MIN &&
      prev.fUmb * st.fUmb <= 0
    ) {
      umbBrackets.push({ left: prev, right: st });
    }
  }

  const penRoots: ObserverPlaneState[] = [];
  for (const b of penBrackets) {
    const st = refine(event, obs, b.left.utcMs, b.right.utcMs, fPen, fPenDeriv);
    if (st && st.l1p > CONE_RADIUS_MIN) {
      penRoots.push(st);
    }
  }
  penRoots.sort((a, b) => a.utcMs - b.utcMs);

  let c1: SolarLocalContact | null = null;
  let c4: SolarLocalContact | null = null;
  if (penRoots.length >= 2) {
    c1 = contactFromState("c1", penRoots[0]!);
    c4 = contactFromState("c4", penRoots[penRoots.length - 1]!);
  } else if (penRoots.length === 1 && minM.fPen < 0) {
    const only = penRoots[0]!;
    if (only.utcMs < minM.utcMs) {
      c1 = contactFromState("c1", only);
    } else {
      c4 = contactFromState("c4", only);
    }
  }

  const umbRoots: ObserverPlaneState[] = [];
  if (sawUmbInside) {
    for (const b of umbBrackets) {
      const st = refine(event, obs, b.left.utcMs, b.right.utcMs, fUmb, fUmbDeriv);
      if (st && Math.abs(st.l2p) > CONE_RADIUS_MIN) {
        umbRoots.push(st);
      }
    }
    umbRoots.sort((a, b) => a.utcMs - b.utcMs);
  }

  let c2: SolarLocalContact | null = null;
  let c3: SolarLocalContact | null = null;
  if (umbRoots.length >= 2) {
    c2 = contactFromState("c2", umbRoots[0]!);
    c3 = contactFromState("c3", umbRoots[umbRoots.length - 1]!);
  }

  let maxState: ObserverPlaneState | null = null;
  const gBrackets: { left: ObserverPlaneState; right: ObserverPlaneState }[] = [];
  for (let i = 1; i < samples.length; i += 1) {
    const prev = samples[i - 1]!;
    const st = samples[i]!;
    if (prev.g * st.g <= 0) {
      gBrackets.push({ left: prev, right: st });
    }
  }
  const gCandidates: ObserverPlaneState[] = [];
  for (const b of gBrackets) {
    const st = refine(event, obs, b.left.utcMs, b.right.utcMs, gMax, (s) => {
      const dt = 1_000;
      const n = observerState(event, obs, Math.min(endMs, s.utcMs + dt));
      return (n.g - s.g) / (dt / 3_600_000);
    });
    if (st) {
      gCandidates.push(st);
    }
  }
  if (gCandidates.length > 0) {
    maxState = gCandidates.reduce((best, st) => (st.m < best.m ? st : best));
  } else {
    maxState = minM;
  }
  if (c1 && c4 && (maxState.utcMs < c1.utcMs || maxState.utcMs > c4.utcMs)) {
    maxState = observerState(
      event,
      obs,
      Math.max(c1.utcMs, Math.min(c4.utcMs, maxState.utcMs)),
    );
  }

  const inPenumbra = maxState.l1p > CONE_RADIUS_MIN && maxState.m <= maxState.l1p + 1e-5;
  if (!daytimeInside && !aboveHorizon(maxState.altitudeDeg)) {
    return empty("outside_footprint");
  }
  if (!inPenumbra && !c1 && !c4) {
    return empty("outside_footprint");
  }

  const hasInternal = c2 !== null && c3 !== null;
  const geographic = geographicKindFromState(maxState, hasInternal);
  const maximum = contactFromState("maximum", maxState);
  const mag = inPenumbra ? magnitudeAtMaximum(maxState) : null;
  const obsFrac = inPenumbra ? obscurationAtMaximum(maxState) : null;
  const observed = observableKindFromContacts(geographic, c1, c2, maximum, c3, c4);

  return {
    eventId: event.id,
    globalSubtype: event.subtype,
    geographicKind: geographic,
    observableKind: observed.kind,
    locallyVisible: observed.visible,
    notVisibleReason: observed.reason,
    c1,
    c2: hasInternal ? c2 : null,
    maximum: inPenumbra ? maximum : null,
    c3: hasInternal ? c3 : null,
    c4,
    magnitude: mag,
    obscuration: obsFrac,
  };
}
