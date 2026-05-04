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
  DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION,
  EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT_MAX,
  EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT_MIN,
  EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY_MAX,
  EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY_MIN,
  applyLayerEnableFlagsToScene,
  buildDefaultSceneConfigFromLayerFlags,
  canonicalEquirectBaseMapIdForPersistence,
  deriveLayerEnableFlagsFromScene,
  getBaseMapPresentationForMapId,
  setBaseMapPresentationForMapId,
  type EmissiveNightLightsPresentationMode,
  type MoonlightPresentationMode,
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

const MOONLIGHT_OPTIONS: { value: MoonlightPresentationMode; label: string; title: string }[] = [
  { value: "off", label: "Off", title: "No moonlight tint or extra night-side lift." },
  { value: "natural", label: "Natural", title: "Subtle, physically restrained moonlight." },
  { value: "enhanced", label: "Enhanced", title: "Readable moonlight while staying grounded." },
  { value: "illustrative", label: "Illustrative", title: "Stronger, instrument-like moonlight visibility." },
];

const EMISSIVE_NIGHT_LIGHTS_OPTIONS: {
  value: EmissiveNightLightsPresentationMode;
  label: string;
  title: string;
}[] = [
  { value: "off", label: "Off", title: "No city / night-lights radiance in the solar shading illumination raster." },
  {
    value: "natural",
    label: "Natural",
    title: "Restrained emissive read: subtle in twilight, legible deep night; moonlight can soften dominance slightly.",
  },
  {
    value: "enhanced",
    label: "Enhanced",
    title: "Clearer instrument readability for urban cores without unbounded glow.",
  },
  {
    value: "illustrative",
    label: "Illustrative",
    title: "Stronger bounded emissive emphasis for teaching and comparison; still one illumination raster.",
  },
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
  const effectivePresentation = getBaseMapPresentationForMapId(
    scene.baseMap.id,
    scene.baseMap.presentationByMapId,
    scene.baseMap.presentation ?? { ...DEFAULT_BASE_MAP_PRESENTATION },
  );
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
          presentation={effectivePresentation}
          mutable={mutable}
          onSelectId={
            mutable && updateConfig
              ? (canonicalId) => {
                  const id = canonicalEquirectBaseMapIdForPersistence(canonicalId);
                  updateConfig((draft) => {
                    const baseScene = draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                    const currentEffective = getBaseMapPresentationForMapId(
                      baseScene.baseMap.id,
                      baseScene.baseMap.presentationByMapId,
                      baseScene.baseMap.presentation,
                    );
                    const nextByMapId = setBaseMapPresentationForMapId(
                      baseScene.baseMap.presentationByMapId,
                      id,
                      getBaseMapPresentationForMapId(
                        id,
                        baseScene.baseMap.presentationByMapId,
                        currentEffective,
                      ),
                    );
                    draft.scene = {
                      ...baseScene,
                      baseMap: {
                        ...baseScene.baseMap,
                        id,
                        presentationByMapId: nextByMapId,
                        presentation: getBaseMapPresentationForMapId(
                          id,
                          nextByMapId,
                          baseScene.baseMap.presentation,
                        ),
                      },
                    };
                    draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                  });
                }
              : undefined
          }
          onPresentationChange={
            mutable && updateConfig
              ? (next) => {
                  updateConfig((draft) => {
                    const baseScene = draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                    const nextByMapId = setBaseMapPresentationForMapId(
                      baseScene.baseMap.presentationByMapId,
                      baseScene.baseMap.id,
                      next,
                    );
                    draft.scene = {
                      ...baseScene,
                      baseMap: {
                        ...baseScene.baseMap,
                        presentationByMapId: nextByMapId,
                        presentation: getBaseMapPresentationForMapId(
                          baseScene.baseMap.id,
                          nextByMapId,
                          baseScene.baseMap.presentation,
                        ),
                      },
                    };
                    draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                  });
                }
              : undefined
          }
        />
        <ConfigControlRow label="Moonlight appearance">
          <select
            className="config-input"
            value={scene.illumination.moonlight.mode}
            disabled={!mutable}
            aria-label="Moonlight appearance"
            title="How strongly moon phase affects the shaded night map (solar shading layer)."
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const mode = e.currentTarget.value as MoonlightPresentationMode;
                    updateConfig((draft) => {
                      const baseScene =
                        draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                      draft.scene = {
                        ...baseScene,
                        illumination: {
                          ...baseScene.illumination,
                          moonlight: { mode },
                        },
                      };
                      draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                    });
                  }
                : undefined
            }
          >
            {MOONLIGHT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} title={o.title}>
                {o.label}
              </option>
            ))}
          </select>
        </ConfigControlRow>
        <ConfigControlRow label="Night lights (emissive)">
          <select
            className="config-input"
            value={scene.illumination.emissiveNightLights.mode}
            disabled={!mutable}
            aria-label="Night lights appearance"
            title="Human-made radiance sampled into the solar shading illumination raster (same planetary raster as twilight and moonlight)."
            onChange={
              mutable && updateConfig
                ? (e) => {
                    const mode = e.currentTarget.value as EmissiveNightLightsPresentationMode;
                    updateConfig((draft) => {
                      const baseScene =
                        draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                      draft.scene = {
                        ...baseScene,
                        illumination: {
                          ...baseScene.illumination,
                          emissiveNightLights: {
                            ...baseScene.illumination.emissiveNightLights,
                            mode,
                          },
                        },
                      };
                      draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                    });
                  }
                : undefined
            }
          >
            {EMISSIVE_NIGHT_LIGHTS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} title={o.title}>
                {o.label}
              </option>
            ))}
          </select>
        </ConfigControlRow>
        <ConfigControlRow label="Night-light intensity">
          <div className="config-tab-stack" style={{ gap: "0.35rem" }}>
            <input
              type="range"
              className="config-input"
              min={EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY_MIN}
              max={EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY_MAX}
              step={0.05}
              disabled={!mutable || scene.illumination.emissiveNightLights.mode === "off"}
              aria-label="Night-light intensity"
              title="Scales emissive contribution after mode policy and solar gates (0–4). Off mode ignores night lights regardless."
              value={scene.illumination.emissiveNightLights.presentation.intensity}
              onChange={
                mutable && updateConfig
                  ? (e) => {
                      const intensity = Number(e.currentTarget.value);
                      updateConfig((draft) => {
                        const baseScene =
                          draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                        draft.scene = {
                          ...baseScene,
                          illumination: {
                            ...baseScene.illumination,
                            emissiveNightLights: {
                              ...baseScene.illumination.emissiveNightLights,
                              presentation: {
                                ...baseScene.illumination.emissiveNightLights.presentation,
                                intensity,
                              },
                            },
                          },
                        };
                        draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                      });
                    }
                  : undefined
              }
            />
            <input
              type="number"
              className="config-input"
              min={EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY_MIN}
              max={EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY_MAX}
              step={0.05}
              disabled={!mutable || scene.illumination.emissiveNightLights.mode === "off"}
              aria-label="Night-light intensity numeric"
              value={scene.illumination.emissiveNightLights.presentation.intensity}
              onChange={
                mutable && updateConfig
                  ? (e) => {
                      const v = Number(e.currentTarget.value);
                      const intensity = Number.isFinite(v)
                        ? Math.max(
                            EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY_MIN,
                            Math.min(EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY_MAX, v),
                          )
                        : DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION.intensity;
                      updateConfig((draft) => {
                        const baseScene =
                          draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                        draft.scene = {
                          ...baseScene,
                          illumination: {
                            ...baseScene.illumination,
                            emissiveNightLights: {
                              ...baseScene.illumination.emissiveNightLights,
                              presentation: {
                                ...baseScene.illumination.emissiveNightLights.presentation,
                                intensity,
                              },
                            },
                          },
                        };
                        draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                      });
                    }
                  : undefined
              }
            />
          </div>
        </ConfigControlRow>
        <ConfigControlRow label="Faint-light lift">
          <div className="config-tab-stack" style={{ gap: "0.35rem" }}>
            <input
              type="range"
              className="config-input"
              min={EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT_MIN}
              max={EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT_MAX}
              step={0.01}
              disabled={!mutable || scene.illumination.emissiveNightLights.mode === "off"}
              aria-label="Night-light luma lift exponent"
              title="Lower values lift dim JPEG texels more strongly; higher values keep urban hotspots tighter."
              value={scene.illumination.emissiveNightLights.presentation.driverExponent}
              onChange={
                mutable && updateConfig
                  ? (e) => {
                      const driverExponent = Number(e.currentTarget.value);
                      updateConfig((draft) => {
                        const baseScene =
                          draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                        draft.scene = {
                          ...baseScene,
                          illumination: {
                            ...baseScene.illumination,
                            emissiveNightLights: {
                              ...baseScene.illumination.emissiveNightLights,
                              presentation: {
                                ...baseScene.illumination.emissiveNightLights.presentation,
                                driverExponent,
                              },
                            },
                          },
                        };
                        draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                      });
                    }
                  : undefined
              }
            />
            <input
              type="number"
              className="config-input"
              min={EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT_MIN}
              max={EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT_MAX}
              step={0.01}
              disabled={!mutable || scene.illumination.emissiveNightLights.mode === "off"}
              aria-label="Faint-light lift numeric"
              value={scene.illumination.emissiveNightLights.presentation.driverExponent}
              onChange={
                mutable && updateConfig
                  ? (e) => {
                      const v = Number(e.currentTarget.value);
                      const driverExponent = Number.isFinite(v)
                        ? Math.max(
                            EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT_MIN,
                            Math.min(EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT_MAX, v),
                          )
                        : DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION.driverExponent;
                      updateConfig((draft) => {
                        const baseScene =
                          draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                        draft.scene = {
                          ...baseScene,
                          illumination: {
                            ...baseScene.illumination,
                            emissiveNightLights: {
                              ...baseScene.illumination.emissiveNightLights,
                              presentation: {
                                ...baseScene.illumination.emissiveNightLights.presentation,
                                driverExponent,
                              },
                            },
                          },
                        };
                        draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                      });
                    }
                  : undefined
              }
            />
          </div>
          <p className="config-section__hint" style={{ marginTop: "0.25rem", marginBottom: 0 }}>
            Lower values reveal faint lights more strongly in the upstream illumination raster.
          </p>
        </ConfigControlRow>
        <ConfigControlRow label="Night-light tuning">
          <button
            type="button"
            className="config-input"
            disabled={!mutable}
            title="Reset intensity and faint-light lift to defaults (does not change mode or asset id)."
            onClick={
              mutable && updateConfig
                ? () => {
                    updateConfig((draft) => {
                      const baseScene =
                        draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                      draft.scene = {
                        ...baseScene,
                        illumination: {
                          ...baseScene.illumination,
                          emissiveNightLights: {
                            ...baseScene.illumination.emissiveNightLights,
                            presentation: { ...DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION },
                          },
                        },
                      };
                      draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                    });
                  }
                : undefined
            }
          >
            Reset night-light presentation
          </button>
        </ConfigControlRow>
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
