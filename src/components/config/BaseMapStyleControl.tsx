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

import { useEffect, useState } from "react";
import {
  type BaseMapPresentationConfig,
  DEFAULT_BASE_MAP_PRESENTATION,
  normalizeBaseMapPresentation,
} from "../../config/baseMapPresentation";
import type { BaseMapOption } from "../../config/v2/sceneConfig";
import {
  BASE_MAP_OPTION_CATEGORY_ORDER,
  EQUIRECT_BASE_MAP_OPTIONS,
  getEquirectBaseMapOptionForId,
  resolveEquirectBaseMapImageSrc,
} from "../../config/v2/sceneConfig";
import { ConfigControlRow } from "./ConfigControlRow";

const CATEGORY_GROUP_LABEL: Record<BaseMapOption["category"], string> = {
  reference: "Reference",
  political: "Political",
  terrain: "Terrain",
  scientific: "Scientific",
};

function optionsByCategory(
  order: readonly BaseMapOption["category"][],
  options: readonly BaseMapOption[],
): { category: BaseMapOption["category"]; options: BaseMapOption[] }[] {
  return order.map((category) => ({
    category,
    options: options.filter((o) => o.category === category),
  })).filter((g) => g.options.length > 0);
}

export type BaseMapStyleControlProps = {
  /** Any persisted `SceneConfig.baseMap.id` (legacy aliases are accepted). */
  baseMapId: string;
  /** Normalized `SceneConfig.baseMap.presentation` (family-level, not per month). */
  presentation: BaseMapPresentationConfig;
  mutable: boolean;
  onSelectId?: (canonicalId: string) => void;
  onPresentationChange?: (next: BaseMapPresentationConfig) => void;
};

const PRESENTATION_SLIDERS: {
  key: keyof BaseMapPresentationConfig;
  label: string;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: "brightness", label: "Brightness", min: 0.5, max: 2, step: 0.01 },
  { key: "contrast", label: "Contrast", min: 0.5, max: 2, step: 0.01 },
  { key: "gamma", label: "Gamma", min: 0.5, max: 2.5, step: 0.01 },
  { key: "saturation", label: "Saturation", min: 0, max: 2, step: 0.01 },
];

type SliderSpec = (typeof PRESENTATION_SLIDERS)[number];

function formatBaseMapDisplayNumber(n: number): string {
  return n.toFixed(2);
}

type BaseMapPresentationSliderRowProps = {
  spec: SliderSpec;
  presentation: BaseMapPresentationConfig;
  value: number;
  mutable: boolean;
  onPresentationChange?: (next: BaseMapPresentationConfig) => void;
};

function BaseMapPresentationSliderRow({
  spec,
  presentation,
  value,
  mutable,
  onPresentationChange,
}: BaseMapPresentationSliderRowProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const rangeId = `config-bm-pres-${spec.key}`;

  useEffect(() => {
    setDraft(null);
  }, [value]);

  const displayText = draft !== null ? draft : formatBaseMapDisplayNumber(value);

  const commitForKey = (n: number) => {
    onPresentationChange?.(normalizeBaseMapPresentation({ ...presentation, [spec.key]: n }));
  };

  return (
    <div className="config-base-map-style__pres-row">
      <label className="config-base-map-style__pres-label" htmlFor={rangeId}>
        {spec.label}
        {spec.key === "gamma" ? (
          <span
            className="config-base-map-style__pres-note"
            title="sRGB per-channel power curve on the base map; alpha is preserved."
          >
            (sRGB power curve; α preserved)
          </span>
        ) : null}
      </label>
      <input
        id={rangeId}
        className="config-input config-base-map-style__pres-range"
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        disabled={!mutable}
        tabIndex={mutable ? 0 : -1}
        aria-label={spec.label}
        onChange={
          mutable && onPresentationChange
            ? (e) => {
                const v = parseFloat(e.currentTarget.value);
                if (Number.isFinite(v)) {
                  commitForKey(v);
                }
              }
            : undefined
        }
      />
      <input
        data-testid={`config-bm-pres-${spec.key}-number`}
        className="config-input config-base-map-style__pres-number"
        type="number"
        min={spec.min}
        max={spec.max}
        step="0.01"
        value={displayText}
        disabled={!mutable}
        tabIndex={mutable ? 0 : -1}
        aria-label={`${spec.label} (numeric)`}
        onFocus={
          mutable
            ? () => {
                setDraft(formatBaseMapDisplayNumber(value));
              }
            : undefined
        }
        onChange={
          mutable
            ? (e) => {
                setDraft(e.currentTarget.value);
              }
            : undefined
        }
        onKeyDown={
          mutable
            ? (e) => {
                if (e.key === "Enter") {
                  (e.currentTarget as HTMLInputElement).blur();
                }
              }
            : undefined
        }
        onBlur={
          mutable
            ? (e) => {
                const raw = e.currentTarget.value.trim();
                setDraft(null);
                if (raw === "" || !Number.isFinite(parseFloat(raw))) {
                  return;
                }
                commitForKey(parseFloat(raw));
              }
            : undefined
        }
      />
    </div>
  );
}

export function BaseMapStyleControl({
  baseMapId,
  presentation,
  mutable,
  onSelectId,
  onPresentationChange,
}: BaseMapStyleControlProps) {
  const selected = getEquirectBaseMapOptionForId(baseMapId);
  const value = selected.id;
  const previewSrc =
    selected.previewThumbnailSrc ?? resolveEquirectBaseMapImageSrc(value);
  const groups = optionsByCategory(BASE_MAP_OPTION_CATEGORY_ORDER, EQUIRECT_BASE_MAP_OPTIONS);

  return (
    <div className="config-base-map-style">
      <ConfigControlRow label="Map style">
        <select
          className="config-input"
          value={value}
          disabled={!mutable}
          aria-label="Map style"
          onChange={
            mutable && onSelectId
              ? (e) => {
                  onSelectId(e.currentTarget.value);
                }
              : undefined
          }
        >
          {groups.map(({ category, options }) => (
            <optgroup key={category} label={CATEGORY_GROUP_LABEL[category]}>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </ConfigControlRow>
      <div
        className="config-base-map-style__presentation"
        data-testid="config-base-map-presentation"
      >
        <h3 className="config-base-map-style__presentation-heading">Base map display</h3>
        <p className="config-base-map-style__presentation-hint">
          Tuning for the selected map family (applies to every month in seasonal maps). Map opacity
          follows layer visibility; these controls adjust brightness, contrast, and color only.
        </p>
        {PRESENTATION_SLIDERS.map((spec) => (
          <BaseMapPresentationSliderRow
            key={spec.key}
            spec={spec}
            presentation={presentation}
            value={presentation[spec.key]}
            mutable={mutable}
            onPresentationChange={onPresentationChange}
          />
        ))}
        <div className="config-base-map-style__pres-actions">
          <button
            type="button"
            className="config-button config-button--secondary"
            disabled={!mutable || !onPresentationChange}
            onClick={() => onPresentationChange?.({ ...DEFAULT_BASE_MAP_PRESENTATION })}
            aria-label="Reset base map display to defaults"
          >
            Reset display
          </button>
        </div>
      </div>
      <div className="config-base-map-style__detail" data-testid="config-base-map-style-detail">
        <div className="config-base-map-style__preview">
          <img
            className="config-base-map-style__preview-img"
            src={previewSrc}
            alt=""
            width={160}
            height={80}
            loading="lazy"
          />
          <p className="config-base-map-style__caption">
            {selected.label}
            {selected.transitionalPlaceholder ? (
              <span className="config-base-map-style__badge" title="Provisional preview raster">
                {" "}
                (placeholder)
              </span>
            ) : null}
          </p>
        </div>
        {selected.shortDescription ? (
          <p className="config-base-map-style__desc">{selected.shortDescription}</p>
        ) : null}
        {selected.attribution ? (
          <p className="config-base-map-style__attr">{selected.attribution}</p>
        ) : null}
      </div>
    </div>
  );
}
