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

import type { LibrationConfigV2 } from "../config/v2/librationConfig";
import type { DynamicDataLifecycleAttachment } from "../lifecycle/dynamicDataLifecycleHostTypes";
import type { PreparedPointFeaturesView } from "../lifecycle/dynamicPointFeaturesMaterializer";
import type { PreparedTracksView } from "../lifecycle/dynamicTracksMaterializer";
import type { RenderPlan } from "../renderer/renderPlan/renderPlanTypes";
import { RESOLVED_RENDER_PLAN_KIND } from "../renderer/renderPlan/resolvedRenderPlanPayload";
import type { RenderableLayerState } from "../renderer/types";

/**
 * Process-local visual-scenario session for the current page load.
 * Set once at DEV startup; never persisted. Production never applies a session.
 */
export type VisualScenarioRuntime =
  | { readonly kind: "inactive" }
  | { readonly kind: "unknown"; readonly requestedId: string }
  | {
      readonly kind: "applied";
      readonly id: string;
      readonly startIsoUtc: string;
      readonly config: LibrationConfigV2;
    };

export const INACTIVE_VISUAL_SCENARIO_RUNTIME: VisualScenarioRuntime = {
  kind: "inactive",
};

const VISUAL_SCENARIO_EXTRA_OVERLAY_ID = "dev.visualScenario.extraOverlay";
const SUBLUNAR_MARKER_LAYER_ID = "layer.points.sublunar";

export type VisualScenarioExtraOverlayBuilder = (input: {
  readonly utcMs: number;
  readonly viewportWidthPx: number;
  readonly viewportHeightPx: number;
}) => RenderPlan;

let runtime: VisualScenarioRuntime = INACTIVE_VISUAL_SCENARIO_RUNTIME;
let extraOverlayBuilder: VisualScenarioExtraOverlayBuilder | null = null;
let preparedTracksOverride: PreparedTracksView | null = null;
let preparedPointFeaturesOverride: PreparedPointFeaturesView | null = null;

export function getVisualScenarioRuntime(): VisualScenarioRuntime {
  return runtime;
}

export function setVisualScenarioRuntime(next: VisualScenarioRuntime): void {
  runtime = next;
}

export function setVisualScenarioExtraOverlayBuilder(
  builder: VisualScenarioExtraOverlayBuilder | null,
): void {
  extraOverlayBuilder = builder;
}

export function setVisualScenarioPreparedTracks(
  view: PreparedTracksView | null,
): void {
  preparedTracksOverride = view;
}

export function setVisualScenarioPreparedPointFeatures(
  view: PreparedPointFeaturesView | null,
): void {
  preparedPointFeaturesOverride = view;
}

export function resetVisualScenarioRuntime(): void {
  runtime = INACTIVE_VISUAL_SCENARIO_RUNTIME;
  extraOverlayBuilder = null;
  preparedTracksOverride = null;
  preparedPointFeaturesOverride = null;
}

/**
 * DEV hatch: reuse a process-local prepared ISS view when a visual scenario
 * installed one. Production never sets the override, so this is a no-op.
 */
export function attachVisualScenarioPreparedTracks(
  attachment: DynamicDataLifecycleAttachment,
): DynamicDataLifecycleAttachment {
  const override = preparedTracksOverride;
  if (override === null) {
    return attachment;
  }
  return {
    ...attachment,
    getPreparedTracks(sourceId) {
      if (sourceId === override.sourceId) {
        return override;
      }
      return attachment.getPreparedTracks(sourceId);
    },
  };
}

/**
 * DEV hatch: reuse a process-local prepared earthquake view when a visual
 * scenario installed one. Production never sets the override, so this is a no-op.
 */
export function attachVisualScenarioPreparedPointFeatures(
  attachment: DynamicDataLifecycleAttachment,
): DynamicDataLifecycleAttachment {
  const override = preparedPointFeaturesOverride;
  if (override === null) {
    return attachment;
  }
  return {
    ...attachment,
    getPreparedPointFeatures(sourceId) {
      if (sourceId === override.sourceId) {
        return override;
      }
      return attachment.getPreparedPointFeatures(sourceId);
    },
  };
}

/**
 * Optional upstream-resolved overlay for a DEV visual scenario.
 * Production never installs a builder, so this always returns null outside DEV fixtures.
 */
export function getVisualScenarioExtraOverlayLayer(input: {
  readonly utcMs: number;
  readonly viewportWidthPx: number;
  readonly viewportHeightPx: number;
  readonly layers: readonly RenderableLayerState[];
}): RenderableLayerState | null {
  if (extraOverlayBuilder === null) {
    return null;
  }
  const plan = extraOverlayBuilder({
    utcMs: input.utcMs,
    viewportWidthPx: input.viewportWidthPx,
    viewportHeightPx: input.viewportHeightPx,
  });
  if (plan.items.length === 0) {
    return null;
  }
  const moon = input.layers.find((layer) => layer.id === SUBLUNAR_MARKER_LAYER_ID);
  const zIndex = moon !== undefined ? moon.zIndex - 0.5 : 50;
  return {
    id: VISUAL_SCENARIO_EXTRA_OVERLAY_ID,
    name: "Visual scenario extra overlay",
    type: "vector",
    zIndex,
    visible: true,
    opacity: 1,
    data: {
      kind: RESOLVED_RENDER_PLAN_KIND,
      plan,
    },
  };
}
