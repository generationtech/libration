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

let runtime: VisualScenarioRuntime = INACTIVE_VISUAL_SCENARIO_RUNTIME;

export function getVisualScenarioRuntime(): VisualScenarioRuntime {
  return runtime;
}

export function setVisualScenarioRuntime(next: VisualScenarioRuntime): void {
  runtime = next;
}

export function resetVisualScenarioRuntime(): void {
  runtime = INACTIVE_VISUAL_SCENARIO_RUNTIME;
}
