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

import type { BottomInformationBarState } from "../renderer/bottomChromeTypes.ts";

/** Semantic payload for the left primary clock string (already formatted for display). */
export type BottomChromeTimeContent = {
  label: string;
};

/** Semantic payload for the micro label above the clock (e.g. LOCAL TIME). */
export type BottomChromeLabelContent = {
  label: string;
};

/** Semantic payload for the right-edge date line. */
export type BottomChromeDateContent = {
  label: string;
};

/** Builds readout content from bar state without changing layout or copy rules. */
export function bottomChromeReadoutContentFromInformationBar(
  ib: BottomInformationBarState,
): {
  label: BottomChromeLabelContent;
  time: BottomChromeTimeContent;
  date: BottomChromeDateContent;
} {
  return {
    label: { label: ib.localMicroLabel },
    time: { label: ib.localTimeLine },
    date: {
      label: ib.rightPanelDateLine.length > 0 ? ib.rightPanelDateLine : "\u00a0",
    },
  };
}
