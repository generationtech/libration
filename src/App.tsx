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
  eventPlaybackLiveLoop,
  eventPlaybackNavigatorForV2,
  eventPlaybackStructuralFingerprint,
  findFirstPlaybackEvent,
} from "./app/eventPlaybackRuntime";
import {
  eventPlaybackCanGoNext,
  eventPlaybackCanGoPrevious,
  eventPlaybackShouldDeactivate,
  inactiveEventPlaybackState,
  pauseEventPlaybackSequence,
  resetEventPlaybackCurrentEvent,
  resumeEventPlaybackSequence,
  skipEventPlaybackEvent,
  startEventPlaybackSequence,
  stepEventPlaybackSequence,
  stopEventPlaybackSequence,
  type EventPlaybackPhase,
  type EventPlaybackSequenceState,
} from "./core/eventPlayback/eventPlaybackSequence";
import type { EventPlaybackListedEvent } from "./app/eventPlaybackRuntime";
import type { EventPlaybackSessionUi } from "./components/config/EventPlaybackPanel";
import {
  attachVisualScenarioPreparedEquirect,
  attachVisualScenarioPreparedPointFeatures,
  attachVisualScenarioPreparedTracks,
  getVisualScenarioExtraOverlayLayer,
  getVisualScenarioRuntime,
  getDevCloudsSectorDebugTint,
  INACTIVE_VISUAL_SCENARIO_RUNTIME,
} from "./dev/visualScenarioRuntime";
import { ConfigShell } from "./components/config/ConfigShell";
import { EclipseInfoPanel } from "./components/eclipse/EclipseInfoPanel";
import { ALLOW_PHASE3_MUTATIONS } from "./components/config/phase3Flags";
import { getEquirectBaseMapCatalogEntry } from "./config/baseMapAssetResolve";
import { calendarMonthUtc1To12FromUnixMs } from "./config/baseMapMonthResolve";
import { resolveEffectiveBaseMapPresentation } from "./config/baseMapPresentation";
import {
  computeOverlayReadabilityFrameFromTimeMs,
  type SubstrateOverlayReadabilityFrameInputs,
} from "./core/overlayReadabilityFrame";
import { createTimeContext } from "./core/time";
import { isProductTimeLiveEnough } from "./core/liveProductTimePolicy";
import { resolveEclipseFrame } from "./core/eclipse/eclipseEventService";
import {
  eclipseInfoPresentationFromScene,
  earthquakePresentationFromScene,
  lunarEclipsePresentationFromScene,
  milkyWayPresentationFromScene,
  solarEclipsePresentationFromScene,
  referenceCityEclipsePresentationFromScene,
} from "./config/v2/sceneConfig";
import { forecastHorizonMsFromDays } from "./core/eclipse/solarEclipseAppearance";
import { buildEclipseEventInformation } from "./core/eclipse/eclipseEventInformation";
import {
  armDynamicLifecycleConsumers,
  createDynamicDataLifecycleHost,
  GLOBAL_CLOUDS_IR_SOURCE_ID,
  ISS_ORBITAL_TRACK_SOURCE_ID,
  USGS_EARTHQUAKES_SOURCE_ID,
  cloudsConfigStatusHint,
  earthquakeConfigStatusHint,
  issConfigStatusHint,
  issProvenanceFromPreparedTrack,
  originStampFromPreparedEquirect,
  originStampFromPreparedPointFeatures,
  resolveAuthoritativeIssCanonicalPosition,
  resolveCloudsProvenance,
  resolveEarthquakeProvenance,
  reviveDisposedDynamicLifecycleHost,
  type CloudsConfigStatusHint,
  type CloudsProvenance,
  type EarthquakeConfigStatusHint,
  type EarthquakeProvenance,
  type IssConfigStatusHint,
} from "./lifecycle";
import { milkyWayViewingConditionsAt } from "./core/milkyWayViewingWindows";
import { collectProductEventNotices } from "./core/collectProductEventNotices";
import { resolveReferenceCityObserverLocation } from "./core/referenceCityObserver";
import { resolveReferenceCityEclipseCircumstances } from "./core/eclipse/referenceCityEclipseCircumstances";
import { resolveReferenceFrameCivilTimeZone } from "./core/displayTimeReference";
import { displayTimeModeFromTopBandTimeMode } from "./core/displayTimeMode";
import { REFERENCE_CITIES } from "./data/referenceCities";
import { CanvasRenderBackend } from "./renderer/canvasRenderBackend";
import { buildRenderableLayerStates } from "./renderer/layerInputAdapter";
import {
  canvasClientPointToSceneCss,
  sceneLayerViewportRectPx,
} from "./renderer/sceneViewportLayout";
import type { SceneLayerViewportPx } from "./renderer/types";
import {
  IDENTITY_SCENE_CAMERA,
  SCENE_CAMERA_PAN_DRAG_THRESHOLD_PX,
  applyAutomaticSceneCoverScale,
  defaultSceneCameraForCover,
  isSceneCameraAtFrameDefault,
  panSceneCameraBySceneDelta,
  sceneCameraCoverPolicyAfterFrameKindChange,
  sceneCameraCoverPolicyAfterManualZoom,
  sceneCameraFromWheelDelta,
  sceneCameraVerticalExtentFromFrame,
  wheelDeltaYToPixels,
  zoomSceneCameraAboutScenePoint,
  type SceneCamera,
  type SceneCameraCoverPolicy,
} from "./core/sceneCamera";
import { runtimeIdForDynamicPointFeaturesSceneLayer } from "./layers/dynamicPointFeaturesOverlayLayer";
import { isDynamicPointFeaturesPayload } from "./layers/dynamicPointFeaturesPayload";
import { applyEarthquakePointerHoverToPayload } from "./layers/earthquakeHoverAnnotation";
import { addEquirectBaseMapImageLoadFailure } from "./layers/baseMapEquirectImageExclusions";
import {
  EARTH_FIXED_SCENE_REFERENCE_FRAME,
  type SceneReferenceFrame,
} from "./core/sceneReferenceFrame";
import {
  nextAnchorContinuousLonDeg,
  sceneCameraAfterReferenceFrameKindChange,
} from "./core/sceneFrameAnchor";
import {
  DEFAULT_TRACKING_SELECTION,
  applyTrackingTargetAvailability,
  isTrackingModeActive,
  isTrackingSelectionPositionLocked,
  parseTrackingModeSelectValue,
  parseTrackingTargetSelectValue,
  sceneReferenceFrameFromTrackingSelection,
  setTrackingMode,
  setTrackingTarget,
  trackingSelectionTransition,
  trackingTargetSelectValue,
  type TrackingSelectionState,
} from "./core/trackingSelection";
import {
  resolveTrackableMapObject,
  trackableMapObjectAuthoritativeStateAt,
} from "./core/trackableMapObject";
import "./App.css";

const CONFIG_PANEL_DOM_ID = "libration-config-shell";

/**
 * DEV Clouds diagnostics are installed before `createRoot`. React StrictMode
 * disposes the canvas-effect host on remount; revive must re-pass the tint or
 * `?cloudsSectorDebug=` composites silently fall back to production appearance.
 */
function devCloudsSectorDebugHostDeps(): {
  tintCloudsComposite?: NonNullable<
    ReturnType<typeof getDevCloudsSectorDebugTint>
  >;
} {
  if (!import.meta.env.DEV) return {};
  const tint = getDevCloudsSectorDebugTint();
  return tint !== null ? { tintCloudsComposite: tint } : {};
}

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

function extraStatusLines(
  event: EventPlaybackListedEvent | null | undefined,
  productUtcMs: number,
  observer: ReturnType<typeof resolveReferenceCityObserverLocation>,
): string[] {
  if (!event?.milkyWay) {
    return [];
  }
  const lines: string[] = [event.milkyWay.cityName];
  lines.push(`Peak GC altitude ${event.milkyWay.peakAltitudeDeg.toFixed(1)}°`);
  if (
    observer &&
    productUtcMs >= event.milkyWay.startUtcMs &&
    productUtcMs < event.milkyWay.endUtcMs
  ) {
    const instant = milkyWayViewingConditionsAt(productUtcMs, observer);
    if (instant?.qualifies) {
      lines.push("Active viewing window");
    }
  }
  return lines;
}

function tourViewFromState(
  state: EventPlaybackSequenceState<EventPlaybackListedEvent>,
  productUtcMs: number,
  observer: ReturnType<typeof resolveReferenceCityObserverLocation>,
  emptyMessage: string | null,
): {
  phase: EventPlaybackPhase;
  currentIndex: number;
  eventCount: number | null;
  currentTitle: string | null;
  currentDateLabel: string | null;
  extraStatusLines: readonly string[];
  emptyMessage: string | null;
} {
  const event = state.current;
  return {
    phase: state.phase,
    currentIndex: state.index,
    eventCount: null,
    currentTitle: event?.title ?? null,
    currentDateLabel: event?.dateLabel ?? null,
    extraStatusLines: extraStatusLines(event, productUtcMs, observer),
    emptyMessage: state.phase === "inactive" ? emptyMessage : null,
  };
}

export default function App() {
  const scenarioRuntime = import.meta.env.DEV
    ? getVisualScenarioRuntime()
    : INACTIVE_VISUAL_SCENARIO_RUNTIME;
  const [configViewTick, bumpConfigView] = useReducer((n: number) => n + 1, 0);
  const [userPresetsEpoch, setUserPresetsEpoch] = useState(0);
  const bumpUserPresets = useCallback(() => setUserPresetsEpoch((n) => n + 1), []);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const isConfigOpenRef = useRef(false);
  const productInstantMsRef = useRef(Date.now());
  const [configPanelProductInstantMs, setConfigPanelProductInstantMs] = useState(
    () => Date.now(),
  );
  const liveProductTimeEligibleRef = useRef(true);
  const [liveProductTimeEligible, setLiveProductTimeEligible] = useState(() => {
    if (scenarioRuntime.kind === "applied") {
      return isProductTimeLiveEnough(
        Date.parse(scenarioRuntime.startIsoUtc),
        Date.now(),
      );
    }
    return true;
  });
  liveProductTimeEligibleRef.current = liveProductTimeEligible;
  const issConfigStatusHintRef = useRef<IssConfigStatusHint | null>(null);
  const [issTrackStatusHint, setIssTrackStatusHint] =
    useState<IssConfigStatusHint | null>(null);
  const earthquakeConfigStatusHintRef = useRef<EarthquakeConfigStatusHint | null>(
    null,
  );
  const earthquakeProvenanceRef = useRef<EarthquakeProvenance | null>(null);
  const [earthquakeTrackStatusHint, setEarthquakeTrackStatusHint] =
    useState<EarthquakeConfigStatusHint | null>(null);
  const [earthquakeProvenanceView, setEarthquakeProvenanceView] =
    useState<EarthquakeProvenance | null>(null);
  const cloudsConfigStatusHintRef = useRef<CloudsConfigStatusHint | null>(null);
  const cloudsProvenanceRef = useRef<CloudsProvenance | null>(null);
  const [cloudsTrackStatusHint, setCloudsTrackStatusHint] =
    useState<CloudsConfigStatusHint | null>(null);
  const [cloudsProvenanceView, setCloudsProvenanceView] =
    useState<CloudsProvenance | null>(null);
  const [eclipsePanelInstantMs, setEclipsePanelInstantMs] = useState(() =>
    scenarioRuntime.kind === "applied"
      ? Date.parse(scenarioRuntime.startIsoUtc)
      : Date.now(),
  );
  const lastEclipsePanelPushRef = useRef(0);
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
  const earthquakePointerSceneCssRef = useRef<{ x: number; y: number } | null>(
    null,
  );
  const sceneCameraRef = useRef<SceneCamera>(IDENTITY_SCENE_CAMERA);
  const sceneCameraCoverPolicyRef = useRef<SceneCameraCoverPolicy>("off");
  const sceneCameraPanActiveRef = useRef(false);
  const [cameraIsAtDefault, setCameraIsAtDefault] = useState(true);
  const trackingSelectionRef = useRef<TrackingSelectionState>(DEFAULT_TRACKING_SELECTION);
  const [trackingSelection, setTrackingSelection] = useState<TrackingSelectionState>(
    DEFAULT_TRACKING_SELECTION,
  );
  const [issTrackingAvailable, setIssTrackingAvailable] = useState(false);
  const issTrackingAvailableRef = useRef(false);
  const anchorContinuousLonRef = useRef<number | null>(null);
  const sceneReferenceFrameRef = useRef<SceneReferenceFrame>(
    EARTH_FIXED_SCENE_REFERENCE_FRAME,
  );
  const scenePointerLayoutRef = useRef<{
    canvasCssWidth: number;
    canvasCssHeight: number;
    scene: SceneLayerViewportPx;
  } | null>(null);
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
  /** Phase 10 shell seam: store/manager/resolver/acquisition for live overlays. */
  const dynamicLifecycleHostRef = useRef(
    createDynamicDataLifecycleHost(devCloudsSectorDebugHostDeps()),
  );

  const commitTrackingSelection = (next: TrackingSelectionState): void => {
    const transition = trackingSelectionTransition(trackingSelectionRef.current, next);
    if (!transition.selectionChanged) {
      return;
    }
    if (transition.reinitializeContinuity) {
      anchorContinuousLonRef.current = null;
    }
    if (transition.reinitializeCamera) {
      sceneCameraCoverPolicyRef.current = sceneCameraCoverPolicyAfterFrameKindChange(
        isTrackingSelectionPositionLocked(next),
      );
      sceneCameraRef.current = sceneCameraAfterReferenceFrameKindChange();
      setCameraIsAtDefault(true);
    }
    trackingSelectionRef.current = next;
    setTrackingSelection(next);
  };

  const requestDemoPause = useCallback(() => {
    demoTransportActionRef.current = "pause";
  }, []);
  const requestDemoResume = useCallback(() => {
    demoTransportActionRef.current = "resume";
  }, []);
  const requestDemoReset = useCallback(() => {
    demoTransportActionRef.current = "reset";
  }, []);

  const eventPlaybackStateRef = useRef(
    inactiveEventPlaybackState<EventPlaybackListedEvent>(),
  );
  const pendingTourJumpRef = useRef<{ iso: string; pause: boolean } | null>(null);
  const eventPlaybackEmptyMessageRef = useRef<string | null>(null);
  const [eventPlaybackView, setEventPlaybackView] = useState(() =>
    tourViewFromState(inactiveEventPlaybackState<EventPlaybackListedEvent>(), Date.now(), null, null),
  );

  const publishEventPlaybackView = useCallback(
    (state: EventPlaybackSequenceState<EventPlaybackListedEvent>) => {
      const observer = workingV2Ref.current
        ? resolveReferenceCityObserverLocation(workingV2Ref.current.chrome.displayTime)
        : null;
      const next = tourViewFromState(
        state,
        productInstantMsRef.current,
        observer,
        eventPlaybackEmptyMessageRef.current,
      );
      setEventPlaybackView((prev) =>
        prev.phase === next.phase &&
        prev.currentIndex === next.currentIndex &&
        prev.eventCount === next.eventCount &&
        prev.currentTitle === next.currentTitle &&
        prev.currentDateLabel === next.currentDateLabel &&
        prev.emptyMessage === next.emptyMessage &&
        prev.extraStatusLines.join("\n") === next.extraStatusLines.join("\n")
          ? prev
          : next,
      );
    },
    [],
  );

  const storage = getLocalStorageIfAvailable();
  const userPresetsList = useMemo(
    () => loadUserPresets(storage),
    [storage, userPresetsEpoch],
  );

  /** Phase 10 / DLC: arm acquisition from config commits — never from rAF paint. */
  const syncDynamicLifecycleConsumers = useCallback(() => {
    const host = reviveDisposedDynamicLifecycleHost(
      dynamicLifecycleHostRef.current,
      devCloudsSectorDebugHostDeps(),
    );
    dynamicLifecycleHostRef.current = host;
    armDynamicLifecycleConsumers(host, {
      cloudsIrOverlay: derivedAppConfigRef.current.layers.globalCloudsIr,
      cloudParticipationOn: false,
      earthquakes: derivedAppConfigRef.current.layers.earthquakes,
      orbitalTracks: derivedAppConfigRef.current.layers.orbitalTracks,
      productTimeLiveEnough: liveProductTimeEligibleRef.current,
    });
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

  const applyTourOwnedDemoStart = useCallback(
    (iso: string) => {
      updateConfig((draft) => {
        draft.data.mode = "demo";
        draft.data.demoTime.enabled = true;
        draft.data.demoTime.startIsoUtc = iso;
      });
    },
    [updateConfig],
  );

  const handleEventPlaybackStart = useCallback(() => {
    const current = eventPlaybackStateRef.current;
    if (current.phase === "paused") {
      eventPlaybackStateRef.current = resumeEventPlaybackSequence(current);
      requestDemoResume();
      publishEventPlaybackView(eventPlaybackStateRef.current);
      return;
    }
    const v2 = workingV2Ref.current;
    const first = findFirstPlaybackEvent(v2);
    const navigator = eventPlaybackNavigatorForV2(v2);
    const key = eventPlaybackStructuralFingerprint(v2);
    if (!first || !navigator) {
      eventPlaybackEmptyMessageRef.current = "No matching events";
      eventPlaybackStateRef.current = stopEventPlaybackSequence(eventPlaybackStateRef.current);
      publishEventPlaybackView(eventPlaybackStateRef.current);
      return;
    }
    eventPlaybackEmptyMessageRef.current = null;
    const started = startEventPlaybackSequence(first, eventPlaybackLiveLoop(v2), key, navigator);
    eventPlaybackStateRef.current = started.state;
    if (started.jumpToIsoUtc) {
      applyTourOwnedDemoStart(started.jumpToIsoUtc);
    }
    requestDemoResume();
    publishEventPlaybackView(started.state);
  }, [applyTourOwnedDemoStart, publishEventPlaybackView, requestDemoResume]);

  const handleEventPlaybackPause = useCallback(() => {
    eventPlaybackStateRef.current = pauseEventPlaybackSequence(eventPlaybackStateRef.current);
    requestDemoPause();
    publishEventPlaybackView(eventPlaybackStateRef.current);
  }, [publishEventPlaybackView, requestDemoPause]);

  const handleEventPlaybackReset = useCallback(() => {
    const result = resetEventPlaybackCurrentEvent(eventPlaybackStateRef.current);
    eventPlaybackStateRef.current = result.state;
    if (result.jumpToIsoUtc) {
      applyTourOwnedDemoStart(result.jumpToIsoUtc);
      requestDemoReset();
    }
    publishEventPlaybackView(result.state);
  }, [applyTourOwnedDemoStart, publishEventPlaybackView, requestDemoReset]);

  const handleEventPlaybackStop = useCallback(() => {
    eventPlaybackStateRef.current = stopEventPlaybackSequence(eventPlaybackStateRef.current);
    requestDemoPause();
    publishEventPlaybackView(eventPlaybackStateRef.current);
  }, [publishEventPlaybackView, requestDemoPause]);

  const handleEventPlaybackSkip = useCallback(
    (delta: number) => {
      const v2 = workingV2Ref.current;
      const navigator = eventPlaybackNavigatorForV2(v2);
      if (!navigator) {
        return;
      }
      const result = skipEventPlaybackEvent(eventPlaybackStateRef.current, delta, navigator);
      eventPlaybackStateRef.current = result.state;
      if (result.jumpToIsoUtc) {
        applyTourOwnedDemoStart(result.jumpToIsoUtc);
        if (result.state.phase === "playing") {
          requestDemoResume();
        }
      }
      publishEventPlaybackView(result.state);
    },
    [applyTourOwnedDemoStart, publishEventPlaybackView, requestDemoResume],
  );

  const handleEventPlaybackDeactivate = useCallback(() => {
    eventPlaybackStateRef.current = stopEventPlaybackSequence(eventPlaybackStateRef.current);
    publishEventPlaybackView(eventPlaybackStateRef.current);
  }, [publishEventPlaybackView]);

  const eventPlaybackSession = useMemo<EventPlaybackSessionUi>(
    () => ({
      phase: eventPlaybackView.phase,
      currentIndex: eventPlaybackView.currentIndex,
      eventCount: eventPlaybackView.eventCount,
      currentTitle: eventPlaybackView.currentTitle,
      currentDateLabel: eventPlaybackView.currentDateLabel,
      extraStatusLines: eventPlaybackView.extraStatusLines,
      emptyMessage: eventPlaybackView.emptyMessage,
      canGoPrevious: eventPlaybackCanGoPrevious(eventPlaybackStateRef.current),
      canGoNext: eventPlaybackCanGoNext(eventPlaybackStateRef.current),
      onStart: handleEventPlaybackStart,
      onPause: handleEventPlaybackPause,
      onReset: handleEventPlaybackReset,
      onStop: handleEventPlaybackStop,
      onPrevious: () => handleEventPlaybackSkip(-1),
      onNext: () => handleEventPlaybackSkip(1),
      onDeactivate: handleEventPlaybackDeactivate,
    }),
    [
      eventPlaybackView,
      handleEventPlaybackDeactivate,
      handleEventPlaybackPause,
      handleEventPlaybackReset,
      handleEventPlaybackSkip,
      handleEventPlaybackStart,
      handleEventPlaybackStop,
    ],
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
    // Startup and live-enough flips: honor persisted enablement without waiting
    // for a Layers toggle. Acquisition stays off the rAF paint path.
    syncDynamicLifecycleConsumers();
  }, [liveProductTimeEligible, syncDynamicLifecycleConsumers]);

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

    // StrictMode remounts this effect and disposes the host on cleanup.
    // Revive + re-arm from current config so later Layer toggles are not no-ops.
    syncDynamicLifecycleConsumers();

    let cancelled = false;
    let frameNumber = 0;
    let stopLoop: (() => void) | null = null;

    const renderFrame = (): void => {
      if (cancelled) return;
      const realNowMs = Date.now();

      const pendingJump = pendingTourJumpRef.current;
      if (pendingJump) {
        pendingTourJumpRef.current = null;
        commitWorkingV2Update(
          workingV2Ref,
          derivedAppConfigRef,
          registryRef,
          (draft) => {
            draft.data.mode = "demo";
            draft.data.demoTime.enabled = true;
            draft.data.demoTime.startIsoUtc = pendingJump.iso;
          },
        );
        bumpConfigView();
        if (pendingJump.pause) {
          demoTransportActionRef.current = "pause";
        }
      }

      let data = derivedAppConfigRef.current.data;
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

      let { nowMs: effectiveNowMs, simulated, next: nextDemoState } =
        computeEffectiveRenderTimeMs(realNowMs, data, demoPlaybackRef.current);

      if (transportAction === "pause" && demoActive) {
        demoPlaybackRef.current = applyDemoPlaybackPause(
          effectiveNowMs,
          nextDemoState,
        );
      } else {
        demoPlaybackRef.current = nextDemoState;
      }

      let tourState = eventPlaybackStateRef.current;
      if (tourState.phase !== "inactive") {
        const fingerprint = eventPlaybackStructuralFingerprint(workingV2Ref.current);
        if (
          eventPlaybackShouldDeactivate(
            tourState,
            demoActive,
            data.demoTime.startIsoUtc,
            fingerprint,
          )
        ) {
          tourState = stopEventPlaybackSequence(tourState);
          eventPlaybackStateRef.current = tourState;
          publishEventPlaybackView(tourState);
        } else {
          if (transportAction === "pause") {
            tourState = pauseEventPlaybackSequence(tourState);
          } else if (transportAction === "resume") {
            tourState = resumeEventPlaybackSequence(tourState);
          }
          const liveLoop = eventPlaybackLiveLoop(workingV2Ref.current);
          if (tourState.loop !== liveLoop) {
            tourState = { ...tourState, loop: liveLoop };
          }
          if (tourState.phase === "playing") {
            const navigator = eventPlaybackNavigatorForV2(workingV2Ref.current);
            if (navigator) {
              const step = stepEventPlaybackSequence(tourState, effectiveNowMs, navigator);
              tourState = step.state;
              if (step.jumpToIsoUtc) {
                commitWorkingV2Update(
                  workingV2Ref,
                  derivedAppConfigRef,
                  registryRef,
                  (draft) => {
                    draft.data.mode = "demo";
                    draft.data.demoTime.enabled = true;
                    draft.data.demoTime.startIsoUtc = step.jumpToIsoUtc!;
                  },
                );
                bumpConfigView();
                data = derivedAppConfigRef.current.data;
                const recomputed = computeEffectiveRenderTimeMs(
                  realNowMs,
                  data,
                  demoPlaybackRef.current,
                );
                effectiveNowMs = recomputed.nowMs;
                simulated = recomputed.simulated;
                nextDemoState = recomputed.next;
                demoPlaybackRef.current = nextDemoState;
              }
              if (step.pause) {
                demoPlaybackRef.current = applyDemoPlaybackPause(
                  effectiveNowMs,
                  demoPlaybackRef.current,
                );
              }
            }
          }
          eventPlaybackStateRef.current = tourState;
          publishEventPlaybackView(tourState);
        }
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
      const liveEnough = isProductTimeLiveEnough(clockNowMs, realNowMs);
      if (liveEnough !== liveProductTimeEligibleRef.current) {
        liveProductTimeEligibleRef.current = liveEnough;
        setLiveProductTimeEligible(liveEnough);
      }
      if (Math.abs(clockNowMs - lastEclipsePanelPushRef.current) >= 400) {
        lastEclipsePanelPushRef.current = clockNowMs;
        setEclipsePanelInstantMs(clockNowMs);
      }
      if (isConfigOpenRef.current) {
        setConfigPanelProductInstantMs((prev) => {
          if (calendarMonthUtc1To12FromUnixMs(prev) !== calendarMonthUtc1To12FromUnixMs(clockNowMs)) {
            return clockNowMs;
          }
          if (Math.abs(clockNowMs - prev) >= 1000) {
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
      const lunarPresentation = lunarEclipsePresentationFromScene(scene);
      const eclipseHorizonMs = derivedAppConfigRef.current.layers.solarEclipse
        ? forecastHorizonMsFromDays(eclipsePresentation.forecastHorizonDays)
        : 0;
      const lunarHorizonMs = derivedAppConfigRef.current.layers.lunarEclipse
        ? forecastHorizonMsFromDays(lunarPresentation.forecastHorizonDays)
        : 0;
      const eclipseFrame = resolveEclipseFrame(clockNowMs, {
        horizonMs: eclipseHorizonMs,
        lunarHorizonMs,
      });
      const time = createTimeContext(clockNowMs, deltaMs, simulated, {
        overlayReadabilityFrame,
        eclipseFrame,
        dynamicDataLifecycle: attachVisualScenarioPreparedEquirect(
          attachVisualScenarioPreparedPointFeatures(
            attachVisualScenarioPreparedTracks(
              dynamicLifecycleHostRef.current.attachForProductInstant(clockNowMs, {
                wallClockUtcMs: realNowMs,
              }),
            ),
          ),
        ),
      });
      const issAttachment = time.dynamicDataLifecycle;
      const issView = issAttachment?.getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID) ?? null;
      const issLife =
        issAttachment?.getLifecycleState(ISS_ORBITAL_TRACK_SOURCE_ID).state ??
        "idle";
      const issPosition = resolveAuthoritativeIssCanonicalPosition({
        preparedTracks: issView,
        lifecycleState: issLife,
        productUtcMs: time.now,
      });
      const issAvailable = issPosition !== null;
      if (issAvailable !== issTrackingAvailableRef.current) {
        issTrackingAvailableRef.current = issAvailable;
        setIssTrackingAvailable(issAvailable);
      }
      const available = { moon: true, sun: true, iss: issAvailable } as const;
      commitTrackingSelection(
        applyTrackingTargetAvailability(trackingSelectionRef.current, available),
      );
      const selection = trackingSelectionRef.current;
      const target = selection.target;
      if (target !== null) {
        const position = resolveTrackableMapObject(
          target,
          trackableMapObjectAuthoritativeStateAt(time.now, issPosition),
        );
        if (position === null) {
          anchorContinuousLonRef.current = null;
          sceneReferenceFrameRef.current = EARTH_FIXED_SCENE_REFERENCE_FRAME;
        } else {
          const continuous = nextAnchorContinuousLonDeg({
            previousContinuousLonDeg: anchorContinuousLonRef.current,
            nextCanonicalLonDeg: position.lonDeg,
            policy: "follow",
          });
          anchorContinuousLonRef.current = continuous;
          sceneReferenceFrameRef.current = sceneReferenceFrameFromTrackingSelection(
            selection,
            continuous,
            position.latDeg,
          );
        }
      } else {
        anchorContinuousLonRef.current = null;
        sceneReferenceFrameRef.current = EARTH_FIXED_SCENE_REFERENCE_FRAME;
      }
      if (
        sceneCameraCoverPolicyRef.current === "auto" &&
        !sceneCameraPanActiveRef.current
      ) {
        sceneCameraRef.current = applyAutomaticSceneCoverScale(
          sceneCameraRef.current,
          sceneCameraVerticalExtentFromFrame(sceneReferenceFrameRef.current),
        );
      }
      const nextIssHint = issConfigStatusHint({
        enabled: derivedAppConfigRef.current.layers.orbitalTracks,
        productTimeLiveEnough: liveEnough,
        lifecycleState: issLife,
        provenance:
          issView === null
            ? null
            : issProvenanceFromPreparedTrack({
                tracks: issView.tracks,
                acquiredAtMs: issView.validTimeMs,
                productUtcMs: clockNowMs,
                lifecycleState: issLife,
              }),
      });
      if (nextIssHint !== issConfigStatusHintRef.current) {
        issConfigStatusHintRef.current = nextIssHint;
        setIssTrackStatusHint(nextIssHint);
      }
      const eqView =
        issAttachment?.getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID) ??
        null;
      const eqLife =
        issAttachment?.getLifecycleState(USGS_EARTHQUAKES_SOURCE_ID).state ??
        "idle";
      const nextEqProvenance =
        eqView === null
          ? null
          : resolveEarthquakeProvenance({
              originStamp: originStampFromPreparedPointFeatures(eqView),
              acquiredAtMs: eqView.acquiredAtMs,
              productUtcMs: clockNowMs,
              lifecycleState: eqLife,
              versionId: eqView.versionId,
            });
      const nextEqHint = earthquakeConfigStatusHint({
        enabled: derivedAppConfigRef.current.layers.earthquakes,
        productTimeLiveEnough: liveEnough,
        lifecycleState: eqLife,
        provenance: nextEqProvenance,
      });
      if (nextEqHint !== earthquakeConfigStatusHintRef.current) {
        earthquakeConfigStatusHintRef.current = nextEqHint;
        setEarthquakeTrackStatusHint(nextEqHint);
      }
      const prevEqProv = earthquakeProvenanceRef.current;
      const provenanceChanged =
        (prevEqProv === null) !== (nextEqProvenance === null) ||
        prevEqProv?.origin !== nextEqProvenance?.origin ||
        prevEqProv?.snapshotAgeMs !== nextEqProvenance?.snapshotAgeMs ||
        prevEqProv?.freshnessBand !== nextEqProvenance?.freshnessBand ||
        prevEqProv?.versionId !== nextEqProvenance?.versionId;
      if (provenanceChanged) {
        earthquakeProvenanceRef.current = nextEqProvenance;
        setEarthquakeProvenanceView(nextEqProvenance);
      }
      const cloudsView =
        issAttachment?.getPreparedEquirectRaster(GLOBAL_CLOUDS_IR_SOURCE_ID) ??
        null;
      const cloudsLife =
        issAttachment?.getLifecycleState(GLOBAL_CLOUDS_IR_SOURCE_ID).state ??
        "idle";
      const nextCloudsProvenance =
        cloudsView === null
          ? null
          : resolveCloudsProvenance({
              originStamp: originStampFromPreparedEquirect(cloudsView),
              acquiredAtMs: cloudsView.acquiredAtMs,
              validTimeMs: cloudsView.validTimeMs,
              productUtcMs: clockNowMs,
              lifecycleState: cloudsLife,
              versionId: cloudsView.versionId,
              ...(cloudsView.coverageKind !== undefined
                ? { coverageKind: cloudsView.coverageKind }
                : {}),
              ...(cloudsView.cloudProviderKind !== undefined
                ? { providerKind: cloudsView.cloudProviderKind }
                : {}),
              ...(cloudsView.cloudComposite !== undefined
                ? { cloudComposite: cloudsView.cloudComposite }
                : {}),
            });
      const nextCloudsHint = cloudsConfigStatusHint({
        enabled: derivedAppConfigRef.current.layers.globalCloudsIr,
        productTimeLiveEnough: liveEnough,
        lifecycleState: cloudsLife,
        provenance: nextCloudsProvenance,
      });
      if (nextCloudsHint !== cloudsConfigStatusHintRef.current) {
        cloudsConfigStatusHintRef.current = nextCloudsHint;
        setCloudsTrackStatusHint(nextCloudsHint);
      }
      const prevCloudsProv = cloudsProvenanceRef.current;
      const cloudsProvenanceChanged =
        (prevCloudsProv === null) !== (nextCloudsProvenance === null) ||
        prevCloudsProv?.origin !== nextCloudsProvenance?.origin ||
        prevCloudsProv?.observationAgeMs !== nextCloudsProvenance?.observationAgeMs ||
        prevCloudsProv?.freshnessBand !== nextCloudsProvenance?.freshnessBand ||
        prevCloudsProv?.coverageKind !== nextCloudsProvenance?.coverageKind ||
        prevCloudsProv?.providerKind !== nextCloudsProvenance?.providerKind ||
        prevCloudsProv?.versionId !== nextCloudsProvenance?.versionId ||
        prevCloudsProv?.newestObservationTimeMs !==
          nextCloudsProvenance?.newestObservationTimeMs ||
        prevCloudsProv?.oldestObservationTimeMs !==
          nextCloudsProvenance?.oldestObservationTimeMs;
      if (cloudsProvenanceChanged) {
        cloudsProvenanceRef.current = nextCloudsProvenance;
        setCloudsProvenanceView(nextCloudsProvenance);
      }
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
      const eclipseInfoPres = eclipseInfoPresentationFromScene(scene);
      const solarPres = eclipsePresentation;
      const lunarPres = lunarPresentation;
      const observer = resolveReferenceCityObserverLocation(derivedAppConfigRef.current.displayTime);
      const circumstances =
        e4pres.detailsEnabled || e4pres.chromeStatusEnabled
          ? resolveReferenceCityEclipseCircumstances(eclipseFrame, observer)
          : null;
      const cityName =
        observer !== null
          ? (REFERENCE_CITIES.find((c) => c.id === observer.cityId)?.name ?? observer.cityId)
          : "";
      const eventInfo = buildEclipseEventInformation({
        frame: eclipseFrame,
        solarEnabled: derivedAppConfigRef.current.layers.solarEclipse,
        lunarEnabled: derivedAppConfigRef.current.layers.lunarEclipse,
        solar: solarPres,
        lunar: lunarPres,
        info: eclipseInfoPres,
        circumstances,
        cityName,
      });
      const noticeStack = collectProductEventNotices({
        eclipseInput: {
          frame: eclipseFrame,
          solarEnabled: derivedAppConfigRef.current.layers.solarEclipse,
          lunarEnabled: derivedAppConfigRef.current.layers.lunarEclipse,
          solar: solarPres,
          lunar: lunarPres,
          circumstances,
          cityName,
        },
        chromeStatusEnabled: e4pres.chromeStatusEnabled,
        eclipseUnsupported: eventInfo.unsupported,
        timeZone: resolveReferenceFrameCivilTimeZone(derivedAppConfigRef.current.displayTime),
        displayTimeMode: displayTimeModeFromTopBandTimeMode(
          derivedAppConfigRef.current.displayTime.topBandMode,
        ),
        milkyWayPresentation: milkyWayPresentationFromScene(scene),
        milkyWayObserver: observer,
        productUtcMs: time.now,
      });
      const eventNoticeTexts = [
        ...noticeStack.visible.map((n) => n.text),
        ...(noticeStack.overflowText ? [noticeStack.overflowText] : []),
      ];
      const chromeState = buildDisplayChromeState({
        time,
        viewport,
        frame: frameCtx,
        displayTime: derivedAppConfigRef.current.displayTime,
        geography: derivedAppConfigRef.current.geography,
        displayChromeLayout: derivedAppConfigRef.current.displayChromeLayout,
        eventNoticeTexts,
      });
      const sceneRect = sceneLayerViewportRectPx(
        viewport,
        chromeState.topBand.height,
      );
      scenePointerLayoutRef.current = {
        canvasCssWidth: viewport.width,
        canvasCssHeight: viewport.height,
        scene: sceneRect,
      };
      const eqLayerId = runtimeIdForDynamicPointFeaturesSceneLayer("earthquakes");
      const showLabelOnHover =
        derivedAppConfigRef.current.layers.earthquakes &&
        earthquakePresentationFromScene(scene).showLabelOnHover;
      const layersForRender = layers.map((layer) => {
        if (
          layer.id !== eqLayerId ||
          !isDynamicPointFeaturesPayload(layer.data)
        ) {
          return layer;
        }
        const next = applyEarthquakePointerHoverToPayload(layer.data, {
          pointerSceneCss: earthquakePointerSceneCssRef.current,
          viewportWidthPx: sceneRect.width,
          viewportHeightPx: sceneRect.height,
          showLabelOnHover,
          camera: sceneCameraRef.current,
          sceneReferenceFrame: sceneReferenceFrameRef.current,
        });
        return next === layer.data ? layer : { ...layer, data: next };
      });
      const input = buildSceneRenderInput({
        frame: frameCtx,
        viewport,
        layers: layersForRender,
        scene: { backgroundColor: "#1a1a1a" },
        topChromeReservedHeightPx: chromeState.topBand.height,
        sceneCamera: sceneCameraRef.current,
        sceneReferenceFrame: sceneReferenceFrameRef.current,
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

    const scenePointFromClient = (
      event: PointerEvent,
      options?: { allowOutsideScene?: boolean },
    ): { x: number; y: number } | null => {
      const layout = scenePointerLayoutRef.current;
      if (layout === null) {
        return null;
      }
      const args = {
        clientX: event.clientX,
        clientY: event.clientY,
        canvasRect: canvas.getBoundingClientRect(),
        canvasCssWidth: layout.canvasCssWidth,
        canvasCssHeight: layout.canvasCssHeight,
        sceneLayerViewportPx: layout.scene,
      };
      const clamped = canvasClientPointToSceneCss(args);
      if (clamped !== null || options?.allowOutsideScene !== true) {
        return clamped;
      }
      const { canvasRect, canvasCssWidth, canvasCssHeight, sceneLayerViewportPx } = args;
      if (
        !(canvasRect.width > 0) ||
        !(canvasRect.height > 0) ||
        !(canvasCssWidth > 0) ||
        !(canvasCssHeight > 0) ||
        !(sceneLayerViewportPx.width > 0) ||
        !(sceneLayerViewportPx.height > 0)
      ) {
        return null;
      }
      const canvasX =
        ((event.clientX - canvasRect.left) / canvasRect.width) * canvasCssWidth;
      const canvasY =
        ((event.clientY - canvasRect.top) / canvasRect.height) * canvasCssHeight;
      return {
        x: canvasX - sceneLayerViewportPx.x,
        y: canvasY - sceneLayerViewportPx.y,
      };
    };

    const setCanvasCursor = (scenePt: { x: number; y: number } | null, grabbing: boolean): void => {
      if (grabbing) {
        canvas.classList.add("is-panning");
        canvas.style.cursor = "grabbing";
        return;
      }
      canvas.classList.remove("is-panning");
      canvas.style.cursor = scenePt !== null ? "grab" : "";
    };

    type PanDragSession = {
      pointerId: number;
      startSceneX: number;
      startSceneY: number;
      origin: SceneCamera;
      active: boolean;
    };
    let panDrag: PanDragSession | null = null;

    const endPanDrag = (event: PointerEvent): void => {
      if (panDrag === null || event.pointerId !== panDrag.pointerId) {
        return;
      }
      const wasActive = panDrag.active;
      panDrag = null;
      sceneCameraPanActiveRef.current = false;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      setCanvasCursor(scenePointFromClient(event), false);
      if (wasActive) {
        setCameraIsAtDefault(
          isSceneCameraAtFrameDefault(
            sceneCameraRef.current,
            sceneReferenceFrameRef.current,
            sceneCameraCoverPolicyRef.current,
          ),
        );
        earthquakePointerSceneCssRef.current = scenePointFromClient(event);
      }
    };

    const syncPointerFromEvent = (event: PointerEvent): void => {
      if (panDrag?.active === true) {
        earthquakePointerSceneCssRef.current = null;
        return;
      }
      earthquakePointerSceneCssRef.current = scenePointFromClient(event);
    };
    const onPointerDown = (event: PointerEvent): void => {
      if (cancelled || event.button !== 0) {
        return;
      }
      const scenePt = scenePointFromClient(event);
      if (scenePt === null) {
        return;
      }
      panDrag = {
        pointerId: event.pointerId,
        startSceneX: scenePt.x,
        startSceneY: scenePt.y,
        origin: sceneCameraRef.current,
        active: false,
      };
      // Untrusted/synthetic PointerEvents throw on setPointerCapture and can
      // immediately fire lostpointercapture, aborting the drag session.
      if (event.isTrusted) {
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch {
          /* capture is optional; move/up still pan while the pointer is on canvas */
        }
      }
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (cancelled) return;
      if (panDrag !== null && event.pointerId === panDrag.pointerId) {
        const layout = scenePointerLayoutRef.current;
        const scenePt = scenePointFromClient(event, { allowOutsideScene: true });
        if (layout !== null && scenePt !== null) {
          const dx = scenePt.x - panDrag.startSceneX;
          const dy = scenePt.y - panDrag.startSceneY;
          if (
            !panDrag.active &&
            Math.hypot(dx, dy) >= SCENE_CAMERA_PAN_DRAG_THRESHOLD_PX
          ) {
            panDrag.active = true;
            sceneCameraPanActiveRef.current = true;
            earthquakePointerSceneCssRef.current = null;
            setCameraIsAtDefault(false);
            setCanvasCursor(scenePt, true);
          }
          if (panDrag.active) {
            sceneCameraRef.current = panSceneCameraBySceneDelta({
              camera: panDrag.origin,
              deltaSceneX: dx,
              deltaSceneY: dy,
              widthPx: layout.scene.width,
              heightPx: layout.scene.height,
              verticalExtent: sceneCameraVerticalExtentFromFrame(
                sceneReferenceFrameRef.current,
              ),
            });
            setCanvasCursor(scenePt, true);
            return;
          }
        }
      }
      const hoverPt = scenePointFromClient(event);
      setCanvasCursor(hoverPt, false);
      syncPointerFromEvent(event);
    };
    const onPointerUp = (event: PointerEvent): void => {
      endPanDrag(event);
    };
    const onPointerLeave = (): void => {
      if (panDrag?.active === true) {
        return;
      }
      earthquakePointerSceneCssRef.current = null;
      if (panDrag === null) {
        setCanvasCursor(null, false);
      }
    };
    const onPointerCancel = (event: PointerEvent): void => {
      endPanDrag(event);
      earthquakePointerSceneCssRef.current = null;
    };
    const onLostPointerCapture = (event: PointerEvent): void => {
      endPanDrag(event);
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("pointercancel", onPointerCancel);
    canvas.addEventListener("lostpointercapture", onLostPointerCapture);

    const onWheel = (event: WheelEvent): void => {
      if (cancelled) return;
      const layout = scenePointerLayoutRef.current;
      if (layout === null) {
        return;
      }
      const scenePt = canvasClientPointToSceneCss({
        clientX: event.clientX,
        clientY: event.clientY,
        canvasRect: canvas.getBoundingClientRect(),
        canvasCssWidth: layout.canvasCssWidth,
        canvasCssHeight: layout.canvasCssHeight,
        sceneLayerViewportPx: layout.scene,
      });
      if (scenePt === null) {
        return;
      }
      event.preventDefault();
      const nextScale = sceneCameraFromWheelDelta(
        sceneCameraRef.current.scale,
        wheelDeltaYToPixels(event),
      );
      const next = zoomSceneCameraAboutScenePoint({
        camera: sceneCameraRef.current,
        nextScale,
        sceneX: scenePt.x,
        sceneY: scenePt.y,
        widthPx: layout.scene.width,
        heightPx: layout.scene.height,
        verticalExtent: sceneCameraVerticalExtentFromFrame(
          sceneReferenceFrameRef.current,
        ),
      });
      const prev = sceneCameraRef.current;
      sceneCameraRef.current = next;
      if (
        Math.abs(next.scale - prev.scale) > 1e-12 ||
        Math.abs(next.centerU - prev.centerU) > 1e-12 ||
        Math.abs(next.centerV - prev.centerV) > 1e-12
      ) {
        sceneCameraCoverPolicyRef.current = sceneCameraCoverPolicyAfterManualZoom(
          sceneCameraCoverPolicyRef.current,
        );
      }
      setCameraIsAtDefault(
        isSceneCameraAtFrameDefault(
          next,
          sceneReferenceFrameRef.current,
          sceneCameraCoverPolicyRef.current,
        ),
      );
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });

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
      earthquakePointerSceneCssRef.current = null;
      scenePointerLayoutRef.current = null;
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("lostpointercapture", onLostPointerCapture);
      canvas.removeEventListener("wheel", onWheel);
      resizeObserver?.disconnect();
      stopLoop?.();
      window.removeEventListener("resize", onResize);
      backend.dispose();
      dynamicLifecycleHostRef.current.dispose();
    };
  }, [syncDynamicLifecycleConsumers]);

  const eclipseInfoConfig = useMemo(() => workingV2Ref.current, [configViewTick]);

  return (
    <div className={isConfigOpen ? "app-shell app-shell--config-open" : "app-shell"}>
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
      <EclipseInfoPanel
        config={eclipseInfoConfig}
        productInstantMs={eclipsePanelInstantMs}
        configOpen={isConfigOpen}
      />
      <div className="scene-tracking-controls">
        <label className="scene-tracking-control">
          <span className="scene-tracking-control__label">Target</span>
          <select
            className="scene-tracking-control__select"
            aria-label="Tracking target"
            data-testid="tracking-target-select"
            value={trackingTargetSelectValue(trackingSelection.target)}
            onChange={(event) => {
              const raw = event.currentTarget.value;
              if (
                raw !== "earthFixed" &&
                raw !== "moon" &&
                raw !== "sun" &&
                raw !== "iss"
              ) {
                return;
              }
              const target = parseTrackingTargetSelectValue(raw);
              commitTrackingSelection(
                setTrackingTarget(trackingSelectionRef.current, target, {
                  moon: true,
                  sun: true,
                  iss: issTrackingAvailableRef.current,
                }),
              );
            }}
          >
            <option value="earthFixed">Earth-fixed</option>
            <option value="moon">Moon</option>
            <option value="sun">Sun</option>
            <option value="iss" disabled={!issTrackingAvailable}>
              ISS
            </option>
          </select>
        </label>
        <label className="scene-tracking-control">
          <span className="scene-tracking-control__label">Mode</span>
          <select
            className="scene-tracking-control__select"
            aria-label="Tracking mode"
            data-testid="tracking-mode-select"
            disabled={!isTrackingModeActive(trackingSelection)}
            value={trackingSelection.rememberedMode}
            onChange={(event) => {
              const mode = parseTrackingModeSelectValue(event.currentTarget.value);
              if (mode === null) {
                return;
              }
              commitTrackingSelection(
                setTrackingMode(trackingSelectionRef.current, mode),
              );
            }}
          >
            <option value="longitude">Longitude</option>
            <option value="position">Position</option>
          </select>
        </label>
      </div>
      <button
        type="button"
        className="scene-camera-reset"
        aria-label="Reset map view"
        disabled={cameraIsAtDefault}
        onClick={() => {
          const positionLock = isTrackingSelectionPositionLocked(
            trackingSelectionRef.current,
          );
          sceneCameraCoverPolicyRef.current =
            sceneCameraCoverPolicyAfterFrameKindChange(positionLock);
          sceneCameraRef.current = positionLock
            ? defaultSceneCameraForCover(
                sceneCameraVerticalExtentFromFrame(sceneReferenceFrameRef.current),
              )
            : IDENTITY_SCENE_CAMERA;
          setCameraIsAtDefault(true);
        }}
      >
        Reset view
      </button>
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
            productTimeLiveEnough={liveProductTimeEligible}
            issConfigStatusHint={issTrackStatusHint}
            earthquakeConfigStatusHint={earthquakeTrackStatusHint}
            earthquakeProvenance={earthquakeProvenanceView}
            cloudsConfigStatusHint={cloudsTrackStatusHint}
            cloudsProvenance={cloudsProvenanceView}
            userPresetsUi={ALLOW_PHASE3_MUTATIONS ? userPresetsUi : undefined}
            demoTransport={{
              paused: demoTransportPaused,
              onPause: requestDemoPause,
              onResume: requestDemoResume,
              onReset: requestDemoReset,
            }}
            eventPlaybackSession={eventPlaybackSession}
          />
        </div>
      ) : null}
    </div>
  );
}
