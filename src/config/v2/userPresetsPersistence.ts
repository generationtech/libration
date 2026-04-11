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

/**
 * User-named configuration presets (Phase 5): full normalized LibrationConfigV2 snapshots only.
 * Separate storage key from the working v2 document; render-engine agnostic.
 */
import type { LibrationConfigV2 } from "./librationConfig";
import { normalizeLibrationConfig } from "./librationConfig";
import { reviveLibrationConfigV2FromUnknown } from "./workingV2Persistence";

export const USER_PRESETS_LOCAL_STORAGE_KEY = "libration.userPresets.v1";

export type UserNamedPresetV1 = {
  id: string;
  name: string;
  snapshot: LibrationConfigV2;
};

export type UserPresetsStoredEnvelopeV1 = {
  version: 1;
  presets: UserNamedPresetV1[];
};

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function newPresetId(): string {
  try {
    if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return `preset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizePresetEntry(raw: unknown): UserNamedPresetV1 | null {
  if (!isPlainObject(raw)) {
    return null;
  }
  const id = raw.id;
  const name = raw.name;
  if (typeof id !== "string" || id.length === 0) {
    return null;
  }
  if (typeof name !== "string") {
    return null;
  }
  const revived = reviveLibrationConfigV2FromUnknown(raw.snapshot);
  if (!revived) {
    return null;
  }
  return {
    id,
    name,
    snapshot: normalizeLibrationConfig(revived),
  };
}

/**
 * Loads and validates stored presets. Invalid entries are dropped; corrupt JSON yields [].
 */
export function loadUserPresets(storage: Storage | null): UserNamedPresetV1[] {
  if (!storage) {
    return [];
  }
  let raw: string | null;
  try {
    raw = storage.getItem(USER_PRESETS_LOCAL_STORAGE_KEY);
  } catch {
    return [];
  }
  if (raw === null || raw === "") {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
  if (!isPlainObject(parsed)) {
    return [];
  }
  if (parsed.version !== 1) {
    return [];
  }
  const list = parsed.presets;
  if (!Array.isArray(list)) {
    return [];
  }
  const out: UserNamedPresetV1[] = [];
  for (const item of list) {
    const sanitized = sanitizePresetEntry(item);
    if (sanitized) {
      out.push(sanitized);
    }
  }
  return out;
}

export function saveUserPresets(storage: Storage | null, presets: UserNamedPresetV1[]): void {
  if (!storage) {
    return;
  }
  const normalized: UserNamedPresetV1[] = presets.map((p) => ({
    id: p.id,
    name: p.name,
    snapshot: normalizeLibrationConfig(p.snapshot),
  }));
  const envelope: UserPresetsStoredEnvelopeV1 = {
    version: 1,
    presets: normalized,
  };
  try {
    storage.setItem(USER_PRESETS_LOCAL_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // quota / private mode
  }
}

export function createUserPresetEntry(name: string, snapshot: LibrationConfigV2): UserNamedPresetV1 {
  return {
    id: newPresetId(),
    name,
    snapshot: normalizeLibrationConfig(snapshot),
  };
}
