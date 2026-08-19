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
import { defaultLibrationConfigV2, normalizeLibrationConfig } from "../config/v2/librationConfig";
import {
  applyEclipseTourPresentationToScene,
  buildDefaultSceneConfigFromLayerFlags,
} from "../config/v2/sceneConfig";
import {
  inactiveEclipseTourState,
  startEclipseTourSequence,
} from "../core/eclipse/eclipseTourSequence";
import {
  buildEclipseTourSchedule,
  eclipseTourShouldDeactivate,
  eclipseTourStartYmdFromNow,
  eclipseTourStructuralFingerprint,
} from "./eclipseTourRuntime";

describe("eclipseTourRuntime", () => {
  it("enumerates a mixed 2017 range in catalog order; fingerprint ignores start date", () => {
    const base = normalizeLibrationConfig(defaultLibrationConfigV2());
    const scene0 = base.scene ?? buildDefaultSceneConfigFromLayerFlags(base.layers);
    base.scene = applyEclipseTourPresentationToScene(scene0, {
      startDateYmd: "2017-08-01",
      endDateYmd: "2017-09-14",
      includeSolar: true,
      includeLunar: true,
    });
    const events = buildEclipseTourSchedule(base);
    expect(events.length).toBeGreaterThan(0);
    for (let i = 1; i < events.length; i += 1) {
      expect(events[i]!.sortTimeUtcMs).toBeGreaterThanOrEqual(events[i - 1]!.sortTimeUtcMs);
    }
    const keyA = eclipseTourStructuralFingerprint(base);
    const sceneA = base.scene ?? buildDefaultSceneConfigFromLayerFlags(base.layers);
    base.scene = applyEclipseTourPresentationToScene(sceneA, {
      startDateYmd: "2017-08-21",
    });
    expect(eclipseTourStructuralFingerprint(base)).toBe(keyA);
    const sceneB = base.scene ?? buildDefaultSceneConfigFromLayerFlags(base.layers);
    base.scene = applyEclipseTourPresentationToScene(sceneB, {
      includeLunar: false,
    });
    expect(eclipseTourStructuralFingerprint(base)).not.toBe(keyA);
  });

  it("deactivates when Demo stops or the Demo start ISO is foreign", () => {
    const v2 = normalizeLibrationConfig(defaultLibrationConfigV2());
    const scene = v2.scene ?? buildDefaultSceneConfigFromLayerFlags(v2.layers);
    v2.scene = applyEclipseTourPresentationToScene(scene, {
      startDateYmd: "2017-08-01",
      endDateYmd: "2017-09-14",
    });
    const events = buildEclipseTourSchedule(v2);
    const started = startEclipseTourSequence(
      events,
      true,
      eclipseTourStructuralFingerprint(v2),
    );
    expect(
      eclipseTourShouldDeactivate(
        started.state,
        true,
        started.state.ownedStartIsoUtc!,
        started.state.structuralKey,
      ),
    ).toBe(false);
    expect(
      eclipseTourShouldDeactivate(
        started.state,
        false,
        started.state.ownedStartIsoUtc!,
        started.state.structuralKey,
      ),
    ).toBe(true);
    expect(
      eclipseTourShouldDeactivate(
        started.state,
        true,
        "2030-01-01T00:00:00.000Z",
        started.state.structuralKey,
      ),
    ).toBe(true);
    expect(eclipseTourShouldDeactivate(inactiveEclipseTourState(), true, "x", "")).toBe(false);
  });

  it("Set tour start to now returns a civil YMD", () => {
    const v2 = normalizeLibrationConfig(defaultLibrationConfigV2());
    const ymd = eclipseTourStartYmdFromNow(v2, Date.UTC(2026, 7, 18, 15, 0, 0));
    expect(ymd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
