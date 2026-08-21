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
 * DLC-2 Model B: dynamic point-features overlay (e.g. earthquakes).
 * Reads sync-prepared lifecycle views only — never fetches in getState.
 * Earthquake presentation filters are local over the prepared snapshot.
 */

import { SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED } from "../config/sceneLayerOrder";
import {
  DEFAULT_EARTHQUAKE_PRESENTATION,
  earthquakeLabelEligible,
  earthquakeMarkerEligible,
  eventTimeMsFromEarthquakeFeature,
  formatEarthquakeMarkerLabel,
  magnitudeFromEarthquakeProperties,
  placeFromEarthquakeProperties,
  type EarthquakePresentation,
} from "../core/earthquakePresentation";
import {
  getOverlayReadabilityFrameOrCompute,
} from "../core/overlayReadabilityFrame";
import { getDynamicDataLifecycleAttachment } from "../lifecycle/dynamicDataLifecycleHost";
import {
  earthquakeShouldPaint,
  originStampFromPreparedPointFeatures,
  resolveEarthquakeProvenance,
  type EarthquakeProvenance,
} from "../lifecycle/earthquakeProvenance";
import type { DynamicSourceId } from "../lifecycle/dynamicSnapshotTypes";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import {
  DYNAMIC_POINT_FEATURES_KIND,
  type DynamicPointFeatureMarker,
  type DynamicPointFeaturesPayload,
} from "./dynamicPointFeaturesPayload";

const updatePolicy: UpdatePolicy = { type: "onDemand" };

export function runtimeIdForDynamicPointFeaturesSceneLayer(
  sceneLayerId: string,
): string {
  return `layer.dynamicPointFeatures.${sceneLayerId}`;
}

export type CreateDynamicPointFeaturesOverlayLayerOptions = {
  /** {@link SceneLayerInstance.id} — names the runtime layer id. */
  sceneLayerId: string;
  /** Durable lifecycle source id (SceneConfig `source.sourceId`). */
  sourceId: DynamicSourceId;
  zIndex?: number;
  opacity?: number;
  name?: string;
  /**
   * Earthquake presentation (LIB-059). Captured at construction; scene equality
   * must include `source.parameters` so edits rebuild the overlay.
   */
  presentation?: EarthquakePresentation;
};

/**
 * Point markers driven by lifecycle-prepared pointFeatures snapshots.
 * Invisible when no prepared view exists for the product instant.
 */
export function createDynamicPointFeaturesOverlayLayer(
  options: CreateDynamicPointFeaturesOverlayLayerOptions,
): Layer {
  const opacity = options.opacity ?? 1;
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const id = runtimeIdForDynamicPointFeaturesSceneLayer(options.sceneLayerId);
  const { sourceId } = options;
  const presentation = options.presentation ?? DEFAULT_EARTHQUAKE_PRESENTATION;
  const isEarthquakesLayer = options.sceneLayerId === "earthquakes";

  return {
    id,
    name: options.name ?? "Dynamic point features",
    enabled: true,
    zIndex,
    type: "points",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const attachment = getDynamicDataLifecycleAttachment(time);
      const prepared = attachment?.getPreparedPointFeatures(sourceId) ?? null;
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

      const lifecycleState =
        attachment?.getLifecycleState(sourceId).state ?? "ready";
      const provenance: EarthquakeProvenance = resolveEarthquakeProvenance({
        originStamp: originStampFromPreparedPointFeatures(prepared),
        acquiredAtMs: prepared.acquiredAtMs,
        productUtcMs: time.now,
        lifecycleState,
        versionId: prepared.versionId,
      });

      if (isEarthquakesLayer && !earthquakeShouldPaint(provenance)) {
        const allowDevFixture =
          provenance.origin === "fixture" && prepared.devAllowFixturePaint === true;
        if (!allowDevFixture) {
          return {
            visible: false,
            opacity,
            data: null,
            metadata: {
              dynamicSourceId: prepared.sourceId,
              versionId: prepared.versionId,
              validTimeMs: prepared.validTimeMs,
              freshness: prepared.freshness,
              featureCount: 0,
              earthquakeProvenance: provenance,
              reason:
                provenance.origin === "fixture"
                  ? "fixture-not-live"
                  : "snapshot-excessively-stale",
            },
          };
        }
      }

      const frame = getOverlayReadabilityFrameOrCompute(time);
      const features: DynamicPointFeatureMarker[] = [];
      for (const f of prepared.features) {
        const magnitude = magnitudeFromEarthquakeProperties(f.properties);
        const eventTimeMs = eventTimeMsFromEarthquakeFeature(f);
        if (isEarthquakesLayer) {
          if (
            !earthquakeMarkerEligible({
              magnitude,
              eventTimeMs,
              properties: f.properties,
              productUtcMs: time.now,
              presentation,
            })
          ) {
            continue;
          }
        }
        const label = isEarthquakesLayer
          ? earthquakeLabelEligible({ magnitude, presentation })
            ? formatEarthquakeMarkerLabel(
                magnitude,
                placeFromEarthquakeProperties(f.properties),
              )
            : undefined
          : labelFromLegacyProperties(f.properties, magnitude);
        features.push({
          id: f.id,
          lonDeg: f.lonDeg,
          latDeg: f.latDeg,
          ...(label !== undefined ? { label } : {}),
          ...(magnitude !== undefined ? { magnitude } : {}),
          readabilityNightVeil01: frame.readabilityVeil01At(
            f.latDeg,
            f.lonDeg,
          ),
        });
      }

      const data: DynamicPointFeaturesPayload = {
        kind: DYNAMIC_POINT_FEATURES_KIND,
        features,
        overlayReadabilityLiftScale01:
          frame.substrateOverlayReadabilityLiftScale01,
      };
      return {
        visible: features.length > 0,
        opacity,
        data,
        metadata: {
          dynamicSourceId: prepared.sourceId,
          versionId: prepared.versionId,
          validTimeMs: prepared.validTimeMs,
          freshness: prepared.freshness,
          featureCount: features.length,
          acquiredFeatureCount: prepared.features.length,
          earthquakeProvenance: provenance,
          ...(prepared.attribution !== undefined
            ? { attribution: prepared.attribution }
            : {}),
        },
      };
    },
  };
}

function labelFromLegacyProperties(
  properties: Readonly<Record<string, unknown>> | undefined,
  magnitude: number | undefined,
): string | undefined {
  if (properties === undefined) return undefined;
  const title = properties.title;
  if (typeof title === "string" && title.trim() !== "") return title.trim();
  const place = properties.place;
  if (
    magnitude !== undefined &&
    typeof place === "string" &&
    place.trim() !== ""
  ) {
    return `M ${magnitude.toFixed(1)}`;
  }
  if (magnitude !== undefined) return `M ${magnitude.toFixed(1)}`;
  return undefined;
}
