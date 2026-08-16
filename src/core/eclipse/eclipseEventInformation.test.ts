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
import { resolveEclipseFrame } from "./eclipseEventService";
import { normalizeEclipseInfoPresentation } from "./eclipseInfoAppearance";
import { normalizeLunarEclipsePresentation } from "./lunarEclipseAppearance";
import { normalizeSolarEclipsePresentation } from "./solarEclipseAppearance";
import { buildEclipseEventInformation } from "./eclipseEventInformation";

const INFO = normalizeEclipseInfoPresentation(undefined);
const SOLAR = normalizeSolarEclipsePresentation(undefined);
const LUNAR = normalizeLunarEclipsePresentation(undefined);

function view(utc: string, horizonMs = 7 * 86_400_000, solar = SOLAR, lunar = LUNAR) {
  const frame = resolveEclipseFrame(Date.parse(utc), { horizonMs });
  return buildEclipseEventInformation({
    frame,
    solarEnabled: true,
    lunarEnabled: true,
    solar,
    lunar,
    info: INFO,
    circumstances: null,
  });
}

describe("eclipse event information", () => {
  it("describes an upcoming total solar eclipse before first contact", () => {
    const v = view("2024-04-03T18:00:00.000Z");
    expect(v.unsupported).toBe(false);
    expect(v.kind).toBe("solar");
    expect(v.lifecycle).toBe("upcoming");
    expect(v.title).toBe("Total solar eclipse");
    expect(v.relativeTime).toMatch(/^in /);
    expect(v.rows.some((r) => r.label === "Forecast path" && r.value === "Path of totality")).toBe(
      true,
    );
  });

  it("describes an active total solar eclipse", () => {
    const v = view("2024-04-08T18:17:15.000Z", 0);
    expect(v.kind).toBe("solar");
    expect(v.lifecycle).toBe("active");
    expect(v.title).toBe("Total solar eclipse");
    expect(v.rows.some((r) => r.label === "Current shadow")).toBe(true);
  });

  it("names annular and hybrid events honestly", () => {
    const annular = view("2023-10-14T17:59:27.300Z", 0);
    expect(annular.title).toBe("Annular solar eclipse");
    const hybrid = view("2023-04-20T04:16:00.000Z", 0);
    expect(hybrid.title).toBe("Hybrid solar eclipse");
  });

  it("describes an active total lunar eclipse and a penumbral event", () => {
    const total = view("2022-05-16T04:11:29.000Z", 0);
    expect(total.kind).toBe("lunar");
    expect(total.title).toBe("Total lunar eclipse");
    expect(total.rows.some((r) => r.label === "Moon-visible region")).toBe(true);
    const penumbral = view("2017-02-11T00:44:00.000Z", 0);
    expect(penumbral.title === "Penumbral lunar eclipse" || penumbral.kind === "lunar").toBe(true);
  });

  it("exposes unsupported range without implying no eclipse exists", () => {
    const v = view("1899-06-15T12:00:00.000Z", 0);
    expect(v.unsupported).toBe(true);
    expect(v.unsupportedCopy).toMatch(/1900–2100/);
    expect(v.title).toBeNull();
    expect(v.rows).toEqual([]);
  });

  it("hides a filtered-out solar type from the information surface", () => {
    const hidden = view(
      "2024-04-03T18:00:00.000Z",
      7 * 86_400_000,
      normalizeSolarEclipsePresentation({ showTypeTotal: false }),
    );
    expect(hidden.title).toBeNull();
    expect(hidden.kind).toBeNull();
  });

  it("returns empty when eclipse features are disabled", () => {
    const frame = resolveEclipseFrame(Date.parse("2024-04-08T18:17:15.000Z"), { horizonMs: 0 });
    const v = buildEclipseEventInformation({
      frame,
      solarEnabled: false,
      lunarEnabled: false,
      solar: SOLAR,
      lunar: LUNAR,
      info: INFO,
      circumstances: null,
    });
    expect(v.title).toBeNull();
    expect(v.unsupported).toBe(false);
  });
});
