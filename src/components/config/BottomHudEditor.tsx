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
import {
  PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
  PRODUCT_TEXT_RENDERER_DEFAULT_SELECT_LABEL,
  resolvedBottomTimeStackSizeMultiplier,
  TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS,
  TOP_BAND_HOUR_MARKER_SIZE_MULT_MAX,
  TOP_BAND_HOUR_MARKER_SIZE_MULT_MIN,
} from "../../config/appConfig";
import type { FontAssetId } from "../../typography/fontAssetTypes";
import { defaultFontAssetRegistry } from "../../typography/fontAssetRegistry";
import { ConfigControlRow } from "./ConfigControlRow";

export type BottomHudEditorProps = {
  config: LibrationConfigV2;
  updateConfig?: (updater: (draft: LibrationConfigV2) => void) => void;
};

export function BottomHudEditor({ config, updateConfig }: BottomHudEditorProps) {
  const lay = config.chrome.layout;
  const wired = Boolean(updateConfig);

  return (
    <div data-testid="chrome-editor-bottom-hud">
      <h3 className="config-section__title config-section__title--sub">Bottom HUD</h3>
      <p className="config-section__hint">
        Lower-left instrument text (not map layers): civil date in the reference-city timezone; time row follows the
        global hour-label mode (12-hour, 24-hour reference wall time, or UTC 24-hour). Size and font apply to this readout.
      </p>
      <ConfigControlRow label="Bottom HUD (reference city)">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={lay.bottomInformationBarVisible}
          readOnly={!wired}
          disabled={!wired}
          tabIndex={wired ? 0 : -1}
          aria-label="Show bottom HUD reference-city date and time"
          onChange={
            wired && updateConfig
              ? (e) => {
                  const checked = e.currentTarget.checked;
                  updateConfig((draft) => {
                    draft.chrome.layout.bottomInformationBarVisible = checked;
                  });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Show date">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          data-testid="chrome-bottom-hud-show-date"
          checked={lay.bottomTimeStackShowDate !== false}
          readOnly={!wired}
          disabled={!wired}
          tabIndex={wired ? 0 : -1}
          aria-label="Show reference-city date on bottom HUD"
          onChange={
            wired && updateConfig
              ? (e) => {
                  const checked = e.currentTarget.checked;
                  updateConfig((draft) => {
                    draft.chrome.layout.bottomTimeStackShowDate = checked;
                  });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Show time">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          data-testid="chrome-bottom-hud-show-time"
          checked={lay.bottomTimeStackShowTime !== false}
          readOnly={!wired}
          disabled={!wired}
          tabIndex={wired ? 0 : -1}
          aria-label="Show reference-city time on bottom HUD"
          onChange={
            wired && updateConfig
              ? (e) => {
                  const checked = e.currentTarget.checked;
                  updateConfig((draft) => {
                    draft.chrome.layout.bottomTimeStackShowTime = checked;
                  });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Show seconds">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          data-testid="chrome-bottom-hud-show-seconds"
          checked={lay.bottomTimeShowSeconds === true}
          readOnly={!wired}
          disabled={!wired}
          tabIndex={wired ? 0 : -1}
          aria-label="Show seconds on lower-left reference time"
          onChange={
            wired && updateConfig
              ? (e) => {
                  const checked = e.currentTarget.checked;
                  updateConfig((draft) => {
                    draft.chrome.layout.bottomTimeShowSeconds = checked;
                  });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Bottom HUD text size">
        <input
          type="range"
          className="config-input"
          data-testid="chrome-bottom-stack-size-range"
          min={TOP_BAND_HOUR_MARKER_SIZE_MULT_MIN}
          max={TOP_BAND_HOUR_MARKER_SIZE_MULT_MAX}
          step={0.05}
          value={resolvedBottomTimeStackSizeMultiplier(lay)}
          disabled={!wired}
          aria-label="Scale factor for bottom HUD date and time stack text"
          onChange={
            wired && updateConfig
              ? (e) => {
                  const v = Number(e.currentTarget.value);
                  if (!Number.isFinite(v)) {
                    return;
                  }
                  updateConfig((draft) => {
                    draft.chrome.layout.bottomTimeStackSizeMultiplier = v;
                  });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Bottom readout font">
        <select
          className="config-input"
          data-testid="chrome-bottom-readout-font-select"
          value={lay.bottomReadoutFontAssetId ?? ""}
          disabled={!wired}
          aria-label="Font for lower-left bottom HUD time stack"
          onChange={
            wired && updateConfig
              ? (e) => {
                  const v = e.currentTarget.value;
                  updateConfig((draft) => {
                    if (v === "") {
                      delete (draft.chrome.layout as { bottomReadoutFontAssetId?: FontAssetId })
                        .bottomReadoutFontAssetId;
                    } else {
                      draft.chrome.layout.bottomReadoutFontAssetId = v as FontAssetId;
                    }
                  });
                }
              : undefined
          }
        >
          <option value="">Default (typography role)</option>
          <option value={PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID}>
            {PRODUCT_TEXT_RENDERER_DEFAULT_SELECT_LABEL}
          </option>
          {TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS.map((id) => {
            const rec = defaultFontAssetRegistry.getById(id);
            return rec ? (
              <option key={id} value={id}>
                {rec.displayName}
              </option>
            ) : null;
          })}
        </select>
      </ConfigControlRow>
    </div>
  );
}
