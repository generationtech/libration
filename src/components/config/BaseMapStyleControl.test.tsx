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
import { DEFAULT_EQUIRECT_BASE_MAP_ID } from "../../config/v2/sceneConfig";
import { BaseMapStyleControl } from "./BaseMapStyleControl";

function Harness({
  initial = DEFAULT_BASE_MAP_PRESENTATION,
  mutable = true,
}: {
  initial?: BaseMapPresentationConfig;
  mutable?: boolean;
}) {
  const [presentation, setPresentation] = useState(initial);
  return (
    <>
      <BaseMapStyleControl
        baseMapId={DEFAULT_EQUIRECT_BASE_MAP_ID}
        presentation={presentation}
        mutable={mutable}
        onSelectId={() => {}}
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
