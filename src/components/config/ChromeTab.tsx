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

import { useState } from "react";
import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import { BottomHudEditor } from "./BottomHudEditor";
import { ChromeTopicSelector } from "./ChromeTopicSelector";
import { ConfigStickyTopicNav } from "./ConfigStickyTopicNav";
import { DEFAULT_CHROME_TOPIC, type ChromeTopicId } from "./chromeTopicTypes";
import { HourIndicatorsEditor } from "./HourIndicatorsEditor";
import { NatoTimezoneEditor } from "./NatoTimezoneEditor";
import { ReferenceClockEditor } from "./ReferenceClockEditor";
import { TickTapeEditor } from "./TickTapeEditor";

export type ChromeTabProps = {
  config: LibrationConfigV2;
  /** When set, wired display-time controls call into the guarded update path. */
  updateConfig?: (updater: (draft: LibrationConfigV2) => void) => void;
};

export function ChromeTab({ config, updateConfig }: ChromeTabProps) {
  const [chromeTopic, setChromeTopic] = useState<ChromeTopicId>(DEFAULT_CHROME_TOPIC);

  return (
    <div className="config-tab-stack">
      <section className="config-section" aria-labelledby="config-chrome-heading">
        <h2 id="config-chrome-heading" className="config-section__title">
          Instrument chrome
        </h2>
        <p className="config-section__hint">
          Choose a topic to edit. Reference &amp; clock defines the frame through which the rest of the
          display is interpreted. Other topics edit the bottom HUD and top-strip chrome. Civil-time and
          meridian semantics stay in Reference &amp; clock.
        </p>
        <ConfigStickyTopicNav topic={chromeTopic} testId="chrome-topic-nav">
          <ChromeTopicSelector value={chromeTopic} onChange={setChromeTopic} />
        </ConfigStickyTopicNav>
        {chromeTopic === "referenceAndClock" ? (
          <ReferenceClockEditor config={config} updateConfig={updateConfig} />
        ) : null}
        {chromeTopic === "bottomHud" ? (
          <BottomHudEditor config={config} updateConfig={updateConfig} />
        ) : null}
        {chromeTopic === "hourIndicators" ? (
          <HourIndicatorsEditor config={config} updateConfig={updateConfig} />
        ) : null}
        {chromeTopic === "tickTape" ? (
          <TickTapeEditor config={config} updateConfig={updateConfig} />
        ) : null}
        {chromeTopic === "natoTimezone" ? (
          <NatoTimezoneEditor config={config} updateConfig={updateConfig} />
        ) : null}
      </section>
    </div>
  );
}
