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

import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import { descriptionForChromeMajorArea } from "./chromeMajorAreaTypes";
import { HourMarkersEditor } from "./HourMarkersEditor";

export type HourIndicatorsEditorProps = {
  config: LibrationConfigV2;
  updateConfig?: (updater: (draft: LibrationConfigV2) => void) => void;
};

export function HourIndicatorsEditor({ config, updateConfig }: HourIndicatorsEditorProps) {
  return (
    <div data-testid="chrome-editor-hour-indicators">
      <h3 className="config-section__title config-section__title--sub">24-hour indicator entries</h3>
      <p className="config-section__hint">{descriptionForChromeMajorArea("hourIndicators")}</p>
      <HourMarkersEditor config={config} updateConfig={updateConfig} />
    </div>
  );
}
