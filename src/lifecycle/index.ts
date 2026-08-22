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
 * Phase 10 dynamic data lifecycle + DLC equirect / point-features / tracks / Model A cloud —
 * public contract surface.
 * P10-1…P10-7: types, store, manager, resolver, acquisition, shell host, closure.
 * DLC-1: global equirect clouds/IR Model B layer (catalog, materializer, fixture adapter).
 * DLC-2: earthquake point-features Model B layer (catalog, materializer, fixture adapter).
 * DLC-3: ISS orbital tracks Model B layer (catalog, materializer, fixture adapter).
 * DLC-4: Model A cloud participation in planetary illumination (opacity materializer + SceneConfig).
 * DLU-2: shared live HTTP acquisition seam (fetch helpers, attribution, fixture fallback, stale policy).
 * DLU-3…DLU-7: live USGS earthquakes, ISS orbital, GIBS clouds/IR, Model A on the same opacity field; DLU track closed.
 */

export type {
  CloudsCompositeComponentMeta,
  CloudsCompositeMeta,
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
  DynamicAcquisitionFailurePolicy,
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

export type {
  ApplyAcquisitionAttributionInput,
  LiveAcquireFailureDisposition,
  LiveAcquireFailurePolicy,
  LiveHttpAcquisitionAdapterOptions,
  LiveHttpAttribution,
  LiveHttpBytesToEntry,
  LiveHttpFetchFail,
  LiveHttpFetchFn,
  LiveHttpFetchOk,
  LiveHttpFetchOptions,
  LiveHttpFetchResult,
} from "./liveHttpAcquisitionTypes";

export {
  applyAcquisitionAttribution,
  applyLiveAcquireFailureToLifecycle,
  contentTypeMatchesAccept,
  createLiveHttpAcquisitionAdapter,
  fetchLiveHttpBytes,
  normalizeHttpContentType,
  resolveLiveAcquireFailureDisposition,
} from "./liveHttpAcquisition";

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

export type {
  CloudOpacitySampleBuffer,
  DynamicCloudOpacityMaterializer,
  DynamicCloudOpacityMaterializerDeps,
  PreparedCloudOpacityView,
} from "./dynamicCloudOpacityMaterializer";

export {
  createDynamicCloudOpacityMaterializer,
  decodeJpegBytesToCloudOpacityBuffer,
  sampleCloudOpacity01,
} from "./dynamicCloudOpacityMaterializer";

export type {
  GlobalCloudsIrAcquireOptions,
  GlobalCloudsIrLiveAcquireOptions,
} from "./globalCloudsIrAcquisition";

export {
  GLOBAL_CLOUDS_IR_ACQUIRE_TIMEOUT_MS,
  GLOBAL_CLOUDS_IR_LIVE_ACCEPT_CONTENT_TYPES,
  GLOBAL_CLOUDS_IR_LIVE_FEED_URL,
  GLOBAL_CLOUDS_IR_SCENE_LAYER_ID,
  createGlobalCloudsIrFixtureAcquisitionAdapter,
  createGlobalCloudsIrLiveHttpAcquisitionAdapter,
  isGlobalCloudsIrSourceId,
  materializeCloudsHighlightStoreEntry,
  produceGlobalCloudsIrFixtureAcquisition,
  produceGlobalCloudsIrLiveAcquisitionFromFetched,
} from "./globalCloudsIrAcquisition";

export {
  CLOUDS_COVERAGE_NOTE,
  CLOUDS_GLOBAL_COVERAGE_NOTE,
  CLOUDS_PARTIAL_COVERAGE_NOTE,
  CLOUDS_EUMET_ATTRIBUTION,
  CLOUDS_GIBS_ATTRIBUTION,
  CLOUDS_OBSERVATION_FRESH_MAX_AGE_MS,
  CLOUDS_OBSERVATION_STALE_MAX_AGE_MS,
  cloudsConfigStatusHint,
  cloudsConfigStatusHintCopy,
  cloudsComponentObservationLines,
  cloudsObservationFreshnessBandFromAgeMs,
  cloudsShouldPaint,
  formatCloudsObservationAgeRange,
  originStampFromPreparedEquirect,
  resolveCloudsProvenance,
} from "./cloudProvenance";

export type {
  CloudsConfigStatusHint,
  CloudsCoverageKind,
  CloudsObservationFreshnessBand,
  CloudsOrigin,
  CloudsProvenance,
} from "./cloudProvenance";

export {
  CLOUD_HIGHLIGHT_LUMA_HI,
  CLOUD_HIGHLIGHT_LUMA_LO,
  CLOUD_HIGHLIGHT_RGB,
  CLOUD_HIGHLIGHT_TRANSFER_VERSION,
  EUMET_IR_LUMA_LIFT,
  MSG_FES_IR_LUMA_LIFT,
  applyCloudHighlightTransfer,
  cloudHighlightAlpha01FromIrLuma,
  liftEumetIrLuma,
  liftMsgFesIrLuma,
} from "./cloudHighlightTransfer";

export {
  CLOUDS_COVERAGE_PROVIDER_ALPHA_MIN,
  extractCloudsCoverageMask,
  isCloudsAuthoritativeClear,
  materializeCloudsSourcePlanes,
  providerAlphaHasCloudsCoverage,
} from "./cloudCoverage";

export {
  buildCloudsGibsSectorGetMapUrl,
  buildCloudsGibsWmsGetMapUrl,
  CLOUDS_GIBS_BAND13_LAYERS,
  CLOUDS_GIBS_GOES_EAST_LAYER,
  CLOUDS_GIBS_GOES_WEST_LAYER,
  CLOUDS_GIBS_HIMAWARI_LAYER,
  CLOUDS_GIBS_WMS_LAYERS_PARAM,
  formatCloudsGibsWmsTime,
  wmsUrlHasExplicitTime,
} from "./cloudsGibsWms";

export {
  buildCloudsEumetWmsGetMapUrl,
  buildCloudsMsgFesWmsGetMapUrl,
  CLOUDS_EUMET_LAYER_ID,
  CLOUDS_MSG_FES_LAYER_ID,
  EUMET_WMS_ENDPOINT,
  formatCloudsEumetWmsTime,
  formatCloudsMsgFesWmsTime,
} from "./cloudsEumetWms";

export {
  CLOUDS_GOES_EAST_SUB_SATELLITE,
  CLOUDS_GOES_WEST_SUB_SATELLITE,
  CLOUDS_HIMAWARI_SUB_SATELLITE,
  CLOUDS_METEOSAT_SUB_SATELLITE,
  CLOUDS_PROVIDER_COMPOSITE,
  CLOUDS_PROVIDER_EUMET,
  CLOUDS_PROVIDER_EUMET_MSG_FES,
  CLOUDS_PROVIDER_GIBS,
  CLOUDS_PROVIDER_GIBS_GOES_EAST,
  CLOUDS_PROVIDER_GIBS_GOES_WEST,
  CLOUDS_PROVIDER_GIBS_HIMAWARI,
  CLOUDS_SECTOR_EUMET_RING,
  CLOUDS_SECTOR_GOES_EAST,
  CLOUDS_SECTOR_GOES_WEST,
  CLOUDS_SECTOR_HIMAWARI,
  CLOUDS_SECTOR_METEOSAT,
  cloudsProviderFreshMaxAgeMs,
  cloudsProviderStaleMaxAgeMs,
} from "./cloudsSectors";

export type { CloudsProviderKind, CloudsSectorId, CloudsGeoSubSatellite } from "./cloudsSectors";

export {
  buildCloudsCompositeMeta,
  cloudsCompositePaintOrder,
  cloudsOverlapCadenceThresholdMs,
  compositeCloudHighlightLayers,
  resolveCloudsCompositeWinnerSectorIds,
  selectCloudsPaintableComponents,
  selectCloudsStatusComponents,
} from "./cloudsComposite";

export {
  CLOUDS_GEO_EARTH_RADIUS_KM,
  CLOUDS_GEO_ORBIT_HEIGHT_KM,
  CLOUDS_QUALITY_ZENITH_FULL_DEG,
  CLOUDS_QUALITY_ZENITH_ZERO_DEG,
  geostationaryQuality01,
  geostationaryQualityU8,
  geostationaryViewingZenithDeg,
  getCloudsQualityPlane,
} from "./cloudQuality";

export {
  decodeCloudsPngRgba,
  encodeRgbaPng,
  sampleEquirectRgbaAlpha,
  validateCloudsPngBytes,
} from "./cloudsPng";

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

export type {
  EarthquakesAcquireOptions,
  EarthquakesLiveAcquireOptions,
  UsgsEarthquakesGeoJsonParseResult,
} from "./earthquakesAcquisition";

export {
  EARTHQUAKES_SCENE_LAYER_ID,
  USGS_EARTHQUAKES_ACQUIRE_TIMEOUT_MS,
  USGS_EARTHQUAKES_LIVE_ACCEPT_CONTENT_TYPES,
  USGS_EARTHQUAKES_LIVE_FEED_URL,
  createEarthquakesFixtureAcquisitionAdapter,
  createEarthquakesLiveHttpAcquisitionAdapter,
  isUsgsEarthquakesSourceId,
  parseUsgsEarthquakesGeoJsonBytes,
  produceEarthquakesFixtureAcquisition,
  produceEarthquakesLiveAcquisitionFromFetched,
} from "./earthquakesAcquisition";

export type {
  EarthquakeConfigStatusHint,
  EarthquakeOrigin,
  EarthquakeOriginStamp,
  EarthquakeProvenance,
  EarthquakeSnapshotFreshnessBand,
} from "./earthquakeProvenance";

export {
  EARTHQUAKE_ORIGIN_PROPERTY,
  EARTHQUAKE_SNAPSHOT_FRESH_MAX_AGE_MS,
  EARTHQUAKE_SNAPSHOT_STALE_MAX_AGE_MS,
  earthquakeConfigStatusHint,
  earthquakeConfigStatusHintCopy,
  earthquakeShouldPaint,
  earthquakeSnapshotFreshnessBandFromAgeMs,
  originStampFromPreparedPointFeatures,
  resolveEarthquakeProvenance,
} from "./earthquakeProvenance";

export type { DynamicSourceTimePolicy } from "./dynamicSourceTimePolicy";

export {
  getDynamicSourceTimePolicy,
  isWallClockCurrentSource,
} from "./dynamicSourceTimePolicy";

export type { DynamicTracksSourceCatalogEntry } from "./dynamicTracksSourceCatalog";

export {
  ISS_ORBITAL_TRACK_DEFAULT_REFRESH_INTERVAL_MS,
  ISS_ORBITAL_TRACK_SOURCE_ID,
  getDynamicTracksSourceCatalogEntry,
  listDynamicTracksSourceCatalog,
} from "./dynamicTracksSourceCatalog";

export type {
  DynamicTracksMaterializer,
  DynamicTracksMaterializerDeps,
  PreparedTracksView,
} from "./dynamicTracksMaterializer";

export { createDynamicTracksMaterializer } from "./dynamicTracksMaterializer";

export type {
  IssGroundTrackPropagateResult,
  IssOrbitalTrackAcquireOptions,
  IssOrbitalTrackLiveAcquireOptions,
  IssPositionAtTimeResult,
  IssTleLines,
  IssTleLiveProvider,
  IssTleLiveProviderId,
  IssTleParseResult,
} from "./issOrbitalTrackAcquisition";

export {
  getIssPresentationTrackSamples,
  issOrbitalPeriodMsFromTle,
  issPresentationProductTimeBucketMs,
  issPresentationTrackCacheKey,
  resetIssPresentationTrackCacheForTests,
} from "./issPresentationTrack";

export {
  ISS_NORAD_CATALOG_NUMBER,
  ISS_ORBITAL_TRACK_LIVE_ACCEPT_CONTENT_TYPES,
  ISS_ORBITAL_TRACK_LIVE_FEED_URL,
  ISS_ORBITAL_TRACK_LOOKAHEAD_MS,
  ISS_ORBITAL_TRACK_LOOKBACK_MS,
  ISS_ORBITAL_TRACK_SAMPLE_STEP_MS,
  ISS_ORBITAL_TRACK_SECONDARY_LIVE_FEED_URL,
  ISS_TLE_ACQUIRE_TIMEOUT_MS,
  ISS_TLE_FAILURE_RETRY_MS,
  ISS_TLE_LINE1_PROPERTY,
  ISS_TLE_LINE2_PROPERTY,
  ISS_TLE_LIVE_PROVIDERS,
  ISS_TLE_NAME_PROPERTY,
  ISS_ORIGIN_PROPERTY,
  ISS_TLE_PROVIDER_PROPERTY,
  ORBITAL_TRACKS_SCENE_LAYER_ID,
  createIssOrbitalTrackFixtureAcquisitionAdapter,
  createIssOrbitalTrackLiveHttpAcquisitionAdapter,
  isIssOrbitalTrackSourceId,
  issTleEpochUnixMs,
  parseIssTleBytes,
  produceIssOrbitalTrackFixtureAcquisition,
  produceIssOrbitalTrackLiveAcquisitionFromFetched,
  propagateIssGroundTrackFromTle,
  propagateIssPositionAtTime,
  resolveIssCurrentSample,
  tleLinesFromTrackProperties,
} from "./issOrbitalTrackAcquisition";

export type {
  IssConfigStatusHint,
  IssTleFreshnessBand,
  IssTrackOrigin,
  IssTrackProvenance,
} from "./issTrackProvenance";

export {
  ISS_TLE_DEGRADED_MAX_AGE_MS,
  ISS_TLE_FRESH_MAX_AGE_MS,
  issConfigStatusHint,
  issConfigStatusHintCopy,
  issProvenanceFromPreparedTrack,
  issTleFreshnessBandFromAgeMs,
  issTrackShouldPaint,
  resolveIssTrackProvenance,
} from "./issTrackProvenance";

export type {
  DynamicDataLifecycleAttachment,
  DynamicDataLifecycleAttachOptions,
  DynamicDataLifecycleHost,
  DynamicDataLifecycleHostDeps,
  DynamicLifecycleConsumerFlags,
} from "./dynamicDataLifecycleHostTypes";

export {
  armDynamicLifecycleConsumers,
  createDynamicDataLifecycleHost,
  getDynamicDataLifecycleAttachment,
  reviveDisposedDynamicLifecycleHost,
} from "./dynamicDataLifecycleHost";
