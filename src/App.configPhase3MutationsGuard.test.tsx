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
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as workingV2Commit from "./app/workingV2Commit";

vi.mock("./components/config/phase3Flags", () => ({
  ALLOW_PHASE3_MUTATIONS: false,
}));

import App from "./App";

describe("Phase 3 mutations guard (ALLOW_PHASE3_MUTATIONS false)", () => {
  afterEach(() => {
    cleanup();
  });

  it("Layers tab: toggling a layer does not call commitWorkingV2Update", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(workingV2Commit, "commitWorkingV2Update");
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Open configuration panel" }));
    await user.click(screen.getByRole("checkbox", { name: "Base map" }));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("Pins tab: add custom pin does not call commitWorkingV2Update", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(workingV2Commit, "commitWorkingV2Update");
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Open configuration panel" }));
    await user.click(screen.getByRole("tab", { name: "Pins" }));
    await user.click(screen.getByRole("button", { name: "Add custom pin" }));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("Pins tab: changing pin scale does not call commitWorkingV2Update", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(workingV2Commit, "commitWorkingV2Update");
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Open configuration panel" }));
    await user.click(screen.getByRole("tab", { name: "Pins" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Pin scale" }), "large");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("Chrome tab: More chrome checkboxes do not call commitWorkingV2Update", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(workingV2Commit, "commitWorkingV2Update");
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Open configuration panel" }));
    await user.click(screen.getByRole("tab", { name: "Chrome" }));
    await user.click(screen.getByRole("checkbox", { name: "Show bottom reference time and date readout" }));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("Data tab: mode and annotation controls do not call commitWorkingV2Update", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(workingV2Commit, "commitWorkingV2Update");
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Open configuration panel" }));
    await user.click(screen.getByRole("tab", { name: "Data" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Data pipeline mode" }), "demo");
    await user.click(screen.getByRole("checkbox", { name: "Show data annotations when available" }));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("Data tab: demo time controls do not call commitWorkingV2Update", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(workingV2Commit, "commitWorkingV2Update");
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Open configuration panel" }));
    await user.click(screen.getByRole("tab", { name: "Data" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Data pipeline mode" }), "demo");
    await user.click(screen.getByRole("checkbox", { name: "Enable demo time" }));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
