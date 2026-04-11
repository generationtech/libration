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

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { loadBundledFontFaces } from "./renderer/canvas/bundledFontFaceLoader";

async function bootstrap(): Promise<void> {
  await loadBundledFontFaces().catch((err: unknown) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console -- startup diagnostic only
      console.warn("[libration] Bundled font load failed; Canvas text may fall back to system UI.", err);
    }
  });

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
