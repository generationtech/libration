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

import type { TopBandTextVisualPolicy } from "../config/topBandVisualPolicy.ts";
import type { TextGlyph } from "./glyphTypes.ts";

/** Builds a {@link TextGlyph} from centralized top-band policy (no layout). */
export function createTopBandTextGlyph(text: string, policy: TopBandTextVisualPolicy): TextGlyph {
  const glyph: TextGlyph = {
    kind: "text",
    text,
    role: policy.role,
  };
  if (policy.glyphStyleId !== undefined) {
    glyph.styleId = policy.glyphStyleId;
  }
  if (policy.fill !== undefined) {
    glyph.fill = policy.fill;
  }
  if (
    policy.typographyOverrides !== undefined &&
    Object.keys(policy.typographyOverrides).length > 0
  ) {
    glyph.typographyOverrides = policy.typographyOverrides;
  }
  if (policy.textBaseline !== undefined) {
    glyph.textBaseline = policy.textBaseline;
  }
  return glyph;
}
