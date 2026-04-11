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

import type { TimeContext } from "../layers/types";

export function createTimeContext(
  now: number,
  deltaMs: number,
  simulated: boolean,
): TimeContext {
  return { now, deltaMs, simulated };
}

export function nowTimeContext(
  deltaMs = 0,
  simulated = false,
): TimeContext {
  return {
    now: Date.now(),
    deltaMs,
    simulated,
  };
}
