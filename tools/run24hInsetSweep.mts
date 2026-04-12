#!/usr/bin/env node
/*
 * Headless runner: starts Vite (dev, import.meta.env.DEV), loads the app, runs
 * window.__LIBRATION_24H_INSET_SWEEP__() and prints JSON + delta table.
 *
 * Usage (from repo root):
 *   npx tsx tools/run24hInsetSweep.mts
 *
 * Requires: Google Chrome/Chromium at CHROME_PATH or /usr/bin/google-chrome.
 */

import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { createConnection } from "net";
import path from "path";
import process from "process";
import puppeteer from "puppeteer-core";
import { fileURLToPath } from "url";

import {
  computeTextMode24hInsetSweepDeltas,
  type TextMode24hInsetSweepResult,
} from "../src/dev/textMode24hInsetSweep.ts";

const HOST = "127.0.0.1";
const PORT = 5199;
const ORIGIN = `http://${HOST}:${PORT}`;

function waitForPort(port: number, host: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = (): void => {
      const s = createConnection({ port, host }, () => {
        s.end();
        resolve();
      });
      s.on("error", () => {
        if (Date.now() > deadline) {
          reject(new Error(`waitForPort: timeout after ${timeoutMs}ms`));
          return;
        }
        setTimeout(tryOnce, 200);
      });
    };
    tryOnce();
  });
}

function startVite(): ChildProcessWithoutNullStreams {
  /** Parent of `tools/` (trailing slash makes `path.dirname` of `..` resolve incorrectly without `../`). */
  const repoRoot = fileURLToPath(new URL("../", import.meta.url));
  const viteBin = path.join(repoRoot, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "--host", HOST, "--port", String(PORT), "--strictPort", "true"],
    {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    },
  );
  return child;
}

async function main(): Promise<void> {
  const chromePath = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
  const vite = startVite();
  try {
    await waitForPort(PORT, HOST, 90000);
    const browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
      await page.goto(ORIGIN, { waitUntil: "load", timeout: 120000 });
      await page.waitForFunction(
        () =>
          typeof (window as unknown as { __LIBRATION_24H_INSET_SWEEP__?: unknown }).__LIBRATION_24H_INSET_SWEEP__ ===
          "function",
        { timeout: 60000 },
      );
      const raw = (await page.evaluate(async () => {
        const w = window as unknown as {
          __LIBRATION_24H_INSET_SWEEP__?: () => Promise<unknown>;
        };
        const fn = w.__LIBRATION_24H_INSET_SWEEP__;
        if (fn === undefined) {
          throw new Error("__LIBRATION_24H_INSET_SWEEP__ missing");
        }
        return await fn();
      })) as TextMode24hInsetSweepResult;

      const deltas = computeTextMode24hInsetSweepDeltas(raw);
      // eslint-disable-next-line no-console -- CLI output
      console.log(JSON.stringify({ sweep: raw, deltas }, null, 2));
    } finally {
      await browser.close();
    }
  } finally {
    vite.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 500));
  }
}

void main().catch((err: unknown) => {
  // eslint-disable-next-line no-console -- CLI output
  console.error(err);
  process.exit(1);
});
