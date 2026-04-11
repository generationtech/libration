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

/// <reference types="vite/client" />

/** Bundled source string for dependency-boundary tests (see `config/v2/librationConfig.test.ts`). */
declare module "*.ts?raw" {
  const src: string;
  export default src;
}
