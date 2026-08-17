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
 * ISS track horizon tokens and TLE-derived orbital period (LIB-041).
 * Horizons are presentation policy. Period is not stored durably.
 *
 * TLE line 2 columns 53–63 (1-based) are mean motion n in revolutions/day.
 * orbitalPeriodMinutes = 1440 / n
 *
 * satellite.js `satrec.no` after `twoline2satrec` is mean motion in radians/minute
 * (SGP4/unkozai), not TLE n. Use it only when the published TLE field cannot be read:
 * periodMinutes = 2π / satrec.no
 */

export const ISS_ORBIT_HORIZON_IDS = [
  "15m",
  "30m",
  "45m",
  "60m",
  "1orbit",
  "2orbits",
  "3orbits",
  "6orbits",
] as const;

export type IssOrbitHorizonId = (typeof ISS_ORBIT_HORIZON_IDS)[number];

export const DEFAULT_ISS_ORBIT_PAST_HORIZON: IssOrbitHorizonId = "60m";
export const DEFAULT_ISS_ORBIT_FUTURE_HORIZON: IssOrbitHorizonId = "30m";

/** 45 min is not in the recommended picker set but is retained for explicit LIB-038 configs. */
export const ISS_ORBIT_HORIZON_UI_IDS: readonly IssOrbitHorizonId[] = ISS_ORBIT_HORIZON_IDS;

const MINUTES_BY_HORIZON: Partial<Record<IssOrbitHorizonId, number>> = {
  "15m": 15,
  "30m": 30,
  "45m": 45,
  "60m": 60,
};

const ORBITS_BY_HORIZON: Partial<Record<IssOrbitHorizonId, number>> = {
  "1orbit": 1,
  "2orbits": 2,
  "3orbits": 3,
  "6orbits": 6,
};

const LEGACY_MINUTES_TO_HORIZON: Readonly<Record<number, IssOrbitHorizonId>> = {
  15: "15m",
  30: "30m",
  45: "45m",
  60: "60m",
};

function isHorizonId(raw: unknown): raw is IssOrbitHorizonId {
  return typeof raw === "string" && (ISS_ORBIT_HORIZON_IDS as readonly string[]).includes(raw);
}

export function normalizeIssOrbitHorizonId(
  raw: unknown,
  fallback: IssOrbitHorizonId,
): IssOrbitHorizonId {
  return isHorizonId(raw) ? raw : fallback;
}

/**
 * Prefer an explicit horizon token. Otherwise map LIB-038 `pastMinutes` / `futureMinutes`.
 */
export function migrateIssOrbitHorizonId(
  horizonRaw: unknown,
  legacyMinutesRaw: unknown,
  fallback: IssOrbitHorizonId,
): IssOrbitHorizonId {
  if (isHorizonId(horizonRaw)) {
    return horizonRaw;
  }
  if (typeof legacyMinutesRaw === "number" && Number.isFinite(legacyMinutesRaw)) {
    const mapped = LEGACY_MINUTES_TO_HORIZON[legacyMinutesRaw];
    if (mapped !== undefined) {
      return mapped;
    }
  }
  return fallback;
}

export function issOrbitHorizonLabel(id: IssOrbitHorizonId): string {
  switch (id) {
    case "15m":
      return "15 min";
    case "30m":
      return "30 min";
    case "45m":
      return "45 min";
    case "60m":
      return "60 min";
    case "1orbit":
      return "1 orbit";
    case "2orbits":
      return "2 orbits";
    case "3orbits":
      return "3 orbits";
    case "6orbits":
      return "6 orbits";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function issOrbitHorizonOrbitCount(id: IssOrbitHorizonId): number | null {
  return ORBITS_BY_HORIZON[id] ?? null;
}

export function issOrbitHorizonMinutes(id: IssOrbitHorizonId): number | null {
  return MINUTES_BY_HORIZON[id] ?? null;
}

/**
 * TLE line-2 mean motion (revolutions per day), or null if unreadable.
 * Columns 53–63 (1-based) of the 69-character element line.
 */
export function issTleMeanMotionRevPerDayFromLine2(line2: string): number | null {
  if (typeof line2 !== "string" || line2.length < 63) {
    return null;
  }
  const n = Number.parseFloat(line2.slice(52, 63).trim());
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
}

export function issOrbitalPeriodMsFromMeanMotionRevPerDay(nRevPerDay: number): number | null {
  if (!Number.isFinite(nRevPerDay) || nRevPerDay <= 0) {
    return null;
  }
  return (1440 / nRevPerDay) * 60_000;
}

export function issOrbitalPeriodMsFromTleLine2(line2: string): number | null {
  const n = issTleMeanMotionRevPerDayFromLine2(line2);
  if (n === null) {
    return null;
  }
  return issOrbitalPeriodMsFromMeanMotionRevPerDay(n);
}

/**
 * `satrec.no` is radians per minute after `twoline2satrec` (SGP4/unkozai).
 * Fallback only — not the published TLE n.
 */
export function issOrbitalPeriodMsFromSatrecNoRadPerMin(noRadPerMin: number): number | null {
  if (!Number.isFinite(noRadPerMin) || noRadPerMin <= 0) {
    return null;
  }
  return ((2 * Math.PI) / noRadPerMin) * 60_000;
}

export function resolveIssOrbitHorizonMs(
  horizon: IssOrbitHorizonId,
  orbitalPeriodMs: number | null,
): number {
  const minutes = issOrbitHorizonMinutes(horizon);
  if (minutes !== null) {
    return minutes * 60_000;
  }
  const orbits = issOrbitHorizonOrbitCount(horizon);
  if (orbits !== null && orbitalPeriodMs !== null && orbitalPeriodMs > 0) {
    return orbits * orbitalPeriodMs;
  }
  return 0;
}

/**
 * Orbit distance from the current product instant. 0 = nearest revolution.
 * Time-based; not inferred from longitude crossings.
 */
export function issOrbitDistanceIndex(elapsedAbsMs: number, orbitalPeriodMs: number): number {
  if (!(orbitalPeriodMs > 0) || !(elapsedAbsMs >= 0) || !Number.isFinite(elapsedAbsMs)) {
    return 0;
  }
  return Math.floor(elapsedAbsMs / orbitalPeriodMs);
}

/**
 * Alpha multiplier vs orbit distance. Nearest revolution stays at 1; farther
 * revolutions fade and floor around 0.42 so a 6-orbit lattice stays readable.
 */
export function issOrbitFadeMultiplier(orbitIndex: number): number {
  if (!(orbitIndex > 0) || !Number.isFinite(orbitIndex)) {
    return 1;
  }
  if (orbitIndex === 1) return 0.82;
  if (orbitIndex === 2) return 0.68;
  if (orbitIndex === 3) return 0.56;
  return 0.42;
}
