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
 * Clouds source identity and freshness. WEATHER-3 composition lives in
 * `cloudsSectors.ts` / `cloudsComposite.ts`. This module re-exports the
 * durable provider constants used by snapshots and tests.
 */

export {
  CLOUDS_EUMET_FRESH_MAX_AGE_MS,
  CLOUDS_EUMET_STALE_MAX_AGE_MS,
  CLOUDS_GIBS_FRESH_MAX_AGE_MS,
  CLOUDS_GIBS_STALE_MAX_AGE_MS,
  CLOUDS_PROVIDER_COMPOSITE,
  CLOUDS_PROVIDER_EUMET,
  CLOUDS_PROVIDER_GIBS,
  cloudsProviderFreshMaxAgeMs,
  cloudsProviderStaleMaxAgeMs,
  isCloudsProviderKind,
  type CloudsProviderKind,
} from "./cloudsSectors";
