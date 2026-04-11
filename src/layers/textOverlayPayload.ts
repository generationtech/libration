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

export const TEXT_OVERLAY_KIND = "overlayText" as const;

export type TextOverlayPlacement = "top-left" | "top-right";

/**
 * Renderer-agnostic text overlay: placement and strings only; no canvas/DOM details.
 */
export interface TextOverlayPayload {
  kind: typeof TEXT_OVERLAY_KIND;
  placement: TextOverlayPlacement;
  /** Main line (e.g. time string). */
  primary: string;
  /** Smaller caption (e.g. "UTC", "Local"). */
  label: string;
}

export function isTextOverlayPayload(data: unknown): data is TextOverlayPayload {
  if (data === null || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return (
    o.kind === TEXT_OVERLAY_KIND &&
    (o.placement === "top-left" || o.placement === "top-right") &&
    typeof o.primary === "string" &&
    typeof o.label === "string"
  );
}
