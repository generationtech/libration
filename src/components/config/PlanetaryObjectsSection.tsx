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
  applyPlanetaryObjectsPresentationToScene,
  buildDefaultSceneConfigFromLayerFlags,
  deriveLayerEnableFlagsFromScene,
  planetaryObjectsPresentationFromScene,
} from "../../config/v2/sceneConfig";
import { ASTRONOMY_PATH_THICKNESS_IDS } from "../../core/astronomyOverlayStrokeAppearance";
import { PLANETARY_BODY_IDS, PLANETARY_BODY_METADATA } from "../../core/planetaryBodies";
import {
  isPlanetaryEphemerisSupportedUtc,
  PLANETARY_EPHEMERIS_UNAVAILABLE_COPY,
} from "../../core/planetaryEphemeris";
import {
  PLANETARY_GLYPH_SIZE_IDS,
  PLANETARY_GLYPH_TYPE_IDS,
  PLANETARY_GROUND_TRACK_HORIZON_IDS,
  PLANETARY_LOCUS_DURATION_IDS,
  PLANETARY_LOCUS_OPACITY_IDS,
  planetaryGlyphSizeLabel,
  planetaryGlyphTypeLabel,
  planetaryGroundTrackHorizonLabel,
  planetaryLocusDurationLabel,
  planetaryLocusOpacityLabel,
  type PlanetaryGlyphSizeId,
  type PlanetaryGlyphTypeId,
  type PlanetaryGroundTrackHorizonId,
  type PlanetaryLocusDurationId,
  type PlanetaryLocusOpacityId,
  type PlanetaryObjectsPresentationPatch,
} from "../../core/planetaryObjectsPresentation";
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

function thicknessLabel(id: string): string {
  return id[0]!.toUpperCase() + id.slice(1);
}

export function PlanetaryObjectsSection(props: {
  config: LibrationConfigV2;
  updateConfig?: UpdateConfig;
  productInstantMs?: number;
}): ReactElement {
  const { config, updateConfig, productInstantMs } = props;
  const mutable = Boolean(updateConfig);
  const scene = config.scene ?? buildDefaultSceneConfigFromLayerFlags(config.layers);
  const pres = planetaryObjectsPresentationFromScene(scene);
  const trackOff = !pres.groundTracks.enabled;
  const pastOff = trackOff || !pres.groundTracks.pastEnabled;
  const futureOff = trackOff || !pres.groundTracks.futureEnabled;
  const unsupported =
    productInstantMs !== undefined && !isPlanetaryEphemerisSupportedUtc(productInstantMs);

  const apply = (patch: PlanetaryObjectsPresentationPatch): void => {
    patchScene(updateConfig, (base) => applyPlanetaryObjectsPresentationToScene(base, patch));
  };

  return (
    <>
      <h3 className="config-section__title config-section__title--sub">Planets</h3>
      <p className="config-section__hint">
        Eight planets plus Pluto as terrestrial sub-object points. Visibility remains under Layer
        masters. These are overhead geometry, not naked-eye sky visibility.
      </p>
      {unsupported ? (
        <p className="config-section__hint" role="status">
          {PLANETARY_EPHEMERIS_UNAVAILABLE_COPY}
        </p>
      ) : null}

      <p className="config-section__hint">Bodies</p>
      {PLANETARY_BODY_IDS.map((id) => {
        const meta = PLANETARY_BODY_METADATA[id];
        const body = pres.bodies[id];
        return (
          <ConfigControlRow key={`${id}-enabled`} label={`${meta.displayName} ${meta.astronomicalSymbol}`}>
            <input
              type="checkbox"
              className="config-input config-input--checkbox"
              checked={body.enabled}
              readOnly={!mutable}
              disabled={!mutable}
              tabIndex={mutable ? 0 : -1}
              aria-label={meta.displayName}
              title={`Show ${meta.displayName} on the map.`}
              onChange={
                mutable
                  ? (e) => {
                      apply({ bodies: { [id]: { enabled: e.currentTarget.checked } } });
                    }
                  : undefined
              }
            />
          </ConfigControlRow>
        );
      })}

      <p className="config-section__hint">Current position</p>
      <ConfigControlRow label="Show current planetary subpoints">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.currentSubpointsEnabled}
          readOnly={!mutable}
          disabled={!mutable}
          tabIndex={mutable ? 0 : -1}
          aria-label="Show current planetary subpoints"
          title="Current overhead glyphs and labels. Tracks and loci stay independent."
          onChange={
            mutable
              ? (e) => {
                  apply({ currentSubpointsEnabled: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Show planet labels">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.labelsEnabled}
          readOnly={!mutable}
          disabled={!mutable}
          tabIndex={mutable ? 0 : -1}
          aria-label="Show planet labels"
          title="Name labels next to current planetary glyphs."
          onChange={
            mutable
              ? (e) => {
                  apply({ labelsEnabled: e.currentTarget.checked });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Glyph">
        <select
          className="config-input"
          disabled={!mutable}
          aria-label="Planet glyph"
          title="Shared glyph for all enabled planets."
          value={pres.glyphType}
          onChange={
            mutable
              ? (e) => {
                  apply({ glyphType: e.currentTarget.value as PlanetaryGlyphTypeId });
                }
              : undefined
          }
        >
          {PLANETARY_GLYPH_TYPE_IDS.map((id) => (
            <option key={id} value={id}>
              {planetaryGlyphTypeLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>
      <ConfigControlRow label="Planet glyph size">
        <select
          className="config-input"
          disabled={!mutable}
          aria-label="Planet glyph size"
          title="Shared size for all planetary glyphs."
          value={pres.glyphSize}
          onChange={
            mutable
              ? (e) => {
                  apply({ glyphSize: e.currentTarget.value as PlanetaryGlyphSizeId });
                }
              : undefined
          }
        >
          {PLANETARY_GLYPH_SIZE_IDS.map((id) => (
            <option key={id} value={id}>
              {planetaryGlyphSizeLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>

      <p className="config-section__hint">Ground tracks</p>
      <ConfigControlRow label="Planet ground tracks">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.groundTracks.enabled}
          readOnly={!mutable}
          disabled={!mutable}
          tabIndex={mutable ? 0 : -1}
          aria-label="Planet ground tracks"
          title="Continuous geographic path of each enabled planet’s overhead point. Not an orbit around Earth."
          onChange={
            mutable
              ? (e) => {
                  apply({ groundTracks: { enabled: e.currentTarget.checked } });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Track past">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.groundTracks.pastEnabled}
          readOnly={!mutable}
          disabled={!mutable || trackOff}
          tabIndex={mutable && !trackOff ? 0 : -1}
          aria-label="Planet track past"
          title="Show the subplanet track before the current product time."
          onChange={
            mutable
              ? (e) => {
                  apply({ groundTracks: { pastEnabled: e.currentTarget.checked } });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Past horizon">
        <select
          className="config-input"
          disabled={!mutable || pastOff}
          aria-label="Planet past horizon"
          title="How far before the current product time to draw the past track."
          value={pres.groundTracks.pastHorizon}
          onChange={
            mutable
              ? (e) => {
                  apply({
                    groundTracks: {
                      pastHorizon: e.currentTarget.value as PlanetaryGroundTrackHorizonId,
                    },
                  });
                }
              : undefined
          }
        >
          {PLANETARY_GROUND_TRACK_HORIZON_IDS.map((id) => (
            <option key={`past-${id}`} value={id}>
              {planetaryGroundTrackHorizonLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>
      <ConfigControlRow label="Track future">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={pres.groundTracks.futureEnabled}
          readOnly={!mutable}
          disabled={!mutable || trackOff}
          tabIndex={mutable && !trackOff ? 0 : -1}
          aria-label="Planet track future"
          title="Show the subplanet track after the current product time."
          onChange={
            mutable
              ? (e) => {
                  apply({ groundTracks: { futureEnabled: e.currentTarget.checked } });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Future horizon">
        <select
          className="config-input"
          disabled={!mutable || futureOff}
          aria-label="Planet future horizon"
          title="How far after the current product time to draw the future track."
          value={pres.groundTracks.futureHorizon}
          onChange={
            mutable
              ? (e) => {
                  apply({
                    groundTracks: {
                      futureHorizon: e.currentTarget.value as PlanetaryGroundTrackHorizonId,
                    },
                  });
                }
              : undefined
          }
        >
          {PLANETARY_GROUND_TRACK_HORIZON_IDS.map((id) => (
            <option key={`future-${id}`} value={id}>
              {planetaryGroundTrackHorizonLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>
      <ConfigControlRow label="Line thickness">
        <select
          className="config-input"
          disabled={!mutable || trackOff}
          aria-label="Planet line thickness"
          title="Shared thickness for planetary ground tracks."
          value={pres.groundTracks.thickness}
          onChange={
            mutable
              ? (e) => {
                  apply({
                    groundTracks: {
                      thickness: e.currentTarget.value as (typeof ASTRONOMY_PATH_THICKNESS_IDS)[number],
                    },
                  });
                }
              : undefined
          }
        >
          {ASTRONOMY_PATH_THICKNESS_IDS.map((id) => (
            <option key={`track-th-${id}`} value={id}>
              {thicknessLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>

      <p className="config-section__hint">Planetary loci</p>
      <p className="config-section__hint">
        A planetary locus samples where each body is overhead at the same UTC each day.
      </p>
      {PLANETARY_BODY_IDS.map((id) => {
        const meta = PLANETARY_BODY_METADATA[id];
        const body = pres.bodies[id];
        const locusOff = !body.enabled;
        return (
          <ConfigControlRow key={`${id}-locus`} label={`${meta.displayName} locus`}>
            <input
              type="checkbox"
              className="config-input config-input--checkbox"
              checked={body.locusEnabled}
              readOnly={!mutable}
              disabled={!mutable || locusOff}
              tabIndex={mutable && !locusOff ? 0 : -1}
              aria-label={`${meta.displayName} locus`}
              title={`Daily same-time subpoint trace for ${meta.displayName}. Hidden while the body is off.`}
              onChange={
                mutable
                  ? (e) => {
                      apply({ bodies: { [id]: { locusEnabled: e.currentTarget.checked } } });
                    }
                  : undefined
              }
            />
          </ConfigControlRow>
        );
      })}
      <ConfigControlRow label="Locus duration">
        <select
          className="config-input"
          disabled={!mutable}
          aria-label="Locus duration"
          title="Shared long interval for planetary loci. Synodic cycle uses each body’s mean synodic period."
          value={pres.loci.duration}
          onChange={
            mutable
              ? (e) => {
                  apply({ loci: { duration: e.currentTarget.value as PlanetaryLocusDurationId } });
                }
              : undefined
          }
        >
          {PLANETARY_LOCUS_DURATION_IDS.map((id) => (
            <option key={id} value={id}>
              {planetaryLocusDurationLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>
      <ConfigControlRow label="Locus thickness">
        <select
          className="config-input"
          disabled={!mutable}
          aria-label="Locus thickness"
          title="Shared thickness for planetary loci."
          value={pres.loci.thickness}
          onChange={
            mutable
              ? (e) => {
                  apply({
                    loci: {
                      thickness: e.currentTarget.value as (typeof ASTRONOMY_PATH_THICKNESS_IDS)[number],
                    },
                  });
                }
              : undefined
          }
        >
          {ASTRONOMY_PATH_THICKNESS_IDS.map((id) => (
            <option key={`locus-th-${id}`} value={id}>
              {thicknessLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>
      <ConfigControlRow label="Locus opacity">
        <select
          className="config-input"
          disabled={!mutable}
          aria-label="Locus opacity"
          title="Shared opacity for planetary loci."
          value={pres.loci.opacity}
          onChange={
            mutable
              ? (e) => {
                  apply({ loci: { opacity: e.currentTarget.value as PlanetaryLocusOpacityId } });
                }
              : undefined
          }
        >
          {PLANETARY_LOCUS_OPACITY_IDS.map((id) => (
            <option key={id} value={id}>
              {planetaryLocusOpacityLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>

      <p className="config-section__hint">Colors</p>
      {PLANETARY_BODY_IDS.map((id) => {
        const meta = PLANETARY_BODY_METADATA[id];
        const body = pres.bodies[id];
        const colorOff = !body.enabled;
        return (
          <ConfigControlRow key={`${id}-color`} label={`${meta.displayName} color`}>
            <input
              type="color"
              className="config-input"
              disabled={!mutable || colorOff}
              aria-label={`${meta.displayName} color`}
              title={`Color for ${meta.displayName} glyph, label, track, and locus.`}
              value={body.color}
              onChange={
                mutable
                  ? (e) => {
                      apply({ bodies: { [id]: { color: e.currentTarget.value } } });
                    }
                  : undefined
              }
            />
          </ConfigControlRow>
        );
      })}
    </>
  );
}
