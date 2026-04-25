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
import { createLayerRegistryFromConfig } from "./app/bootstrap";
import bootstrapSource from "./app/bootstrap.ts?raw";
import { buildDisplayChromeState } from "./app/renderBridge";
import { createTimeContext } from "./core/time";
import { getActiveAppConfig } from "./config/displayPresets";
import {
  appConfigToV2,
  normalizeLibrationConfig,
  v2ToAppConfig,
} from "./config/v2/librationConfig";
import { resolveStartupWorkingV2 } from "./config/v2/workingV2Persistence";
import type { Viewport } from "./renderer/types";

const rendererSources = import.meta.glob<string>("./renderer/**/*.{ts,tsx}", {
  eager: true,
  query: "?raw",
  import: "default",
});

function sortLayerIds(registry: ReturnType<typeof createLayerRegistryFromConfig>): string[] {
  return [...registry.getLayers().map((l) => l.id)].sort();
}

/** Mirrors App.tsx shell startup with no durable storage (Phase 4: same as empty/missing persistence). */
function shellStartupDerivedAppConfig() {
  const workingV2 = resolveStartupWorkingV2(null, () =>
    appConfigToV2(getActiveAppConfig()),
  );
  return v2ToAppConfig(workingV2);
}

function assertNoV2ImportInSource(source: string, label: string): void {
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes("from ") && !line.includes("import(")) continue;
    const trimmed = line.trimStart();
    if (trimmed.startsWith("//")) continue;
    if (
      line.includes("config/v2") ||
      line.includes("./v2/") ||
      line.includes("../v2/") ||
      line.includes("/v2/librationConfig")
    ) {
      throw new Error(`Unexpected v2 import in ${label}:${i + 1}: ${line.trim()}`);
    }
  }
}

describe("LibrationConfig v2 Phase 2 (shell ownership)", () => {
  it("startup equivalence: derived AppConfig matches getActiveAppConfig()", () => {
    const derived = shellStartupDerivedAppConfig();
    const active = getActiveAppConfig();
    expect(appConfigToV2(derived)).toEqual(appConfigToV2(active));
    expect(derived.scene.baseMap.presentationByMapId?.[derived.scene.baseMap.id]).toEqual(
      normalizeLibrationConfig(appConfigToV2(derived)).scene?.baseMap.presentation,
    );
  });

  it("registry equivalence: derived config yields same layer ids as active preset", () => {
    const active = getActiveAppConfig();
    const derived = shellStartupDerivedAppConfig();
    expect(sortLayerIds(createLayerRegistryFromConfig(derived))).toEqual(
      sortLayerIds(createLayerRegistryFromConfig(active)),
    );
  });

  it("chrome equivalence: displayTime from derived AppConfig matches active preset", () => {
    const active = getActiveAppConfig();
    const derived = shellStartupDerivedAppConfig();
    const time = createTimeContext(1_700_000_000_000, 16, false);
    const viewport: Viewport = { width: 1200, height: 800, devicePixelRatio: 1 };
    const frame = { frameNumber: 1, now: time.now, deltaMs: time.deltaMs };
    const a = buildDisplayChromeState({
      time,
      viewport,
      frame,
      displayTime: active.displayTime,
      geography: active.geography,
    });
    const b = buildDisplayChromeState({
      time,
      viewport,
      frame,
      displayTime: derived.displayTime,
      geography: derived.geography,
    });
    expect(b).toEqual(a);
  });

  it("no v2 imports in renderer or app/bootstrap (shell-only boundary)", () => {
    for (const [path, source] of Object.entries(rendererSources)) {
      assertNoV2ImportInSource(source, path);
    }
    assertNoV2ImportInSource(bootstrapSource, "./app/bootstrap.ts");
  });
});
