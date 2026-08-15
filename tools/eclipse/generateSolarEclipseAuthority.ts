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
 * Development-time ingest: NASA GSFC Besselian dump → bundled solar eclipse authority.
 * Not imported by the application. Runtime never fetches NASA.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");

const SOURCE_REL = "tools/eclipse/source/eclipse_besselian_from_mysqldump2.csv";
const EXPECTED_SHA256 = "44460be3ed5a5c69a7627af6ffa875c82c70872f067e2907d20b49068e792b44";
const SOURCE_URL = "https://eclipse.gsfc.nasa.gov/eclipse_besselian_from_mysqldump2.csv";

const AUTHORITY_ID = "nasa-espenak-meeus-5mcse-solar";
const AUTHORITY_VERSION = "1";
const SPAN_START_MS = Date.UTC(1900, 0, 1, 0, 0, 0, 0);
const SPAN_END_MS = Date.UTC(2101, 0, 1, 0, 0, 0, 0);

type CsvRow = Record<string, string>;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQ = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) {
    throw new Error("eclipse ingest: empty CSV");
  }
  const headers = parseCsvLine(lines[0]!).map((h) => h.trim());
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]!);
    const row: CsvRow = {};
    for (let c = 0; c < headers.length; c += 1) {
      row[headers[c]!] = cols[c] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

function num(row: CsvRow, key: string): number {
  const v = Number.parseFloat(row[key] ?? "");
  if (!Number.isFinite(v)) {
    throw new Error(`eclipse ingest: bad number ${key}=${row[key]}`);
  }
  return v;
}

function parseTdHours(td: string): number {
  const m = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(td.trim());
  if (!m) {
    throw new Error(`eclipse ingest: bad td_ge ${td}`);
  }
  return Number(m[1]) + Number(m[2]) / 60 + Number(m[3]) / 3600;
}

function subtypeFromTypeCode(code: string): "partial" | "annular" | "total" | "hybrid" {
  const c = code.trim()[0];
  if (c === "P") return "partial";
  if (c === "A") return "annular";
  if (c === "T") return "total";
  if (c === "H") return "hybrid";
  throw new Error(`eclipse ingest: unknown eclipse_type ${code}`);
}

function evalPoly(coeffs: readonly number[], t: number): number {
  let s = 0;
  let p = 1;
  for (const c of coeffs) {
    s += c * p;
    p *= t;
  }
  return s;
}

function tdtEpochMs(year: number, month: number, day: number, tdtHours: number): number {
  return Date.UTC(year, month - 1, day, 0, 0, 0, 0) + tdtHours * 3_600_000;
}

function penumbraHitsEarth(
  x0: number[],
  y0: number[],
  l10: number[],
  t: number,
): boolean {
  const x = evalPoly(x0, t);
  const y = evalPoly(y0, t);
  const l1 = evalPoly(l10, t);
  return Math.hypot(x, y) <= 1 + l1 + 1e-6;
}

function refineEdge(
  x: number[],
  y: number[],
  l1: number[],
  lo: number,
  hi: number,
  wantHit: boolean,
): number {
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    const hit = penumbraHitsEarth(x, y, l1, mid);
    if (hit === wantHit) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return (lo + hi) / 2;
}

function globalIntervalHours(
  x: number[],
  y: number[],
  l1: number[],
  tMin: number,
  tMax: number,
): { start: number; end: number } {
  const step = 1 / 60;
  let first: number | null = null;
  let last: number | null = null;
  for (let t = tMin; t <= tMax + 1e-12; t += step) {
    if (penumbraHitsEarth(x, y, l1, t)) {
      if (first === null) first = t;
      last = t;
    }
  }
  if (first === null || last === null) {
    return { start: tMin, end: tMax };
  }
  const start = refineEdge(x, y, l1, Math.max(tMin, first - step), first, true);
  const end = refineEdge(x, y, l1, last, Math.min(tMax, last + step), false);
  return { start, end };
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function main(): void {
  const sourcePath = join(repoRoot, SOURCE_REL);
  const raw = readFileSync(sourcePath);
  const sha = createHash("sha256").update(raw).digest("hex");
  if (sha !== EXPECTED_SHA256) {
    throw new Error(
      `eclipse ingest: SHA-256 mismatch for ${SOURCE_REL}\n expected ${EXPECTED_SHA256}\n actual   ${sha}`,
    );
  }
  const rows = parseCsv(raw.toString("utf8"));
  const events = [];
  for (const row of rows) {
    const year = Math.trunc(num(row, "year"));
    const month = Math.trunc(num(row, "month"));
    const day = Math.trunc(num(row, "day"));
    // Date.UTC maps years 0–99 onto 1900–1999; filter on catalog year first.
    if (year < 1900 || year > 2100) {
      continue;
    }
    const t0 = num(row, "t0");
    const deltaT = num(row, "dt");
    const tdHours = parseTdHours(row.td_ge ?? "");
    const greatestTdtMs = tdtEpochMs(year, month, day, tdHours);
    const greatestUtcMs = greatestTdtMs - deltaT * 1000;
    if (greatestUtcMs < SPAN_START_MS || greatestUtcMs >= SPAN_END_MS) {
      continue;
    }
    const typeCode = (row.eclipse_type ?? "").trim();
    const x = [num(row, "x0"), num(row, "x1"), num(row, "x2"), num(row, "x3")];
    const y = [num(row, "y0"), num(row, "y1"), num(row, "y2"), num(row, "y3")];
    const d = [num(row, "d0"), num(row, "d1"), num(row, "d2")];
    const mu = [num(row, "mu0"), num(row, "mu1"), num(row, "mu2")];
    const l1 = [num(row, "l10"), num(row, "l11"), num(row, "l12")];
    const l2 = [num(row, "l20"), num(row, "l21"), num(row, "l22")];
    const tMin = num(row, "tmin");
    const tMax = num(row, "tmax");
    const iv = globalIntervalHours(x, y, l1, tMin, tMax);
    const t0Ms = tdtEpochMs(year, month, day, t0);
    const catalogNumber = Math.trunc(num(row, "cat_no"));
    events.push({
      id: `nasa-5mcse-solar-${catalogNumber}`,
      catalogNumber,
      kind: "solar" as const,
      subtype: subtypeFromTypeCode(typeCode),
      typeCode,
      year,
      month,
      day,
      greatestEclipseTdtMs: Math.round(greatestTdtMs),
      greatestEclipseUtcMs: Math.round(greatestUtcMs),
      deltaTSeconds: round(deltaT, 4),
      gamma: round(num(row, "gamma"), 8),
      magnitude: round(num(row, "magnitude"), 8),
      geLatDeg: round(num(row, "lat_dd_ge"), 6),
      geLonDeg: round(num(row, "lng_dd_ge"), 6),
      pathWidthKm: round(num(row, "path_width"), 3),
      sunAltDeg: round(num(row, "sun_alt"), 3),
      saros: Math.trunc(num(row, "saros")),
      lunation: Math.trunc(num(row, "luna_num")),
      t0TdtHours: round(t0, 6),
      tMinHours: round(tMin, 6),
      tMaxHours: round(tMax, 6),
      x: x.map((v) => round(v, 10)),
      y: y.map((v) => round(v, 10)),
      d: d.map((v) => round(v, 10)),
      mu: mu.map((v) => round(v, 10)),
      l1: l1.map((v) => round(v, 10)),
      l2: l2.map((v) => round(v, 10)),
      tanF1: round(num(row, "tan_f1"), 10),
      tanF2: round(num(row, "tan_f2"), 10),
      globalStartMs: Math.round(t0Ms + iv.start * 3_600_000 - deltaT * 1000),
      globalEndMs: Math.round(t0Ms + iv.end * 3_600_000 - deltaT * 1000),
    });
  }
  events.sort((a, b) => a.globalStartMs - b.globalStartMs || a.catalogNumber - b.catalogNumber);
  const generatedAtUtc = new Date().toISOString();
  const asset = {
    metadata: {
      authorityId: AUTHORITY_ID,
      authorityVersion: AUTHORITY_VERSION,
      source: {
        identity: "NASA GSFC Five Millennium Canon/Catalog of Solar Eclipses (Espenak & Meeus)",
        documents: ["NASA/TP-2006-214141", "NASA/TP-2009-214174"],
        file: "eclipse_besselian_from_mysqldump2.csv",
        url: SOURCE_URL,
        retrievedUtc: "2026-08-15",
        sourceSha256: EXPECTED_SHA256,
        listingDate: "2014-04-11",
      },
      supportedUtcRange: { startMs: SPAN_START_MS, endMs: SPAN_END_MS },
      generatedAtUtc,
      eventCount: events.length,
      licenseNote:
        "NASA material is not protected by copyright unless noted; permission is freely granted to reproduce eclipse data with acknowledgment.",
      attribution:
        "Eclipse Predictions by Fred Espenak and Jean Meeus (NASA's GSFC). Eclipse map/figure/table/predictions courtesy of Fred Espenak, NASA/Goddard Space Flight Center, from eclipse.gsfc.nasa.gov.",
    },
    events,
  };
  const outDir = join(repoRoot, "src/assets/eclipse");
  mkdirSync(outDir, { recursive: true });
  const assetPath = join(outDir, "solar-eclipse-authority-v1.json");
  writeFileSync(assetPath, `${JSON.stringify(asset)}\n`, "utf8");
  const types: Record<string, number> = {};
  for (const e of events) {
    types[e.subtype] = (types[e.subtype] ?? 0) + 1;
  }
  process.stdout.write(
    `Wrote ${assetPath}\n events=${events.length} types=${JSON.stringify(types)} bytes=${raw.length}\n`,
  );
}

main();
