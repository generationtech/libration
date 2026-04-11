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

import type { ReactNode } from "react";

export type ConfigControlRowProps = {
  label: string;
  children: ReactNode;
};

export function ConfigControlRow({ label, children }: ConfigControlRowProps) {
  return (
    <div className="config-control-row">
      <span className="config-control-row__label">{label}</span>
      <div className="config-control-row__slot">{children}</div>
    </div>
  );
}
