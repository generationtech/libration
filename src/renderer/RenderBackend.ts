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

import type { SceneRenderInput, Viewport } from "./types";

export interface RenderBackend {
  initialize(viewport: Viewport): Promise<void>;
  resize(viewport: Viewport): void;
  render(input: SceneRenderInput): void;
  dispose(): void;
}
