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

export type LayerId = string;

export type LayerType =
  | "raster"
  | "vector"
  | "points"
  | "tracks"
  | "heatmap"
  | "text"
  | "illumination";

export interface TimeContext {
  now: number;
  deltaMs: number;
  simulated: boolean;
}

export interface LayerState {
  visible: boolean;
  opacity: number;
  data: unknown;
  metadata?: Record<string, unknown>;
}

export type UpdatePolicy =
  | { type: "perFrame" }
  | { type: "interval"; intervalMs: number }
  | { type: "onDemand" };

export interface Layer {
  id: LayerId;
  name: string;
  enabled: boolean;
  zIndex: number;
  type: LayerType;
  updatePolicy: UpdatePolicy;
  getState(time: TimeContext): LayerState;
}
