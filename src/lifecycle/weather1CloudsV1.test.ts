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

import { describe, expect, it, vi } from "vitest";
import { applyCloudHighlightTransfer, cloudHighlightAlpha01FromIrLuma, CLOUD_HIGHLIGHT_RGB } from "./cloudHighlightTransfer";
import {
  CLOUDS_OBSERVATION_FRESH_MAX_AGE_MS,
  CLOUDS_OBSERVATION_STALE_MAX_AGE_MS,
  cloudsConfigStatusHint,
  cloudsConfigStatusHintCopy,
  cloudsShouldPaint,
  resolveCloudsProvenance,
} from "./cloudProvenance";
import {
  buildCloudsGibsWmsGetMapUrl,
  CLOUDS_GIBS_BAND13_LAYERS,
  formatCloudsGibsWmsTime,
  wmsUrlHasExplicitTime,
} from "./cloudsGibsWms";
import { validateCloudsPngBytes } from "./cloudsPng";
import {
  CLOUDS_EUMET_TEST_OBSERVATION_MS,
  CLOUDS_TEST_OBSERVATION_MS,
  encodeCloudsTestPng,
  mockCloudsLiveFetch,
} from "./cloudsAcquisition.testSupport";
import {
  createGlobalCloudsIrLiveHttpAcquisitionAdapter,
  produceGlobalCloudsIrFixtureAcquisition,
  produceGlobalCloudsIrLiveAcquisitionFromFetched,
} from "./globalCloudsIrAcquisition";
import { GLOBAL_CLOUDS_IR_SOURCE_ID } from "./dynamicEquirectSourceCatalog";

describe("WEATHER-1 Clouds v1 time, PNG, transfer, provenance", () => {
  it("never omits TIME from a GIBS GetMap URL", () => {
    const url = buildCloudsGibsWmsGetMapUrl(CLOUDS_TEST_OBSERVATION_MS);
    expect(wmsUrlHasExplicitTime(url)).toBe(true);
    expect(url).toMatch(/TIME=/i);
    expect(url).toContain("FORMAT=image%2Fpng");
    expect(url).toContain("TRANSPARENT=TRUE");
    expect(url).toContain(CLOUDS_GIBS_BAND13_LAYERS[0]);
    expect(() => buildCloudsGibsWmsGetMapUrl(Number.NaN)).toThrow(/TIME/i);
  });

  it("normalizes observation TIME to 10-minute slots", () => {
    expect(formatCloudsGibsWmsTime(Date.parse("2026-08-21T20:44:33.123Z"))).toBe(
      "2026-08-21T20:40:00Z",
    );
  });

  it("stamps validTimeMs as observation TIME independent of acquiredAtMs", () => {
    const png = encodeCloudsTestPng();
    const observation = Date.UTC(2026, 7, 21, 20, 40, 0);
    const acquired = Date.UTC(2026, 7, 21, 22, 11, 0);
    const result = produceGlobalCloudsIrLiveAcquisitionFromFetched(
      {
        ok: true,
        bytes: png,
        contentType: "image/png",
        responseUrl: "https://example.test/wms",
        status: 200,
      },
      { nowMs: () => acquired, observationTimeMs: observation },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.validTimeMs).toBe(observation);
    expect(result.entry.record.meta.acquiredAtMs).toBe(acquired);
    expect(result.entry.record.meta.origin).toBe("live");
    expect(result.entry.record.body.kind === "equirectRaster" && result.entry.record.body.coverageKind).toBe(
      "partial",
    );
  });

  it("live adapter requests explicit TIME and accepts PNG", async () => {
    const png = encodeCloudsTestPng();
    const fetchFn = vi.fn(mockCloudsLiveFetch({ png }));
    const adapter = createGlobalCloudsIrLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => CLOUDS_TEST_OBSERVATION_MS + 3_600_000,
      useFixtureFallback: false,
      requireGibsDimensions: false,
    });
    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const urls = (fetchFn as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    const getMap = urls.find((u) => u.includes("GetMap"));
    expect(getMap).toBeDefined();
    expect(wmsUrlHasExplicitTime(getMap!)).toBe(true);
    expect(getMap).toContain("view.eumetsat.int");
    expect(getMap).toContain("worldcloudmap_ir108");
    expect(result.entry.record.meta.validTimeMs).toBe(CLOUDS_EUMET_TEST_OBSERVATION_MS);
    expect(result.entry.record.body.kind === "equirectRaster" && result.entry.record.body.coverageKind).toBe(
      "global",
    );
    expect(result.entry.payloadBytes![0]).toBe(0x89);
    expect(result.entry.payloadBytes![1]).toBe(0x50);
  });

  it("rejects XML service exceptions and empty mosaics", () => {
    const xml = new TextEncoder().encode("<?xml version='1.0'?><ServiceException>no</ServiceException>");
    expect(validateCloudsPngBytes(xml).ok).toBe(false);
    const empty = encodeCloudsTestPng({ opaqueRatio: 0 });
    expect(validateCloudsPngBytes(empty).ok).toBe(false);
  });

  it("preserves provider alpha 0 as transparent and does not infer clear sky", () => {
    const rgba = new Uint8Array([
      200, 200, 200, 0,
      40, 40, 40, 255,
      210, 210, 210, 255,
      0, 0, 0, 0,
    ]);
    const out = applyCloudHighlightTransfer(rgba);
    expect(out[3]).toBe(0);
    expect(out[7]).toBeLessThan(40);
    expect(out[11]).toBeGreaterThan(out[7]!);
    expect(out[15]).toBe(0);
    expect(out[0]).toBe(0);
    expect(out[8]).toBe(CLOUD_HIGHLIGHT_RGB.r);
  });

  it("maps colder/brighter IR luma to higher cloud alpha (monotonic)", () => {
    expect(cloudHighlightAlpha01FromIrLuma(50)).toBe(0);
    expect(cloudHighlightAlpha01FromIrLuma(100)).toBe(0);
    expect(cloudHighlightAlpha01FromIrLuma(148)).toBeGreaterThan(0.4);
    expect(cloudHighlightAlpha01FromIrLuma(148)).toBeLessThan(
      cloudHighlightAlpha01FromIrLuma(195),
    );
    expect(cloudHighlightAlpha01FromIrLuma(195)).toBe(1);
  });

  it("freshness uses observation age, not fetch time", () => {
    const product = Date.UTC(2026, 7, 21, 23, 0, 0);
    const observed = Date.UTC(2026, 7, 21, 20, 40, 0);
    const fetched = Date.UTC(2026, 7, 21, 22, 50, 0);
    const provenance = resolveCloudsProvenance({
      originStamp: "live",
      acquiredAtMs: fetched,
      validTimeMs: observed,
      productUtcMs: product,
      lifecycleState: "ready",
      versionId: "v1",
    });
    expect(provenance.observationAgeMs).toBe(product - observed);
    expect(provenance.observationAgeMs).not.toBe(product - fetched);
    expect(provenance.freshnessBand).toBe("fresh");
    expect(cloudsShouldPaint(provenance)).toBe(true);
    const stale = resolveCloudsProvenance({
      originStamp: "live",
      acquiredAtMs: fetched,
      validTimeMs: product - (CLOUDS_OBSERVATION_FRESH_MAX_AGE_MS + 1),
      productUtcMs: product,
      lifecycleState: "stale",
      versionId: "v1",
    });
    expect(stale.freshnessBand).toBe("stale");
    expect(cloudsShouldPaint(stale)).toBe(true);
    const old = resolveCloudsProvenance({
      originStamp: "live",
      acquiredAtMs: fetched,
      validTimeMs: product - (CLOUDS_OBSERVATION_STALE_MAX_AGE_MS + 1),
      productUtcMs: product,
      lifecycleState: "stale",
      versionId: "v1",
    });
    expect(old.freshnessBand).toBe("excessively-stale");
    expect(cloudsShouldPaint(old)).toBe(false);
  });

  it("first live failure is unavailable; fixture never paints as live", () => {
    expect(
      cloudsConfigStatusHint({
        enabled: true,
        productTimeLiveEnough: true,
        lifecycleState: "error",
        provenance: null,
      }),
    ).toBe("unavailable");
    const fixture = resolveCloudsProvenance({
      originStamp: "fixture",
      acquiredAtMs: 1,
      validTimeMs: 1,
      productUtcMs: 1,
      lifecycleState: "ready",
      versionId: "fix",
    });
    expect(cloudsShouldPaint(fixture)).toBe(false);
    expect(cloudsConfigStatusHintCopy("fixture")).toBe("Clouds (DEV fixture)");
    const live = produceGlobalCloudsIrFixtureAcquisition();
    expect(live.ok).toBe(true);
    if (!live.ok) return;
    expect(live.entry.record.meta.origin).toBe("fixture");
    expect(live.entry.record.meta.sourceId).toBe(GLOBAL_CLOUDS_IR_SOURCE_ID);
  });

  it("production live adapter does not fixture-fallback", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("offline");
    });
    const adapter = createGlobalCloudsIrLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => CLOUDS_TEST_OBSERVATION_MS,
      useFixtureFallback: false,
      requireGibsDimensions: false,
    });
    const result = await adapter.acquire();
    expect(result.ok).toBe(false);
  });

  it("encodes a fixture PNG with polar holes and Africa/Europe filled", () => {
    const result = produceGlobalCloudsIrFixtureAcquisition({
      nowMs: () => CLOUDS_TEST_OBSERVATION_MS,
      observationTimeMs: CLOUDS_TEST_OBSERVATION_MS,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.payloadBytes![0]).toBe(0x89);
    const validated = validateCloudsPngBytes(result.entry.payloadBytes!, {
      minCoverageRatio: 0.7,
      requireAfricaEuropeCoverage: true,
    });
    expect(validated.ok).toBe(true);
    expect(result.entry.record.body.kind === "equirectRaster" && result.entry.record.body.coverageKind).toBe(
      "global",
    );
  });
});
