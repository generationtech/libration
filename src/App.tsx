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

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createLayerRegistryFromConfig } from "./app/bootstrap";
import {
  deletePreset as deleteUserStoredPreset,
  loadPreset as loadUserStoredPresetIntoWorking,
  renamePreset as renameUserStoredPreset,
  saveCurrentAsPreset as saveWorkingAsUserPreset,
} from "./app/userPresetsLifecycle";
import {
  commitWorkingV2Update,
  deriveAppConfigFromV2,
} from "./app/workingV2Commit";
import { getActiveAppConfig } from "./config/displayPresets";
import type { AppConfig } from "./config/appConfig";
import type { LibrationConfigV2 } from "./config/v2/librationConfig";
import { appConfigToV2 } from "./config/v2/librationConfig";
import { loadUserPresets } from "./config/v2/userPresetsPersistence";
import {
  getLocalStorageIfAvailable,
  resolveStartupWorkingV2,
} from "./config/v2/workingV2Persistence";
import { LayerRegistry } from "./layers/LayerRegistry";
import {
  buildDisplayChromeState,
  buildSceneRenderInput,
  createViewportFromCanvas,
  renderDisplayChrome,
} from "./app/renderBridge";
import { runAnimationFrameLoop } from "./app/renderLoop";
import {
  applyDemoPlaybackPause,
  applyDemoPlaybackReset,
  applyDemoPlaybackResume,
  computeEffectiveRenderTimeMs,
  createPausedDemoPlaybackState,
  isDemoTimeActive,
  type DemoPlaybackState,
} from "./app/demoPlayback";
import {
  getVisualScenarioExtraOverlayLayer,
  getVisualScenarioRuntime,
  INACTIVE_VISUAL_SCENARIO_RUNTIME,
} from "./dev/visualScenarioRuntime";
import { ConfigShell } from "./components/config/ConfigShell";
import { ALLOW_PHASE3_MUTATIONS } from "./components/config/phase3Flags";
import { getEquirectBaseMapCatalogEntry } from "./config/baseMapAssetResolve";
import { calendarMonthUtc1To12FromUnixMs } from "./config/baseMapMonthResolve";
import { resolveEffectiveBaseMapPresentation } from "./config/baseMapPresentation";
import {
  computeOverlayReadabilityFrameFromTimeMs,
  type SubstrateOverlayReadabilityFrameInputs,
} from "./core/overlayReadabilityFrame";
import { createTimeContext } from "./core/time";
import { resolveEclipseFrame } from "./core/eclipse/eclipseEventService";
import { solarEclipsePresentationFromScene, referenceCityEclipsePresentationFromScene } from "./config/v2/sceneConfig";
import { forecastHorizonMsFromDays } from "./core/eclipse/solarEclipseAppearance";
import { createDynamicDataLifecycleHost } from "./lifecycle";
import { resolveReferenceCityObserverLocation } from "./core/referenceCityObserver";
import { resolveReferenceCityEclipseCircumstances } from "./core/eclipse/referenceCityEclipseCircumstances";
import { formatReferenceCityEclipseChromeStatus } from "./core/referenceCityEclipseStatus";
import { resolveReferenceFrameCivilTimeZone } from "./core/displayTimeReference";
import { displayTimeModeFromTopBandTimeMode } from "./core/displayTimeMode";
import { REFERENCE_CITIES } from "./data/referenceCities";
import { CanvasRenderBackend } from "./renderer/canvasRenderBackend";
import { buildRenderableLayerStates } from "./renderer/layerInputAdapter";
import { addEquirectBaseMapImageLoadFailure } from "./layers/baseMapEquirectImageExclusions";
import "./App.css";

const CONFIG_PANEL_DOM_ID = "libration-config-shell";

function isTextEntryElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
}

export default function App() {
  const scenarioRuntime = import.meta.env.DEV
    ? getVisualScenarioRuntime()
    : INACTIVE_VISUAL_SCENARIO_RUNTIME;
  const [, bumpConfigView] = useReducer((n: number) => n + 1, 0);
  const [userPresetsEpoch, setUserPresetsEpoch] = useState(0);
  const bumpUserPresets = useCallback(() => setUserPresetsEpoch((n) => n + 1), []);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const isConfigOpenRef = useRef(false);
  const productInstantMsRef = useRef(Date.now());
  const [configPanelProductInstantMs, setConfigPanelProductInstantMs] = useState(
    () => Date.now(),
  );
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isDirtyFromPreset, setIsDirtyFromPreset] = useState(false);
  const activePresetIdRef = useRef<string | null>(null);
  activePresetIdRef.current = activePresetId;

  const workingV2Ref = useRef<LibrationConfigV2>(
    resolveStartupWorkingV2(
      scenarioRuntime.kind === "applied" ? null : getLocalStorageIfAvailable(),
      () =>
        scenarioRuntime.kind === "applied"
          ? scenarioRuntime.config
          : appConfigToV2(getActiveAppConfig()),
    ),
  );
  const derivedAppConfigRef = useRef<AppConfig>(
    deriveAppConfigFromV2(workingV2Ref.current),
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const registryRef = useRef<LayerRegistry>(
    createLayerRegistryFromConfig(derivedAppConfigRef.current),
  );
  const demoPlaybackRef = useRef<DemoPlaybackState | null>(
    scenarioRuntime.kind === "applied"
      ? createPausedDemoPlaybackState(
          scenarioRuntime.startIsoUtc,
          Date.now(),
          scenarioRuntime.config.data.demoTime.speedMultiplier,
        )
      : null,
  );
  const demoTransportActionRef = useRef<
    "pause" | "resume" | "reset" | null
  >(null);
  const [demoTransportPaused, setDemoTransportPaused] = useState(
    scenarioRuntime.kind === "applied",
  );
  const prevDemoTimeActiveRef = useRef(scenarioRuntime.kind === "applied");
  const lastRenderClockMsRef = useRef<number | null>(null);
  /** Phase 10 shell seam: store/manager/resolver/acquisition (no dynamic overlay UI). */
  const dynamicLifecycleHostRef = useRef(createDynamicDataLifecycleHost());

  const requestDemoPause = useCallback(() => {
    demoTransportActionRef.current = "pause";
  }, []);
  const requestDemoResume = useCallback(() => {
    demoTransportActionRef.current = "resume";
  }, []);
  const requestDemoReset = useCallback(() => {
    demoTransportActionRef.current = "reset";
  }, []);

  const storage = getLocalStorageIfAvailable();
  const userPresetsList = useMemo(
    () => loadUserPresets(storage),
    [storage, userPresetsEpoch],
  );

  /** Phase 10 / DLC: arm acquisition from config commits — never from rAF paint. */
  const syncDynamicLifecycleConsumers = useCallback(() => {
    const host = dynamicLifecycleHostRef.current;
    const scene = derivedAppConfigRef.current.scene;
    const cloudsIrOverlay = derivedAppConfigRef.current.layers.globalCloudsIr;
    const cloudParticipationOn =
      scene.illumination.cloudParticipation.mode !== "off";
    if (cloudsIrOverlay || cloudParticipationOn) {
      host.ensureGlobalCloudsIrConsumer({ runImmediately: true });
    } else {
      host.stopGlobalCloudsIrConsumer();
    }
    if (derivedAppConfigRef.current.layers.earthquakes) {
      host.ensureEarthquakesConsumer({ runImmediately: true });
    } else {
      host.stopEarthquakesConsumer();
    }
    if (derivedAppConfigRef.current.layers.orbitalTracks) {
      host.ensureOrbitalTracksConsumer({ runImmediately: true });
    } else {
      host.stopOrbitalTracksConsumer();
    }
  }, []);

  const updateConfig = useCallback(
    (updater: (draft: LibrationConfigV2) => void) => {
      if (!ALLOW_PHASE3_MUTATIONS) {
        return;
      }
      commitWorkingV2Update(
        workingV2Ref,
        derivedAppConfigRef,
        registryRef,
        updater,
      );
      syncDynamicLifecycleConsumers();
      if (activePresetIdRef.current !== null) {
        setIsDirtyFromPreset(true);
      }
      bumpConfigView();
    },
    [syncDynamicLifecycleConsumers],
  );

  const userPresetsUi = useMemo(
    () => ({
      presets: userPresetsList,
      activePresetId,
      isDirtyFromPreset,
      onSaveCurrentAsPreset: (name: string) => {
        const r = saveWorkingAsUserPreset(storage, workingV2Ref, name);
        if (r.ok) {
          bumpUserPresets();
        }
        return r;
      },
      onLoadPreset: (id: string) => {
        if (
          !loadUserStoredPresetIntoWorking(
            storage,
            workingV2Ref,
            derivedAppConfigRef,
            registryRef,
            id,
          )
        ) {
          return;
        }
        syncDynamicLifecycleConsumers();
        setActivePresetId(id);
        setIsDirtyFromPreset(false);
        bumpConfigView();
      },
      onRenamePreset: (id: string, name: string) => {
        const r = renameUserStoredPreset(storage, id, name);
        if (r.ok) {
          bumpUserPresets();
        }
        return r.ok;
      },
      onDeletePreset: (id: string) => {
        deleteUserStoredPreset(storage, id);
        bumpUserPresets();
        if (activePresetId === id) {
          setActivePresetId(null);
          setIsDirtyFromPreset(false);
        }
      },
    }),
    [
      userPresetsList,
      activePresetId,
      isDirtyFromPreset,
      storage,
      bumpUserPresets,
      bumpConfigView,
      syncDynamicLifecycleConsumers,
    ],
  );

  useEffect(() => {
    // Startup: honor persisted enablement without waiting for a Layers toggle.
    syncDynamicLifecycleConsumers();
  }, [syncDynamicLifecycleConsumers]);

  useEffect(() => {
    isConfigOpenRef.current = isConfigOpen;
  }, [isConfigOpen]);

  useEffect(() => {
    if (isConfigOpen) {
      setConfigPanelProductInstantMs(productInstantMsRef.current);
    }
  }, [isConfigOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        if (!isConfigOpen) {
          return;
        }
        e.preventDefault();
        setIsConfigOpen(false);
        return;
      }
      if (e.key !== "c" && e.key !== "C") {
        return;
      }
      if (e.repeat) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }
      if (isTextEntryElement(e.target)) {
        return;
      }
      e.preventDefault();
      setIsConfigOpen((open) => !open);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isConfigOpen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let cancelled = false;
    let frameNumber = 0;
    let stopLoop: (() => void) | null = null;

    const renderFrame = (): void => {
      if (cancelled) return;
      const realNowMs = Date.now();

      const data = derivedAppConfigRef.current.data;
      const demoActive = isDemoTimeActive(data);
      const wasDemoActive = prevDemoTimeActiveRef.current;

      const transportAction = demoTransportActionRef.current;
      demoTransportActionRef.current = null;

      if (transportAction === "reset" && demoActive) {
        demoPlaybackRef.current = applyDemoPlaybackReset(
          realNowMs,
          data,
          demoPlaybackRef.current,
        );
      } else if (transportAction === "resume" && demoActive) {
        demoPlaybackRef.current = applyDemoPlaybackResume(
          realNowMs,
          data,
          demoPlaybackRef.current,
        );
      }

      const { nowMs: effectiveNowMs, simulated, next: nextDemoState } =
        computeEffectiveRenderTimeMs(realNowMs, data, demoPlaybackRef.current);

      if (transportAction === "pause" && demoActive) {
        demoPlaybackRef.current = applyDemoPlaybackPause(
          effectiveNowMs,
          nextDemoState,
        );
      } else {
        demoPlaybackRef.current = nextDemoState;
      }

      if (demoActive !== wasDemoActive) {
        lastRenderClockMsRef.current = null;
        prevDemoTimeActiveRef.current = demoActive;
        if (!demoActive) {
          setDemoTransportPaused(false);
        }
      }

      if (transportAction !== null || demoActive !== wasDemoActive) {
        const p = demoActive && Boolean(demoPlaybackRef.current?.paused);
        setDemoTransportPaused((prev) => (prev === p ? prev : p));
      }

      const clockNowMs = demoActive ? effectiveNowMs : realNowMs;
      productInstantMsRef.current = clockNowMs;
      if (isConfigOpenRef.current) {
        setConfigPanelProductInstantMs((prev) => {
          if (calendarMonthUtc1To12FromUnixMs(prev) !== calendarMonthUtc1To12FromUnixMs(clockNowMs)) {
            return clockNowMs;
          }
          return prev;
        });
      }
      const deltaMs =
        lastRenderClockMsRef.current === null
          ? 0
          : Math.max(0, clockNowMs - lastRenderClockMsRef.current);
      lastRenderClockMsRef.current = clockNowMs;

      const emissive = derivedAppConfigRef.current.scene.illumination.emissiveNightLights;
      const scene = derivedAppConfigRef.current.scene;
      const catalogEntry = getEquirectBaseMapCatalogEntry(scene.baseMap.id);
      const effectivePresentation = resolveEffectiveBaseMapPresentation(catalogEntry, scene.baseMap);
      const substrate: SubstrateOverlayReadabilityFrameInputs = {
        presentation: {
          brightness: effectivePresentation.brightness,
          contrast: effectivePresentation.contrast,
          gamma: effectivePresentation.gamma,
          saturation: effectivePresentation.saturation,
        },
        catalogHint: catalogEntry.capabilities,
      };
      const overlayReadabilityFrame = computeOverlayReadabilityFrameFromTimeMs(
        clockNowMs,
        {
          mode: emissive.mode,
          presentationIntensity: emissive.presentation.intensity,
          presentationDriverExponent: emissive.presentation.driverExponent,
        },
        substrate,
        scene.overlayReadability.presentation,
      );
      const eclipsePresentation = solarEclipsePresentationFromScene(scene);
      const eclipseHorizonMs = derivedAppConfigRef.current.layers.solarEclipse
        ? forecastHorizonMsFromDays(eclipsePresentation.forecastHorizonDays)
        : 0;
      const eclipseFrame = resolveEclipseFrame(clockNowMs, { horizonMs: eclipseHorizonMs });
      const time = createTimeContext(clockNowMs, deltaMs, simulated, {
        overlayReadabilityFrame,
        eclipseFrame,
        dynamicDataLifecycle:
          dynamicLifecycleHostRef.current.attachForProductInstant(clockNowMs),
      });
      const viewport = createViewportFromCanvas(canvas);
      const registry = registryRef.current;
      registry.update(time);
      const layers = buildRenderableLayerStates(registry, time);
      frameNumber += 1;
      const frameCtx = {
        frameNumber,
        now: time.now,
        deltaMs: time.deltaMs,
      };
      const e4pres = referenceCityEclipsePresentationFromScene(scene);
      const observer = resolveReferenceCityObserverLocation(derivedAppConfigRef.current.displayTime);
      const circumstances =
        e4pres.detailsEnabled || e4pres.chromeStatusEnabled
          ? resolveReferenceCityEclipseCircumstances(eclipseFrame, observer)
          : null;
      const cityName =
        observer !== null
          ? (REFERENCE_CITIES.find((c) => c.id === observer.cityId)?.name ?? observer.cityId)
          : "";
      const eclipseStatusText = e4pres.chromeStatusEnabled
        ? formatReferenceCityEclipseChromeStatus(
            circumstances,
            cityName,
            resolveReferenceFrameCivilTimeZone(derivedAppConfigRef.current.displayTime),
            displayTimeModeFromTopBandTimeMode(derivedAppConfigRef.current.displayTime.topBandMode),
          )
        : null;
      const chromeState = buildDisplayChromeState({
        time,
        viewport,
        frame: frameCtx,
        displayTime: derivedAppConfigRef.current.displayTime,
        geography: derivedAppConfigRef.current.geography,
        displayChromeLayout: derivedAppConfigRef.current.displayChromeLayout,
        eclipseStatusText,
      });
      const input = buildSceneRenderInput({
        frame: frameCtx,
        viewport,
        layers,
        scene: { backgroundColor: "#1a1a1a" },
        topChromeReservedHeightPx: chromeState.topBand.height,
      });
      if (import.meta.env.DEV) {
        const extra = getVisualScenarioExtraOverlayLayer({
          utcMs: time.now,
          viewportWidthPx: input.sceneLayerViewportPx.width,
          viewportHeightPx: input.sceneLayerViewportPx.height,
          layers: input.layers,
        });
        if (extra) {
          input.layers.push(extra);
        }
      }
      backend.render(input);
      const ctx2d = canvas.getContext("2d");
      if (ctx2d) {
        renderDisplayChrome(ctx2d, chromeState, viewport);
      }
    };

    const backend = new CanvasRenderBackend(
      canvas,
      () => {
        if (!cancelled) renderFrame();
      },
      (src) => {
        addEquirectBaseMapImageLoadFailure(src);
      },
    );

    const onResize = (): void => {
      if (cancelled) return;
      const viewport = createViewportFromCanvas(canvas);
      backend.resize(viewport);
      renderFrame();
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            onResize();
          })
        : null;
    resizeObserver?.observe(canvas);

    void (async () => {
      const viewport = createViewportFromCanvas(canvas);
      await backend.initialize(viewport);
      if (cancelled) {
        backend.dispose();
        return;
      }
      stopLoop = runAnimationFrameLoop(renderFrame);
      window.addEventListener("resize", onResize);
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      stopLoop?.();
      window.removeEventListener("resize", onResize);
      backend.dispose();
      dynamicLifecycleHostRef.current.dispose();
    };
  }, []);

  return (
    <div className="app-shell">
      {import.meta.env.DEV && scenarioRuntime.kind === "applied" ? (
        <div
          className="visual-scenario-banner"
          data-visual-scenario={scenarioRuntime.id}
          data-visual-scenario-status="applied"
          role="status"
        >
          scenario: {scenarioRuntime.id} · {scenarioRuntime.startIsoUtc} · persistence isolated
        </div>
      ) : null}
      {import.meta.env.DEV && scenarioRuntime.kind === "unknown" ? (
        <div
          className="visual-scenario-banner visual-scenario-banner--error"
          data-visual-scenario-status="unknown"
          role="alert"
        >
          unknown scenario “{scenarioRuntime.requestedId}” — ordinary startup; the requested
          scenario was not applied
        </div>
      ) : null}
      <div className="app-main">
        <canvas ref={canvasRef} className="render-canvas" aria-hidden />
      </div>
      <button
        type="button"
        className="config-launcher"
        aria-label={
          isConfigOpen ? "Close configuration panel" : "Open configuration panel"
        }
        aria-expanded={isConfigOpen}
        aria-controls={CONFIG_PANEL_DOM_ID}
        onClick={() => {
          setIsConfigOpen((open) => !open);
        }}
      >
        Config
      </button>
      {isConfigOpen ? (
        <div
          className="config-overlay-host"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${CONFIG_PANEL_DOM_ID}-title`}
        >
          <ConfigShell
            panelDomId={CONFIG_PANEL_DOM_ID}
            workingV2Ref={workingV2Ref}
            updateConfig={updateConfig}
            productInstantMs={configPanelProductInstantMs}
            userPresetsUi={ALLOW_PHASE3_MUTATIONS ? userPresetsUi : undefined}
            demoTransport={{
              paused: demoTransportPaused,
              onPause: requestDemoPause,
              onResume: requestDemoResume,
              onReset: requestDemoReset,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
