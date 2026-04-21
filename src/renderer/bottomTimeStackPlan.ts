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
 * optional spacer, colon-aligned time column — reference-city–centric semantics.
 */

import type { DisplayChromeLayoutConfig } from "../config/appConfig.ts";
import type { TopBandTimeMode } from "../config/appConfig.ts";
import { displayTimeModeFromTopBandTimeMode } from "../core/displayTimeMode.ts";
import { formatWallClockInTimeZone } from "../core/timeFormat.ts";
import type { BottomTimeStackLine } from "./bottomChromeTypes.ts";
import {
  alignBottomStackTimeBodiesToColonColumn,
} from "./bottomStackTimeColumnLayout.ts";

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
 * - If exactly one clock row is visible: no labels (time strings only).
 * - If two or more clock rows: label each row except suppress "Refer" when local was omitted only because it matched reference.
 */
function resolveClockLabel(
  kind: BottomTimeStackClockKind,
  options: { visibleClockRows: number; localSuppressedBecauseMatchesReference: boolean },
): string | null {
  if (options.visibleClockRows <= 1) {
    return null;
  }
  if (kind === "refer" && options.localSuppressedBecauseMatchesReference) {
    return null;
  }
  return shortLabel(kind);
}

const STACK_FONT_SIZE_FOR_ALIGNMENT_PX = 16;

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

  const referBodyRaw = fmt(refTz, hour12);
  const utcBodyRaw = fmt("UTC", false);
  const localBodyRaw = fmt(systemTz, hour12);

  const showRefer = lay.bottomTimeStackShowRefer !== false;
  const showUtc = lay.bottomTimeStackShowUtc !== false;
  const showLocal = lay.bottomTimeStackShowLocal !== false;

  const localSuppressedBecauseMatchesReference = showLocal && localBodyRaw === referBodyRaw;
  const showLocalRow = showLocal && !localSuppressedBecauseMatchesReference;

  type Planned = { kind: BottomTimeStackClockKind; body: string };
  const planned: Planned[] = [];
  if (showRefer) {
    planned.push({ kind: "refer", body: referBodyRaw });
  }
  if (showUtc) {
    planned.push({ kind: "utc", body: utcBodyRaw });
  }
  if (showLocalRow) {
    planned.push({ kind: "local", body: localBodyRaw });
  }

  const nClock = planned.length;
  const align12hrMulti = hour12 && nClock >= 2;

  const bodiesForAlignment = planned.map((p) => {
    let body = p.body;
    if (align12hrMulti && p.kind !== "utc") {
      body = applyBottomStack12hrColonAlignment(body, true);
    }
    return body;
  });

  const alignedBodies =
    nClock >= 2
      ? alignBottomStackTimeBodiesToColonColumn(bodiesForAlignment, STACK_FONT_SIZE_FOR_ALIGNMENT_PX)
      : bodiesForAlignment;

  const lines: BottomTimeStackLine[] = [];
  lines.push({ role: "date", text: formatBottomHudDateLine(options.nowMs, refTz) });

  for (let i = 0; i < planned.length; i += 1) {
    const p = planned[i]!;
    if (p.kind === "local" && showLocalRow && (showRefer || showUtc)) {
      lines.push({ role: "spacer" });
    }
    const label = resolveClockLabel(p.kind, {
      visibleClockRows: nClock,
      localSuppressedBecauseMatchesReference,
    });
    lines.push({ role: "clock", label, timeText: alignedBodies[i]! });
  }

  return lines;
}
