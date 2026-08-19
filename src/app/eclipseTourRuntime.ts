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
 * App-side adapter: build an Eclipse Tour schedule from the v2 document and
 * a structural fingerprint used to deactivate the tour on config mutation.
 */

import type { LibrationConfigV2 } from "../config/v2/librationConfig";
import {
  lunarEclipsePresentationFromScene,
  solarEclipsePresentationFromScene,
  eclipseTourPresentationFromScene,
  buildDefaultSceneConfigFromLayerFlags,
} from "../config/v2/sceneConfig";
import { eclipseTourStructuralKey } from "../core/eclipse/eclipseTourSequence";
import {
  listEclipseTourEvents,
  scheduleEclipseTourEvents,
  type EclipseTourScheduledEvent,
} from "../core/eclipse/eclipseTourCatalog";
import { eclipseTourRangeUtcMs } from "../core/eclipse/eclipseTourRange";
import { effectiveDemoWallClockZone } from "../components/config/demoTimeStartIso";
import { resolveReferenceFrameCivilTimeZone } from "../core/displayTimeReference";
import { formatIsoCalendarYmd } from "../core/eclipse/eclipseTourAppearance";
import { getCalendarYmdInZone } from "../core/wallTimeInZone";
import type { EclipseTourSequenceState } from "../core/eclipse/eclipseTourSequence";
import type { SceneConfig } from "../config/v2/sceneConfig";

function sceneFromV2(v2: LibrationConfigV2): SceneConfig {
  return v2.scene ?? buildDefaultSceneConfigFromLayerFlags(v2.layers);
}

export function eclipseTourUseUtcCivilFrame(v2: LibrationConfigV2): boolean {
  return v2.chrome.displayTime.topBandMode === "utc24";
}

export function eclipseTourCivilZone(v2: LibrationConfigV2): string {
  return effectiveDemoWallClockZone(
    v2.chrome.displayTime.topBandMode,
    resolveReferenceFrameCivilTimeZone(v2.chrome.displayTime),
  );
}

export function eclipseTourStructuralFingerprint(v2: LibrationConfigV2): string {
  const scene = sceneFromV2(v2);
  const tour = eclipseTourPresentationFromScene(scene);
  const solar = solarEclipsePresentationFromScene(scene);
  const lunar = lunarEclipsePresentationFromScene(scene);
  return eclipseTourStructuralKey({
    startDateYmd: "",
    endDateYmd: tour.endDateYmd,
    includeSolar: tour.includeSolar,
    includeLunar: tour.includeLunar,
    leadInId: tour.leadInId,
    postWaitId: tour.postWaitId,
    solarTypes: `${solar.showTypeTotal},${solar.showTypeAnnular},${solar.showTypePartial},${solar.showTypeHybrid}`,
    lunarTypes: `${lunar.showTypeTotal},${lunar.showTypePartial},${lunar.showTypePenumbral}`,
  });
}

export function buildEclipseTourSchedule(v2: LibrationConfigV2): EclipseTourScheduledEvent[] {
  const scene = sceneFromV2(v2);
  const tour = eclipseTourPresentationFromScene(scene);
  const bounds = eclipseTourRangeUtcMs(
    tour.startDateYmd,
    tour.endDateYmd,
    eclipseTourUseUtcCivilFrame(v2),
    eclipseTourCivilZone(v2),
  );
  if (!bounds || (!tour.includeSolar && !tour.includeLunar)) {
    return [];
  }
  const events = listEclipseTourEvents({
    startUtcMs: bounds.startUtcMs,
    endUtcMs: bounds.endUtcMs,
    includeSolar: tour.includeSolar,
    includeLunar: tour.includeLunar,
    solarPresentation: solarEclipsePresentationFromScene(scene),
    lunarPresentation: lunarEclipsePresentationFromScene(scene),
  });
  return scheduleEclipseTourEvents(
    events,
    bounds.startUtcMs,
    bounds.endUtcMs,
    tour.leadInId,
    tour.postWaitId,
  );
}

export function eclipseTourStartYmdFromNow(v2: LibrationConfigV2, nowMs: number = Date.now()): string {
  const ymd = getCalendarYmdInZone(nowMs, eclipseTourCivilZone(v2));
  return formatIsoCalendarYmd(ymd.y, ymd.m, ymd.d);
}

export function eclipseTourShouldDeactivate(
  state: EclipseTourSequenceState,
  demoActive: boolean,
  currentStartIsoUtc: string,
  structuralKey: string,
): boolean {
  if (state.phase === "inactive") {
    return false;
  }
  if (!demoActive) {
    return true;
  }
  if (state.ownedStartIsoUtc !== null && currentStartIsoUtc !== state.ownedStartIsoUtc) {
    return true;
  }
  if (state.structuralKey !== structuralKey) {
    return true;
  }
  return false;
}
