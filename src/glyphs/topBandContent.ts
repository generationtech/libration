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
 * Semantic content for top-band chrome text outside the hour-disk stack (planner-resolved labels).
 */

/** Upper next-hour numeral above the disk row — label is precomputed by the top-band time planner. */
export type TopBandHourNumeralContent = {
  hour0To23: number;
  label: string;
};

/** Noon / midnight crown annotation beneath the disk row. */
export type TopBandAnnotationContent = {
  kind: "noon" | "midnight";
  label: string;
};
