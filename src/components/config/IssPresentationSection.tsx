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

import type { ReactElement } from "react";
import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import {
  applyIssOrbitalPresentationToScene,
  buildDefaultSceneConfigFromLayerFlags,
  deriveLayerEnableFlagsFromScene,
  issOrbitalPresentationFromScene,
} from "../../config/v2/sceneConfig";
import {
  ISS_GLYPH_SIZE_IDS,
  ISS_GLYPH_TYPE_IDS,
  ISS_ORBIT_FUTURE_MINUTES,
  ISS_ORBIT_LINE_THICKNESS_IDS,
  ISS_ORBIT_PAST_MINUTES,
  issGlyphSizeLabel,
  issGlyphTypeLabel,
  issOrbitLineThicknessLabel,
  type IssGlyphSizeId,
  type IssGlyphTypeId,
  type IssOrbitFutureMinutes,
  type IssOrbitLineThicknessId,
  type IssOrbitPastMinutes,
  type IssOrbitalPresentation,
} from "../../core/issOrbitalPresentation";
import { ConfigControlRow } from "./ConfigControlRow";

type UpdateConfig = (updater: (draft: LibrationConfigV2) => void) => void;

function patchScene(
  updateConfig: UpdateConfig | undefined,
  mutate: (scene: NonNullable<LibrationConfigV2["scene"]>) => NonNullable<LibrationConfigV2["scene"]>,
): void {
  if (!updateConfig) {
    return;
  }
  updateConfig((draft) => {
    const baseScene = draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
    draft.scene = mutate(baseScene);
    draft.layers = deriveLayerEnableFlagsFromScene(draft.scene);
  });
}

export function IssPresentationSection(props: {
  config: LibrationConfigV2;
  updateConfig?: UpdateConfig;
}): ReactElement {
  const { config, updateConfig } = props;
  const mutable = Boolean(updateConfig);
  const scene = config.scene ?? buildDefaultSceneConfigFromLayerFlags(config.layers);
  const pres = issOrbitalPresentationFromScene(scene);
  const trackOff = !pres.trackEnabled;
  const pastOff = trackOff || !pres.pastEnabled;
  const futureOff = trackOff || !pres.futureEnabled;

  const apply = (patch: Partial<IssOrbitalPresentation>): void => {
    patchScene(updateConfig, (base) => applyIssOrbitalPresentationToScene(base, patch));
  };

  return (
    <>
      <h3 className="config-section__title config-section__title--sub">
        International Space Station (ISS)
      </h3>
      <p className="config-section__hint">
        Presentation for the ISS overlay. Visibility remains under Layer masters. Turning the orbit
        track off keeps the current ISS glyph.
      </p>
      <p className="config-section__hint">Orbit &amp; track</p>
      <ConfigControlRow label="Orbit track">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.trackEnabled}
          readOnly={!mutable}
          disabled={!mutable}
          tabIndex={mutable ? 0 : -1}
          aria-label="Orbit track"
          title="Draw the ISS ground-track trajectory. The current ISS glyph stays visible when this is off."
          onChange={
            mutable
              ? (e) => {
                  apply({ trackEnabled: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Track past">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.pastEnabled}
          readOnly={!mutable}
          disabled={!mutable || trackOff}
          tabIndex={mutable && !trackOff ? 0 : -1}
          aria-label="Track past"
          title="Show the ground track before the current product time."
          onChange={
            mutable
              ? (e) => {
                  apply({ pastEnabled: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Past duration">
        <select
          className="config-input"
          disabled={!mutable || pastOff}
          aria-label="Past duration"
          title="How far before the current product time to draw the past track."
          value={String(pres.pastMinutes)}
          onChange={
            mutable
              ? (e) => {
                  apply({ pastMinutes: Number(e.currentTarget.value) as IssOrbitPastMinutes });
                }
              : undefined
          }
        >
          {ISS_ORBIT_PAST_MINUTES.map((m) => (
            <option key={`past-${m}`} value={m}>
              {m} min
            </option>
          ))}
        </select>
      </ConfigControlRow>
      <ConfigControlRow label="Past color">
        <input
          type="color"
          className="config-input"
          disabled={!mutable || pastOff}
          aria-label="Past color"
          title="Color of the track before the current product time."
          value={pres.pastColor}
          onChange={
            mutable
              ? (e) => {
                  apply({ pastColor: e.currentTarget.value });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Track future">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.futureEnabled}
          readOnly={!mutable}
          disabled={!mutable || trackOff}
          tabIndex={mutable && !trackOff ? 0 : -1}
          aria-label="Track future"
          title="Show the ground track after the current product time."
          onChange={
            mutable
              ? (e) => {
                  apply({ futureEnabled: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Future duration">
        <select
          className="config-input"
          disabled={!mutable || futureOff}
          aria-label="Future duration"
          title="How far after the current product time to draw the future track."
          value={String(pres.futureMinutes)}
          onChange={
            mutable
              ? (e) => {
                  apply({
                    futureMinutes: Number(e.currentTarget.value) as IssOrbitFutureMinutes,
                  });
                }
              : undefined
          }
        >
          {ISS_ORBIT_FUTURE_MINUTES.map((m) => (
            <option key={`future-${m}`} value={m}>
              {m} min
            </option>
          ))}
        </select>
      </ConfigControlRow>
      <ConfigControlRow label="Future color">
        <input
          type="color"
          className="config-input"
          disabled={!mutable || futureOff}
          aria-label="Future color"
          title="Color of the track after the current product time."
          value={pres.futureColor}
          onChange={
            mutable
              ? (e) => {
                  apply({ futureColor: e.currentTarget.value });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Orbit line thickness">
        <select
          className="config-input"
          disabled={!mutable || trackOff}
          aria-label="Orbit line thickness"
          title="Stroke width shared by past and future track segments."
          value={pres.lineThickness}
          onChange={
            mutable
              ? (e) => {
                  apply({
                    lineThickness: e.currentTarget.value as IssOrbitLineThicknessId,
                  });
                }
              : undefined
          }
        >
          {ISS_ORBIT_LINE_THICKNESS_IDS.map((id) => (
            <option key={id} value={id}>
              {issOrbitLineThicknessLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>
      <ConfigControlRow label="Orbit base color">
        <input
          type="color"
          className="config-input"
          disabled={!mutable}
          aria-label="Orbit base color"
          title="Canonical ISS color: label family and fallback when past/future colors are missing."
          value={pres.baseColor}
          onChange={
            mutable
              ? (e) => {
                  apply({ baseColor: e.currentTarget.value });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <p className="config-section__hint">Current position</p>
      <ConfigControlRow label="ISS glyph">
        <select
          className="config-input"
          disabled={!mutable}
          aria-label="ISS glyph"
          title="Current-position marker: a disc or a tiny ISS silhouette."
          value={pres.glyphType}
          onChange={
            mutable
              ? (e) => {
                  apply({ glyphType: e.currentTarget.value as IssGlyphTypeId });
                }
              : undefined
          }
        >
          {ISS_GLYPH_TYPE_IDS.map((id) => (
            <option key={id} value={id}>
              {issGlyphTypeLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>
      <ConfigControlRow label="ISS glyph size">
        <select
          className="config-input"
          disabled={!mutable}
          aria-label="ISS glyph size"
          title="Size of the current ISS marker (dot and silhouette)."
          value={pres.glyphSize}
          onChange={
            mutable
              ? (e) => {
                  apply({ glyphSize: e.currentTarget.value as IssGlyphSizeId });
                }
              : undefined
          }
        >
          {ISS_GLYPH_SIZE_IDS.map((id) => (
            <option key={id} value={id}>
              {issGlyphSizeLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>
      {pres.glyphType === "dot" ? (
        <ConfigControlRow label="ISS dot color">
          <input
            type="color"
            className="config-input"
            disabled={!mutable}
            aria-label="ISS dot color"
            title="Fill color of the current-position disc."
            value={pres.dotColor}
            onChange={
              mutable
                ? (e) => {
                    apply({ dotColor: e.currentTarget.value });
                  }
                : undefined
            }
          />
        </ConfigControlRow>
      ) : (
        <ConfigControlRow label="ISS glyph color">
          <input
            type="color"
            className="config-input"
            disabled={!mutable}
            aria-label="ISS glyph color"
            title="Fill color of the ISS silhouette."
            value={pres.glyphColor}
            onChange={
              mutable
                ? (e) => {
                    apply({ glyphColor: e.currentTarget.value });
                  }
                : undefined
            }
          />
        </ConfigControlRow>
      )}
      <ConfigControlRow label="Show ISS label">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.labelEnabled}
          readOnly={!mutable}
          disabled={!mutable}
          tabIndex={mutable ? 0 : -1}
          aria-label="Show ISS label"
          title="Show the ISS text label next to the current-position glyph."
          onChange={
            mutable
              ? (e) => {
                  apply({ labelEnabled: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
    </>
  );
}
