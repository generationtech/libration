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
 * Geographic obscuration grid for active solar eclipses.
 *
 * Physical samples are bilinearly interpolated in lon/lat. Time is quantized
 * to a short bucket so consecutive frames at the same product UTC reuse the
 * field; the bucket is small enough that the moving shadow does not jump at
 * world-map scale.
 */

import { evaluateBesselianElements } from "./besselianElements";
import { solarEclipseObscurationFromElements } from "./solarEclipseObscuration";
import { solarObserverFixed } from "./solarObserverPlane";
import type { SolarEclipseEvent } from "./solarEclipseTypes";

/** ~1.25° longitude. Smooth at a 1920-class equirect viewport without per-texel Besselian work. */
export const SOLAR_ECLIPSE_OBSCURATION_FIELD_LON_SAMPLES = 288;
/** 1.25° latitude including both poles. */
export const SOLAR_ECLIPSE_OBSCURATION_FIELD_LAT_SAMPLES = 145;
export const SOLAR_ECLIPSE_OBSCURATION_FIELD_TIME_BUCKET_MS = 250;

export type SolarEclipseObscurationField = {
  readonly eventId: string;
  readonly utcMs: number;
  readonly lonSamples: number;
  readonly latSamples: number;
  /** Row-major, lat from +90 → −90, lon from −180 → +180. Values in [0, 1]. */
  readonly obscuration01: Float32Array;
};

export type GeographicRing = readonly { readonly latDeg: number; readonly lonDeg: number }[];

type FieldCache = {
  key: string;
  field: SolarEclipseObscurationField;
};

let fieldCache: FieldCache | null = null;

export function solarEclipseObscurationFieldCacheKey(
  eventId: string,
  utcMs: number,
): string {
  const bucket =
    Math.round(utcMs / SOLAR_ECLIPSE_OBSCURATION_FIELD_TIME_BUCKET_MS) *
    SOLAR_ECLIPSE_OBSCURATION_FIELD_TIME_BUCKET_MS;
  return `${eventId}:${bucket}`;
}

export function clearSolarEclipseObscurationFieldCache(): void {
  fieldCache = null;
}

function lonIndexToDeg(i: number, lonSamples: number): number {
  return -180 + (i / lonSamples) * 360;
}

function latIndexToDeg(j: number, latSamples: number): number {
  if (latSamples <= 1) {
    return 0;
  }
  return 90 - (j / (latSamples - 1)) * 180;
}

function wrapLonDeg(lonDeg: number): number {
  let lon = lonDeg;
  while (lon < -180) {
    lon += 360;
  }
  while (lon >= 180) {
    lon -= 360;
  }
  return lon;
}

function ringBounds(ring: GeographicRing | undefined): {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  wraps: boolean;
} | null {
  if (!ring || ring.length < 4) {
    return null;
  }
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const p of ring) {
    minLat = Math.min(minLat, p.latDeg);
    maxLat = Math.max(maxLat, p.latDeg);
    minLon = Math.min(minLon, p.lonDeg);
    maxLon = Math.max(maxLon, p.lonDeg);
  }
  if (!Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
    return null;
  }
  const wraps = maxLon - minLon > 180;
  return {
    minLat: Math.max(-90, minLat - 3),
    maxLat: Math.min(90, maxLat + 3),
    minLon: minLon - 3,
    maxLon: maxLon + 3,
    wraps,
  };
}

export function buildSolarEclipseObscurationField(
  utcMs: number,
  event: SolarEclipseEvent,
  options: {
    lonSamples?: number;
    latSamples?: number;
    partialRegion?: GeographicRing;
  } = {},
): SolarEclipseObscurationField {
  const lonSamples = options.lonSamples ?? SOLAR_ECLIPSE_OBSCURATION_FIELD_LON_SAMPLES;
  const latSamples = options.latSamples ?? SOLAR_ECLIPSE_OBSCURATION_FIELD_LAT_SAMPLES;
  const obscuration01 = new Float32Array(lonSamples * latSamples);
  const el = evaluateBesselianElements(event.besselian, utcMs);
  if (!el.insideElementWindow || utcMs < event.globalStartMs || utcMs > event.globalEndMs) {
    return { eventId: event.id, utcMs, lonSamples, latSamples, obscuration01 };
  }
  const bounds = ringBounds(options.partialRegion);
  const padLat = bounds ? { min: bounds.minLat, max: bounds.maxLat } : { min: -90, max: 90 };
  for (let j = 0; j < latSamples; j += 1) {
    const latDeg = latIndexToDeg(j, latSamples);
    if (latDeg < padLat.min || latDeg > padLat.max) {
      continue;
    }
    const row = j * lonSamples;
    const obsLat = solarObserverFixed(latDeg, 0);
    for (let i = 0; i < lonSamples; i += 1) {
      const lonDeg = lonIndexToDeg(i, lonSamples);
      if (
        bounds &&
        !bounds.wraps &&
        (lonDeg < bounds.minLon || lonDeg > bounds.maxLon)
      ) {
        continue;
      }
      const obs = { ...obsLat, longitudeDeg: lonDeg };
      obscuration01[row + i] = solarEclipseObscurationFromElements(el, obs).obscuration01;
    }
  }
  return { eventId: event.id, utcMs, lonSamples, latSamples, obscuration01 };
}

export function solarEclipseObscurationFieldAt(
  utcMs: number,
  event: SolarEclipseEvent,
  options: {
    lonSamples?: number;
    latSamples?: number;
    partialRegion?: GeographicRing;
  } = {},
): SolarEclipseObscurationField {
  const bucket =
    Math.round(utcMs / SOLAR_ECLIPSE_OBSCURATION_FIELD_TIME_BUCKET_MS) *
    SOLAR_ECLIPSE_OBSCURATION_FIELD_TIME_BUCKET_MS;
  const lonSamples = options.lonSamples ?? SOLAR_ECLIPSE_OBSCURATION_FIELD_LON_SAMPLES;
  const latSamples = options.latSamples ?? SOLAR_ECLIPSE_OBSCURATION_FIELD_LAT_SAMPLES;
  const key = `${solarEclipseObscurationFieldCacheKey(event.id, bucket)}:${lonSamples}x${latSamples}`;
  if (fieldCache?.key === key) {
    return fieldCache.field;
  }
  const field = buildSolarEclipseObscurationField(bucket, event, {
    lonSamples,
    latSamples,
    partialRegion: options.partialRegion,
  });
  fieldCache = { key, field };
  return field;
}

export function sampleSolarEclipseObscurationField(
  field: SolarEclipseObscurationField,
  longitudeDeg: number,
  latitudeDeg: number,
): number {
  const { lonSamples, latSamples, obscuration01 } = field;
  if (lonSamples < 2 || latSamples < 2) {
    return 0;
  }
  const lon = wrapLonDeg(longitudeDeg);
  const lat = Math.max(-90, Math.min(90, latitudeDeg));
  const lonPos = ((lon + 180) / 360) * lonSamples;
  const latPos = ((90 - lat) / 180) * (latSamples - 1);
  let i0 = Math.floor(lonPos);
  const tLon = lonPos - i0;
  i0 = ((i0 % lonSamples) + lonSamples) % lonSamples;
  const i1 = (i0 + 1) % lonSamples;
  const j0 = Math.max(0, Math.min(latSamples - 2, Math.floor(latPos)));
  const j1 = j0 + 1;
  const tLat = Math.max(0, Math.min(1, latPos - j0));
  const a = obscuration01[j0 * lonSamples + i0]!;
  const b = obscuration01[j0 * lonSamples + i1]!;
  const c = obscuration01[j1 * lonSamples + i0]!;
  const d = obscuration01[j1 * lonSamples + i1]!;
  const top = a + (b - a) * tLon;
  const bottom = c + (d - c) * tLon;
  return Math.max(0, Math.min(1, top + (bottom - top) * tLat));
}
