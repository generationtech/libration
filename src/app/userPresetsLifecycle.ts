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

import type { RefObject } from "react";
import type { AppConfig } from "../config/appConfig";
import type { LibrationConfigV2 } from "../config/v2/librationConfig";
import { cloneV2 } from "../config/v2/librationConfig";
import {
  loadUserPresets,
  saveUserPresets,
  createUserPresetEntry,
  type UserNamedPresetV1,
} from "../config/v2/userPresetsPersistence";
import { replaceWorkingV2FromSnapshot } from "./workingV2Commit";
import type { LayerRegistry } from "../layers/LayerRegistry";

export type { UserNamedPresetV1 };

export type SavePresetResult =
  | { ok: true; id: string }
  | { ok: false; reason: "empty-name" | "no-working" };

/**
 * Persists the current working v2 document as a new named preset (normalized snapshot).
 */
export function saveCurrentAsPreset(
  storage: Storage | null,
  workingV2Ref: RefObject<LibrationConfigV2 | null>,
  name: string,
): SavePresetResult {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, reason: "empty-name" };
  }
  const cur = workingV2Ref.current;
  if (!cur) {
    return { ok: false, reason: "no-working" };
  }
  const snapshot = cloneV2(cur);
  const entry = createUserPresetEntry(trimmed, snapshot);
  const list = loadUserPresets(storage);
  saveUserPresets(storage, [...list, entry]);
  return { ok: true, id: entry.id };
}

/**
 * Replaces working config from a stored preset snapshot via {@link replaceWorkingV2FromSnapshot}.
 */
export function loadPreset(
  storage: Storage | null,
  workingV2Ref: RefObject<LibrationConfigV2 | null>,
  derivedAppConfigRef: RefObject<AppConfig>,
  registryRef: RefObject<LayerRegistry>,
  id: string,
): boolean {
  const list = loadUserPresets(storage);
  const found = list.find((p) => p.id === id);
  if (!found) {
    return false;
  }
  replaceWorkingV2FromSnapshot(
    workingV2Ref,
    derivedAppConfigRef,
    registryRef,
    cloneV2(found.snapshot),
  );
  return true;
}

export function deletePreset(storage: Storage | null, id: string): void {
  const list = loadUserPresets(storage);
  saveUserPresets(
    storage,
    list.filter((p) => p.id !== id),
  );
}

export function renamePreset(
  storage: Storage | null,
  id: string,
  name: string,
): { ok: true } | { ok: false; reason: "empty-name" | "not-found" } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, reason: "empty-name" };
  }
  const list = loadUserPresets(storage);
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) {
    return { ok: false, reason: "not-found" };
  }
  const next = [...list];
  const prev = next[idx]!;
  next[idx] = {
    id: prev.id,
    name: trimmed,
    snapshot: cloneV2(prev.snapshot),
  };
  saveUserPresets(storage, next);
  return { ok: true };
}
