'use client';

import { useState, type ReactNode } from 'react';

export type ConsoleTab = { id: string; label: string; panel: ReactNode };

/**
 * The right-hand panel of the console.
 *
 * Hand control, telemetry, events and the log are four different jobs and only
 * one is being done at a time. Stacking them made a column twice the height of
 * the frame; behind tabs they share one float beside it.
 */
export default function ConsoleTabs({ tabs, label }: { tabs: ConsoleTab[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="obs-float">
      <div className="obs-tabs" role="tablist" aria-label={label}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`obs-tab-${tab.id}`}
            aria-selected={tab.id === current?.id}
            aria-controls={`obs-panel-${tab.id}`}
            className="obs-tabs__tab"
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {current && (
        <div
          role="tabpanel"
          id={`obs-panel-${current.id}`}
          aria-labelledby={`obs-tab-${current.id}`}
          className="obs-tabs__panel"
        >
          {current.panel}
        </div>
      )}
    </div>
  );
}
