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

export type ConfigTabId =
  | "layers"
  | "pins"
  | "chrome"
  | "geography"
  | "data"
  | "general";

export type ConfigTabDef = {
  id: ConfigTabId;
  label: string;
};

/** Single source of truth for configuration shell tabs (order and labels). */
export const CONFIG_TAB_DEFS: readonly ConfigTabDef[] = [
  { id: "layers", label: "Layers" },
  { id: "pins", label: "Pins" },
  { id: "chrome", label: "Chrome" },
  { id: "geography", label: "Geography" },
  { id: "data", label: "Data" },
  { id: "general", label: "General" },
] as const;
