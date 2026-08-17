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
 * UI-only topic areas for the Chrome configuration tab. Not persisted — editor navigation only.
 */
export type ChromeTopicId =
  | "referenceAndClock"
  | "bottomHud"
  | "hourIndicators"
  | "tickTape"
  | "natoTimezone";

export const CHROME_TOPIC_IDS: readonly ChromeTopicId[] = [
  "referenceAndClock",
  "bottomHud",
  "hourIndicators",
  "tickTape",
  "natoTimezone",
];

export const DEFAULT_CHROME_TOPIC: ChromeTopicId = "referenceAndClock";

export function labelForChromeTopic(id: ChromeTopicId): string {
  switch (id) {
    case "referenceAndClock":
      return "Reference & clock";
    case "bottomHud":
      return "Bottom HUD";
    case "hourIndicators":
      return "Hour indicators";
    case "tickTape":
      return "Tick tape";
    case "natoTimezone":
      return "NATO time zones";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function descriptionForChromeTopic(id: ChromeTopicId): string {
  switch (id) {
    case "referenceAndClock":
      return "One instant and one reference frame: civil date and time follow the IANA zone; the top strip read point follows the meridian policy. Hour label style is formatting only — it does not move tape geometry or change which instant is shown.";
    case "bottomHud":
      return "Lower-left instrument text (not map layers): civil date in the reference-city timezone; time row follows the global hour-label mode. Size and font apply to this readout.";
    case "hourIndicators":
      return "Hour disks and entries row — civil-phased at the read point; display mode changes labels only, not tape registration. UTC label mode uses text-only hour-marker realization.";
    case "tickTape":
      return "Tick rail — same phased band as the hour row; ticks do not shift when you change hour label format.";
    case "natoTimezone":
      return "Structural 15° / NATO letter row — geometric sectors independent of the reference civil zone.";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
