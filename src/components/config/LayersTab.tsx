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
import type { LayerEnableFlags } from "../../config/appConfig";
import {
  DEFAULT_BASE_MAP_PRESENTATION,
  applyLayerEnableFlagsToScene,
  buildDefaultSceneConfigFromLayerFlags,
  canonicalEquirectBaseMapIdForPersistence,
  deriveLayerEnableFlagsFromScene,
  normalizeBaseMapPresentation,
} from "../../config/v2/sceneConfig";
import { BaseMapStyleControl } from "./BaseMapStyleControl";
import { ConfigControlRow } from "./ConfigControlRow";

const LAYER_KEYS: (keyof LayerEnableFlags)[] = [
  "baseMap",
  "solarShading",
  "grid",
  "staticEquirectOverlay",
  "cityPins",
  "subsolarMarker",
  "sublunarMarker",
  "solarAnalemma",
];

function labelForLayer(key: keyof LayerEnableFlags): string {
  const map: Record<keyof LayerEnableFlags, string> = {
    baseMap: "Base map",
    solarShading: "Solar shading",
    grid: "Grid",
    staticEquirectOverlay: "Static equirect overlay",
    cityPins: "City pins",
    subsolarMarker: "Subsolar marker",
    sublunarMarker: "Sublunar marker",
    solarAnalemma: "Solar analemma (ground track)",
  };
  return map[key];
}

export type LayersTabProps = {
  config: LibrationConfigV2;
  /** When set, layer checkboxes call into App’s guarded update path (`commitWorkingV2Update`). */
  updateConfig?: (updater: (draft: LibrationConfigV2) => void) => void;
};

export function LayersTab({ config, updateConfig }: LayersTabProps) {
  const mutable = Boolean(updateConfig);
  const scene = config.scene ?? buildDefaultSceneConfigFromLayerFlags(config.layers);
  return (
    <div className="config-tab-stack">
      <section
        className="config-section"
        aria-labelledby="config-layers-scene-heading"
      >
        <h2 id="config-layers-scene-heading" className="config-section__title">
          Scene layers
        </h2>
        <p className="config-section__hint">
          Choose the basemap style, then toggle which map and overlay layers are shown. Read-only
          when the panel has no live update handler.
        </p>
        <BaseMapStyleControl
          baseMapId={scene.baseMap.id}
          presentation={scene.baseMap.presentation ?? { ...DEFAULT_BASE_MAP_PRESENTATION }}
          mutable={mutable}
          onSelectId={
            mutable && updateConfig
              ? (canonicalId) => {
                  const id = canonicalEquirectBaseMapIdForPersistence(canonicalId);
                  updateConfig((draft) => {
                    const baseScene = draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                    draft.scene = {
                      ...baseScene,
                      baseMap: { ...baseScene.baseMap, id },
                    };
                    draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                  });
                }
              : undefined
          }
          onPresentationChange={
            mutable && updateConfig
              ? (next) => {
                  const normalized = normalizeBaseMapPresentation(next);
                  updateConfig((draft) => {
                    const baseScene = draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                    draft.scene = {
                      ...baseScene,
                      baseMap: { ...baseScene.baseMap, presentation: normalized },
                    };
                    draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                  });
                }
              : undefined
          }
        />
        {LAYER_KEYS.map((key) => {
          return (
            <ConfigControlRow key={key} label={labelForLayer(key)}>
              <input
                type="checkbox"
                className="config-input config-input--checkbox"
                checked={config.layers[key]}
                readOnly={!mutable}
                disabled={!mutable}
                tabIndex={mutable ? 0 : -1}
                aria-label={labelForLayer(key)}
                onChange={
                  mutable && updateConfig
                    ? (e) => {
                        const checked = e.currentTarget.checked;
                        updateConfig((draft) => {
                          const next: LayerEnableFlags = { ...draft.layers, [key]: checked };
                          const baseScene =
                            draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                          const scene = applyLayerEnableFlagsToScene(baseScene, next);
                          draft.scene = scene;
                          draft.layers = deriveLayerEnableFlagsFromScene(scene);
                        });
                      }
                    : undefined
                }
              />
            </ConfigControlRow>
          );
        })}
      </section>
    </div>
  );
}
