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

import {
  CHROME_MAJOR_AREA_IDS,
  labelForChromeMajorArea,
  type ChromeMajorAreaId,
} from "./chromeMajorAreaTypes";
import { ConfigControlRow } from "./ConfigControlRow";

export type ChromeMajorAreaSelectorProps = {
  value: ChromeMajorAreaId;
  onChange: (next: ChromeMajorAreaId) => void;
};

export function ChromeMajorAreaSelector({ value, onChange }: ChromeMajorAreaSelectorProps) {
  return (
    <ConfigControlRow label="Chrome area">
      <select
        id="config-chrome-major-area"
        className="config-input"
        aria-label="Chrome major area"
        data-testid="chrome-major-area-select"
        value={value}
        onChange={(e) => {
          onChange(e.currentTarget.value as ChromeMajorAreaId);
        }}
      >
        {CHROME_MAJOR_AREA_IDS.map((id) => (
          <option key={id} value={id}>
            {labelForChromeMajorArea(id)}
          </option>
        ))}
      </select>
    </ConfigControlRow>
  );
}
