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
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import type { TopBandTimeMode } from "../../config/appConfig";
import { formatWallClockInTimeZone } from "../../core/timeFormat";
import { DemoTimeStartFields } from "./DemoTimeStartFields";

function Harness({
  initial,
  disabled = false,
  topBandMode = "utc24" as TopBandTimeMode,
  resolvedReferenceTimeZone = "UTC",
}: {
  initial: string;
  disabled?: boolean;
  topBandMode?: TopBandTimeMode;
  resolvedReferenceTimeZone?: string;
}) {
  const [v, setV] = useState(initial);
  return (
    <>
      <DemoTimeStartFields
        committedStartIsoUtc={v}
        topBandMode={topBandMode}
        resolvedReferenceTimeZone={resolvedReferenceTimeZone}
        disabled={disabled}
        onCommit={setV}
      />
      <span data-testid="committed">{v}</span>
    </>
  );
}

describe("DemoTimeStartFields", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders date above time with display-time labels", () => {
    render(<Harness initial="2030-06-15T12:00:00.000Z" />);
    expect(screen.getByText("Demo start date", { exact: true })).toBeInTheDocument();
    expect(screen.getByText("Demo start time", { exact: true })).toBeInTheDocument();
    const dateEl = screen.getByLabelText("Demo start date");
    const timeEl = screen.getByLabelText("Demo start time");
    expect(dateEl.compareDocumentPosition(timeEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("does not commit partial time text until blur with a valid time", async () => {
    const user = userEvent.setup();
    render(<Harness initial="2030-06-15T12:00:00.000Z" />);
    const timeInput = screen.getByLabelText("Demo start time");
    await user.click(timeInput);
    await user.clear(timeInput);
    await user.type(timeInput, "14:3");
    expect(screen.getByTestId("committed").textContent).toBe("2030-06-15T12:00:00.000Z");

    await user.type(timeInput, "0");
    fireEvent.blur(timeInput);
    expect(screen.getByTestId("committed").textContent).toBe("2030-06-15T14:30:00.000Z");
  });

  it("blur with invalid time text does not change committed value", async () => {
    const user = userEvent.setup();
    render(<Harness initial="2030-06-15T12:00:00.000Z" />);
    const timeInput = screen.getByLabelText("Demo start time");
    await user.click(timeInput);
    await user.clear(timeInput);
    await user.type(timeInput, "not-a-time");
    fireEvent.blur(timeInput);
    expect(screen.getByTestId("committed").textContent).toBe("2030-06-15T12:00:00.000Z");
    expect(timeInput).toHaveValue("12:00:00");
  });

  it("commits valid time on Enter", async () => {
    const user = userEvent.setup();
    render(<Harness initial="2030-06-15T12:00:00.000Z" />);
    const timeInput = screen.getByLabelText("Demo start time");
    await user.click(timeInput);
    await user.clear(timeInput);
    await user.type(timeInput, "18:15:30{enter}");
    expect(screen.getByTestId("committed").textContent).toBe("2030-06-15T18:15:30.000Z");
  });

  it("formats demo start time in 12-hour style when top band mode is local12 (NY wall)", () => {
    render(
      <Harness
        initial="2030-06-15T16:03:03.000Z"
        topBandMode="local12"
        resolvedReferenceTimeZone="America/New_York"
      />,
    );
    const timeInput = screen.getByLabelText("Demo start time") as HTMLInputElement;
    expect(timeInput.value).toMatch(/12:03:03/);
    expect(timeInput.value.toUpperCase()).toMatch(/PM/);
  });

  it("formats demo start time in 24-hour style when top band mode is utc24", () => {
    render(<Harness initial="2030-06-15T18:22:52.000Z" topBandMode="utc24" />);
    const timeInput = screen.getByLabelText("Demo start time") as HTMLInputElement;
    expect(timeInput.value).toBe("18:22:52");
  });

  it("does not show fractional seconds in the time field while ISO keeps milliseconds", () => {
    render(
      <Harness
        initial="2030-06-15T15:53:03.172Z"
        topBandMode="local12"
        resolvedReferenceTimeZone="UTC"
      />,
    );
    const timeInput = screen.getByLabelText("Demo start time") as HTMLInputElement;
    expect(timeInput.value).toBe(
      formatWallClockInTimeZone(Date.parse("2030-06-15T15:53:03.172Z"), "UTC", true),
    );
    expect(screen.getByTestId("committed").textContent).toBe("2030-06-15T15:53:03.172Z");
  });

  it("refreshes blurred time display when top band mode changes", () => {
    const onCommit = vi.fn();
    const { rerender } = render(
      <DemoTimeStartFields
        committedStartIsoUtc="2030-06-15T15:30:00.000Z"
        topBandMode="utc24"
        resolvedReferenceTimeZone="UTC"
        disabled={false}
        onCommit={onCommit}
      />,
    );
    const timeInput = screen.getByLabelText("Demo start time") as HTMLInputElement;
    expect(timeInput.value).toBe("15:30:00");
    rerender(
      <DemoTimeStartFields
        committedStartIsoUtc="2030-06-15T15:30:00.000Z"
        topBandMode="local12"
        resolvedReferenceTimeZone="UTC"
        disabled={false}
        onCommit={onCommit}
      />,
    );
    expect(timeInput.value).toBe(
      formatWallClockInTimeZone(Date.parse("2030-06-15T15:30:00.000Z"), "UTC", true),
    );
  });

  it("commits 12-hour time on Enter under local12 mode", async () => {
    const user = userEvent.setup();
    render(<Harness initial="2030-06-15T12:00:00.000Z" topBandMode="local12" resolvedReferenceTimeZone="UTC" />);
    const timeInput = screen.getByLabelText("Demo start time");
    await user.click(timeInput);
    await user.clear(timeInput);
    await user.type(timeInput, "6:15 pm{enter}");
    expect(screen.getByTestId("committed").textContent).toBe("2030-06-15T18:15:00.000Z");
  });

  it("commits 24-hour time on Enter under utc24 mode", async () => {
    const user = userEvent.setup();
    render(<Harness initial="2030-06-15T12:00:00.000Z" />);
    const timeInput = screen.getByLabelText("Demo start time");
    await user.click(timeInput);
    await user.clear(timeInput);
    await user.type(timeInput, "18:15:30{enter}");
    expect(screen.getByTestId("committed").textContent).toBe("2030-06-15T18:15:30.000Z");
  });

  it("Escape reverts time draft without committing", async () => {
    const user = userEvent.setup();
    render(<Harness initial="2030-06-15T12:00:00.000Z" />);
    const timeInput = screen.getByLabelText("Demo start time");
    await user.click(timeInput);
    await user.clear(timeInput);
    await user.type(timeInput, "23:59:59");
    await user.keyboard("{Escape}");
    expect(screen.getByTestId("committed").textContent).toBe("2030-06-15T12:00:00.000Z");
    expect(timeInput).toHaveValue("12:00:00");
  });

  it("Use current time button commits wall clock as canonical UTC ISO", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2033-07-07T07:07:07.070Z"));
    const onCommit = vi.fn();
    render(
      <DemoTimeStartFields
        committedStartIsoUtc="2030-01-01T00:00:00.000Z"
        topBandMode="utc24"
        resolvedReferenceTimeZone="UTC"
        disabled={false}
        onCommit={onCommit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Set demo start to current time" }));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("2033-07-07T07:07:07.070Z");
    vi.useRealTimers();
  });

  it("native date change commits merged instant preserving wall time-of-day (UTC mode)", () => {
    const onCommit = vi.fn();
    render(
      <DemoTimeStartFields
        committedStartIsoUtc="2030-06-15T12:34:56.789Z"
        topBandMode="utc24"
        resolvedReferenceTimeZone="UTC"
        disabled={false}
        onCommit={onCommit}
      />,
    );
    const dateInput = screen.getByLabelText("Demo start date");
    fireEvent.change(dateInput, { target: { value: "2045-08-01" } });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("2045-08-01T12:34:56.789Z");
  });

  it("time edit commit preserves wall calendar date in reference zone", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial="2030-06-15T16:03:03.789Z"
        topBandMode="local24"
        resolvedReferenceTimeZone="America/New_York"
      />,
    );
    const timeInput = screen.getByLabelText("Demo start time");
    await user.click(timeInput);
    await user.clear(timeInput);
    await user.type(timeInput, "11:00:00{enter}");
    expect(screen.getByTestId("committed").textContent).toBe("2030-06-15T15:00:00.789Z");
  });

  it("date picker commit refreshes time draft when time field had a stale in-progress value", async () => {
    const user = userEvent.setup();
    render(<Harness initial="2030-06-15T12:34:56.789Z" />);
    const timeInput = screen.getByLabelText("Demo start time");
    const dateInput = screen.getByLabelText("Demo start date");
    await user.click(timeInput);
    await user.clear(timeInput);
    await user.type(timeInput, "incomplete");
    fireEvent.change(dateInput, { target: { value: "2040-03-04" } });
    expect(screen.getByTestId("committed").textContent).toBe("2040-03-04T12:34:56.789Z");
    expect(timeInput).toHaveValue("12:34:56");
  });

  it("onCommit is not invoked for time keystrokes alone", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(
      <DemoTimeStartFields
        committedStartIsoUtc="2030-06-15T12:00:00.000Z"
        topBandMode="utc24"
        resolvedReferenceTimeZone="UTC"
        disabled={false}
        onCommit={onCommit}
      />,
    );
    const timeInput = screen.getByLabelText("Demo start time");
    await user.click(timeInput);
    await user.type(timeInput, "x");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("still accepts 24-hour input when top band mode is local12", async () => {
    const user = userEvent.setup();
    render(<Harness initial="2030-06-15T12:00:00.000Z" topBandMode="local12" resolvedReferenceTimeZone="UTC" />);
    const timeInput = screen.getByLabelText("Demo start time");
    await user.click(timeInput);
    await user.clear(timeInput);
    await user.type(timeInput, "18:15:30{enter}");
    expect(screen.getByTestId("committed").textContent).toBe("2030-06-15T18:15:30.000Z");
  });
});
