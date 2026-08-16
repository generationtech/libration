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
 * Development-time ingest: NASA GSFC Five Millennium Catalog of Lunar Eclipses
 * → bundled lunar eclipse authority. Not imported by the application.
 * Runtime never fetches NASA and never parses HTML/PDF.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");

const SOURCE_REL = "tools/eclipse/source/5MKLEcatalog.txt";
const EXPECTED_SHA256 = "d47586fc9c1c59338f234b3c6634c31744739887169f58d411ac766f3861fcf2";
const SOURCE_URL = "https://eclipse.gsfc.nasa.gov/5MCLE/5MKLEcatalog.txt";

const AUTHORITY_ID = "nasa-espenak-meeus-5mcle-lunar";
const AUTHORITY_VERSION = "1";
const SPAN_START_MS = Date.UTC(1900, 0, 1, 0, 0, 0, 0);
const SPAN_END_MS = Date.UTC(2101, 0, 1, 0, 0, 0, 0);

const MONTHS: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

const LINE_RE =
  /^(\d{5})\s+(-?\d+)\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(\S+)\s+(\S+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\d+)([NS])\s+(\d+)([EW])\s*$/;

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function parseDurationMinutes(token: string): number | null {
  const t = token.trim();
  if (t === "-" || t === "") {
    return null;
  }
  const v = Number.parseFloat(t);
  if (!Number.isFinite(v) || v <= 0) {
    return null;
  }
  return v;
}

function subtypeFromTypeCode(code: string): "penumbral" | "partial" | "total" {
  const c = code.trim()[0];
  if (c === "N") return "penumbral";
  if (c === "P") return "partial";
  if (c === "T") return "total";
  throw new Error(`lunar eclipse ingest: unknown eclipse type ${code}`);
}

function main(): void {
  const sourcePath = join(repoRoot, SOURCE_REL);
  const raw = readFileSync(sourcePath);
  const sha = createHash("sha256").update(raw).digest("hex");
  if (sha !== EXPECTED_SHA256) {
    throw new Error(
      `lunar eclipse ingest: SHA-256 mismatch for ${SOURCE_REL}\n expected ${EXPECTED_SHA256}\n actual   ${sha}`,
    );
  }
  const text = raw.toString("utf8");
  const events = [];
  let parsed = 0;
  for (const line of text.split(/\r?\n/)) {
    const m = LINE_RE.exec(line);
    if (!m) {
      continue;
    }
    parsed += 1;
    const catalogNumber = Number.parseInt(m[1]!, 10);
    const year = Number.parseInt(m[2]!, 10);
    if (year < 1900 || year > 2100) {
      continue;
    }
    const monthName = m[3]!;
    const month = MONTHS[monthName];
    if (month === undefined) {
      throw new Error(`lunar eclipse ingest: bad month ${monthName} on cat ${catalogNumber}`);
    }
    const day = Number.parseInt(m[4]!, 10);
    const hh = Number.parseInt(m[5]!, 10);
    const mm = Number.parseInt(m[6]!, 10);
    const ss = Number.parseInt(m[7]!, 10);
    const deltaTSeconds = Number.parseInt(m[8]!, 10); // may be negative / -0 in the early 20th century
    const lunation = Number.parseInt(m[9]!, 10);
    const saros = Number.parseInt(m[10]!, 10);
    const typeCode = m[11]!;
    const qse = m[12]!;
    const gamma = Number.parseFloat(m[13]!);
    const penumbralMagnitude = Number.parseFloat(m[14]!);
    const umbralMagnitude = Number.parseFloat(m[15]!);
    const penDurMin = parseDurationMinutes(m[16]!);
    const parDurMin = parseDurationMinutes(m[17]!);
    const totDurMin = parseDurationMinutes(m[18]!);
    const zenLatAbs = Number.parseInt(m[19]!, 10);
    const zenLatHem = m[20]!;
    const zenLonAbs = Number.parseInt(m[21]!, 10);
    const zenLonHem = m[22]!;
    const subtype = subtypeFromTypeCode(typeCode);
    const tdtHours = hh + mm / 60 + ss / 3600;
    const greatestEclipseTdtMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) + tdtHours * 3_600_000;
    const greatestEclipseUtcMs = Math.round(greatestEclipseTdtMs - deltaTSeconds * 1000);
    if (greatestEclipseUtcMs < SPAN_START_MS || greatestEclipseUtcMs >= SPAN_END_MS) {
      continue;
    }
    const halfPenMs = penDurMin !== null ? Math.round((penDurMin * 60_000) / 2) : null;
    const halfParMs = parDurMin !== null ? Math.round((parDurMin * 60_000) / 2) : null;
    const halfTotMs = totDurMin !== null ? Math.round((totDurMin * 60_000) / 2) : null;
    const p1UtcMs = halfPenMs !== null ? greatestEclipseUtcMs - halfPenMs : null;
    const p4UtcMs = halfPenMs !== null ? greatestEclipseUtcMs + halfPenMs : null;
    const u1UtcMs = subtype === "penumbral" || halfParMs === null ? null : greatestEclipseUtcMs - halfParMs;
    const u4UtcMs = subtype === "penumbral" || halfParMs === null ? null : greatestEclipseUtcMs + halfParMs;
    const u2UtcMs = subtype !== "total" || halfTotMs === null ? null : greatestEclipseUtcMs - halfTotMs;
    const u3UtcMs = subtype !== "total" || halfTotMs === null ? null : greatestEclipseUtcMs + halfTotMs;
    const contactMs = [p1UtcMs, u1UtcMs, u2UtcMs, greatestEclipseUtcMs, u3UtcMs, u4UtcMs, p4UtcMs].filter(
      (v): v is number => v !== null,
    );
    const globalStartMs = Math.min(...contactMs);
    const globalEndMs = Math.max(...contactMs);
    const zenithLatDeg = zenLatHem === "S" ? -zenLatAbs : zenLatAbs;
    const zenithLonDeg = zenLonHem === "W" ? -zenLonAbs : zenLonAbs;
    events.push({
      id: `nasa-5mcle-lunar-${catalogNumber}`,
      catalogNumber,
      kind: "lunar" as const,
      subtype,
      typeCode,
      qse,
      year,
      month,
      day,
      greatestEclipseTdtMs: Math.round(greatestEclipseTdtMs),
      greatestEclipseUtcMs,
      deltaTSeconds,
      gamma: round(gamma, 8),
      penumbralMagnitude: round(penumbralMagnitude, 8),
      umbralMagnitude: round(umbralMagnitude, 8),
      penumbralDurationMinutes: penDurMin !== null ? round(penDurMin, 4) : null,
      partialDurationMinutes: parDurMin !== null ? round(parDurMin, 4) : null,
      totalDurationMinutes: totDurMin !== null ? round(totDurMin, 4) : null,
      zenithLatDeg,
      zenithLonDeg,
      saros,
      lunation,
      p1UtcMs,
      u1UtcMs,
      u2UtcMs,
      u3UtcMs,
      u4UtcMs,
      p4UtcMs,
      globalStartMs,
      globalEndMs,
    });
  }
  if (parsed < 10_000) {
    throw new Error(`lunar eclipse ingest: too few parsed catalog lines (${parsed})`);
  }
  events.sort((a, b) => a.globalStartMs - b.globalStartMs || a.catalogNumber - b.catalogNumber);
  const generatedAtUtc = "2026-08-15T00:00:00.000Z";
  const asset = {
    metadata: {
      authorityId: AUTHORITY_ID,
      authorityVersion: AUTHORITY_VERSION,
      source: {
        identity: "NASA GSFC Five Millennium Canon/Catalog of Lunar Eclipses (Espenak & Meeus)",
        documents: ["NASA/TP-2009-214172", "NASA/TP-2009-214173"],
        file: "5MKLEcatalog.txt",
        url: SOURCE_URL,
        retrievedUtc: "2026-08-15",
        sourceSha256: EXPECTED_SHA256,
        listingDate: "2011-05-23",
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
  const assetPath = join(outDir, "lunar-eclipse-authority-v1.json");
  writeFileSync(assetPath, `${JSON.stringify(asset)}\n`, "utf8");
  const types: Record<string, number> = {};
  for (const e of events) {
    types[e.subtype] = (types[e.subtype] ?? 0) + 1;
  }
  process.stdout.write(
    `Wrote ${assetPath}\n events=${events.length} parsedLines=${parsed} types=${JSON.stringify(types)} bytes=${raw.length}\n`,
  );
}

main();
