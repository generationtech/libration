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
import type { LayerEnableFlags } from "../../config/appConfig";
import {
  DEFAULT_BASE_MAP_PRESENTATION,
  DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION,
  DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION,
  EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT_MAX,
  EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT_MIN,
  EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY_MAX,
  EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY_MIN,
  OVERLAY_READABILITY_LIFT_MULT_MAX,
  OVERLAY_READABILITY_LIFT_MULT_MIN,
  OVERLAY_READABILITY_VEIL_SCALE_MAX,
  OVERLAY_READABILITY_VEIL_SCALE_MIN,
  applyLayerEnableFlagsToScene,
  buildDefaultSceneConfigFromLayerFlags,
  canonicalEquirectBaseMapIdForPersistence,
  deriveLayerEnableFlagsFromScene,
  getBaseMapPresentationForMapId,
  setBaseMapPresentationForMapId,
  type EmissiveNightLightsPresentationMode,
  type MoonlightPresentationMode,
  type SceneConfig,
  type SceneOverlayReadabilityPerLayerPilotKey,
  type SceneOverlayReadabilityPresentationConfig,
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

function isIdentityOverlayReadabilityPresentation(
  pres: SceneOverlayReadabilityPresentationConfig,
): boolean {
  return (
    pres.readabilityVeilScale01 ===
      DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION.readabilityVeilScale01 &&
    pres.overlayLiftMultiplier01 ===
      DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION.overlayLiftMultiplier01
  );
}

function overlayReadabilityWithPerLayerPilotUpdate(
  overlay: SceneConfig["overlayReadability"],
  key: SceneOverlayReadabilityPerLayerPilotKey,
  nextPilot: SceneOverlayReadabilityPresentationConfig,
): SceneConfig["overlayReadability"] {
  const nextPerLayer = { ...overlay.perLayer };
  if (isIdentityOverlayReadabilityPresentation(nextPilot)) {
    delete nextPerLayer[key];
  } else {
    nextPerLayer[key] = { ...nextPilot };
  }
  const hasPerLayer = Object.keys(nextPerLayer).length > 0;
  return {
    presentation: overlay.presentation,
    ...(hasPerLayer ? { perLayer: nextPerLayer } : {}),
  };
}

function OverlayReadabilityPerLayerPilotBlock(props: {
  mutable: boolean;
  updateConfig?: (updater: (draft: LibrationConfigV2) => void) => void;
  pilotKey: SceneOverlayReadabilityPerLayerPilotKey;
  pilotReadability: SceneOverlayReadabilityPresentationConfig;
  veilRowLabel: string;
  liftRowLabel: string;
  resetRowLabel: string;
  veilAriaLabel: string;
  liftAriaLabel: string;
  veilSliderTitle: string;
  liftSliderTitle: string;
  resetButtonTitle: string;
  resetButtonText: string;
}): ReactElement {
  const {
    mutable,
    updateConfig,
    pilotKey,
    pilotReadability,
    veilRowLabel,
    liftRowLabel,
    resetRowLabel,
    veilAriaLabel,
    liftAriaLabel,
    veilSliderTitle,
    liftSliderTitle,
    resetButtonTitle,
    resetButtonText,
  } = props;
  const curPilot = (scene: SceneConfig) => ({
    ...DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION,
    ...scene.overlayReadability.perLayer?.[pilotKey],
  });
  return (
    <>
      <ConfigControlRow label={veilRowLabel}>
        <div className="config-tab-stack" style={{ gap: "0.35rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
              width: "100%",
            }}
          >
            <input
              type="range"
              className="config-input"
              style={{ flex: "1 1 7rem", minWidth: "6rem" }}
              min={OVERLAY_READABILITY_VEIL_SCALE_MIN}
              max={OVERLAY_READABILITY_VEIL_SCALE_MAX}
              step={0.05}
              disabled={!mutable}
              aria-label={veilAriaLabel}
              title={veilSliderTitle}
              value={pilotReadability.readabilityVeilScale01}
              onChange={
                mutable && updateConfig
                  ? (e) => {
                      const readabilityVeilScale01 = Number(e.currentTarget.value);
                      updateConfig((draft) => {
                        const baseScene =
                          draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                        draft.scene = {
                          ...baseScene,
                          overlayReadability: overlayReadabilityWithPerLayerPilotUpdate(
                            baseScene.overlayReadability,
                            pilotKey,
                            { ...curPilot(baseScene), readabilityVeilScale01 },
                          ),
                        };
                        draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                      });
                    }
                  : undefined
              }
            />
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                margin: 0,
                fontSize: "0.85rem",
              }}
            >
              <span>Value (0–1.5)</span>
              <input
                type="number"
                className="config-input"
                style={{ width: "4.25rem" }}
                min={OVERLAY_READABILITY_VEIL_SCALE_MIN}
                max={OVERLAY_READABILITY_VEIL_SCALE_MAX}
                step={0.05}
                disabled={!mutable}
                aria-label={`${veilAriaLabel} value`}
                value={pilotReadability.readabilityVeilScale01}
                onChange={
                  mutable && updateConfig
                    ? (e) => {
                        const v = Number(e.currentTarget.value);
                        const readabilityVeilScale01 = Number.isFinite(v)
                          ? Math.max(
                              OVERLAY_READABILITY_VEIL_SCALE_MIN,
                              Math.min(OVERLAY_READABILITY_VEIL_SCALE_MAX, v),
                            )
                          : DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION.readabilityVeilScale01;
                        updateConfig((draft) => {
                          const baseScene =
                            draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                          draft.scene = {
                            ...baseScene,
                            overlayReadability: overlayReadabilityWithPerLayerPilotUpdate(
                              baseScene.overlayReadability,
                              pilotKey,
                              { ...curPilot(baseScene), readabilityVeilScale01 },
                            ),
                          };
                          draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                        });
                      }
                    : undefined
                }
              />
            </label>
          </div>
        </div>
      </ConfigControlRow>
      <ConfigControlRow label={liftRowLabel}>
        <div className="config-tab-stack" style={{ gap: "0.35rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
              width: "100%",
            }}
          >
            <input
              type="range"
              className="config-input"
              style={{ flex: "1 1 7rem", minWidth: "6rem" }}
              min={OVERLAY_READABILITY_LIFT_MULT_MIN}
              max={OVERLAY_READABILITY_LIFT_MULT_MAX}
              step={0.01}
              disabled={!mutable}
              aria-label={liftAriaLabel}
              title={liftSliderTitle}
              value={pilotReadability.overlayLiftMultiplier01}
              onChange={
                mutable && updateConfig
                  ? (e) => {
                      const overlayLiftMultiplier01 = Number(e.currentTarget.value);
                      updateConfig((draft) => {
                        const baseScene =
                          draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                        draft.scene = {
                          ...baseScene,
                          overlayReadability: overlayReadabilityWithPerLayerPilotUpdate(
                            baseScene.overlayReadability,
                            pilotKey,
                            { ...curPilot(baseScene), overlayLiftMultiplier01 },
                          ),
                        };
                        draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                      });
                    }
                  : undefined
              }
            />
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                margin: 0,
                fontSize: "0.85rem",
              }}
            >
              <span>Value (0.65–1.35)</span>
              <input
                type="number"
                className="config-input"
                style={{ width: "4.25rem" }}
                min={OVERLAY_READABILITY_LIFT_MULT_MIN}
                max={OVERLAY_READABILITY_LIFT_MULT_MAX}
                step={0.01}
                disabled={!mutable}
                aria-label={`${liftAriaLabel} value`}
                value={pilotReadability.overlayLiftMultiplier01}
                onChange={
                  mutable && updateConfig
                    ? (e) => {
                        const v = Number(e.currentTarget.value);
                        const overlayLiftMultiplier01 = Number.isFinite(v)
                          ? Math.max(
                              OVERLAY_READABILITY_LIFT_MULT_MIN,
                              Math.min(OVERLAY_READABILITY_LIFT_MULT_MAX, v),
                            )
                          : DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION.overlayLiftMultiplier01;
                        updateConfig((draft) => {
                          const baseScene =
                            draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                          draft.scene = {
                            ...baseScene,
                            overlayReadability: overlayReadabilityWithPerLayerPilotUpdate(
                              baseScene.overlayReadability,
                              pilotKey,
                              { ...curPilot(baseScene), overlayLiftMultiplier01 },
                            ),
                          };
                          draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                        });
                      }
                    : undefined
                }
              />
            </label>
          </div>
        </div>
      </ConfigControlRow>
      <ConfigControlRow label={resetRowLabel}>
        <button
          type="button"
          className="config-input"
          disabled={!mutable}
          title={resetButtonTitle}
          onClick={
            mutable && updateConfig
              ? () => {
                  updateConfig((draft) => {
                    const baseScene =
                      draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                    draft.scene = {
                      ...baseScene,
                      overlayReadability: overlayReadabilityWithPerLayerPilotUpdate(
                        baseScene.overlayReadability,
                        pilotKey,
                        { ...DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION },
                      ),
                    };
                    draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                  });
                }
              : undefined
          }
        >
          {resetButtonText}
        </button>
      </ConfigControlRow>
    </>
  );
}

export type LayersTabProps = {
  config: LibrationConfigV2;
  /** When set, layer checkboxes call into App’s guarded update path (`commitWorkingV2Update`). */
  updateConfig?: (updater: (draft: LibrationConfigV2) => void) => void;
  /** Product instant for month-aware map selector (UTC civil month display). */
  productInstantMs?: number;
};

export function LayersTab({ config, updateConfig, productInstantMs }: LayersTabProps) {
  const mutable = Boolean(updateConfig);
  const scene = config.scene ?? buildDefaultSceneConfigFromLayerFlags(config.layers);
  const gridPilotReadability: SceneOverlayReadabilityPresentationConfig = {
    ...DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION,
    ...scene.overlayReadability.perLayer?.grid,
  };
  const solarAnalemmaPilotReadability: SceneOverlayReadabilityPresentationConfig = {
    ...DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION,
    ...scene.overlayReadability.perLayer?.solarAnalemma,
  };
  const subsolarPilotReadability: SceneOverlayReadabilityPresentationConfig = {
    ...DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION,
    ...scene.overlayReadability.perLayer?.subsolarMarker,
  };
  const sublunarPilotReadability: SceneOverlayReadabilityPresentationConfig = {
    ...DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION,
    ...scene.overlayReadability.perLayer?.sublunarMarker,
  };
  const cityPinsPilotReadability: SceneOverlayReadabilityPresentationConfig = {
    ...DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION,
    ...scene.overlayReadability.perLayer?.cityPins,
  };
  const staticEquirectPilotReadability: SceneOverlayReadabilityPresentationConfig = {
    ...DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION,
    ...scene.overlayReadability.perLayer?.staticEquirectOverlay,
  };
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
          productInstantMs={productInstantMs}
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
                width: "100%",
              }}
            >
              <input
                type="range"
                className="config-input"
                style={{ flex: "1 1 7rem", minWidth: "6rem" }}
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
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  margin: 0,
                  fontSize: "0.85rem",
                }}
              >
                <span>Intensity value (0–4)</span>
                <input
                  type="number"
                  className="config-input"
                  style={{ width: "4.25rem" }}
                  min={EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY_MIN}
                  max={EMISSIVE_NIGHT_LIGHTS_PRESENTATION_INTENSITY_MAX}
                  step={0.05}
                  disabled={!mutable || scene.illumination.emissiveNightLights.mode === "off"}
                  aria-label="Night-light intensity value"
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
              </label>
            </div>
          </div>
        </ConfigControlRow>
        <ConfigControlRow label="Faint-light lift">
          <div className="config-tab-stack" style={{ gap: "0.35rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
                width: "100%",
              }}
            >
              <input
                type="range"
                className="config-input"
                style={{ flex: "1 1 7rem", minWidth: "6rem" }}
                min={EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT_MIN}
                max={EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT_MAX}
                step={0.01}
                disabled={!mutable || scene.illumination.emissiveNightLights.mode === "off"}
                aria-label="Night-light faint-light lift (driver exponent)"
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
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  margin: 0,
                  fontSize: "0.85rem",
                }}
              >
                <span>Lift value (0.35–1)</span>
                <input
                  type="number"
                  className="config-input"
                  style={{ width: "4.25rem" }}
                  min={EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT_MIN}
                  max={EMISSIVE_NIGHT_LIGHTS_DRIVER_EXPONENT_MAX}
                  step={0.01}
                  disabled={!mutable || scene.illumination.emissiveNightLights.mode === "off"}
                  aria-label="Faint-light lift value"
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
              </label>
            </div>
            <p className="config-section__hint" style={{ marginTop: 0, marginBottom: 0 }}>
              Lower faint-light lift reveals dimmer lights more strongly.
            </p>
          </div>
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
            Reset night-light tuning
          </button>
        </ConfigControlRow>
        <ConfigControlRow label="Overlay readability veil scale">
          <div className="config-tab-stack" style={{ gap: "0.35rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
                width: "100%",
              }}
            >
              <input
                type="range"
                className="config-input"
                style={{ flex: "1 1 7rem", minWidth: "6rem" }}
                min={OVERLAY_READABILITY_VEIL_SCALE_MIN}
                max={OVERLAY_READABILITY_VEIL_SCALE_MAX}
                step={0.05}
                disabled={!mutable}
                aria-label="Overlay combined readability veil scale"
                title="Scales subsolar + emissive-policy combined veil for grids, markers, pins, and static equirect overlays (0 = minimum; 1 = default; up to 1.5)."
                value={scene.overlayReadability.presentation.readabilityVeilScale01}
                onChange={
                  mutable && updateConfig
                    ? (e) => {
                        const readabilityVeilScale01 = Number(e.currentTarget.value);
                        updateConfig((draft) => {
                          const baseScene =
                            draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                          draft.scene = {
                            ...baseScene,
                            overlayReadability: {
                              ...baseScene.overlayReadability,
                              presentation: {
                                ...baseScene.overlayReadability.presentation,
                                readabilityVeilScale01,
                              },
                            },
                          };
                          draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                        });
                      }
                    : undefined
                }
              />
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  margin: 0,
                  fontSize: "0.85rem",
                }}
              >
                <span>Value (0–1.5)</span>
                <input
                  type="number"
                  className="config-input"
                  style={{ width: "4.25rem" }}
                  min={OVERLAY_READABILITY_VEIL_SCALE_MIN}
                  max={OVERLAY_READABILITY_VEIL_SCALE_MAX}
                  step={0.05}
                  disabled={!mutable}
                  aria-label="Overlay veil scale value"
                  value={scene.overlayReadability.presentation.readabilityVeilScale01}
                  onChange={
                    mutable && updateConfig
                      ? (e) => {
                          const v = Number(e.currentTarget.value);
                          const readabilityVeilScale01 = Number.isFinite(v)
                            ? Math.max(
                                OVERLAY_READABILITY_VEIL_SCALE_MIN,
                                Math.min(OVERLAY_READABILITY_VEIL_SCALE_MAX, v),
                              )
                            : DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION.readabilityVeilScale01;
                          updateConfig((draft) => {
                            const baseScene =
                              draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                            draft.scene = {
                              ...baseScene,
                              overlayReadability: {
                                ...baseScene.overlayReadability,
                                presentation: {
                                  ...baseScene.overlayReadability.presentation,
                                  readabilityVeilScale01,
                                },
                              },
                            };
                            draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                          });
                        }
                      : undefined
                  }
                />
              </label>
            </div>
          </div>
        </ConfigControlRow>
        <ConfigControlRow label="Overlay lift multiplier">
          <div className="config-tab-stack" style={{ gap: "0.35rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
                width: "100%",
              }}
            >
              <input
                type="range"
                className="config-input"
                style={{ flex: "1 1 7rem", minWidth: "6rem" }}
                min={OVERLAY_READABILITY_LIFT_MULT_MIN}
                max={OVERLAY_READABILITY_LIFT_MULT_MAX}
                step={0.01}
                disabled={!mutable}
                aria-label="Overlay substrate lift multiplier"
                title="Multiplies substrate-derived overlay lift scale before clamp (1 = default; lower reduces stroke and cssFilter lift on bright bases)."
                value={scene.overlayReadability.presentation.overlayLiftMultiplier01}
                onChange={
                  mutable && updateConfig
                    ? (e) => {
                        const overlayLiftMultiplier01 = Number(e.currentTarget.value);
                        updateConfig((draft) => {
                          const baseScene =
                            draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                          draft.scene = {
                            ...baseScene,
                            overlayReadability: {
                              ...baseScene.overlayReadability,
                              presentation: {
                                ...baseScene.overlayReadability.presentation,
                                overlayLiftMultiplier01,
                              },
                            },
                          };
                          draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                        });
                      }
                    : undefined
                }
              />
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  margin: 0,
                  fontSize: "0.85rem",
                }}
              >
                <span>Value (0.65–1.35)</span>
                <input
                  type="number"
                  className="config-input"
                  style={{ width: "4.25rem" }}
                  min={OVERLAY_READABILITY_LIFT_MULT_MIN}
                  max={OVERLAY_READABILITY_LIFT_MULT_MAX}
                  step={0.01}
                  disabled={!mutable}
                  aria-label="Overlay lift multiplier value"
                  value={scene.overlayReadability.presentation.overlayLiftMultiplier01}
                  onChange={
                    mutable && updateConfig
                      ? (e) => {
                          const v = Number(e.currentTarget.value);
                          const overlayLiftMultiplier01 = Number.isFinite(v)
                            ? Math.max(
                                OVERLAY_READABILITY_LIFT_MULT_MIN,
                                Math.min(OVERLAY_READABILITY_LIFT_MULT_MAX, v),
                              )
                            : DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION.overlayLiftMultiplier01;
                          updateConfig((draft) => {
                            const baseScene =
                              draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                            draft.scene = {
                              ...baseScene,
                              overlayReadability: {
                                ...baseScene.overlayReadability,
                                presentation: {
                                  ...baseScene.overlayReadability.presentation,
                                  overlayLiftMultiplier01,
                                },
                              },
                            };
                            draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                          });
                        }
                      : undefined
                  }
                />
              </label>
            </div>
          </div>
        </ConfigControlRow>
        <OverlayReadabilityPerLayerPilotBlock
          mutable={mutable}
          updateConfig={updateConfig}
          pilotKey="grid"
          pilotReadability={gridPilotReadability}
          veilRowLabel="Grid overlay veil (pilot)"
          liftRowLabel="Grid overlay lift (pilot)"
          resetRowLabel="Grid overlay readability (pilot)"
          veilAriaLabel="Latitude longitude grid overlay readability veil scale"
          liftAriaLabel="Latitude longitude grid overlay lift multiplier"
          veilSliderTitle="Extra veil multiplier for the lat/lon grid only, applied after global overlay readability (1 = default)."
          liftSliderTitle="Extra lift multiplier for the lat/lon grid only, applied after global overlay readability (1 = default)."
          resetButtonTitle="Clear grid-only veil/lift overrides (does not change global overlay readability)."
          resetButtonText="Reset grid overlay readability"
        />
        <OverlayReadabilityPerLayerPilotBlock
          mutable={mutable}
          updateConfig={updateConfig}
          pilotKey="solarAnalemma"
          pilotReadability={solarAnalemmaPilotReadability}
          veilRowLabel="Solar analemma overlay veil (pilot)"
          liftRowLabel="Solar analemma overlay lift (pilot)"
          resetRowLabel="Solar analemma overlay readability (pilot)"
          veilAriaLabel="Solar analemma overlay readability veil scale"
          liftAriaLabel="Solar analemma overlay lift multiplier"
          veilSliderTitle="Extra veil multiplier for the solar analemma only, applied after global overlay readability (1 = default)."
          liftSliderTitle="Extra lift multiplier for the solar analemma only, applied after global overlay readability (1 = default)."
          resetButtonTitle="Clear solar-analemma-only veil/lift overrides (does not change global overlay readability)."
          resetButtonText="Reset solar analemma overlay readability"
        />
        <OverlayReadabilityPerLayerPilotBlock
          mutable={mutable}
          updateConfig={updateConfig}
          pilotKey="subsolarMarker"
          pilotReadability={subsolarPilotReadability}
          veilRowLabel="Subsolar marker overlay veil (pilot)"
          liftRowLabel="Subsolar marker overlay lift (pilot)"
          resetRowLabel="Subsolar marker overlay readability (pilot)"
          veilAriaLabel="Subsolar marker overlay readability veil scale"
          liftAriaLabel="Subsolar marker overlay lift multiplier"
          veilSliderTitle="Extra veil multiplier for the subsolar marker only, applied after global overlay readability (1 = default)."
          liftSliderTitle="Extra lift multiplier for the subsolar marker only, applied after global overlay readability (1 = default)."
          resetButtonTitle="Clear subsolar-marker-only veil/lift overrides (does not change global overlay readability)."
          resetButtonText="Reset subsolar marker overlay readability"
        />
        <OverlayReadabilityPerLayerPilotBlock
          mutable={mutable}
          updateConfig={updateConfig}
          pilotKey="sublunarMarker"
          pilotReadability={sublunarPilotReadability}
          veilRowLabel="Sublunar marker overlay veil (pilot)"
          liftRowLabel="Sublunar marker overlay lift (pilot)"
          resetRowLabel="Sublunar marker overlay readability (pilot)"
          veilAriaLabel="Sublunar marker overlay readability veil scale"
          liftAriaLabel="Sublunar marker overlay lift multiplier"
          veilSliderTitle="Extra veil multiplier for the sublunar marker only, applied after global overlay readability (1 = default)."
          liftSliderTitle="Extra lift multiplier for the sublunar marker only, applied after global overlay readability (1 = default)."
          resetButtonTitle="Clear sublunar-marker-only veil/lift overrides (does not change global overlay readability)."
          resetButtonText="Reset sublunar marker overlay readability"
        />
        <OverlayReadabilityPerLayerPilotBlock
          mutable={mutable}
          updateConfig={updateConfig}
          pilotKey="cityPins"
          pilotReadability={cityPinsPilotReadability}
          veilRowLabel="City pins overlay veil (pilot)"
          liftRowLabel="City pins overlay lift (pilot)"
          resetRowLabel="City pins overlay readability (pilot)"
          veilAriaLabel="City pins overlay readability veil scale"
          liftAriaLabel="City pins overlay lift multiplier"
          veilSliderTitle="Extra veil multiplier for city pins only, applied after global overlay readability (1 = default)."
          liftSliderTitle="Extra lift multiplier for city pins only, applied after global overlay readability (1 = default)."
          resetButtonTitle="Clear city-pins-only veil/lift overrides (does not change global overlay readability)."
          resetButtonText="Reset city pins overlay readability"
        />
        <OverlayReadabilityPerLayerPilotBlock
          mutable={mutable}
          updateConfig={updateConfig}
          pilotKey="staticEquirectOverlay"
          pilotReadability={staticEquirectPilotReadability}
          veilRowLabel="Static equirect overlay veil (pilot)"
          liftRowLabel="Static equirect overlay lift (pilot)"
          resetRowLabel="Static equirect overlay readability (pilot)"
          veilAriaLabel="Static equirect overlay readability veil scale"
          liftAriaLabel="Static equirect overlay lift multiplier"
          veilSliderTitle="Extra veil multiplier for static equirect rasters only, applied after global overlay readability (1 = default)."
          liftSliderTitle="Extra lift multiplier for static equirect rasters only, applied after global overlay readability (1 = default)."
          resetButtonTitle="Clear static-equirect-only veil/lift overrides (does not change global overlay readability)."
          resetButtonText="Reset static equirect overlay readability"
        />
        <ConfigControlRow label="Overlay readability tuning">
          <button
            type="button"
            className="config-input"
            disabled={!mutable}
            title="Reset global veil/lift and clear all per-layer pilot overrides (all 1 / 1)."
            onClick={
              mutable && updateConfig
                ? () => {
                    updateConfig((draft) => {
                      const baseScene =
                        draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
                      draft.scene = {
                        ...baseScene,
                        overlayReadability: {
                          presentation: { ...DEFAULT_SCENE_OVERLAY_READABILITY_PRESENTATION },
                        },
                      };
                      draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
                    });
                  }
                : undefined
            }
          >
            Reset overlay readability
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
