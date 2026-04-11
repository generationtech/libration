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

/**
 * App-shell scheduling: drives repaint cadence without owning drawing logic.
 * Typically aligns with display refresh (~60Hz); stops when the returned disposer runs.
 */
export function runAnimationFrameLoop(callback: () => void): () => void {
  let rafId = 0;
  let stopped = false;

  const tick = (): void => {
    if (stopped) {
      return;
    }
    callback();
    rafId = window.requestAnimationFrame(tick);
  };

  rafId = window.requestAnimationFrame(tick);

  return () => {
    stopped = true;
    window.cancelAnimationFrame(rafId);
  };
}
