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

/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  defaultLibrationConfigV2,
  normalizeLibrationConfig,
} from "../../config/v2/librationConfig";
import { applyEclipseInfoPresentationToScene } from "../../config/v2/sceneConfig";
import {
  buildEclipseInfoPanelModel,
  eclipseInfoPanelHasContent,
  EclipseInfoPanel,
} from "./EclipseInfoPanel";

afterEach(() => {
  cleanup();
});

function configAt() {
  return normalizeLibrationConfig(defaultLibrationConfigV2());
}

describe("EclipseInfoPanel model", () => {
  it("describes upcoming solar, active solar, upcoming lunar, and active lunar", () => {
    const cfg = configAt();
    const upcomingSolar = buildEclipseInfoPanelModel(cfg, Date.parse("2024-04-03T18:00:00.000Z"));
    expect(upcomingSolar.view.kind).toBe("solar");
    expect(upcomingSolar.view.lifecycle).toBe("upcoming");
    expect(upcomingSolar.view.title).toMatch(/Total solar eclipse/);
    expect(eclipseInfoPanelHasContent(upcomingSolar.view)).toBe(true);

    const activeSolar = buildEclipseInfoPanelModel(cfg, Date.parse("2024-04-08T18:17:15.000Z"));
    expect(activeSolar.view.kind).toBe("solar");
    expect(activeSolar.view.lifecycle).toBe("active");
    expect(activeSolar.view.rows.some((r) => r.label === "Current shadow")).toBe(true);

    const upcomingLunar = buildEclipseInfoPanelModel(cfg, Date.parse("2022-05-13T04:00:00.000Z"));
    expect(upcomingLunar.view.kind).toBe("lunar");
    expect(upcomingLunar.view.lifecycle).toBe("upcoming");

    const activeLunar = buildEclipseInfoPanelModel(cfg, Date.parse("2022-05-16T04:11:29.000Z"));
    expect(activeLunar.view.kind).toBe("lunar");
    expect(activeLunar.view.lifecycle).toBe("active");
    expect(activeLunar.view.rows.some((r) => r.label === "Penumbral magnitude")).toBe(true);
  });

  it("keeps reference-city circumstances derived and does not hide a global event", () => {
    const cfg = configAt();
    const knox = buildEclipseInfoPanelModel(cfg, Date.parse("2024-04-08T18:17:15.000Z"));
    expect(knox.view.title).toMatch(/Total solar eclipse/);
    expect(knox.view.circumstances?.solar?.locallyVisible).toBe(true);
    expect(knox.cityName).toMatch(/Knoxville/);
  });

  it("is empty on a quiet supported date and reports unsupported range honestly", () => {
    const cfg = configAt();
    const quiet = buildEclipseInfoPanelModel(cfg, Date.parse("2024-01-15T00:00:00.000Z"));
    expect(quiet.view.title).toBeNull();
    expect(eclipseInfoPanelHasContent(quiet.view)).toBe(false);
    const unsupported = buildEclipseInfoPanelModel(cfg, Date.parse("1899-01-01T00:00:00.000Z"));
    expect(unsupported.view.unsupported).toBe(true);
    expect(unsupported.view.unsupportedCopy).toMatch(/1900–2100/);
  });
});

describe("EclipseInfoPanel", () => {
  it("renders the lower-right panel when Event information is on and an event is relevant", () => {
    render(
      <EclipseInfoPanel
        config={configAt()}
        productInstantMs={Date.parse("2022-05-16T04:11:29.000Z")}
        configOpen={false}
      />,
    );
    expect(screen.getByTestId("eclipse-event-information").textContent).toMatch(/Total lunar eclipse/);
    expect(screen.getByTestId("eclipse-info-overlay").className).not.toMatch(/config-open/);
  });

  it("hides the panel when Event information is off", () => {
    const cfg = configAt();
    cfg.scene = applyEclipseInfoPresentationToScene(cfg.scene!, { eventInformationEnabled: false });
    render(
      <EclipseInfoPanel
        config={cfg}
        productInstantMs={Date.parse("2022-05-16T04:11:29.000Z")}
        configOpen={false}
      />,
    );
    expect(screen.queryByTestId("eclipse-event-information")).toBeNull();
    expect(screen.queryByTestId("eclipse-info-overlay")).toBeNull();
  });

  it("renders nothing on a quiet date", () => {
    render(
      <EclipseInfoPanel
        config={configAt()}
        productInstantMs={Date.parse("2024-01-15T00:00:00.000Z")}
        configOpen={false}
      />,
    );
    expect(screen.queryByTestId("eclipse-event-information")).toBeNull();
  });

  it("can be hidden and reopened without returning dynamic rows to Config", async () => {
    const user = userEvent.setup();
    render(
      <EclipseInfoPanel
        config={configAt()}
        productInstantMs={Date.parse("2024-04-03T18:00:00.000Z")}
        configOpen
      />,
    );
    expect(screen.getByTestId("eclipse-info-overlay").className).toMatch(/config-open/);
    await user.click(screen.getByLabelText("Hide eclipse information"));
    expect(screen.queryByTestId("eclipse-event-information")).toBeNull();
    expect(screen.getByTestId("eclipse-info-chip")).toBeTruthy();
    await user.click(screen.getByTestId("eclipse-info-chip"));
    expect(screen.getByTestId("eclipse-event-information").textContent).toMatch(/Total solar eclipse/);
  });
});
