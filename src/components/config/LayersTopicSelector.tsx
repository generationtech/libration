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
  LAYERS_TOPIC_IDS,
  labelForLayersTopic,
  type LayersTopicId,
} from "./layersTopicTypes";
import { ConfigControlRow } from "./ConfigControlRow";

export type LayersTopicSelectorProps = {
  value: LayersTopicId;
  onChange: (next: LayersTopicId) => void;
};

export function LayersTopicSelector({ value, onChange }: LayersTopicSelectorProps) {
  return (
    <ConfigControlRow label="Layers topic">
      <select
        id="config-layers-topic"
        className="config-input"
        aria-label="Layers topic"
        data-testid="layers-topic-select"
        value={value}
        onChange={(e) => {
          onChange(e.currentTarget.value as LayersTopicId);
        }}
      >
        {LAYERS_TOPIC_IDS.map((id) => (
          <option key={id} value={id}>
            {labelForLayersTopic(id)}
          </option>
        ))}
      </select>
    </ConfigControlRow>
  );
}
