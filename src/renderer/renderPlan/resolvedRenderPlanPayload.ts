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

import type { RenderPlan } from "./renderPlanTypes";

/**
 * Upstream-resolved {@link RenderPlan} carried as layer data.
 * The backend executes the items; it must not interpret product meaning.
 */
export const RESOLVED_RENDER_PLAN_KIND = "resolvedRenderPlan" as const;

export type ResolvedRenderPlanPayload = {
  readonly kind: typeof RESOLVED_RENDER_PLAN_KIND;
  readonly plan: RenderPlan;
};

export function isResolvedRenderPlanPayload(data: unknown): data is ResolvedRenderPlanPayload {
  if (data === null || typeof data !== "object") {
    return false;
  }
  const o = data as Record<string, unknown>;
  if (o.kind !== RESOLVED_RENDER_PLAN_KIND) {
    return false;
  }
  const plan = o.plan;
  if (plan === null || typeof plan !== "object") {
    return false;
  }
  return Array.isArray((plan as RenderPlan).items);
}
