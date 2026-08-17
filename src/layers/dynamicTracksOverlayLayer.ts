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
import {
  getOverlayReadabilityFrameOrCompute,
} from "../core/overlayReadabilityFrame";
import { getDynamicDataLifecycleAttachment } from "../lifecycle/dynamicDataLifecycleHost";
import { resolveIssCurrentSample } from "../lifecycle/issOrbitalTrackAcquisition";
import {
  issProvenanceFromPreparedTrack,
  issTrackShouldPaint,
} from "../lifecycle/issTrackProvenance";
import type { DynamicSourceId } from "../lifecycle/dynamicSnapshotTypes";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import {
  DYNAMIC_TRACKS_KIND,
  type DynamicTrackOverlay,
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

      const tracks: DynamicTrackOverlay[] = prepared.tracks
        .filter((t) => t.samples.length > 0)
        .map((t) => {
          const label =
            t.id === "iss" ? "ISS" : labelFromProperties(t.properties);
          return {
            id: t.id,
            samples: t.samples.map((s) => ({
              lonDeg: s.lonDeg,
              latDeg: s.latDeg,
              timeMs: s.timeMs,
            })),
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

      const data: DynamicTracksPayload = {
        kind: DYNAMIC_TRACKS_KIND,
        tracks,
        currentPosition: {
          lonDeg: marker.lonDeg,
          latDeg: marker.latDeg,
          timeMs: marker.timeMs,
        },
        overlayReadabilityLiftScale01:
          frame.substrateOverlayReadabilityLiftScale01,
        tipReadabilityNightVeil01: tipVeil,
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
