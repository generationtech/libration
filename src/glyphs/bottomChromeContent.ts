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

/** Semantic payload for one canvas line in the lower-left time stack. */
export type BottomChromeStackLineContent = {
  label: string;
};

/** Builds readout content from bar state without changing copy rules. */
export function bottomChromeReadoutContentFromInformationBar(
  ib: BottomInformationBarState,
): { stackLines: BottomChromeStackLineContent[] } {
  return {
    stackLines: ib.leftTimeStackLines.map((row) => ({
      label: row.text.length > 0 ? row.text : "\u00a0",
    })),
  };
}
