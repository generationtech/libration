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

import { describe, expect, it } from "vitest";
import {
  activeSolarEclipseAt,
  eclipseAuthoritySupport,
  getSolarEclipseEventById,
  isUtcWithinEclipseAuthority,
  parseSolarEclipseAuthorityAsset,
  SOLAR_ECLIPSE_AUTHORITY_METADATA,
  SOLAR_ECLIPSE_EVENTS,
} from "./eclipseAuthority";

const SPAN_START = Date.UTC(1900, 0, 1, 0, 0, 0, 0);
const SPAN_END = Date.UTC(2101, 0, 1, 0, 0, 0, 0);

describe("solar eclipse authority asset", () => {
  it("carries durable provenance, version, and supported span", () => {
    const m = SOLAR_ECLIPSE_AUTHORITY_METADATA;
    expect(m.authorityId).toBe("nasa-espenak-meeus-5mcse-solar");
    expect(m.authorityVersion).toBe("1");
    expect(m.source.identity).toMatch(/NASA/);
    expect(m.source.documents).toEqual(
      expect.arrayContaining(["NASA/TP-2006-214141", "NASA/TP-2009-214174"]),
    );
    expect(m.source.sourceSha256).toBe(
      "44460be3ed5a5c69a7627af6ffa875c82c70872f067e2907d20b49068e792b44",
    );
    expect(m.supportedUtcRange.startMs).toBe(SPAN_START);
    expect(m.supportedUtcRange.endMs).toBe(SPAN_END);
    expect(m.attribution.length).toBeGreaterThan(20);
    expect(m.licenseNote.length).toBeGreaterThan(10);
    expect(m.eventCount).toBe(454);
  });

  it("loads a stable 1900–2100 solar set with hybrid preserved", () => {
    expect(SOLAR_ECLIPSE_EVENTS).toHaveLength(454);
    expect(SOLAR_ECLIPSE_EVENTS.every((e) => e.kind === "solar")).toBe(true);
    const counts = { total: 0, annular: 0, partial: 0, hybrid: 0 };
    for (const e of SOLAR_ECLIPSE_EVENTS) {
      counts[e.subtype] += 1;
      expect(e.id).toBe(`nasa-5mcse-solar-${e.catalogNumber}`);
    }
    expect(counts).toEqual({ total: 140, annular: 146, partial: 155, hybrid: 13 });
    const hybrid = getSolarEclipseEventById("nasa-5mcse-solar-9559");
    expect(hybrid?.subtype).toBe("hybrid");
    expect(hybrid?.typeCode.startsWith("H")).toBe(true);
  });

  it("refuses an asset that has lost provenance metadata", () => {
    expect(() => parseSolarEclipseAuthorityAsset({ events: [] })).toThrow(/authority/);
    expect(() =>
      parseSolarEclipseAuthorityAsset({
        metadata: {
          authorityId: "x",
          authorityVersion: "1",
          source: { identity: "x" },
          supportedUtcRange: { startMs: 0, endMs: 1 },
          attribution: "x",
        },
        events: [{ id: "x" }],
      }),
    ).toThrow(/authority/);
  });
});

describe("eclipse authority lookup", () => {
  it("distinguishes unsupported range from no active eclipse", () => {
    expect(isUtcWithinEclipseAuthority(SPAN_START - 1)).toBe(false);
    expect(eclipseAuthoritySupport(SPAN_START - 1)).toEqual({
      supported: false,
      reason: "outside-authority-range",
    });
    expect(eclipseAuthoritySupport(SPAN_END)).toEqual({
      supported: false,
      reason: "outside-authority-range",
    });
    expect(activeSolarEclipseAt(SPAN_START - 1)).toBeNull();
    expect(activeSolarEclipseAt(SPAN_END)).toBeNull();

    const quiet = Date.parse("2024-04-01T00:00:00.000Z");
    expect(eclipseAuthoritySupport(quiet)).toEqual({ supported: true });
    expect(activeSolarEclipseAt(quiet)).toBeNull();
  });

  it("resolves known NASA fixtures by id and at greatest-eclipse UTC", () => {
    const total = getSolarEclipseEventById("nasa-5mcse-solar-9561");
    expect(total?.subtype).toBe("total");
    expect(total?.greatestEclipseUtcMs).toBe(Date.parse("2024-04-08T18:17:15.000Z"));
    expect(activeSolarEclipseAt(total!.greatestEclipseUtcMs)?.id).toBe(total!.id);

    const annular = getSolarEclipseEventById("nasa-5mcse-solar-9560");
    expect(annular?.subtype).toBe("annular");
    expect(activeSolarEclipseAt(annular!.greatestEclipseUtcMs)?.id).toBe(annular!.id);

    const partial = getSolarEclipseEventById("nasa-5mcse-solar-9558");
    expect(partial?.subtype).toBe("partial");
    expect(activeSolarEclipseAt(partial!.greatestEclipseUtcMs)?.id).toBe(partial!.id);

    expect(activeSolarEclipseAt(total!.globalStartMs - 1)).toBeNull();
    expect(activeSolarEclipseAt(total!.globalEndMs + 1)).toBeNull();
  });

  it("looks up 1000 instants without scanning the whole catalog each time", () => {
    const t0 = Date.parse("2024-01-01T00:00:00.000Z");
    const start = performance.now();
    for (let i = 0; i < 1000; i += 1) {
      activeSolarEclipseAt(t0 + i * 86_400_000);
    }
    expect(performance.now() - start).toBeLessThan(50);
  });
});
