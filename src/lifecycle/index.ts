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
 * Phase 10 dynamic data lifecycle — public contract surface.
 * P10-1: types & pure helpers. P10-2: versioned snapshot store.
 * P10-3: per-source lifecycle manager (state machine + subscribe).
 * P10-4: product-time resolver (scrub-safe read-only resolve).
 * P10-5: acquisition adapter + periodic refresh + manual/file import.
 * Later steps add app shell seam under this folder.
 */

export type {
  DynamicPointFeature,
  DynamicSnapshotBody,
  DynamicSnapshotFreshness,
  DynamicSnapshotKind,
  DynamicSnapshotRecord,
  DynamicSnapshotResolveResult,
  DynamicSnapshotTemporalMeta,
  DynamicSnapshotVersionId,
  DynamicSourceId,
  DynamicTrack,
  DynamicTrackSample,
  EquirectRasterSnapshotBody,
  PointFeaturesSnapshotBody,
  TracksSnapshotBody,
} from "./dynamicSnapshotTypes";

export {
  DYNAMIC_SNAPSHOT_FRESHNESS_VALUES,
  DYNAMIC_SNAPSHOT_KINDS,
} from "./dynamicSnapshotTypes";

export {
  buildDynamicSnapshotRecord,
  isDynamicSnapshotFreshness,
  isDynamicSnapshotKind,
  isValidDynamicSnapshotVersionId,
  isValidDynamicSourceId,
  normalizeDynamicSourceId,
  parseDynamicSnapshotTemporalMeta,
  selectNearestSnapshotMetaByValidTime,
  snapshotCoversProductInstant,
  validTimeDistanceMs,
} from "./dynamicSnapshotContracts";

export type {
  DynamicSnapshotStore,
  DynamicSnapshotStoreEntry,
  DynamicSnapshotStorePutResult,
} from "./dynamicSnapshotStoreTypes";

export {
  cloneStoreEntry,
  compareSnapshotMetaForList,
  copyPayloadBytes,
  prepareDynamicSnapshotStoreEntry,
  toPutResult,
} from "./dynamicSnapshotStore";

export {
  MemoryDynamicSnapshotStore,
  createMemoryDynamicSnapshotStore,
} from "./memoryDynamicSnapshotStore";

export type {
  DynamicDataLifecycleManager,
  DynamicLifecycleMarkReadyOptions,
  DynamicLifecycleTransitionResult,
  DynamicSourceLifecycleListener,
  DynamicSourceLifecycleSnapshot,
  DynamicSourceLifecycleState,
} from "./dynamicLifecycleTypes";

export {
  DYNAMIC_SOURCE_LIFECYCLE_STATES,
  lifecycleStateToFreshness,
} from "./dynamicLifecycleTypes";

export {
  DynamicDataLifecycleManagerImpl,
  createDynamicDataLifecycleManager,
  isAllowedLifecycleTransition,
  isDynamicSourceLifecycleState,
} from "./dynamicLifecycleManager";

export type {
  DynamicSnapshotResolver,
  DynamicSnapshotResolverDeps,
} from "./dynamicSnapshotResolver";

export { createDynamicSnapshotResolver } from "./dynamicSnapshotResolver";

export type {
  DynamicAcquisitionController,
  DynamicAcquisitionControllerDeps,
  DynamicAcquisitionFail,
  DynamicAcquisitionImportResult,
  DynamicAcquisitionIntervalHandle,
  DynamicAcquisitionOk,
  DynamicAcquisitionRefreshResult,
  DynamicAcquisitionResult,
  DynamicAcquisitionStartPeriodicOptions,
  DynamicAcquisitionStartPeriodicResult,
  DynamicAcquisitionTimerHooks,
  DynamicSnapshotAcquisitionAdapter,
} from "./dynamicAcquisitionTypes";

export {
  createDynamicAcquisitionController,
  createFixtureAcquisitionAdapter,
} from "./dynamicAcquisition";
