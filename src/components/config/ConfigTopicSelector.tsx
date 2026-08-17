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

import { ConfigControlRow } from "./ConfigControlRow";

export type ConfigTopicSelectorProps<T extends string> = {
  label: string;
  selectId: string;
  ariaLabel: string;
  testId: string;
  value: T;
  optionIds: readonly T[];
  labelFor: (id: T) => string;
  onChange: (next: T) => void;
};

/** Native topic `<select>` used by Layers and Chrome. Presentation only — not persisted. */
export function ConfigTopicSelector<T extends string>({
  label,
  selectId,
  ariaLabel,
  testId,
  value,
  optionIds,
  labelFor,
  onChange,
}: ConfigTopicSelectorProps<T>) {
  return (
    <ConfigControlRow label={label}>
      <select
        id={selectId}
        className="config-input"
        aria-label={ariaLabel}
        data-testid={testId}
        value={value}
        onChange={(e) => {
          onChange(e.currentTarget.value as T);
        }}
      >
        {optionIds.map((id) => (
          <option key={id} value={id}>
            {labelFor(id)}
          </option>
        ))}
      </select>
    </ConfigControlRow>
  );
}
