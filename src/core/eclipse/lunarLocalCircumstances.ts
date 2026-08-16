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
 * Lunar eclipse circumstances for a terrestrial observer.
 *
 * Global contacts come from the NASA/Espenak–Meeus event. This module does not
 * re-solve lunar contacts. It evaluates geometric Moon altitude at each global
 * contact, finds geometric moonrise/moonset inside the event interval, and
 * derives the locally visible maximum (global GE when the Moon is up; otherwise
 * the visible instant closest to GE).
 *
 * Geometric horizon only: altitude = asin(sphericalMoonAltitudeCosine).
 * No atmospheric refraction.
 */

import { lunarEclipseGeometryAt } from "./lunarEclipseGeometry";
import type { LunarEclipseEvent } from "./lunarEclipseTypes";
import type {
  LunarHorizonCrossing,
  LunarLocalCircumstances,
  LunarLocalContact,
  LunarLocalContactId,
  LunarLocalMaximum,
} from "./referenceCityEclipseTypes";
import {
  geometricMoonAltitudeDeg,
  geometricMoonAzimuthDeg,
  sphericalMoonAltitudeCosine,
} from "./lunarVisibilityGeometry";
import { sublunarPoint } from "../sublunarPoint";

const SAMPLE_STEP_MS = 120_000;
const BISECTION_ITERS = 40;
const TIME_TOL_MS = 250;

const CONTACT_ORDER: readonly LunarLocalContactId[] = [
  "p1",
  "u1",
  "u2",
  "greatest",
  "u3",
  "u4",
  "p4",
];

function contactUtc(event: LunarEclipseEvent, id: LunarLocalContactId): number | null {
  switch (id) {
    case "p1":
      return event.p1UtcMs;
    case "u1":
      return event.u1UtcMs;
    case "u2":
      return event.u2UtcMs;
    case "greatest":
      return event.greatestEclipseUtcMs;
    case "u3":
      return event.u3UtcMs;
    case "u4":
      return event.u4UtcMs;
    case "p4":
      return event.p4UtcMs;
  }
}

function sampleAt(
  utcMs: number,
  latDeg: number,
  lonDeg: number,
): { altitudeDeg: number; azimuthDeg: number; aboveHorizon: boolean } {
  const moon = sublunarPoint(utcMs);
  const altitudeDeg = geometricMoonAltitudeDeg(latDeg, lonDeg, moon.latDeg, moon.lonDeg);
  const azimuthDeg = geometricMoonAzimuthDeg(latDeg, lonDeg, moon.latDeg, moon.lonDeg);
  return { altitudeDeg, azimuthDeg, aboveHorizon: altitudeDeg >= 0 };
}

function cosineAt(utcMs: number, latDeg: number, lonDeg: number): number {
  const moon = sublunarPoint(utcMs);
  return sphericalMoonAltitudeCosine(latDeg, lonDeg, moon.latDeg, moon.lonDeg);
}

function bisectHorizon(
  leftMs: number,
  rightMs: number,
  latDeg: number,
  lonDeg: number,
): number {
  let a = leftMs;
  let b = rightMs;
  let fa = cosineAt(a, latDeg, lonDeg);
  for (let i = 0; i < BISECTION_ITERS; i += 1) {
    const mid = (a + b) / 2;
    if (b - a <= TIME_TOL_MS) {
      return mid;
    }
    const fm = cosineAt(mid, latDeg, lonDeg);
    if (fa * fm <= 0) {
      b = mid;
    } else {
      a = mid;
      fa = fm;
    }
  }
  return (a + b) / 2;
}

function horizonCrossings(
  event: LunarEclipseEvent,
  latDeg: number,
  lonDeg: number,
): LunarHorizonCrossing[] {
  const start = event.globalStartMs;
  const end = event.globalEndMs;
  const out: LunarHorizonCrossing[] = [];
  let prevMs = start;
  let prevC = cosineAt(prevMs, latDeg, lonDeg);
  for (let t = start + SAMPLE_STEP_MS; t <= end; t += SAMPLE_STEP_MS) {
    const c = cosineAt(t, latDeg, lonDeg);
    if (prevC === 0 || c === 0 || prevC * c < 0) {
      const utcMs = bisectHorizon(prevMs, t, latDeg, lonDeg);
      const s = sampleAt(utcMs, latDeg, lonDeg);
      out.push({
        kind: prevC < 0 || (prevC === 0 && c > 0) ? "moonrise" : "moonset",
        utcMs,
        altitudeDeg: s.altitudeDeg,
        azimuthDeg: s.azimuthDeg,
        aboveHorizon: true,
      });
    }
    prevMs = t;
    prevC = c;
  }
  if (prevMs < end) {
    const c = cosineAt(end, latDeg, lonDeg);
    if (prevC * c < 0) {
      const utcMs = bisectHorizon(prevMs, end, latDeg, lonDeg);
      const s = sampleAt(utcMs, latDeg, lonDeg);
      out.push({
        kind: prevC < 0 ? "moonrise" : "moonset",
        utcMs,
        altitudeDeg: s.altitudeDeg,
        azimuthDeg: s.azimuthDeg,
        aboveHorizon: true,
      });
    }
  }
  return out;
}

function localMaximum(
  event: LunarEclipseEvent,
  latDeg: number,
  lonDeg: number,
  geSample: { altitudeDeg: number; azimuthDeg: number; aboveHorizon: boolean },
  crossings: readonly LunarHorizonCrossing[],
  visibleContacts: readonly LunarLocalContact[],
): LunarLocalMaximum | null {
  if (geSample.aboveHorizon) {
    const g = lunarEclipseGeometryAt(event, event.greatestEclipseUtcMs);
    return {
      source: "global_greatest",
      utcMs: event.greatestEclipseUtcMs,
      altitudeDeg: geSample.altitudeDeg,
      azimuthDeg: geSample.azimuthDeg,
      aboveHorizon: true,
      umbralMagnitude: g.umbralMagnitude,
      penumbralMagnitude: g.penumbralMagnitude,
    };
  }
  const candidates: { utcMs: number; source: LunarLocalMaximum["source"] }[] = [];
  for (const x of crossings) {
    candidates.push({ utcMs: x.utcMs, source: x.kind });
  }
  for (const c of visibleContacts) {
    if (c.id !== "greatest") {
      candidates.push({ utcMs: c.utcMs, source: "visible_contact" });
    }
  }
  if (candidates.length === 0) {
    return null;
  }
  const ge = event.greatestEclipseUtcMs;
  let best = candidates[0]!;
  for (const c of candidates) {
    if (Math.abs(c.utcMs - ge) < Math.abs(best.utcMs - ge)) {
      best = c;
    }
  }
  const s = sampleAt(best.utcMs, latDeg, lonDeg);
  const g = lunarEclipseGeometryAt(event, best.utcMs);
  return {
    source: best.source,
    utcMs: best.utcMs,
    altitudeDeg: s.altitudeDeg,
    azimuthDeg: s.azimuthDeg,
    aboveHorizon: s.aboveHorizon,
    umbralMagnitude: g.umbralMagnitude,
    penumbralMagnitude: g.penumbralMagnitude,
  };
}

export function solveLunarLocalCircumstances(
  event: LunarEclipseEvent,
  latitudeDeg: number,
  longitudeDeg: number,
): LunarLocalCircumstances {
  const contacts: LunarLocalContact[] = [];
  for (const id of CONTACT_ORDER) {
    const utcMs = contactUtc(event, id);
    if (utcMs === null) {
      continue;
    }
    const s = sampleAt(utcMs, latitudeDeg, longitudeDeg);
    contacts.push({
      id,
      globallyPresent: true,
      utcMs,
      altitudeDeg: s.altitudeDeg,
      azimuthDeg: s.azimuthDeg,
      aboveHorizon: s.aboveHorizon,
    });
  }
  const crossings = horizonCrossings(event, latitudeDeg, longitudeDeg);
  const visibleContacts = contacts.filter((c) => c.aboveHorizon);
  const locallyVisible = visibleContacts.length > 0 || crossings.length > 0;
  const ge = contacts.find((c) => c.id === "greatest");
  const geSample = ge
    ? { altitudeDeg: ge.altitudeDeg, azimuthDeg: ge.azimuthDeg, aboveHorizon: ge.aboveHorizon }
    : sampleAt(event.greatestEclipseUtcMs, latitudeDeg, longitudeDeg);
  const maximum = localMaximum(
    event,
    latitudeDeg,
    longitudeDeg,
    geSample,
    crossings,
    visibleContacts,
  );
  const firstVisible = visibleContacts[0] ?? null;
  const lastVisible = visibleContacts[visibleContacts.length - 1] ?? null;
  const u2 = contacts.find((c) => c.id === "u2");
  const u3 = contacts.find((c) => c.id === "u3");
  const totalityVisible =
    event.subtype === "total" &&
    ((u2?.aboveHorizon === true && u3?.aboveHorizon === true) ||
      (maximum?.source === "global_greatest" &&
        geSample.aboveHorizon &&
        event.subtype === "total"));
  const u1 = contacts.find((c) => c.id === "u1");
  const u4 = contacts.find((c) => c.id === "u4");
  const partialityVisible =
    (u1?.aboveHorizon === true || u4?.aboveHorizon === true || u2?.aboveHorizon === true) &&
    event.subtype !== "penumbral";
  const moonUpAtStart = sampleAt(event.globalStartMs, latitudeDeg, longitudeDeg).aboveHorizon;
  const moonUpAtEnd = sampleAt(event.globalEndMs, latitudeDeg, longitudeDeg).aboveHorizon;
  const inProgressAtMoonrise = crossings.some((x) => x.kind === "moonrise") && !moonUpAtStart;
  const endsAfterMoonset = crossings.some((x) => x.kind === "moonset") && !moonUpAtEnd;
  return {
    eventId: event.id,
    globalSubtype: event.subtype,
    locallyVisible,
    totalityVisible: event.subtype === "total" ? Boolean(totalityVisible) : false,
    partialityVisible: Boolean(partialityVisible) || (locallyVisible && event.subtype === "partial"),
    inProgressAtMoonrise,
    endsAfterMoonset,
    contacts,
    firstVisibleContactId: firstVisible?.id ?? null,
    lastVisibleContactId: lastVisible?.id ?? null,
    horizonCrossings: crossings,
    localMaximum: locallyVisible ? maximum : null,
  };
}
