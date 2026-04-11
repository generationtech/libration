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
  isDemoTimeActive,
  type DemoPlaybackState,
} from "./app/demoPlayback";
import { ConfigShell } from "./components/config/ConfigShell";
import { ALLOW_PHASE3_MUTATIONS } from "./components/config/phase3Flags";
import { createTimeContext } from "./core/time";
import { CanvasRenderBackend } from "./renderer/canvasRenderBackend";
import { buildRenderableLayerStates } from "./renderer/layerInputAdapter";
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
  const [, bumpConfigView] = useReducer((n: number) => n + 1, 0);
  const [userPresetsEpoch, setUserPresetsEpoch] = useState(0);
  const bumpUserPresets = useCallback(() => setUserPresetsEpoch((n) => n + 1), []);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isDirtyFromPreset, setIsDirtyFromPreset] = useState(false);
  const activePresetIdRef = useRef<string | null>(null);
  activePresetIdRef.current = activePresetId;

  const workingV2Ref = useRef<LibrationConfigV2>(
    resolveStartupWorkingV2(getLocalStorageIfAvailable(), () =>
      appConfigToV2(getActiveAppConfig()),
    ),
  );
  const derivedAppConfigRef = useRef<AppConfig>(
    deriveAppConfigFromV2(workingV2Ref.current),
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const registryRef = useRef<LayerRegistry>(
    createLayerRegistryFromConfig(derivedAppConfigRef.current),
  );
  const demoPlaybackRef = useRef<DemoPlaybackState | null>(null);
  const demoTransportActionRef = useRef<
    "pause" | "resume" | "reset" | null
  >(null);
  const [demoTransportPaused, setDemoTransportPaused] = useState(false);
  const prevDemoTimeActiveRef = useRef(false);
  const lastRenderClockMsRef = useRef<number | null>(null);

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
      if (activePresetIdRef.current !== null) {
        setIsDirtyFromPreset(true);
      }
      bumpConfigView();
    },
    [],
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
    ],
  );

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
      const deltaMs =
        lastRenderClockMsRef.current === null
          ? 0
          : Math.max(0, clockNowMs - lastRenderClockMsRef.current);
      lastRenderClockMsRef.current = clockNowMs;

      const time = createTimeContext(clockNowMs, deltaMs, simulated);
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
      const input = buildSceneRenderInput({
        frame: frameCtx,
        viewport,
        layers,
        scene: { backgroundColor: "#1a1a1a" },
      });
      backend.render(input);
      const ctx2d = canvas.getContext("2d");
      if (ctx2d) {
        const chromeState = buildDisplayChromeState({
          time,
          viewport,
          frame: frameCtx,
          displayTime: derivedAppConfigRef.current.displayTime,
          geography: derivedAppConfigRef.current.geography,
          displayChromeLayout: derivedAppConfigRef.current.displayChromeLayout,
        });
        renderDisplayChrome(ctx2d, chromeState, viewport);
      }
    };

    const backend = new CanvasRenderBackend(canvas, () => {
      if (!cancelled) renderFrame();
    });

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
    };
  }, []);

  return (
    <div className="app-shell">
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
