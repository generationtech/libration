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
 * Deterministic longitude-wrapping marching squares for a global lat/lon scalar field.
 * Positive values are inside. Zero-crossing rings are closed polylines.
 */

export type GeographicRingPoint = {
  readonly latDeg: number;
  readonly lonDeg: number;
};

const EPS = 1e-9;

function lerp(a: number, b: number, fa: number, fb: number): number {
  const den = fb - fa;
  if (Math.abs(den) < EPS) {
    return 0.5 * (a + b);
  }
  const t = Math.max(0, Math.min(1, (0 - fa) / den));
  return a + t * (b - a);
}

function wrapLon(lonDeg: number): number {
  let x = lonDeg;
  while (x <= -180) {
    x += 360;
  }
  while (x > 180) {
    x -= 360;
  }
  return x;
}

function pointKey(latDeg: number, lonDeg: number): string {
  return `${latDeg.toFixed(5)},${wrapLon(lonDeg).toFixed(5)}`;
}

type Segment = {
  readonly a: GeographicRingPoint;
  readonly b: GeographicRingPoint;
};

/**
 * Extract closed 0-contours from a global grid.
 * `values[iLat][iLon]` with iLat from south to north, iLon from west, wrapping in longitude.
 */
export function extractClosedContoursFromGrid(args: {
  readonly values: ReadonlyArray<ReadonlyArray<number>>;
  readonly lat0: number;
  readonly lon0: number;
  readonly latStep: number;
  readonly lonStep: number;
}): GeographicRingPoint[][] {
  const grid = args.values;
  const nLat = grid.length;
  if (nLat < 2) {
    return [];
  }
  const nLon = grid[0]?.length ?? 0;
  if (nLon < 2) {
    return [];
  }
  const segments: Segment[] = [];
  for (let i = 0; i < nLat - 1; i += 1) {
    const latS = args.lat0 + i * args.latStep;
    const latN = args.lat0 + (i + 1) * args.latStep;
    for (let j = 0; j < nLon; j += 1) {
      const jE = (j + 1) % nLon;
      const lonW = args.lon0 + j * args.lonStep;
      const lonE = args.lon0 + (j + 1) * args.lonStep;
      const sw = grid[i]![j]!;
      const se = grid[i]![jE]!;
      const ne = grid[i + 1]![jE]!;
      const nw = grid[i + 1]![j]!;
      const idx =
        (sw >= 0 ? 1 : 0) | (se >= 0 ? 2 : 0) | (ne >= 0 ? 4 : 0) | (nw >= 0 ? 8 : 0);
      if (idx === 0 || idx === 15) {
        continue;
      }
      const south = (): GeographicRingPoint => ({
        latDeg: latS,
        lonDeg: lerp(lonW, lonE, sw, se),
      });
      const east = (): GeographicRingPoint => ({
        latDeg: lerp(latS, latN, se, ne),
        lonDeg: lonE,
      });
      const north = (): GeographicRingPoint => ({
        latDeg: latN,
        lonDeg: lerp(lonW, lonE, nw, ne),
      });
      const west = (): GeographicRingPoint => ({
        latDeg: lerp(latS, latN, sw, nw),
        lonDeg: lonW,
      });
      const push = (a: GeographicRingPoint, b: GeographicRingPoint): void => {
        segments.push({ a, b });
      };
      switch (idx) {
        case 1:
        case 14:
          push(west(), south());
          break;
        case 2:
        case 13:
          push(south(), east());
          break;
        case 3:
        case 12:
          push(west(), east());
          break;
        case 4:
        case 11:
          push(east(), north());
          break;
        case 6:
        case 9:
          push(south(), north());
          break;
        case 7:
        case 8:
          push(west(), north());
          break;
        case 5:
          push(west(), north());
          push(south(), east());
          break;
        case 10:
          push(west(), south());
          push(east(), north());
          break;
        default:
          break;
      }
    }
  }
  return stitchRings(segments);
}

function stitchRings(segments: readonly Segment[]): GeographicRingPoint[][] {
  const unused = segments.map((s) => ({ ...s, used: false }));
  const byKey = new Map<string, number[]>();
  const add = (key: string, idx: number): void => {
    const list = byKey.get(key);
    if (list) {
      list.push(idx);
    } else {
      byKey.set(key, [idx]);
    }
  };
  for (let i = 0; i < unused.length; i += 1) {
    add(pointKey(unused[i]!.a.latDeg, unused[i]!.a.lonDeg), i);
    add(pointKey(unused[i]!.b.latDeg, unused[i]!.b.lonDeg), i);
  }

  const rings: GeographicRingPoint[][] = [];
  for (let start = 0; start < unused.length; start += 1) {
    if (unused[start]!.used) {
      continue;
    }
    unused[start]!.used = true;
    const ring: GeographicRingPoint[] = [
      {
        latDeg: unused[start]!.a.latDeg,
        lonDeg: wrapLon(unused[start]!.a.lonDeg),
      },
      {
        latDeg: unused[start]!.b.latDeg,
        lonDeg: wrapLon(unused[start]!.b.lonDeg),
      },
    ];
    let guard = 0;
    while (guard < unused.length + 2) {
      guard += 1;
      const last = ring[ring.length - 1]!;
      const first = ring[0]!;
      if (ring.length > 2 && pointKey(last.latDeg, last.lonDeg) === pointKey(first.latDeg, first.lonDeg)) {
        ring[ring.length - 1] = { latDeg: first.latDeg, lonDeg: first.lonDeg };
        break;
      }
      const candidates = byKey.get(pointKey(last.latDeg, last.lonDeg)) ?? [];
      let nextIdx = -1;
      let nextPt: GeographicRingPoint | null = null;
      for (const idx of candidates) {
        const seg = unused[idx]!;
        if (seg.used) {
          continue;
        }
        const aKey = pointKey(seg.a.latDeg, seg.a.lonDeg);
        const lastKey = pointKey(last.latDeg, last.lonDeg);
        if (aKey === lastKey) {
          nextIdx = idx;
          nextPt = { latDeg: seg.b.latDeg, lonDeg: wrapLon(seg.b.lonDeg) };
          break;
        }
        nextIdx = idx;
        nextPt = { latDeg: seg.a.latDeg, lonDeg: wrapLon(seg.a.lonDeg) };
        break;
      }
      if (nextIdx < 0 || !nextPt) {
        break;
      }
      unused[nextIdx]!.used = true;
      ring.push(nextPt);
    }
    if (ring.length >= 4) {
      const first = ring[0]!;
      const last = ring[ring.length - 1]!;
      if (pointKey(first.latDeg, first.lonDeg) !== pointKey(last.latDeg, last.lonDeg)) {
        ring.push({ latDeg: first.latDeg, lonDeg: first.lonDeg });
      }
      if (ring.length >= 4) {
        rings.push(ring);
      }
    }
  }
  return rings;
}

export function wrapContourLongitudeDeg(lonDeg: number): number {
  return wrapLon(lonDeg);
}
