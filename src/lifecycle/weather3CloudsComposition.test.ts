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
import {
  buildCloudsCompositeMeta,
  cloudsCompositePaintOrder,
  compositeCloudHighlightLayers,
  selectCloudsPaintableComponents,
  selectCloudsStatusComponents,
} from "./cloudsComposite";
import {
  CLOUDS_GIBS_GOES_EAST_LAYER,
  CLOUDS_GIBS_GOES_WEST_LAYER,
  CLOUDS_GIBS_HIMAWARI_LAYER,
} from "./cloudsGibsWms";
import {
  CLOUDS_PROVIDER_COMPOSITE,
  CLOUDS_SECTOR_EUMET_RING,
  CLOUDS_SECTOR_GOES_EAST,
  CLOUDS_SECTOR_GOES_WEST,
  CLOUDS_SECTOR_HIMAWARI,
  CLOUDS_SECTOR_METEOSAT,
} from "./cloudsSectors";
import {
  cloudsConfigStatusHint,
  cloudsConfigStatusHintCopy,
  cloudsComponentObservationLines,
  formatCloudsObservationAgeRange,
  resolveCloudsProvenance,
} from "./cloudProvenance";
import { createTimeContext } from "../core/time";
import { createSolarShadingLayer } from "../layers/solarShadingLayer";
import { isSolarShadingPayload } from "../layers/solarShadingPayload";
import { createDynamicDataLifecycleHost } from "./dynamicDataLifecycleHost";
import { GLOBAL_CLOUDS_IR_SOURCE_ID } from "./dynamicEquirectSourceCatalog";
import { createGlobalCloudsIrLiveHttpAcquisitionAdapter } from "./globalCloudsIrAcquisition";
import { wmsTimeFromUrl } from "./cloudsAcquisition.testSupport";
import {
  CLOUDS_TEST_OBSERVATION_MS,
  encodeCloudsGlobalTestPng,
  encodeCloudsTestPng,
  mockCloudsLiveFetch,
} from "./cloudsAcquisition.testSupport";

const EAST_ISO = "2023-11-14T20:50:00Z";
const WEST_ISO = "2023-11-14T20:40:00Z";
const MSG_ISO = "2023-11-14T20:30:00Z";
const HIMAWARI_ISO = "2023-11-14T20:40:00Z";
const EAST_MS = Date.parse(EAST_ISO);
const WEST_MS = Date.parse(WEST_ISO);
const MSG_MS = Date.parse(MSG_ISO);
const HIMAWARI_MS = Date.parse(HIMAWARI_ISO);
const PRODUCT_MS = Date.parse("2023-11-14T21:00:00Z");

describe("WEATHER-3 freshness-over-synchronization", () => {
  it("uses each sector's latest time instead of min() common TIME", () => {
    const painted = selectCloudsPaintableComponents(
      [
        {
          sectorId: CLOUDS_SECTOR_GOES_EAST,
          observationTimeMs: EAST_MS,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_GOES_WEST,
          observationTimeMs: WEST_MS,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_METEOSAT,
          observationTimeMs: MSG_MS,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_HIMAWARI,
          observationTimeMs: HIMAWARI_MS,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
      ],
      PRODUCT_MS,
    );
    expect(painted.map((c) => c.observationTimeMs).sort()).toEqual(
      [MSG_MS, WEST_MS, HIMAWARI_MS, EAST_MS].sort(),
    );
    expect(painted.every((c) => c.observationTimeMs !== MSG_MS || c.sectorId === CLOUDS_SECTOR_METEOSAT)).toBe(
      true,
    );
    const meta = buildCloudsCompositeMeta(painted);
    expect(meta).not.toBeNull();
    expect(meta!.newestObservationTimeMs).toBe(EAST_MS);
    expect(meta!.oldestObservationTimeMs).toBe(MSG_MS);
    expect(meta!.components).toHaveLength(4);
    expect(meta!.components.find((c) => c.sectorId === CLOUDS_SECTOR_GOES_EAST)?.observationTimeMs).toBe(
      EAST_MS,
    );
    expect(meta!.components.find((c) => c.sectorId === CLOUDS_SECTOR_METEOSAT)?.observationTimeMs).toBe(
      MSG_MS,
    );
    expect(Math.min(...painted.map((c) => c.observationTimeMs))).toBe(MSG_MS);
    expect(painted.some((c) => c.observationTimeMs === EAST_MS)).toBe(true);
  });

  it("live adapter requests independent TIME per GIBS sector", async () => {
    const png = encodeCloudsTestPng({ opaqueRatio: 0.4 });
    const fetchFn = vi.fn(
      mockCloudsLiveFetch({
        png,
        gibsLayerTimes: {
          [CLOUDS_GIBS_GOES_EAST_LAYER]: EAST_ISO,
          [CLOUDS_GIBS_GOES_WEST_LAYER]: WEST_ISO,
          [CLOUDS_GIBS_HIMAWARI_LAYER]: HIMAWARI_ISO,
        },
        eumetCapabilitiesXml: `<Layer><Name>mumi:worldcloudmap_ir108</Name><Dimension name="time" default="2023-11-14T18:00:00Z" units="ISO8601" nearestValue="1">2021-06-06T15:00:00.000Z/2023-11-14T18:00:00Z/PT3H</Dimension></Layer><Layer><Name>msg_fes:ir108</Name><Dimension name="time" default="${MSG_ISO}" units="ISO8601" nearestValue="1">2020-09-01T00:00:00.000Z/${MSG_ISO}/PT15M</Dimension></Layer>`,
        allowTimes: [
          EAST_ISO,
          WEST_ISO,
          HIMAWARI_ISO,
          MSG_ISO,
          "2023-11-14T18:00:00Z",
        ],
      }),
    );
    const adapter = createGlobalCloudsIrLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => PRODUCT_MS,
      useFixtureFallback: false,
      requireMosaicDimensions: false,
    });
    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.validTimeMs).toBe(EAST_MS);
    expect(result.entry.record.meta.validTimeMs).not.toBe(MSG_MS);
    if (result.entry.record.body.kind === "equirectRaster") {
      expect(result.entry.record.body.cloudProviderKind).toBe(CLOUDS_PROVIDER_COMPOSITE);
      expect(result.entry.record.body.cloudComposite?.newestObservationTimeMs).toBe(EAST_MS);
      const bySector = new Map(
        result.entry.record.body.cloudComposite?.components.map((c) => [
          c.sectorId,
          c.observationTimeMs,
        ]),
      );
      expect(bySector.get(CLOUDS_SECTOR_GOES_EAST)).toBe(EAST_MS);
      expect(bySector.get(CLOUDS_SECTOR_GOES_WEST)).toBe(WEST_MS);
      expect(bySector.get(CLOUDS_SECTOR_HIMAWARI)).toBe(HIMAWARI_MS);
      expect(bySector.get(CLOUDS_SECTOR_METEOSAT)).toBe(MSG_MS);
    }
    const getMaps = (fetchFn as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .filter((u) => u.includes("GetMap") && u.includes("gibs.earthdata.nasa.gov"));
    const eastTimes = new Set(
      getMaps.filter((u) => u.includes("GOES-East")).map((u) => wmsTimeFromUrl(u)),
    );
    const westTimes = new Set(
      getMaps.filter((u) => u.includes("GOES-West")).map((u) => wmsTimeFromUrl(u)),
    );
    expect(eastTimes.has(EAST_ISO)).toBe(true);
    expect(westTimes.has(WEST_ISO)).toBe(true);
    expect(eastTimes.has(EAST_ISO) && westTimes.has(WEST_ISO)).toBe(true);
  });

  it("one sector update does not mutate other component times", async () => {
    let eastTime = EAST_ISO;
    const png = encodeCloudsTestPng({ opaqueRatio: 0.4 });
    const fetchFn = vi.fn(async (input) => {
      return mockCloudsLiveFetch({
        png,
        gibsLayerTimes: {
          [CLOUDS_GIBS_GOES_EAST_LAYER]: eastTime,
          [CLOUDS_GIBS_GOES_WEST_LAYER]: WEST_ISO,
          [CLOUDS_GIBS_HIMAWARI_LAYER]: HIMAWARI_ISO,
        },
      })(input);
    });
    const adapter = createGlobalCloudsIrLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => PRODUCT_MS,
      useFixtureFallback: false,
      requireMosaicDimensions: false,
    });
    const first = await adapter.acquire();
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const firstComponents = first.entry.record.body.kind === "equirectRaster"
      ? first.entry.record.body.cloudComposite?.components
      : undefined;
    expect(firstComponents).toBeDefined();
    const laterEast = "2023-11-14T21:00:00Z";
    eastTime = laterEast;
    const second = await adapter.acquire();
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const secondComponents =
      second.entry.record.body.kind === "equirectRaster"
        ? second.entry.record.body.cloudComposite?.components
        : undefined;
    expect(secondComponents).toBeDefined();
    const firstBy = new Map(firstComponents!.map((c) => [c.sectorId, c.observationTimeMs]));
    const secondBy = new Map(secondComponents!.map((c) => [c.sectorId, c.observationTimeMs]));
    expect(secondBy.get(CLOUDS_SECTOR_GOES_EAST)).toBe(Date.parse(laterEast));
    expect(secondBy.get(CLOUDS_SECTOR_GOES_WEST)).toBe(firstBy.get(CLOUDS_SECTOR_GOES_WEST));
    expect(secondBy.get(CLOUDS_SECTOR_HIMAWARI)).toBe(firstBy.get(CLOUDS_SECTOR_HIMAWARI));
    expect(secondBy.get(CLOUDS_SECTOR_METEOSAT)).toBe(firstBy.get(CLOUDS_SECTOR_METEOSAT));
  });

  it("status range uses visible selected sources only", () => {
    const painted = selectCloudsPaintableComponents(
      [
        {
          sectorId: CLOUDS_SECTOR_GOES_EAST,
          observationTimeMs: PRODUCT_MS - 5 * 60_000,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_GOES_WEST,
          observationTimeMs: PRODUCT_MS - 11 * 60_000,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_METEOSAT,
          observationTimeMs: PRODUCT_MS - 8 * 60_000,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_HIMAWARI,
          observationTimeMs: PRODUCT_MS - 17 * 60_000,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_EUMET_RING,
          observationTimeMs: PRODUCT_MS - 2 * 3_600_000,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
      ],
      PRODUCT_MS,
    );
    const status = selectCloudsStatusComponents(painted);
    expect(status.ringFillsMissingRegional).toBe(false);
    expect(status.components.some((c) => c.sectorId === CLOUDS_SECTOR_EUMET_RING)).toBe(
      false,
    );
    const meta = buildCloudsCompositeMeta(painted);
    expect(meta!.oldestObservationTimeMs).toBe(PRODUCT_MS - 17 * 60_000);
    expect(meta!.newestObservationTimeMs).toBe(PRODUCT_MS - 5 * 60_000);
    const provenance = resolveCloudsProvenance({
      originStamp: "live",
      acquiredAtMs: PRODUCT_MS,
      validTimeMs: meta!.newestObservationTimeMs,
      productUtcMs: PRODUCT_MS,
      lifecycleState: "ready",
      versionId: "c",
      coverageKind: "global",
      providerKind: CLOUDS_PROVIDER_COMPOSITE,
      cloudComposite: meta,
    });
    const hint = cloudsConfigStatusHint({
      enabled: true,
      productTimeLiveEnough: true,
      lifecycleState: "ready",
      provenance,
    });
    expect(hint).toBe("recent");
    const copy = cloudsConfigStatusHintCopy(hint!, provenance);
    expect(copy).toMatch(/observations/);
    expect(copy).toMatch(/5–17 min/);
    expect(copy).not.toMatch(/2h/);
  });

  it("includes ring age in status only when it fills a missing regional", () => {
    const painted = selectCloudsPaintableComponents(
      [
        {
          sectorId: CLOUDS_SECTOR_GOES_EAST,
          observationTimeMs: PRODUCT_MS - 8 * 60_000,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_EUMET_RING,
          observationTimeMs: PRODUCT_MS - 3 * 3_600_000,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
      ],
      PRODUCT_MS,
    );
    const status = selectCloudsStatusComponents(painted);
    expect(status.ringFillsMissingRegional).toBe(true);
    const meta = buildCloudsCompositeMeta(painted);
    expect(meta!.oldestObservationTimeMs).toBe(PRODUCT_MS - 3 * 3_600_000);
    const provenance = resolveCloudsProvenance({
      originStamp: "live",
      acquiredAtMs: PRODUCT_MS,
      validTimeMs: meta!.newestObservationTimeMs,
      productUtcMs: PRODUCT_MS,
      lifecycleState: "ready",
      versionId: "c",
      coverageKind: "global",
      providerKind: CLOUDS_PROVIDER_COMPOSITE,
      cloudComposite: meta,
    });
    const copy = cloudsConfigStatusHintCopy("mixed", provenance);
    expect(copy).toMatch(/mixed freshness/);
    expect(copy).toMatch(/3h/);
  });

  it("regional stale/unavailable uses ring backstop; no source is transparent", () => {
    const none = selectCloudsPaintableComponents([], PRODUCT_MS);
    expect(none).toHaveLength(0);
    expect(buildCloudsCompositeMeta(none)).toBeNull();

    const ringOnly = selectCloudsPaintableComponents(
      [
        {
          sectorId: CLOUDS_SECTOR_EUMET_RING,
          observationTimeMs: PRODUCT_MS - 3 * 3_600_000,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_GOES_EAST,
          observationTimeMs: PRODUCT_MS - 5 * 3_600_000,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
      ],
      PRODUCT_MS,
    );
    expect(ringOnly.map((c) => c.sectorId)).toEqual([CLOUDS_SECTOR_EUMET_RING]);
  });

  it("overlap paint order is deterministic and prefers a meaningfully fresher sector", () => {
    const nearEqual = cloudsCompositePaintOrder(
      [
        {
          sectorId: CLOUDS_SECTOR_GOES_WEST,
          observationTimeMs: PRODUCT_MS - 11 * 60_000,
          acquiredAtMs: PRODUCT_MS,
        },
        {
          sectorId: CLOUDS_SECTOR_GOES_EAST,
          observationTimeMs: PRODUCT_MS - 12 * 60_000,
          acquiredAtMs: PRODUCT_MS,
        },
      ],
      PRODUCT_MS,
    );
    expect(nearEqual).toEqual([CLOUDS_SECTOR_GOES_WEST, CLOUDS_SECTOR_GOES_EAST]);

    const eastMuchFresher = cloudsCompositePaintOrder(
      [
        {
          sectorId: CLOUDS_SECTOR_GOES_WEST,
          observationTimeMs: PRODUCT_MS - 40 * 60_000,
          acquiredAtMs: PRODUCT_MS,
        },
        {
          sectorId: CLOUDS_SECTOR_GOES_EAST,
          observationTimeMs: PRODUCT_MS - 5 * 60_000,
          acquiredAtMs: PRODUCT_MS,
        },
      ],
      PRODUCT_MS,
    );
    expect(eastMuchFresher[eastMuchFresher.length - 1]).toBe(CLOUDS_SECTOR_GOES_EAST);
  });

  it("composite src-over does not invent coverage from transparent pixels", () => {
    const base = new Uint8Array(8);
    base[0] = 10;
    base[1] = 10;
    base[2] = 10;
    base[3] = 200;
    const over = new Uint8Array(8);
    over[4] = 20;
    over[5] = 20;
    over[6] = 20;
    over[7] = 255;
    const out = compositeCloudHighlightLayers(
      [
        {
          sectorId: CLOUDS_SECTOR_EUMET_RING,
          width: 2,
          height: 1,
          rgba: base,
        },
        {
          sectorId: CLOUDS_SECTOR_GOES_EAST,
          width: 2,
          height: 1,
          rgba: over,
        },
      ],
      [CLOUDS_SECTOR_EUMET_RING, CLOUDS_SECTOR_GOES_EAST],
    );
    expect(out).not.toBeNull();
    expect(out!.rgba[3]).toBe(200);
    expect(out!.rgba[7]).toBe(255);
    expect(out!.rgba[4]).toBe(20);
  });

  it("East fail with others fresh still produces a composite", async () => {
    const png = encodeCloudsTestPng({ opaqueRatio: 0.4 });
    const fetchFn = vi.fn(
      mockCloudsLiveFetch({
        png,
        failGibsLayers: [CLOUDS_GIBS_GOES_EAST_LAYER],
      }),
    );
    const adapter = createGlobalCloudsIrLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => CLOUDS_TEST_OBSERVATION_MS + 60_000,
      useFixtureFallback: false,
      requireMosaicDimensions: false,
    });
    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.entry.record.body.kind === "equirectRaster") {
      const ids = result.entry.record.body.cloudComposite?.components.map((c) => c.sectorId) ?? [];
      expect(ids).not.toContain(CLOUDS_SECTOR_GOES_EAST);
      expect(ids).toContain(CLOUDS_SECTOR_EUMET_RING);
    }
  });

  it("ring unavailable but regionals valid still paints", async () => {
    const png = encodeCloudsTestPng({ opaqueRatio: 0.4, fillAfricaEurope: true });
    const fetchFn = vi.fn(mockCloudsLiveFetch({ png, failEumet: true }));
    const adapter = createGlobalCloudsIrLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => CLOUDS_TEST_OBSERVATION_MS + 60_000,
      useFixtureFallback: false,
      requireMosaicDimensions: false,
    });
    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.entry.record.body.kind === "equirectRaster") {
      expect(result.entry.record.body.coverageKind).toBe("partial");
      const ids = result.entry.record.body.cloudComposite?.components.map((c) => c.sectorId) ?? [];
      expect(ids).not.toContain(CLOUDS_SECTOR_EUMET_RING);
      expect(ids).toContain(CLOUDS_SECTOR_GOES_EAST);
    }
  });

  it("all sources failing does not fixture-as-live", async () => {
    const fetchFn = vi.fn(
      mockCloudsLiveFetch({
        png: encodeCloudsTestPng(),
        failEumet: true,
        failGibs: true,
      }),
    );
    const adapter = createGlobalCloudsIrLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => CLOUDS_TEST_OBSERVATION_MS,
      useFixtureFallback: false,
      requireMosaicDimensions: false,
    });
    const result = await adapter.acquire();
    expect(result.ok).toBe(false);
  });

  it("invalid/near-empty image is skipped rather than all-or-nothing", async () => {
    const fetchFn = vi.fn(
      mockCloudsLiveFetch({
        png: encodeCloudsTestPng({ opaqueRatio: 0 }),
        eumetPng: encodeCloudsGlobalTestPng(),
      }),
    );
    const adapter = createGlobalCloudsIrLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => CLOUDS_TEST_OBSERVATION_MS + 60_000,
      useFixtureFallback: false,
      requireMosaicDimensions: false,
    });
    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.entry.record.body.kind === "equirectRaster") {
      const ids = result.entry.record.body.cloudComposite?.components.map((c) => c.sectorId) ?? [];
      expect(ids).toContain(CLOUDS_SECTOR_EUMET_RING);
      expect(ids).not.toContain(CLOUDS_SECTOR_GOES_EAST);
    }
  });

  it("Clouds composite does not feed physical illumination", async () => {
    const host = createDynamicDataLifecycleHost({
      cloudsIrLiveFetchFn: mockCloudsLiveFetch({ png: encodeCloudsTestPng() }),
      nowMs: () => CLOUDS_TEST_OBSERVATION_MS + 60_000,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.ensureGlobalCloudsIrConsumer({ intervalMs: 60_000, runImmediately: true });
    await vi.waitFor(() => {
      expect(
        host
          .attachForProductInstant(CLOUDS_TEST_OBSERVATION_MS + 60_000)
          .getPreparedEquirectRaster(GLOBAL_CLOUDS_IR_SOURCE_ID),
      ).not.toBeNull();
    });
    const att = host.attachForProductInstant(CLOUDS_TEST_OBSERVATION_MS + 60_000);
    expect(att.getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID)).toBeNull();
    const layer = createSolarShadingLayer({
      cloudParticipationMode: "natural",
      cloudParticipationSourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
      cloudParticipationIntensity: 1,
      emissiveNightLightsMode: "off",
      moonlightMode: "off",
    });
    const onState = layer.getState(
      createTimeContext(CLOUDS_TEST_OBSERVATION_MS + 60_000, 0, false, {
        dynamicDataLifecycle: att,
      }),
    );
    expect(isSolarShadingPayload(onState.data)).toBe(true);
    if (isSolarShadingPayload(onState.data)) {
      expect(onState.data.cloudOpacityRaster).toBeNull();
    }
    host.dispose();
  });

  it("formats observation age without seconds", () => {
    expect(formatCloudsObservationAgeRange(5 * 60_000, 17 * 60_000)).toBe("5–17 min");
    expect(formatCloudsObservationAgeRange(5 * 60_000, 2 * 3_600_000)).toMatch(/5m–2h/);
  });

  it("component observation lines follow status-visible sectors only", () => {
    const painted = selectCloudsPaintableComponents(
      [
        {
          sectorId: CLOUDS_SECTOR_GOES_EAST,
          observationTimeMs: PRODUCT_MS - 5 * 60_000,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_GOES_WEST,
          observationTimeMs: PRODUCT_MS - 11 * 60_000,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_METEOSAT,
          observationTimeMs: PRODUCT_MS - 8 * 60_000,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_HIMAWARI,
          observationTimeMs: PRODUCT_MS - 17 * 60_000,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
        {
          sectorId: CLOUDS_SECTOR_EUMET_RING,
          observationTimeMs: PRODUCT_MS - 2 * 3_600_000,
          acquiredAtMs: PRODUCT_MS,
          coverageOk: true,
        },
      ],
      PRODUCT_MS,
    );
    const meta = buildCloudsCompositeMeta(painted);
    const provenance = resolveCloudsProvenance({
      originStamp: "live",
      acquiredAtMs: PRODUCT_MS,
      validTimeMs: meta!.newestObservationTimeMs,
      productUtcMs: PRODUCT_MS,
      lifecycleState: "ready",
      versionId: "lines",
      coverageKind: "global",
      providerKind: CLOUDS_PROVIDER_COMPOSITE,
      cloudComposite: meta,
    });
    const lines = cloudsComponentObservationLines(provenance);
    expect(lines.some((l) => l.includes("GOES-East"))).toBe(true);
    expect(lines.some((l) => l.includes("EUMET ring"))).toBe(false);
  });
});
