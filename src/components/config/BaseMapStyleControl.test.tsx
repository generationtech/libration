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
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import {
  DEFAULT_BASE_MAP_PRESENTATION,
  type BaseMapPresentationConfig,
} from "../../config/baseMapPresentation";
import {
  DEFAULT_EQUIRECT_BASE_MAP_ID,
  getEquirectBaseMapOptionForId,
} from "../../config/v2/sceneConfig";
import { BaseMapStyleControl } from "./BaseMapStyleControl";

function Harness({
  baseMapId = DEFAULT_EQUIRECT_BASE_MAP_ID,
  initial = DEFAULT_BASE_MAP_PRESENTATION,
  mutable = true,
  onSelectId,
}: {
  baseMapId?: string;
  initial?: BaseMapPresentationConfig;
  mutable?: boolean;
  onSelectId?: (id: string) => void;
}) {
  const [presentation, setPresentation] = useState(initial);
  const [mapId, setMapId] = useState(baseMapId);
  return (
    <>
      <BaseMapStyleControl
        baseMapId={mapId}
        presentation={presentation}
        mutable={mutable}
        onSelectId={
          onSelectId ??
          ((id) => {
            setMapId(id);
          })
        }
        onPresentationChange={setPresentation}
      />
      <pre data-testid="presentation-state">{JSON.stringify(presentation)}</pre>
    </>
  );
}

function readPresentation(): BaseMapPresentationConfig {
  return JSON.parse(screen.getByTestId("presentation-state").textContent ?? "{}");
}

describe("BaseMapStyleControl", () => {
  afterEach(() => {
    cleanup();
  });

  it("commits a valid typed brightness on blur and updates presentation", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const num = screen.getByTestId("config-bm-pres-brightness-number");
    await user.clear(num);
    await user.type(num, "1.25");
    fireEvent.blur(num);
    const p = readPresentation();
    expect(p.brightness).toBe(1.25);
    expect(p.contrast).toBe(1);
    expect(p.gamma).toBe(1);
    expect(p.saturation).toBe(1);
  });

  it("clamps an out-of-range typed value on blur through normalize", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const num = screen.getByTestId("config-bm-pres-brightness-number");
    await user.clear(num);
    await user.type(num, "10");
    fireEvent.blur(num);
    expect(readPresentation().brightness).toBe(2);
  });

  it("does not commit invalid or empty text on blur (leaves last good state)", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial={{
          ...DEFAULT_BASE_MAP_PRESENTATION,
          brightness: 0.8,
        }}
      />,
    );
    const num = screen.getByTestId("config-bm-pres-brightness-number");
    await user.click(num);
    fireEvent.change(num, { target: { value: "nope" } });
    fireEvent.blur(num);
    expect(readPresentation().brightness).toBe(0.8);
    expect(num).toHaveValue(0.8);
  });

  it("keeps last good state when blurring with an empty field", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial={{
          ...DEFAULT_BASE_MAP_PRESENTATION,
          contrast: 0.7,
        }}
      />,
    );
    const num = screen.getByTestId("config-bm-pres-contrast-number");
    await user.clear(num);
    fireEvent.blur(num);
    expect(readPresentation().contrast).toBe(0.7);
  });

  it("shows source and license block for legacy default with packaged attribution", () => {
    render(<Harness />);
    const block = screen.getByTestId("config-base-map-source-license");
    expect(block).toHaveAttribute("aria-label", "Source and license");
    expect(screen.getByText("Libration packaged reference map")).toBeInTheDocument();
    expect(
      screen.getByText(/Original shaded-relief basemap shipped with Libration/),
    ).toBeInTheDocument();
  });

  it("shows external source link when political family is selected", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.selectOptions(screen.getByLabelText("Map style"), "equirect-world-political-v1");
    const link = screen.getByRole("link", { name: "Natural Earth" });
    expect(link).toHaveAttribute("href", "https://www.naturalearthdata.com/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("Natural Earth (public domain)")).toBeInTheDocument();
  });

  it("exposes licenseNote and sourceLinks on political catalog option", () => {
    const o = getEquirectBaseMapOptionForId("equirect-world-political-v1");
    expect(o.licenseNote).toMatch(/public domain/i);
    expect(o.sourceLinks?.[0]?.href).toBe("https://www.naturalearthdata.com/");
  });

  it("reset display restores defaults for all presentation fields", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial={{
          brightness: 0.7,
          contrast: 0.6,
          gamma: 0.6,
          saturation: 0.5,
        }}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Reset base map display to defaults" }),
    );
    const p = readPresentation();
    expect(p).toEqual({ ...DEFAULT_BASE_MAP_PRESENTATION });
  });
});
