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
import { useCallback, useState, type ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { displayTimeModeFromTopBandTimeMode } from "../../core/displayTimeMode.ts";
import { resolveEffectiveTopBandHourMarkers } from "../../config/topBandHourMarkersResolver.ts";
import type { TopBandTimeMode } from "../../config/appConfig";
import {
  defaultLibrationConfigV2,
  normalizeLibrationConfig,
  type LibrationConfigV2,
} from "../../config/v2/librationConfig";
import { HourMarkersEditor } from "./HourMarkersEditor";

function HourMarkersHarness({
  initial,
  children,
}: {
  initial: LibrationConfigV2;
  children?: (ctx: {
    config: LibrationConfigV2;
    updateConfig: (updater: (draft: LibrationConfigV2) => void) => void;
  }) => ReactNode;
}) {
  const [config, setConfig] = useState(() => normalizeLibrationConfig(initial));
  const updateConfig = useCallback((updater: (draft: LibrationConfigV2) => void) => {
    setConfig((prev) => {
      const draft = normalizeLibrationConfig(prev);
      updater(draft);
      return normalizeLibrationConfig(draft);
    });
  }, []);
  return (
    <>
      <HourMarkersEditor config={config} updateConfig={updateConfig} />
      {children?.({ config, updateConfig })}
    </>
  );
}

function baseCustomHourMarkers(
  overrides: Partial<LibrationConfigV2["chrome"]["layout"]["hourMarkers"]> = {},
  topBandMode?: TopBandTimeMode,
): LibrationConfigV2 {
  const d = defaultLibrationConfigV2();
  const hm = d.chrome.layout.hourMarkers;
  const chromeBase = {
    ...d.chrome,
    layout: {
      ...d.chrome.layout,
      hourMarkers: {
        ...hm,
        realization: { kind: "text", fontAssetId: "zeroes-one", appearance: {} },
        layout: { sizeMultiplier: 1 },
        ...overrides,
      },
    },
  };
  const chrome =
    topBandMode !== undefined
      ? { ...chromeBase, displayTime: { ...d.chrome.displayTime, topBandMode } }
      : chromeBase;
  return normalizeLibrationConfig({
    ...d,
    chrome,
  } as LibrationConfigV2);
}

describe("HourMarkersEditor structured authoring", () => {
  afterEach(() => {
    cleanup();
  });

  it("realization kind change resets appearance for the new kind", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers({
          realization: { kind: "text", fontAssetId: "zeroes-one", appearance: { color: "#112233" } },
        })}
      >
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i }), {
      target: { value: "radialLine" },
    });

    expect(last!.chrome.layout.hourMarkers.realization).toEqual({ kind: "radialLine", appearance: {} });
  });

  it("text path: font change updates structured realization", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers({
          realization: { kind: "text", fontAssetId: "dseg7modern-regular", appearance: {} },
        })}
      >
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /Font for top-band hour disk numerals/i }), {
      target: { value: "computer" },
    });

    expect(last!.chrome.layout.hourMarkers.realization).toMatchObject({
      kind: "text",
      fontAssetId: "computer",
    });
  });

  it("realization kind select updates glyph mode", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers({
          realization: { kind: "analogClock", appearance: {} },
        })}
      >
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i }), {
      target: { value: "radialWedge" },
    });

    expect(last!.chrome.layout.hourMarkers.realization).toEqual({ kind: "radialWedge", appearance: {} });
  });

  it("color and size write structured fields only", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness initial={baseCustomHourMarkers()}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );

    fireEvent.change(screen.getByLabelText(/Top-band hour marker color/i), {
      target: { value: "#aabbcc" },
    });
    expect(last!.chrome.layout.hourMarkers.realization).toMatchObject({
      appearance: { color: "#aabbcc" },
    });

    fireEvent.change(screen.getByRole("slider", { name: /Hour marker size multiplier/i }), {
      target: { value: "1.5" },
    });
    expect(last!.chrome.layout.hourMarkers.layout.sizeMultiplier).toBe(1.5);
  });

  it("content row padding inputs update canonical layout.padding fields", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness initial={baseCustomHourMarkers()}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );

    fireEvent.change(
      screen.getByRole("spinbutton", { name: /Top padding of the hour-marker content row/i }),
      { target: { value: "4" } },
    );
    expect(last!.chrome.layout.hourMarkers.layout.contentPaddingTopPx).toBe(4);

    fireEvent.change(
      screen.getByRole("spinbutton", { name: /Bottom padding of the hour-marker content row/i }),
      { target: { value: "-2" } },
    );
    expect(last!.chrome.layout.hourMarkers.layout.contentPaddingBottomPx).toBe(-2);

    fireEvent.change(
      screen.getByRole("spinbutton", { name: /Top padding of the hour-marker content row/i }),
      { target: { value: "" } },
    );
    expect(last!.chrome.layout.hourMarkers.layout.contentPaddingTopPx).toBeUndefined();
  });

  it("indicator entries area visibility toggles config and disables subordinate controls when hidden", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness initial={baseCustomHourMarkers()}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );
    const areaCb = screen.getByRole("checkbox", {
      name: /Show 24-hour indicator entries area above the tick tape/i,
    });
    expect(areaCb).toBeChecked();
    expect(
      screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i }),
    ).not.toBeDisabled();

    fireEvent.click(areaCb);
    expect(last!.chrome.layout.hourMarkers.indicatorEntriesAreaVisible).toBe(false);
    expect(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i })).toBeDisabled();

    fireEvent.click(areaCb);
    expect(last!.chrome.layout.hourMarkers.indicatorEntriesAreaVisible).not.toBe(false);
    expect(
      screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i }),
    ).not.toBeDisabled();
  });

  it("noon/midnight customization toggles structured config", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness initial={baseCustomHourMarkers()}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );
    const customize = screen.getByRole("checkbox", {
      name: /Customize noon and midnight indicator entries/i,
    });
    expect(customize).toBeChecked();
    expect(last!.chrome.layout.hourMarkers.noonMidnightCustomization).toEqual({
      enabled: true,
      expressionMode: "boxedNumber",
    });
    fireEvent.click(customize);
    expect(last!.chrome.layout.hourMarkers.noonMidnightCustomization).toBeUndefined();
    fireEvent.click(customize);
    expect(last!.chrome.layout.hourMarkers.noonMidnightCustomization).toEqual({
      enabled: true,
      expressionMode: "boxedNumber",
    });
    fireEvent.change(screen.getByRole("combobox", { name: /Noon and midnight expression mode/i }), {
      target: { value: "semanticGlyph" },
    });
    expect(last!.chrome.layout.hourMarkers.noonMidnightCustomization).toEqual({
      enabled: true,
      expressionMode: "semanticGlyph",
    });
    fireEvent.click(customize);
    expect(last!.chrome.layout.hourMarkers.noonMidnightCustomization).toBeUndefined();
  });

  it("defaults noon/midnight to enabled and Boxed number when realization is text", () => {
    render(<HourMarkersHarness initial={baseCustomHourMarkers()} />);
    expect(
      screen.getByRole("checkbox", { name: /Customize noon and midnight indicator entries/i }),
    ).toBeChecked();
    expect(screen.getByRole("combobox", { name: /Noon and midnight expression mode/i })).toHaveValue("boxedNumber");
  });

  it("noon/midnight controls are absent when realization is not text", () => {
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers({
          realization: { kind: "analogClock", appearance: {} },
        })}
      />,
    );
    expect(screen.queryByRole("checkbox", { name: /Customize noon and midnight indicator entries/i })).toBeNull();
    expect(screen.queryByRole("combobox", { name: /Noon and midnight expression mode/i })).toBeNull();
  });

  it("Realization fieldset order: kind, then noon/midnight for text", () => {
    const { container } = render(<HourMarkersHarness initial={baseCustomHourMarkers()} />);
    const legend = Array.from(container.querySelectorAll("legend")).find((el) => el.textContent === "Realization");
    const fieldset = legend?.closest("fieldset");
    expect(fieldset).toBeTruthy();
    const rows = fieldset!.querySelectorAll(".config-control-row");
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[0]?.textContent).toContain("Realization kind");
    expect(rows[1]?.textContent).toContain("Customize noon / midnight");
  });

  it("switching realization away from text and back preserves authored noon/midnight customization", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers({
          noonMidnightCustomization: { enabled: true, expressionMode: "semanticGlyph" },
        })}
      >
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );
    fireEvent.change(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i }), {
      target: { value: "radialLine" },
    });
    expect(last!.chrome.layout.hourMarkers.noonMidnightCustomization).toEqual({
      enabled: true,
      expressionMode: "semanticGlyph",
    });
    fireEvent.change(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i }), {
      target: { value: "text" },
    });
    expect(last!.chrome.layout.hourMarkers.noonMidnightCustomization).toEqual({
      enabled: true,
      expressionMode: "semanticGlyph",
    });
  });

  it("radialLine appearance exposes line color and face color controls", () => {
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers({
          realization: { kind: "radialLine", appearance: {} },
        })}
      />,
    );
    expect(
      screen.getByLabelText(/Top-band radial line hour marker line color/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Top-band radial line hour marker face color/i),
    ).toBeInTheDocument();
  });

  it("radialWedge appearance exposes edge, face, and wedge fill controls", () => {
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers({
          realization: { kind: "radialWedge", appearance: {} },
        })}
      />,
    );
    expect(
      screen.getByLabelText(/Top-band radial wedge hour marker edge color/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Top-band radial wedge hour marker face color/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Top-band radial wedge hour marker wedge fill color/i),
    ).toBeInTheDocument();
  });

  it("noon/midnight expression mode is preserved in the editor when customization is toggled off then on", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness initial={baseCustomHourMarkers()}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );
    const customize = screen.getByRole("checkbox", {
      name: /Customize noon and midnight indicator entries/i,
    });
    fireEvent.change(screen.getByRole("combobox", { name: /Noon and midnight expression mode/i }), {
      target: { value: "semanticGlyph" },
    });
    expect(last!.chrome.layout.hourMarkers.noonMidnightCustomization).toEqual({
      enabled: true,
      expressionMode: "semanticGlyph",
    });
    fireEvent.click(customize);
    expect(last!.chrome.layout.hourMarkers.noonMidnightCustomization).toBeUndefined();
    fireEvent.click(customize);
    expect(last!.chrome.layout.hourMarkers.noonMidnightCustomization).toEqual({
      enabled: true,
      expressionMode: "semanticGlyph",
    });
  });
});

describe("HourMarkersEditor UTC vs authored realization", () => {
  afterEach(() => {
    cleanup();
  });

  it("UTC + legacy procedural on disk normalizes to text-authored (selector is Text, not a proxy)", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers(
          { realization: { kind: "analogClock", appearance: { handColor: "#112233" } } },
          "utc24",
        )}
      >
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );
    const sel = screen.getByTestId("chrome-hour-marker-realization-kind-select");
    expect(sel.querySelectorAll("option")).toHaveLength(1);
    expect(sel).toHaveValue("text");
    expect(sel).not.toBeDisabled();
    expect(last!.chrome.layout.hourMarkers.realization.kind).toBe("text");
  });

  it("round-trip UTC then 12hr leaves authored text; user can switch to procedural kinds explicitly", () => {
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers(
          { realization: { kind: "radialLine", appearance: { lineColor: "#445566" } } },
          "utc24",
        )}
      >
        {({ updateConfig }) => (
          <button
            type="button"
            data-testid="to-local12"
            onClick={() =>
              updateConfig((draft) => {
                draft.chrome.displayTime.topBandMode = "local12";
              })
            }
          />
        )}
      </HourMarkersHarness>,
    );
    expect(screen.queryByTestId("chrome-hour-marker-utc-procedural-preserved-hint")).toBeNull();
    fireEvent.click(screen.getByTestId("to-local12"));
    expect(screen.getByTestId("chrome-hour-marker-realization-kind-select").querySelectorAll("option")).toHaveLength(4);
    expect(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i })).toHaveValue("text");
    fireEvent.change(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i }), {
      target: { value: "radialLine" },
    });
    expect(screen.getByLabelText(/Top-band radial line hour marker line color/i)).toBeInTheDocument();
  });

  it("redundant same-kind realization select change does not wipe text appearance", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers({
          realization: { kind: "text", fontAssetId: "zeroes-one", appearance: { color: "#aabbcc" } },
        })}
      >
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );
    fireEvent.change(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i }), {
      target: { value: "text" },
    });
    expect(last!.chrome.layout.hourMarkers.realization).toEqual({
      kind: "text",
      fontAssetId: "zeroes-one",
      appearance: { color: "#aabbcc" },
    });
  });

  it("repeated UTC / non-UTC toggles keep authored text after first UTC entry; resolver matches", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers({ realization: { kind: "radialWedge", appearance: {} } }, "local24")}
      >
        {({ config, updateConfig }) => {
          last = config;
          return (
            <button
              type="button"
              data-testid="flip-utc-24"
              onClick={() =>
                updateConfig((draft) => {
                  draft.chrome.displayTime.topBandMode =
                    draft.chrome.displayTime.topBandMode === "utc24" ? "local24" : "utc24";
                })
              }
            />
          );
        }}
      </HourMarkersHarness>,
    );
    const flip = screen.getByTestId("flip-utc-24");
    fireEvent.click(flip);
    expect(last!.chrome.displayTime.topBandMode).toBe("utc24");
    expect(last!.chrome.layout.hourMarkers.realization.kind).toBe("text");
    expect(
      resolveEffectiveTopBandHourMarkers(last!.chrome.layout, {
        displayTimeMode: displayTimeModeFromTopBandTimeMode(last!.chrome.displayTime.topBandMode),
      }).realization.kind,
    ).toBe("text");

    fireEvent.click(flip);
    expect(last!.chrome.displayTime.topBandMode).toBe("local24");
    expect(
      resolveEffectiveTopBandHourMarkers(last!.chrome.layout, {
        displayTimeMode: displayTimeModeFromTopBandTimeMode(last!.chrome.displayTime.topBandMode),
      }).realization.kind,
    ).toBe("text");

    fireEvent.click(flip);
    fireEvent.click(flip);
    expect(last!.chrome.displayTime.topBandMode).toBe("local24");
    expect(last!.chrome.layout.hourMarkers.realization.kind).toBe("text");
  });

  it("entering UTC from analogClock rewrites realization to text in one normalized commit", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers(
          { realization: { kind: "analogClock", appearance: { handColor: "#112233" } } },
          "local24",
        )}
      >
        {({ config, updateConfig }) => {
          last = config;
          return (
            <button
              type="button"
              data-testid="to-utc"
              onClick={() =>
                updateConfig((draft) => {
                  draft.chrome.displayTime.topBandMode = "utc24";
                })
              }
            />
          );
        }}
      </HourMarkersHarness>,
    );
    fireEvent.click(screen.getByTestId("to-utc"));
    expect(last!.chrome.displayTime.topBandMode).toBe("utc24");
    expect(last!.chrome.layout.hourMarkers.realization).toEqual({ kind: "text", appearance: {} });
  });

  it.each(
    [
      {
        kind: "analogClock",
        appearance: { handColor: "#aabbcc" },
        subLabel: /Top-band analog hour marker hand color/i,
      },
      {
        kind: "radialLine",
        appearance: { lineColor: "#ccddee" },
        subLabel: /Top-band radial line hour marker line color/i,
      },
      {
        kind: "radialWedge",
        appearance: { edgeColor: "#eeff00" },
        subLabel: /Top-band radial wedge hour marker edge color/i,
      },
    ] as const,
  )(
    "after UTC, leaving civil mode keeps text until user picks $kind again",
    ({ kind, appearance, subLabel }) => {
      let last: LibrationConfigV2 | null = null;
      render(
        <HourMarkersHarness
          initial={baseCustomHourMarkers({ realization: { kind, appearance } }, "utc24")}
        >
          {({ config, updateConfig }) => {
            last = config;
            return (
              <button
                type="button"
                data-testid="to-local24"
                onClick={() =>
                  updateConfig((draft) => {
                    draft.chrome.displayTime.topBandMode = "local24";
                  })
                }
              />
            );
          }}
        </HourMarkersHarness>,
      );
      expect(screen.getByTestId("chrome-hour-marker-realization-kind-select")).not.toBeDisabled();
      fireEvent.click(screen.getByTestId("to-local24"));
      expect(last!.chrome.layout.hourMarkers.realization).toEqual({ kind: "text", appearance: {} });
      expect(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i })).toHaveValue("text");
      fireEvent.change(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i }), {
        target: { value: kind },
      });
      expect(last!.chrome.layout.hourMarkers.realization).toEqual({ kind, appearance: {} });
      expect(screen.getByLabelText(subLabel)).toBeInTheDocument();
    },
  );

  it("multi-step mode switches: non-text → UTC commits text, then civil modes keep text until changed", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers({
          realization: { kind: "radialLine", appearance: { lineColor: "#010203", faceColor: "#040506" } },
        })}
      >
        {({ config, updateConfig }) => {
          last = config;
          return (
            <>
              <button
                type="button"
                data-testid="set-utc"
                onClick={() => {
                  updateConfig((d) => {
                    d.chrome.displayTime.topBandMode = "utc24";
                  });
                }}
              />
              <button
                type="button"
                data-testid="set-local24"
                onClick={() => {
                  updateConfig((d) => {
                    d.chrome.displayTime.topBandMode = "local24";
                  });
                }}
              />
              <button
                type="button"
                data-testid="set-local12"
                onClick={() => {
                  updateConfig((d) => {
                    d.chrome.displayTime.topBandMode = "local12";
                  });
                }}
              />
            </>
          );
        }}
      </HourMarkersHarness>,
    );
    expect(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i })).toHaveValue(
      "radialLine",
    );
    fireEvent.click(screen.getByTestId("set-utc"));
    expect(last!.chrome.displayTime.topBandMode).toBe("utc24");
    expect(screen.getByTestId("chrome-hour-marker-realization-kind-select")).not.toBeDisabled();
    expect(last!.chrome.layout.hourMarkers.realization).toEqual({ kind: "text", appearance: {} });

    fireEvent.click(screen.getByTestId("set-local24"));
    expect(last!.chrome.displayTime.topBandMode).toBe("local24");
    expect(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i })).toHaveValue("text");
    expect(screen.getByRole("combobox", { name: /Font for top-band hour disk numerals/i })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("set-utc"));
    expect(last!.chrome.layout.hourMarkers.realization.kind).toBe("text");

    fireEvent.click(screen.getByTestId("set-local12"));
    expect(last!.chrome.displayTime.topBandMode).toBe("local12");
    expect(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i })).toHaveValue("text");
    expect(last!.chrome.layout.hourMarkers.realization).toEqual({ kind: "text", appearance: {} });
  });

  it("text-authored UTC mode: realization select stays enabled and edits persist across leaving UTC", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers(
          {
            realization: { kind: "text", fontAssetId: "zeroes-one", appearance: { color: "#c0ffee" } },
          },
          "utc24",
        )}
      >
        {({ config, updateConfig }) => {
          last = config;
          return (
            <button
              type="button"
              data-testid="set-local12"
              onClick={() => {
                updateConfig((d) => {
                  d.chrome.displayTime.topBandMode = "local12";
                });
              }}
            />
          );
        }}
      </HourMarkersHarness>,
    );
    const sel = screen.getByTestId("chrome-hour-marker-realization-kind-select");
    expect(sel).not.toBeDisabled();
    fireEvent.change(screen.getByRole("combobox", { name: /Font for top-band hour disk numerals/i }), {
      target: { value: "computer" },
    });
    expect(last!.chrome.layout.hourMarkers.realization).toMatchObject({
      kind: "text",
      fontAssetId: "computer",
      appearance: { color: "#c0ffee" },
    });
    fireEvent.click(screen.getByTestId("set-local12"));
    expect(last!.chrome.layout.hourMarkers.realization).toEqual({
      kind: "text",
      fontAssetId: "computer",
      appearance: { color: "#c0ffee" },
    });
    expect(screen.getByRole("combobox", { name: /Font for top-band hour disk numerals/i })).toHaveValue("computer");
  });

  it("in UTC, changing indicator entries area background does not change text realization shape", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers(
          {
            realization: { kind: "radialWedge", appearance: { fillColor: "#abcdef" } },
            indicatorEntriesAreaBackgroundColor: "#111111",
          },
          "utc24",
        )}
      >
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );
    fireEvent.change(screen.getByLabelText(/24-hour indicator entries area background color/i), {
      target: { value: "#222222" },
    });
    expect(last!.chrome.layout.hourMarkers.indicatorEntriesAreaBackgroundColor).toBe("#222222");
    expect(last!.chrome.layout.hourMarkers.realization).toEqual({ kind: "text", appearance: {} });
  });
});
