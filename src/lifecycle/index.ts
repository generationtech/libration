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
 * Phase 10 dynamic data lifecycle + DLC equirect / point-features consumers —
 * public contract surface.
 * P10-1…P10-7: types, store, manager, resolver, acquisition, shell host, closure.
 * DLC-1: global equirect clouds/IR Model B layer (catalog, materializer, fixture adapter).
 * DLC-2: earthquake point-features Model B layer (catalog, materializer, fixture adapter).
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

export type { DynamicEquirectSourceCatalogEntry } from "./dynamicEquirectSourceCatalog";

export {
  GLOBAL_CLOUDS_IR_DEFAULT_REFRESH_INTERVAL_MS,
  GLOBAL_CLOUDS_IR_SOURCE_ID,
  getDynamicEquirectSourceCatalogEntry,
  listDynamicEquirectSourceCatalog,
} from "./dynamicEquirectSourceCatalog";

export type {
  DynamicEquirectMaterializer,
  DynamicEquirectMaterializerDeps,
  PreparedEquirectRasterView,
} from "./dynamicEquirectMaterializer";

export { createDynamicEquirectMaterializer } from "./dynamicEquirectMaterializer";

export type { GlobalCloudsIrAcquireOptions } from "./globalCloudsIrAcquisition";

export {
  GLOBAL_CLOUDS_IR_SCENE_LAYER_ID,
  createGlobalCloudsIrFixtureAcquisitionAdapter,
  isGlobalCloudsIrSourceId,
  produceGlobalCloudsIrFixtureAcquisition,
} from "./globalCloudsIrAcquisition";

export type { DynamicPointFeaturesSourceCatalogEntry } from "./dynamicPointFeaturesSourceCatalog";

export {
  USGS_EARTHQUAKES_DEFAULT_REFRESH_INTERVAL_MS,
  USGS_EARTHQUAKES_SOURCE_ID,
  getDynamicPointFeaturesSourceCatalogEntry,
  listDynamicPointFeaturesSourceCatalog,
} from "./dynamicPointFeaturesSourceCatalog";

export type {
  DynamicPointFeaturesMaterializer,
  DynamicPointFeaturesMaterializerDeps,
  PreparedPointFeaturesView,
} from "./dynamicPointFeaturesMaterializer";

export { createDynamicPointFeaturesMaterializer } from "./dynamicPointFeaturesMaterializer";

export type { EarthquakesAcquireOptions } from "./earthquakesAcquisition";

export {
  EARTHQUAKES_SCENE_LAYER_ID,
  createEarthquakesFixtureAcquisitionAdapter,
  isUsgsEarthquakesSourceId,
  produceEarthquakesFixtureAcquisition,
} from "./earthquakesAcquisition";

export type {
  DynamicDataLifecycleAttachment,
  DynamicDataLifecycleHost,
  DynamicDataLifecycleHostDeps,
} from "./dynamicDataLifecycleHostTypes";

export {
  createDynamicDataLifecycleHost,
  getDynamicDataLifecycleAttachment,
} from "./dynamicDataLifecycleHost";
