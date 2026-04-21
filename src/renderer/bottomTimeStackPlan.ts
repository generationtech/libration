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
 * Lower-left bottom HUD time stack: ordered lines (date → reference → UTC → local), smart labels,
 * optional spacer, and 12-hour colon alignment — reference-city–centric semantics.
 */

import type { DisplayChromeLayoutConfig } from "../config/appConfig.ts";
import type { TopBandTimeMode } from "../config/appConfig.ts";
import { displayTimeModeFromTopBandTimeMode } from "../core/displayTimeMode.ts";
import { formatWallClockInTimeZone } from "../core/timeFormat.ts";
import type { BottomTimeStackLine } from "./bottomChromeTypes.ts";

export type BottomTimeStackClockKind = "refer" | "utc" | "local";

/** Calendar row: always the reference IANA zone’s civil date (reference city), not device-local and not UTC unless the zone is UTC. */
export function formatBottomHudDateLine(nowMs: number, referenceTimeZone: string): string {
  const d = new Date(nowMs);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: referenceTimeZone,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).formatToParts(d);
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  return `${month} ${day} ${year}`.trim();
}

/**
 * Display-only: when multiple 12-hour stack rows are shown, prefix one space before a single-digit hour so colons line up.
 * Does not insert a semantic leading zero (24-hour rows stay two-digit).
 */
export function applyBottomStack12hrColonAlignment(clockBody: string, enabled: boolean): string {
  if (!enabled) {
    return clockBody;
  }
  if (/^\d{2}:/u.test(clockBody)) {
    return clockBody;
  }
  if (/^\d:/u.test(clockBody)) {
    return ` ${clockBody}`;
  }
  return clockBody;
}

function shortLabel(kind: BottomTimeStackClockKind): string {
  switch (kind) {
    case "refer":
      return "Refer";
    case "utc":
      return "UTC";
    case "local":
      return "Local";
  }
}

/**
 * Smart labels (deterministic):
 * - If exactly one clock row is visible: omit labels (time strings only).
 * - If two or more clock rows are visible: prefix each line with `Refer` / `UTC` / `Local` (minimal short labels).
 */
export function buildBottomTimeStackLines(options: {
  nowMs: number;
  referenceTimeZone: string;
  topBandMode: TopBandTimeMode;
  bottomTimeStack?: Pick<
    DisplayChromeLayoutConfig,
    | "bottomTimeStackShowLocal"
    | "bottomTimeStackShowRefer"
    | "bottomTimeStackShowUtc"
    | "bottomTimeStackShowSeconds"
  >;
}): BottomTimeStackLine[] {
  const lay = options.bottomTimeStack ?? {};
  const dm = displayTimeModeFromTopBandTimeMode(options.topBandMode);
  const hour12 = dm === "12hr";
  const includeSeconds = lay.bottomTimeStackShowSeconds !== false;
  const systemTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const refTz = options.referenceTimeZone;

  const fmt = (timeZone: string, h12: boolean) =>
    formatWallClockInTimeZone(options.nowMs, timeZone, h12, { includeSeconds });

  const referBody = fmt(refTz, hour12);
  const utcBody = fmt("UTC", false);
  const localBody = fmt(systemTz, hour12);

  const showRefer = lay.bottomTimeStackShowRefer !== false;
  const showUtc = lay.bottomTimeStackShowUtc !== false;
  const showLocal = lay.bottomTimeStackShowLocal !== false;

  /** Same instant, same formatting options — hide redundant local when it matches reference wall time. */
  const localDistinct = localBody !== referBody;
  const showLocalRow = showLocal && localDistinct;

  type Planned = { kind: BottomTimeStackClockKind; body: string };
  const planned: Planned[] = [];
  if (showRefer) {
    planned.push({ kind: "refer", body: referBody });
  }
  if (showUtc) {
    planned.push({ kind: "utc", body: utcBody });
  }
  if (showLocalRow) {
    planned.push({ kind: "local", body: localBody });
  }

  const clockRows = planned.length;
  const useLabels = clockRows >= 2;
  const align12hr =
    hour12 && clockRows >= 2;

  const formatClockLine = (p: Planned): string => {
    let body = p.body;
    if (align12hr && p.kind !== "utc") {
      body = applyBottomStack12hrColonAlignment(body, true);
    }
    if (!useLabels) {
      return body;
    }
    return `${shortLabel(p.kind)}  ${body}`;
  };

  const lines: BottomTimeStackLine[] = [];
  lines.push({ role: "date", text: formatBottomHudDateLine(options.nowMs, refTz) });

  for (let i = 0; i < planned.length; i += 1) {
    const p = planned[i]!;
    if (
      p.kind === "local" &&
      showLocalRow &&
      (showRefer || showUtc)
    ) {
      lines.push({ role: "spacer", text: "" });
    }
    lines.push({ role: "clock", text: formatClockLine(p) });
  }

  return lines;
}
