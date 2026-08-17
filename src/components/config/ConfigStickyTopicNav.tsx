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

import { useLayoutEffect, useRef, type ReactNode } from "react";

export type ConfigStickyTopicNavProps = {
  /** Current UI-only topic id. Changing it resets the owning `.config-tab-panel` scroll. */
  topic: string;
  testId: string;
  children: ReactNode;
};

/**
 * Compact sticky topic-selector wrapper inside the existing tab-panel scroller.
 * Does not write config. Heading/help copy must stay outside this element.
 */
export function ConfigStickyTopicNav({ topic, testId, children }: ConfigStickyTopicNavProps) {
  const navRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const panel = navRef.current?.closest(".config-tab-panel");
    if (panel instanceof HTMLElement) {
      panel.scrollTop = 0;
    }
  }, [topic]);

  return (
    <div ref={navRef} className="config-topic-nav" data-testid={testId}>
      {children}
    </div>
  );
}
