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
 * Semantic geographic helpers for eclipse alignment presentation.
 * These are map-space constructions, not a 3D ray through screen space.
 */

import { wrapLongitudeDeg, type GeographicPoint } from "./besselianGeographic";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export type LatLon = GeographicPoint;

function toVec(latDeg: number, lonDeg: number): [number, number, number] {
  const φ = latDeg * DEG;
  const λ = lonDeg * DEG;
  const c = Math.cos(φ);
  return [c * Math.cos(λ), c * Math.sin(λ), Math.sin(φ)];
}

function fromVec(x: number, y: number, z: number): LatLon {
  const r = Math.hypot(x, y, z);
  if (r < 1e-12) {
    return { latDeg: 0, lonDeg: 0 };
  }
  return {
    latDeg: Math.asin(Math.max(-1, Math.min(1, z / r))) * RAD,
    lonDeg: wrapLongitudeDeg(Math.atan2(y, x) * RAD),
  };
}

export function angularDistanceDeg(a: LatLon, b: LatLon): number {
  const [ax, ay, az] = toVec(a.latDeg, a.lonDeg);
  const [bx, by, bz] = toVec(b.latDeg, b.lonDeg);
  return Math.acos(Math.min(1, Math.max(-1, ax * bx + ay * by + az * bz))) * RAD;
}

export function midpointGreatCircle(a: LatLon, b: LatLon): LatLon {
  const [ax, ay, az] = toVec(a.latDeg, a.lonDeg);
  const [bx, by, bz] = toVec(b.latDeg, b.lonDeg);
  return fromVec(ax + bx, ay + by, az + bz);
}

export function interpolateGreatCircle(a: LatLon, b: LatLon, t: number): LatLon {
  const A = toVec(a.latDeg, a.lonDeg);
  const B = toVec(b.latDeg, b.lonDeg);
  const dot = Math.min(1, Math.max(-1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
  const Ω = Math.acos(dot);
  if (Ω < 1e-8) {
    return { latDeg: a.latDeg, lonDeg: a.lonDeg };
  }
  const s0 = Math.sin((1 - t) * Ω) / Math.sin(Ω);
  const s1 = Math.sin(t * Ω) / Math.sin(Ω);
  return fromVec(s0 * A[0] + s1 * B[0], s0 * A[1] + s1 * B[1], s0 * A[2] + s1 * B[2]);
}

export function offsetAlongGreatCircle(from: LatLon, toward: LatLon, distanceDeg: number): LatLon {
  const span = angularDistanceDeg(from, toward);
  if (span < 1e-6) {
    return { latDeg: from.latDeg, lonDeg: from.lonDeg };
  }
  return interpolateGreatCircle(from, toward, distanceDeg / span);
}

export function antiSolarPoint(subsolar: LatLon): LatLon {
  return {
    latDeg: -subsolar.latDeg,
    lonDeg: wrapLongitudeDeg(subsolar.lonDeg + 180),
  };
}

function offsetPerpendicular(
  point: LatLon,
  alongA: LatLon,
  alongB: LatLon,
  sideSign: number,
  widthDeg: number,
): LatLon {
  const P = toVec(point.latDeg, point.lonDeg);
  const A = toVec(alongA.latDeg, alongA.lonDeg);
  const B = toVec(alongB.latDeg, alongB.lonDeg);
  let tx = B[0] - A[0];
  let ty = B[1] - A[1];
  let tz = B[2] - A[2];
  const pt = tx * P[0] + ty * P[1] + tz * P[2];
  tx -= pt * P[0];
  ty -= pt * P[1];
  tz -= pt * P[2];
  let tn = Math.hypot(tx, ty, tz);
  if (tn < 1e-10) {
    tx = -P[1];
    ty = P[0];
    tz = 0;
    tn = Math.hypot(tx, ty, tz);
    if (tn < 1e-10) {
      tx = 1;
      ty = 0;
      tz = 0;
      tn = 1;
    }
  }
  tx /= tn;
  ty /= tn;
  tz /= tn;
  let px = P[1] * tz - P[2] * ty;
  let py = P[2] * tx - P[0] * tz;
  let pz = P[0] * ty - P[1] * tx;
  const pn = Math.hypot(px, py, pz);
  if (pn < 1e-10) {
    return { latDeg: point.latDeg, lonDeg: point.lonDeg };
  }
  px /= pn;
  py /= pn;
  pz /= pn;
  const w = widthDeg * DEG;
  return fromVec(
    P[0] * Math.cos(w) + sideSign * px * Math.sin(w),
    P[1] * Math.cos(w) + sideSign * py * Math.sin(w),
    P[2] * Math.cos(w) + sideSign * pz * Math.sin(w),
  );
}

function smootherstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * Closed tapered ribbon along the short great-circle from origin to target.
 * Wider at the origin, narrower at the target. Vertices stay short-arc sequential
 * so generic equirect unwrap can copy the ring across the dateline.
 */
export function taperedAlignmentRibbon(
  origin: LatLon,
  target: LatLon,
  startHalfWidthDeg: number,
  endHalfWidthDeg: number,
  samples = 20,
): LatLon[] {
  const n = Math.max(4, samples);
  const left: LatLon[] = [];
  const right: LatLon[] = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const p = interpolateGreatCircle(origin, target, t);
    const half = startHalfWidthDeg + (endHalfWidthDeg - startHalfWidthDeg) * smootherstep(t);
    left.push(offsetPerpendicular(p, origin, target, 1, half));
    right.push(offsetPerpendicular(p, origin, target, -1, half));
  }
  const ring = [...left, ...right.reverse()];
  const first = ring[0];
  if (first) {
    ring.push({ latDeg: first.latDeg, lonDeg: first.lonDeg });
  }
  return ring;
}

export function greatCircleCenterline(origin: LatLon, target: LatLon, samples = 16): LatLon[] {
  const n = Math.max(2, samples);
  const pts: LatLon[] = [];
  for (let i = 0; i <= n; i += 1) {
    pts.push(interpolateGreatCircle(origin, target, i / n));
  }
  return pts;
}

export function circleAlignmentRing(center: LatLon, radiusDeg: number, samples = 28): LatLon[] {
  const n = Math.max(8, samples);
  const pole: LatLon =
    Math.abs(center.latDeg) < 80
      ? { latDeg: 90, lonDeg: 0 }
      : { latDeg: 0, lonDeg: wrapLongitudeDeg(center.lonDeg + 90) };
  const rim0 = offsetAlongGreatCircle(center, pole, radiusDeg);
  const ring: LatLon[] = [];
  for (let i = 0; i < n; i += 1) {
    const t = i / n;
    // Rotate rim0 around the center by spinning a perpendicular basis.
    const C = toVec(center.latDeg, center.lonDeg);
    const R = toVec(rim0.latDeg, rim0.lonDeg);
    let ux = R[0] - C[0] * (R[0] * C[0] + R[1] * C[1] + R[2] * C[2]);
    let uy = R[1] - C[1] * (R[0] * C[0] + R[1] * C[1] + R[2] * C[2]);
    let uz = R[2] - C[2] * (R[0] * C[0] + R[1] * C[1] + R[2] * C[2]);
    const un = Math.hypot(ux, uy, uz);
    if (un < 1e-10) {
      continue;
    }
    ux /= un;
    uy /= un;
    uz /= un;
    let vx = C[1] * uz - C[2] * uy;
    let vy = C[2] * ux - C[0] * uz;
    let vz = C[0] * uy - C[1] * ux;
    const vn = Math.hypot(vx, vy, vz);
    if (vn < 1e-10) {
      continue;
    }
    vx /= vn;
    vy /= vn;
    vz /= vn;
    const ang = t * Math.PI * 2;
    const w = radiusDeg * DEG;
    ring.push(
      fromVec(
        C[0] * Math.cos(w) + (ux * Math.cos(ang) + vx * Math.sin(ang)) * Math.sin(w),
        C[1] * Math.cos(w) + (uy * Math.cos(ang) + vy * Math.sin(ang)) * Math.sin(w),
        C[2] * Math.cos(w) + (uz * Math.cos(ang) + vz * Math.sin(ang)) * Math.sin(w),
      ),
    );
  }
  if (ring[0]) {
    ring.push({ latDeg: ring[0].latDeg, lonDeg: ring[0].lonDeg });
  }
  return ring;
}

export function ringLongitudeJumpsAreShortArc(ring: readonly LatLon[], maxStepDeg = 40): boolean {
  for (let i = 1; i < ring.length; i += 1) {
    const a = ring[i - 1]!;
    const b = ring[i]!;
    let dLon = Math.abs(b.lonDeg - a.lonDeg);
    if (dLon > 180) {
      dLon = 360 - dLon;
    }
    if (dLon > maxStepDeg && angularDistanceDeg(a, b) > maxStepDeg) {
      return false;
    }
  }
  return true;
}
