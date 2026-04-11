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

import type { Layer, LayerId, LayerState, TimeContext } from "./types";

export interface LayerRegistryContract {
  register(layer: Layer): void;
  unregister(id: LayerId): void;
  getLayers(): Layer[];
  getActiveLayers(): Layer[];
  update(time: TimeContext): void;
  getRenderableState(time: TimeContext): LayerState[];
}

export class LayerRegistry implements LayerRegistryContract {
  private readonly layers = new Map<LayerId, Layer>();
  private lastIntervalTick = new Map<LayerId, number>();

  register(layer: Layer): void {
    this.layers.set(layer.id, layer);
  }

  unregister(id: LayerId): void {
    this.layers.delete(id);
    this.lastIntervalTick.delete(id);
  }

  getLayers(): Layer[] {
    return this.sortByZIndex([...this.layers.values()]);
  }

  getActiveLayers(): Layer[] {
    return this.sortByZIndex(
      [...this.layers.values()].filter((layer) => layer.enabled),
    );
  }

  update(time: TimeContext): void {
    for (const layer of this.getActiveLayers()) {
      const policy = layer.updatePolicy;
      if (policy.type === "interval") {
        const last = this.lastIntervalTick.get(layer.id) ?? 0;
        if (time.now - last >= policy.intervalMs) {
          this.lastIntervalTick.set(layer.id, time.now);
        }
      }
    }
  }

  /**
   * Layer state only, in z-order. For full renderer-facing layer objects (id, name, type, zIndex + state),
   * use `buildRenderableLayerStates` in `src/renderer/layerInputAdapter.ts`.
   */
  getRenderableState(time: TimeContext): LayerState[] {
    const states: LayerState[] = [];
    for (const layer of this.getActiveLayers()) {
      states.push(layer.getState(time));
    }
    return states;
  }

  private sortByZIndex(layers: Layer[]): Layer[] {
    return [...layers].sort((a, b) => a.zIndex - b.zIndex);
  }
}
