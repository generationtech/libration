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

import type { LayerRegistry } from "../layers/LayerRegistry";
import type { Layer, LayerState, TimeContext } from "../layers/types";
import type { RenderableLayerState } from "./types";

/**
 * Merges a layer definition with its evaluated state into the renderer-facing shape.
 * This is the single conversion step from layer registry output to scene render input layers.
 * `zIndex` and `state.opacity` come from the scene composition plan; the backend draws in
 * z-order and applies per-layer alpha (see `CanvasRenderBackend.render`).
 */
export function toRenderableLayerState(
  layer: Layer,
  state: LayerState,
): RenderableLayerState {
  return {
    id: layer.id,
    name: layer.name,
    type: layer.type,
    zIndex: layer.zIndex,
    visible: state.visible,
    opacity: state.opacity,
    data: state.data,
    metadata: state.metadata,
  };
}

/**
 * Builds ordered {@link RenderableLayerState} for the current frame from the registry.
 * Central entry point: registry output → renderer input layers.
 */
export function buildRenderableLayerStates(
  registry: LayerRegistry,
  time: TimeContext,
): RenderableLayerState[] {
  return registry
    .getActiveLayers()
    .map((layer) => toRenderableLayerState(layer, layer.getState(time)));
}
