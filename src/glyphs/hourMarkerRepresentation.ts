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

import type { TypographyRole } from "../typography/typographyTypes.ts";
import type { HourMarkerGlyphStyleId } from "./glyphStyleTypes.ts";

/**
 * Which representation family is used for an hour marker. Broader than {@link NumericRepresentationMode}
 * (app config) so future modes can be declared without widening user-facing config yet.
 */
export type HourMarkerRepresentationMode =
  | "geometric"
  | "segment"
  | "dotmatrix"
  | "terminal"
  | "analogClock"
  | "radialWedge"
  | "radialLine";

/**
 * Declarative policy: mode + typography role for text paths + procedural/text style tokens.
 */
export type HourMarkerRepresentationSpec = {
  mode: HourMarkerRepresentationMode;
  textRole: TypographyRole;
  glyphStyleId: HourMarkerGlyphStyleId;
};
