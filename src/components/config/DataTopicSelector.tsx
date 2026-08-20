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

import { ConfigTopicSelector } from "./ConfigTopicSelector";
import {
  DATA_TOPIC_IDS,
  labelForDataTopic,
  type DataTopicId,
} from "./dataTopicTypes";

export type DataTopicSelectorProps = {
  value: DataTopicId;
  onChange: (next: DataTopicId) => void;
};

export function DataTopicSelector({ value, onChange }: DataTopicSelectorProps) {
  return (
    <ConfigTopicSelector
      label="Data topic"
      selectId="config-data-topic"
      ariaLabel="Data topic"
      testId="data-topic-select"
      value={value}
      optionIds={DATA_TOPIC_IDS}
      labelFor={labelForDataTopic}
      onChange={onChange}
    />
  );
}
