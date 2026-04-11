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

import type { RenderBackend } from "./RenderBackend";
import type { SceneRenderInput, Viewport } from "./types";

const PREFIX = "[libration:render]";

/**
 * Validates and records render input without drawing to a surface (Phase 01).
 */
export class LoggingRenderBackend implements RenderBackend {
  async initialize(viewport: Viewport): Promise<void> {
    if (viewport.width <= 0 || viewport.height <= 0) {
      throw new Error(`${PREFIX} invalid viewport dimensions`);
    }
    console.info(`${PREFIX} initialize`, viewport);
  }

  resize(viewport: Viewport): void {
    console.info(`${PREFIX} resize`, viewport);
  }

  render(input: SceneRenderInput): void {
    if (!input.layers.length) {
      console.warn(`${PREFIX} render with zero layers`);
    }
    console.info(`${PREFIX} render`, {
      frame: input.frame.frameNumber,
      layerCount: input.layers.length,
      layerIds: input.layers.map((l) => l.id),
      viewport: input.viewport,
    });
  }

  dispose(): void {
    console.info(`${PREFIX} dispose`);
  }
}
