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

import type { DataConfig } from "../config/appConfig";
import { DEFAULT_DEMO_TIME_START_ISO_UTC } from "../config/appConfig";

/**
 * Running anchors for demo playback (playing). Not persisted; app render loop only.
 */
export type DemoSessionAnchors = {
  realAnchorMs: number;
  demoAnchorMs: number;
  lastSpeed: number;
  lastStartIsoUtc: string;
};

/**
 * Runtime session for deterministic demo playback: anchors real wall time to a synthetic timeline,
 * plus optional transport (pause / resume / reset). Not persisted.
 */
export type DemoPlaybackState = {
  session: DemoSessionAnchors;
  paused: boolean;
  /** When paused, frozen synthetic unix ms; otherwise null. */
  pausedDemoNowMs: number | null;
};

export function isDemoTimeActive(data: DataConfig): boolean {
  return data.mode === "demo" && data.demoTime.enabled;
}

export function parseUtcIsoToUnixMs(iso: string): number | null {
  const t = Date.parse(iso.trim());
  return Number.isFinite(t) ? t : null;
}

/** Resolves config start (already normalized) to unix ms; falls back to the product default instant. */
export function resolvedDemoStartUnixMs(startIsoUtc: string): number {
  return (
    parseUtcIsoToUnixMs(startIsoUtc) ??
    parseUtcIsoToUnixMs(DEFAULT_DEMO_TIME_START_ISO_UTC)!
  );
}

/**
 * After a frame computes `next` from {@link computeEffectiveRenderTimeMs}, freeze the clock at
 * `effectiveDemoNowMs` without mutating config.
 */
export function applyDemoPlaybackPause(
  effectiveDemoNowMs: number,
  next: DemoPlaybackState | null,
): DemoPlaybackState | null {
  if (!next || next.paused) {
    return next;
  }
  return {
    session: next.session,
    paused: true,
    pausedDemoNowMs: effectiveDemoNowMs,
  };
}

/**
 * Re-anchor so playback continues from the paused synthetic instant (no jump).
 */
export function applyDemoPlaybackResume(
  realNowMs: number,
  data: DataConfig,
  prev: DemoPlaybackState | null,
): DemoPlaybackState | null {
  if (!prev || !prev.paused || prev.pausedDemoNowMs === null) {
    return prev;
  }
  const speed = data.demoTime.speedMultiplier;
  const startIso = data.demoTime.startIsoUtc;
  return {
    session: {
      realAnchorMs: realNowMs,
      demoAnchorMs: prev.pausedDemoNowMs,
      lastSpeed: speed,
      lastStartIsoUtc: startIso,
    },
    paused: false,
    pausedDemoNowMs: null,
  };
}

/**
 * Return to the configured demo start instant; re-anchors session. Preserves play/pause state from
 * {@link prev} (reset does not force resume).
 */
export function applyDemoPlaybackReset(
  realNowMs: number,
  data: DataConfig,
  prev: DemoPlaybackState | null = null,
): DemoPlaybackState | null {
  if (!isDemoTimeActive(data)) {
    return null;
  }
  const startIso = data.demoTime.startIsoUtc;
  const speed = data.demoTime.speedMultiplier;
  const startMs = resolvedDemoStartUnixMs(startIso);
  const wasPaused = Boolean(prev?.paused);
  return {
    session: {
      realAnchorMs: realNowMs,
      demoAnchorMs: startMs,
      lastSpeed: speed,
      lastStartIsoUtc: startIso,
    },
    paused: wasPaused,
    pausedDemoNowMs: wasPaused ? startMs : null,
  };
}

/**
 * Computes the effective render-time instant for the current frame.
 * When demo time is inactive, returns wall `realNowMs` and clears session state (`next === null`).
 */
export function computeEffectiveRenderTimeMs(
  realNowMs: number,
  data: DataConfig,
  prev: DemoPlaybackState | null,
): { nowMs: number; simulated: boolean; next: DemoPlaybackState | null } {
  if (!isDemoTimeActive(data)) {
    return { nowMs: realNowMs, simulated: false, next: null };
  }

  const startIso = data.demoTime.startIsoUtc;
  const speed = data.demoTime.speedMultiplier;
  const startMs = resolvedDemoStartUnixMs(startIso);

  if (prev === null) {
    const session: DemoSessionAnchors = {
      realAnchorMs: realNowMs,
      demoAnchorMs: startMs,
      lastSpeed: speed,
      lastStartIsoUtc: startIso,
    };
    const next: DemoPlaybackState = {
      session,
      paused: false,
      pausedDemoNowMs: null,
    };
    return { nowMs: startMs, simulated: true, next };
  }

  if (prev.session.lastStartIsoUtc !== startIso) {
    const session: DemoSessionAnchors = {
      realAnchorMs: realNowMs,
      demoAnchorMs: startMs,
      lastSpeed: speed,
      lastStartIsoUtc: startIso,
    };
    const next: DemoPlaybackState = {
      session,
      paused: prev.paused,
      pausedDemoNowMs: prev.paused ? startMs : null,
    };
    return { nowMs: startMs, simulated: true, next };
  }

  if (prev.paused && prev.pausedDemoNowMs !== null) {
    const session =
      prev.session.lastSpeed !== speed
        ? { ...prev.session, lastSpeed: speed }
        : prev.session;
    const next: DemoPlaybackState = {
      session,
      paused: true,
      pausedDemoNowMs: prev.pausedDemoNowMs,
    };
    return { nowMs: prev.pausedDemoNowMs, simulated: true, next };
  }

  if (prev.session.lastSpeed !== speed) {
    const atChange =
      prev.session.demoAnchorMs +
      (realNowMs - prev.session.realAnchorMs) * prev.session.lastSpeed;
    const session: DemoSessionAnchors = {
      realAnchorMs: realNowMs,
      demoAnchorMs: atChange,
      lastSpeed: speed,
      lastStartIsoUtc: startIso,
    };
    const next: DemoPlaybackState = {
      session,
      paused: false,
      pausedDemoNowMs: null,
    };
    return { nowMs: atChange, simulated: true, next };
  }

  const nowMs =
    prev.session.demoAnchorMs +
    (realNowMs - prev.session.realAnchorMs) * prev.session.lastSpeed;
  return { nowMs, simulated: true, next: prev };
}
