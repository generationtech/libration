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

import type { SavePresetResult } from "../../app/userPresetsLifecycle";
import type { UserNamedPresetV1 } from "../../config/v2/userPresetsPersistence";

export type UserPresetsUiProps = {
  presets: readonly UserNamedPresetV1[];
  activePresetId: string | null;
  isDirtyFromPreset: boolean;
  onSaveCurrentAsPreset: (name: string) => SavePresetResult;
  onLoadPreset: (id: string) => void;
  onRenamePreset: (id: string, name: string) => boolean;
  onDeletePreset: (id: string) => void;
};

export type { SavePresetResult, UserNamedPresetV1 };
