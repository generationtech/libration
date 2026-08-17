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
 * DLC-3 Model B: dynamic tracks overlay (e.g. ISS orbital ground track).
 * Reads sync-prepared lifecycle views only — never fetches in getState.
 */

import { SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED } from "../config/sceneLayerOrder";
import { resolveIssOrbitHorizonMs } from "../core/issOrbitHorizon";
import {
  DEFAULT_ISS_ORBITAL_PRESENTATION,
  issTravelHeadingRad,
  selectIssTrackTemporalWindow,
  type IssOrbitalPresentation,
} from "../core/issOrbitalPresentation";
import {
  getOverlayReadabilityFrameOrCompute,
} from "../core/overlayReadabilityFrame";
import { getDynamicDataLifecycleAttachment } from "../lifecycle/dynamicDataLifecycleHost";
import {
  ISS_ORBITAL_TRACK_SAMPLE_STEP_MS,
  resolveIssCurrentSample,
  tleLinesFromTrackProperties,
} from "../lifecycle/issOrbitalTrackAcquisition";
import {
  getIssPresentationTrackSamples,
  issOrbitalPeriodMsFromTle,
} from "../lifecycle/issPresentationTrack";
import {
  issProvenanceFromPreparedTrack,
  issTrackShouldPaint,
} from "../lifecycle/issTrackProvenance";
import type { DynamicSourceId } from "../lifecycle/dynamicSnapshotTypes";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import {
  DYNAMIC_TRACKS_KIND,
  type DynamicTrackOverlay,
  type DynamicTrackSampleMarker,
  type DynamicTracksPayload,
} from "./dynamicTracksPayload";

const updatePolicy: UpdatePolicy = { type: "onDemand" };

export function runtimeIdForDynamicTracksSceneLayer(
  sceneLayerId: string,
): string {
  return `layer.dynamicTracks.${sceneLayerId}`;
}

export type CreateDynamicTracksOverlayLayerOptions = {
  /** {@link SceneLayerInstance.id} — names the runtime layer id. */
  sceneLayerId: string;
  /** Durable lifecycle source id (SceneConfig `source.sourceId`). */
  sourceId: DynamicSourceId;
  zIndex?: number;
  opacity?: number;
  name?: string;
  presentation?: IssOrbitalPresentation;
};

function labelFromProperties(
  properties: Readonly<Record<string, unknown>> | undefined,
): string | undefined {
  if (properties === undefined) return undefined;
  const title = properties.title;
  if (typeof title === "string" && title.trim() !== "") return title.trim();
  const name = properties.name;
  if (typeof name === "string" && name.trim() !== "") return name.trim();
  return undefined;
}

/**
 * Track trails + current-position marker driven by lifecycle-prepared tracks.
 * Invisible when no prepared view exists for the product instant.
 */
export function createDynamicTracksOverlayLayer(
  options: CreateDynamicTracksOverlayLayerOptions,
): Layer {
  const opacity = options.opacity ?? 1;
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const id = runtimeIdForDynamicTracksSceneLayer(options.sceneLayerId);
  const { sourceId } = options;
  const presentation = options.presentation ?? DEFAULT_ISS_ORBITAL_PRESENTATION;

  return {
    id,
    name: options.name ?? "Dynamic tracks",
    enabled: true,
    zIndex,
    type: "tracks",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const attachment = getDynamicDataLifecycleAttachment(time);
      const prepared = attachment?.getPreparedTracks(sourceId) ?? null;
      if (prepared === null) {
        return {
          visible: false,
          opacity,
          data: null,
          metadata: {
            dynamicSourceId: sourceId,
            reason: "missing-prepared-view",
          },
        };
      }

      const frame = getOverlayReadabilityFrameOrCompute(time);
      const first = prepared.tracks[0];
      const lifecycleState =
        attachment?.getLifecycleState(sourceId).state ?? "idle";
      const provenance = issProvenanceFromPreparedTrack({
        tracks: prepared.tracks,
        acquiredAtMs: prepared.validTimeMs,
        productUtcMs: time.now,
        lifecycleState,
      });
      if (provenance === null || !issTrackShouldPaint(provenance)) {
        return {
          visible: false,
          opacity,
          data: null,
          metadata: {
            dynamicSourceId: prepared.sourceId,
            versionId: prepared.versionId,
            reason:
              provenance === null
                ? "empty-tracks"
                : provenance.origin === "fixture"
                  ? "iss-fixture-suppressed"
                  : provenance.freshnessBand === "excessively-stale"
                    ? "iss-excessively-stale"
                    : "iss-unavailable",
            issProvenance: provenance,
          },
        };
      }

      const current =
        first !== undefined
          ? resolveIssCurrentSample(first, time.now)
          : null;

      const tle =
        first !== undefined ? tleLinesFromTrackProperties(first.properties) : null;
      const orbitalPeriodMs = tle !== null ? issOrbitalPeriodMsFromTle(tle) : null;
      const pastMs = resolveIssOrbitHorizonMs(presentation.pastHorizon, orbitalPeriodMs);
      const futureMs = resolveIssOrbitHorizonMs(
        presentation.futureHorizon,
        orbitalPeriodMs,
      );
      const headingPad = ISS_ORBITAL_TRACK_SAMPLE_STEP_MS;
      const lookbackMs =
        presentation.trackEnabled && presentation.pastEnabled ? pastMs : headingPad;
      const lookaheadMs =
        presentation.trackEnabled && presentation.futureEnabled ? futureMs : headingPad;
      const localSamples =
        tle !== null
          ? getIssPresentationTrackSamples({
              tle,
              productUtcMs: time.now,
              lookbackMs,
              lookaheadMs,
            })
          : null;

      const tracks: DynamicTrackOverlay[] = prepared.tracks
        .filter((t) => t.samples.length > 0)
        .map((t) => {
          const label =
            t.id === "iss" && presentation.labelEnabled
              ? "ISS"
              : t.id === "iss"
                ? undefined
                : labelFromProperties(t.properties);
          const sourceSamples =
            t.id === "iss" && localSamples !== null && localSamples.length > 0
              ? localSamples
              : t.samples;
          const samples: DynamicTrackSampleMarker[] = sourceSamples.map((s) => ({
            lonDeg: s.lonDeg,
            latDeg: s.latDeg,
            timeMs: s.timeMs,
          }));
          const marker: DynamicTrackSampleMarker | undefined =
            t.id === "iss" && current !== null
              ? {
                  lonDeg: current.lonDeg,
                  latDeg: current.latDeg,
                  timeMs: current.timeMs,
                }
              : undefined;
          const windowed = selectIssTrackTemporalWindow(samples, time.now, {
            pastEnabled: presentation.trackEnabled && presentation.pastEnabled,
            futureEnabled: presentation.trackEnabled && presentation.futureEnabled,
            pastMs,
            futureMs,
            current: marker,
          });
          return {
            id: t.id,
            samples,
            pastSamples: windowed.past,
            futureSamples: windowed.future,
            ...(label !== undefined ? { label } : {}),
          };
        });

      if (tracks.length === 0) {
        return {
          visible: false,
          opacity,
          data: null,
          metadata: {
            dynamicSourceId: prepared.sourceId,
            versionId: prepared.versionId,
            reason: "empty-tracks",
          },
        };
      }

      const marker = current ?? tracks[0]!.samples[0]!;
      const tipVeil = frame.readabilityVeil01At(marker.latDeg, marker.lonDeg);
      const heading = travelHeadingFromSamples(tracks[0]!.samples, marker.timeMs);

      const data: DynamicTracksPayload = {
        kind: DYNAMIC_TRACKS_KIND,
        tracks,
        currentPosition: {
          lonDeg: marker.lonDeg,
          latDeg: marker.latDeg,
          timeMs: marker.timeMs,
        },
        presentation,
        ...(heading !== null ? { travelHeadingRad: heading } : {}),
        overlayReadabilityLiftScale01:
          frame.substrateOverlayReadabilityLiftScale01,
        tipReadabilityNightVeil01: tipVeil,
        ...(orbitalPeriodMs !== null ? { orbitalPeriodMs } : {}),
      };
      return {
        visible: true,
        opacity,
        data,
        metadata: {
          dynamicSourceId: prepared.sourceId,
          versionId: prepared.versionId,
          validTimeMs: prepared.validTimeMs,
          freshness: prepared.freshness,
          trackCount: tracks.length,
          issProvenance: provenance,
          ...(prepared.attribution !== undefined
            ? { attribution: prepared.attribution }
            : {}),
        },
      };
    },
  };
}

function unwrapLonNear(lonDeg: number, nearLonDeg: number): number {
  let x = lonDeg;
  while (x - nearLonDeg > 180) x -= 360;
  while (nearLonDeg - x > 180) x += 360;
  return x;
}

function travelHeadingFromSamples(
  samples: readonly DynamicTrackSampleMarker[],
  timeMs: number,
): number | null {
  if (samples.length < 2) return null;
  let nearest = 0;
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < samples.length; i += 1) {
    const d = Math.abs(samples[i]!.timeMs - timeMs);
    if (d < best) {
      best = d;
      nearest = i;
    }
  }
  const prev = samples[Math.max(0, nearest - 1)]!;
  const next = samples[Math.min(samples.length - 1, nearest + 1)]!;
  if (prev === next) return null;
  return issTravelHeadingRad({
    fromLonDeg: prev.lonDeg,
    fromLatDeg: prev.latDeg,
    toLonDeg: unwrapLonNear(next.lonDeg, prev.lonDeg),
    toLatDeg: next.latDeg,
  });
}
