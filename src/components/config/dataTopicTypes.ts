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
 * UI-only topic areas for the Data configuration tab. Not persisted — editor navigation only.
 * Distinct from enabled event types, which are durable playback source config.
 */
export type DataTopicId = "time" | "eventPlayback";

export const DATA_TOPIC_IDS: readonly DataTopicId[] = ["time", "eventPlayback"];

export const DEFAULT_DATA_TOPIC: DataTopicId = "time";

export function labelForDataTopic(id: DataTopicId): string {
  switch (id) {
    case "time":
      return "Time";
    case "eventPlayback":
      return "Event playback";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function descriptionForDataTopic(id: DataTopicId): string {
  switch (id) {
    case "time":
      return "Generic product-time Demo. Display modes format this instant; they do not own a second clock.";
    case "eventPlayback":
      return "Sequence domain events by commanding the shared Demo clock. Layers still own what is rendered.";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
