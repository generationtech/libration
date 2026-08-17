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
  CHROME_TOPIC_IDS,
  labelForChromeTopic,
  type ChromeTopicId,
} from "./chromeTopicTypes";

export type ChromeTopicSelectorProps = {
  value: ChromeTopicId;
  onChange: (next: ChromeTopicId) => void;
};

export function ChromeTopicSelector({ value, onChange }: ChromeTopicSelectorProps) {
  return (
    <ConfigTopicSelector
      label="Chrome topic"
      selectId="config-chrome-topic"
      ariaLabel="Chrome topic"
      testId="chrome-topic-select"
      value={value}
      optionIds={CHROME_TOPIC_IDS}
      labelFor={labelForChromeTopic}
      onChange={onChange}
    />
  );
}
