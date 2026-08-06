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

import * as jpeg from "jpeg-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTimeContext } from "../core/time";
import { buildDynamicSnapshotRecord } from "./dynamicSnapshotContracts";
import {
  createDynamicDataLifecycleHost,
  createFixtureAcquisitionAdapter,
  getDynamicDataLifecycleAttachment,
  type DynamicAcquisitionResult,
  type DynamicSnapshotStoreEntry,
  type DynamicSnapshotTemporalMeta,
} from "./index";

/** Minimal real-format JPEG (1×1) via jpeg-js — not a cosmetic fake product layer. */
function encodeFixtureJpeg(): Uint8Array {
  const encoded = jpeg.encode(
    { data: new Uint8Array([0, 0, 0, 255]), width: 1, height: 1 },
    90,
  );
  return new Uint8Array(encoded.data);
}

const SOURCE = "fixture-clouds-ir-v1";

const BASE_META: DynamicSnapshotTemporalMeta = {
  sourceId: SOURCE,
  kind: "equirectRaster",
  versionId: "v-2026-08-05T12",
  acquiredAtMs: 1_700_000_000_000,
  validTimeMs: 1_700_000_100_000,
  attribution: "Fixture IR sample",
};

function rasterEntry(
  overrides: Partial<DynamicSnapshotTemporalMeta> = {},
  payloadBytes: Uint8Array = encodeFixtureJpeg(),
): DynamicSnapshotStoreEntry {
  const meta = { ...BASE_META, ...overrides };
  const record = buildDynamicSnapshotRecord(meta, {
    kind: "equirectRaster",
    contentType: "image/jpeg",
    lonMinDeg: -180,
    lonMaxDeg: 180,
    byteLength: payloadBytes.byteLength,
  });
  if (record === null) {
    throw new Error("expected valid raster record");
  }
  return { record, payloadBytes };
}

describe("createDynamicDataLifecycleHost (P10-6 shell seam)", () => {
  const timers: Array<ReturnType<typeof setInterval>> = [];

  afterEach(() => {
    for (const handle of timers) {
      clearInterval(handle);
    }
    timers.length = 0;
  });

  it("wires store, lifecycle, resolver, and acquisition into one host", () => {
    const host = createDynamicDataLifecycleHost();
    expect(host.store).toBeDefined();
    expect(host.lifecycle).toBeDefined();
    expect(host.resolver).toBeDefined();
    expect(host.acquisition).toBeDefined();
    host.dispose();
  });

  it("attaches a product-time view that resolves imported fixtures", async () => {
    const host = createDynamicDataLifecycleHost();
    const entry = rasterEntry({ versionId: "shell-import-v1" });
    const imported = await host.acquisition.importSnapshot(entry);
    expect(imported).toEqual({ ok: true, versionId: "shell-import-v1" });

    const productInstantMs = BASE_META.validTimeMs + 60_000;
    const attachment = host.attachForProductInstant(productInstantMs);
    expect(attachment.productInstantMs).toBe(productInstantMs);
    expect(attachment.getLifecycleState(SOURCE).state).toBe("ready");

    const result = await attachment.resolveSnapshot(SOURCE);
    expect(result.status).toBe("ok");
    expect(result.snapshot?.meta.versionId).toBe("shell-import-v1");
    expect(result.freshness).toBe("ready");
    host.dispose();
  });

  it("threads the attachment through createTimeContext for future layers", async () => {
    const host = createDynamicDataLifecycleHost();
    await host.acquisition.importSnapshot(
      rasterEntry({ versionId: "time-ctx-v1" }),
    );

    const productInstantMs = BASE_META.validTimeMs;
    const attachment = host.attachForProductInstant(productInstantMs);
    const time = createTimeContext(productInstantMs, 16, false, {
      dynamicDataLifecycle: attachment,
    });

    expect(getDynamicDataLifecycleAttachment(time)).toBe(attachment);
    expect(time.dynamicDataLifecycle?.productInstantMs).toBe(productInstantMs);

    const result = await time.dynamicDataLifecycle!.resolveSnapshot(SOURCE);
    expect(result.status).toBe("ok");
    expect(result.snapshot?.meta.versionId).toBe("time-ctx-v1");
    host.dispose();
  });

  it("returns undefined from getDynamicDataLifecycleAttachment when unset", () => {
    const time = createTimeContext(1_700_000_000_000, 0, false);
    expect(getDynamicDataLifecycleAttachment(time)).toBeUndefined();
  });

  it("does not invoke acquisition adapters when resolving via the attachment", async () => {
    const host = createDynamicDataLifecycleHost();
    await host.acquisition.importSnapshot(
      rasterEntry({ versionId: "cached-v1" }),
    );

    const acquire = vi.fn(
      async (): Promise<DynamicAcquisitionResult> => ({
        ok: true,
        entry: rasterEntry({ versionId: "should-not-run" }),
      }),
    );
    host.acquisition.registerAdapter({
      sourceId: SOURCE,
      acquire,
    });

    const attachment = host.attachForProductInstant(BASE_META.validTimeMs);
    for (const productInstantMs of [
      BASE_META.validTimeMs - 3_600_000,
      BASE_META.validTimeMs,
      BASE_META.validTimeMs + 3_600_000,
    ]) {
      const frame = host.attachForProductInstant(productInstantMs);
      const result = await frame.resolveSnapshot(SOURCE);
      expect(result.status).toBe("ok");
      expect(result.snapshot?.meta.versionId).toBe("cached-v1");
    }

    // Scrub-style resolves must stay read-only even with a registered adapter.
    expect(acquire).not.toHaveBeenCalled();
    expect(attachment.getLifecycleState(SOURCE).state).toBe("ready");
    host.dispose();
  });

  it("dispose stops periodic acquisition without blocking resolve", async () => {
    const host = createDynamicDataLifecycleHost({
      setIntervalFn: (handler, timeout) => {
        const handle = setInterval(handler, timeout);
        timers.push(handle);
        return handle;
      },
      clearIntervalFn: (handle) => {
        clearInterval(handle as ReturnType<typeof setInterval>);
      },
    });

    await host.acquisition.importSnapshot(
      rasterEntry({ versionId: "dispose-v1" }),
    );
    host.acquisition.registerAdapter(
      createFixtureAcquisitionAdapter(SOURCE, () => ({
        ok: true,
        entry: rasterEntry({ versionId: "periodic-v2" }),
      })),
    );
    const started = host.acquisition.startPeriodic(SOURCE, {
      intervalMs: 60_000,
    });
    expect(started).toEqual({ ok: true });
    expect(host.acquisition.isPeriodicActive(SOURCE)).toBe(true);

    host.dispose();
    expect(host.acquisition.isPeriodicActive(SOURCE)).toBe(false);

    const result = await host
      .attachForProductInstant(BASE_META.validTimeMs)
      .resolveSnapshot(SOURCE);
    expect(result.status).toBe("ok");
    expect(result.snapshot?.meta.versionId).toBe("dispose-v1");
  });

  it("selects nearest validTime across scrubbed product instants", async () => {
    const host = createDynamicDataLifecycleHost();
    await host.acquisition.importSnapshot(
      rasterEntry({
        versionId: "early",
        validTimeMs: 1_700_000_000_000,
      }),
    );
    await host.acquisition.importSnapshot(
      rasterEntry({
        versionId: "late",
        validTimeMs: 1_700_000_200_000,
      }),
    );

    const early = await host
      .attachForProductInstant(1_700_000_010_000)
      .resolveSnapshot(SOURCE);
    expect(early.snapshot?.meta.versionId).toBe("early");

    const late = await host
      .attachForProductInstant(1_700_000_190_000)
      .resolveSnapshot(SOURCE);
    expect(late.snapshot?.meta.versionId).toBe("late");
    host.dispose();
  });
});
