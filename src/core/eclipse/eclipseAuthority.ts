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

import solarAuthorityJson from "../../assets/eclipse/solar-eclipse-authority-v1.json";
import type { SolarBesselianCoefficients } from "./besselianElements";
import type {
  EclipseAuthorityMetadata,
  EclipseAuthoritySupport,
  SolarEclipseEvent,
  SolarEclipseSubtype,
} from "./solarEclipseTypes";

type RawEvent = {
  id: string;
  catalogNumber: number;
  kind: "solar";
  subtype: SolarEclipseSubtype;
  typeCode: string;
  year: number;
  month: number;
  day: number;
  greatestEclipseTdtMs: number;
  greatestEclipseUtcMs: number;
  deltaTSeconds: number;
  gamma: number;
  magnitude: number;
  geLatDeg: number;
  geLonDeg: number;
  pathWidthKm: number;
  sunAltDeg: number;
  saros: number;
  lunation: number;
  t0TdtHours: number;
  tMinHours: number;
  tMaxHours: number;
  x: number[];
  y: number[];
  d: number[];
  mu: number[];
  l1: number[];
  l2: number[];
  tanF1: number;
  tanF2: number;
  globalStartMs: number;
  globalEndMs: number;
};

type RawAsset = {
  metadata: EclipseAuthorityMetadata;
  events: RawEvent[];
};

const SUBTYPES: readonly SolarEclipseSubtype[] = ["partial", "annular", "total", "hybrid"];

function fail(msg: string): never {
  throw new Error(`eclipse authority: ${msg}`);
}

function asFinite(n: unknown, label: string): number {
  if (typeof n !== "number" || !Number.isFinite(n)) {
    fail(`missing/invalid ${label}`);
  }
  return n;
}

function asTuple(arr: unknown, len: number, label: string): number[] {
  if (!Array.isArray(arr) || arr.length !== len) {
    fail(`${label} must have ${len} coefficients`);
  }
  return arr.map((v, i) => asFinite(v, `${label}[${i}]`));
}

function parseEvent(raw: RawEvent): SolarEclipseEvent {
  if (raw.kind !== "solar") {
    fail(`event ${raw.id} is not solar`);
  }
  if (!SUBTYPES.includes(raw.subtype)) {
    fail(`event ${raw.id} has unknown subtype ${raw.subtype}`);
  }
  const besselian: SolarBesselianCoefficients = {
    x: asTuple(raw.x, 4, "x") as unknown as SolarBesselianCoefficients["x"],
    y: asTuple(raw.y, 4, "y") as unknown as SolarBesselianCoefficients["y"],
    d: asTuple(raw.d, 3, "d") as unknown as SolarBesselianCoefficients["d"],
    mu: asTuple(raw.mu, 3, "mu") as unknown as SolarBesselianCoefficients["mu"],
    l1: asTuple(raw.l1, 3, "l1") as unknown as SolarBesselianCoefficients["l1"],
    l2: asTuple(raw.l2, 3, "l2") as unknown as SolarBesselianCoefficients["l2"],
    tanF1: asFinite(raw.tanF1, "tanF1"),
    tanF2: asFinite(raw.tanF2, "tanF2"),
    t0TdtHours: asFinite(raw.t0TdtHours, "t0TdtHours"),
    tMinHours: asFinite(raw.tMinHours, "tMinHours"),
    tMaxHours: asFinite(raw.tMaxHours, "tMaxHours"),
    deltaTSeconds: asFinite(raw.deltaTSeconds, "deltaTSeconds"),
    calendarYear: asFinite(raw.year, "year"),
    calendarMonth: asFinite(raw.month, "month"),
    calendarDay: asFinite(raw.day, "day"),
  };
  return {
    id: typeof raw.id === "string" && raw.id.length > 0 ? raw.id : fail("event id"),
    catalogNumber: asFinite(raw.catalogNumber, "catalogNumber"),
    kind: "solar",
    subtype: raw.subtype,
    typeCode: typeof raw.typeCode === "string" ? raw.typeCode : fail("typeCode"),
    year: besselian.calendarYear,
    month: besselian.calendarMonth,
    day: besselian.calendarDay,
    greatestEclipseTdtMs: asFinite(raw.greatestEclipseTdtMs, "greatestEclipseTdtMs"),
    greatestEclipseUtcMs: asFinite(raw.greatestEclipseUtcMs, "greatestEclipseUtcMs"),
    deltaTSeconds: besselian.deltaTSeconds,
    gamma: asFinite(raw.gamma, "gamma"),
    magnitude: asFinite(raw.magnitude, "magnitude"),
    geLatDeg: asFinite(raw.geLatDeg, "geLatDeg"),
    geLonDeg: asFinite(raw.geLonDeg, "geLonDeg"),
    pathWidthKm: asFinite(raw.pathWidthKm, "pathWidthKm"),
    sunAltDeg: asFinite(raw.sunAltDeg, "sunAltDeg"),
    saros: asFinite(raw.saros, "saros"),
    lunation: asFinite(raw.lunation, "lunation"),
    globalStartMs: asFinite(raw.globalStartMs, "globalStartMs"),
    globalEndMs: asFinite(raw.globalEndMs, "globalEndMs"),
    besselian,
  };
}

export function parseSolarEclipseAuthorityAsset(
  raw: unknown,
): { metadata: EclipseAuthorityMetadata; events: SolarEclipseEvent[] } {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    fail("missing metadata");
  }
  const asset = raw as RawAsset;
  const m = asset.metadata;
  if (!m || typeof m !== "object") {
    fail("missing metadata");
  }
  if (typeof m.authorityId !== "string" || m.authorityId.length === 0) {
    fail("missing authorityId");
  }
  if (typeof m.authorityVersion !== "string" || m.authorityVersion.length === 0) {
    fail("missing authorityVersion");
  }
  if (!m.source || typeof m.source.identity !== "string" || typeof m.source.sourceSha256 !== "string") {
    fail("missing source attribution");
  }
  if (!m.supportedUtcRange || typeof m.supportedUtcRange.startMs !== "number" || typeof m.supportedUtcRange.endMs !== "number") {
    fail("missing supportedUtcRange");
  }
  if (typeof m.attribution !== "string" || m.attribution.length === 0) {
    fail("missing attribution");
  }
  if (!Array.isArray(asset.events) || asset.events.length === 0) {
    fail("no events");
  }
  const events = asset.events.map(parseEvent);
  for (let i = 1; i < events.length; i += 1) {
    if (events[i]!.globalStartMs < events[i - 1]!.globalStartMs) {
      fail("events are not sorted by globalStartMs");
    }
  }
  return { metadata: m, events };
}

const parsed = parseSolarEclipseAuthorityAsset(solarAuthorityJson);

export const SOLAR_ECLIPSE_AUTHORITY_METADATA: EclipseAuthorityMetadata = parsed.metadata;
export const SOLAR_ECLIPSE_EVENTS: readonly SolarEclipseEvent[] = parsed.events;

const byId = new Map(SOLAR_ECLIPSE_EVENTS.map((e) => [e.id, e]));

export function isUtcWithinEclipseAuthority(utcMs: number): boolean {
  const { startMs, endMs } = SOLAR_ECLIPSE_AUTHORITY_METADATA.supportedUtcRange;
  return utcMs >= startMs && utcMs < endMs;
}

export function eclipseAuthoritySupport(utcMs: number): EclipseAuthoritySupport {
  return isUtcWithinEclipseAuthority(utcMs)
    ? { supported: true }
    : { supported: false, reason: "outside-authority-range" };
}

export function getSolarEclipseEventById(id: string): SolarEclipseEvent | undefined {
  return byId.get(id);
}

/**
 * Binary search: last event with globalStartMs <= utcMs, then scan a short window.
 */
export function activeSolarEclipseAt(utcMs: number): SolarEclipseEvent | null {
  if (!isUtcWithinEclipseAuthority(utcMs)) {
    return null;
  }
  const events = SOLAR_ECLIPSE_EVENTS;
  let lo = 0;
  let hi = events.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid]!.globalStartMs <= utcMs) {
      idx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (idx < 0) {
    return null;
  }
  for (let i = idx; i >= 0; i -= 1) {
    const e = events[i]!;
    if (e.globalEndMs < utcMs) {
      break;
    }
    if (utcMs >= e.globalStartMs && utcMs <= e.globalEndMs) {
      return e;
    }
  }
  return null;
}

/**
 * First solar event with globalStartMs > utcMs. Works for any UTC (including
 * outside the authority span) so a truncated forecast window can still ask
 * “what is next in the catalog?”
 */
export function nextSolarEclipseAfter(utcMs: number): SolarEclipseEvent | null {
  const events = SOLAR_ECLIPSE_EVENTS;
  let lo = 0;
  let hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid]!.globalStartMs <= utcMs) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return events[lo] ?? null;
}

/**
 * Events whose [globalStart, globalEnd] overlaps [startMs, endMs], in catalog order.
 * Binary search plus a short linear scan — not a full catalog walk.
 */
export function solarEclipsesIntersecting(startMs: number, endMs: number): SolarEclipseEvent[] {
  if (!(endMs >= startMs)) {
    return [];
  }
  const events = SOLAR_ECLIPSE_EVENTS;
  let lo = 0;
  let hi = events.length - 1;
  let lastLe = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid]!.globalStartMs <= endMs) {
      lastLe = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (lastLe < 0) {
    return [];
  }
  const out: SolarEclipseEvent[] = [];
  for (let i = lastLe; i >= 0; i -= 1) {
    const e = events[i]!;
    if (e.globalEndMs < startMs) {
      break;
    }
    if (e.globalStartMs <= endMs && e.globalEndMs >= startMs) {
      out.push(e);
    }
  }
  out.reverse();
  return out;
}

/**
 * Upcoming solar events whose global start lies in (utcMs, utcMs + horizonMs].
 */
export function solarEclipsesUpcomingInHorizon(
  utcMs: number,
  horizonMs: number,
): SolarEclipseEvent[] {
  if (!(horizonMs > 0)) {
    return [];
  }
  const endMs = utcMs + horizonMs;
  const intersecting = solarEclipsesIntersecting(utcMs + 1, endMs);
  return intersecting.filter((e) => e.globalStartMs > utcMs && e.globalStartMs <= endMs);
}
