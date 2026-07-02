'use client';

/**
 * /moon — preview route for the Moon detail view.
 * On-brand rebuild of the Apple Weather moon screen using Stellar tokens.
 * Sample (English) data for now; next step is wiring real /sky moon data
 * into a MoonDetailSheet opened from the Sky summary strip.
 */

import { X } from 'lucide-react';
import './moon.css';

const TICKS = [
  '', 'tall', '', '', 'tall', '', '', 'tall', '', 'now',
  '', 'tall', '', '', 'tall', '', '', 'tall', '',
];

export default function MoonPreviewPage() {
  return (
    <div className="moonpg">
      <div className="moonpg__col">
        <div className="moonpg__bar">
          <div className="moonpg__ctx">Moon · Sky Tonight</div>
          <button className="moonpg__x" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="moonpg__hero">
          <img src="/sky/targets/moon.jpg" alt="The Moon tonight" />
        </div>

        <h1 className="moonpg__title">Waxing Gibbous</h1>
        <p className="moonpg__sub">Monday, March 30 · 1:00 PM</p>
        <div className="moonpg__chipwrap">
          <span className="moonpg__chip"><span className="moonpg__dot" />Visible now</span>
        </div>

        <div className="moonpg__scrub">
          <div className="moonpg__ticks">
            {TICKS.map((c, i) => <i key={i} className={c} />)}
          </div>
          <div className="moonpg__marks">
            <span>SAT</span><span>SUN</span><span className="today">TODAY</span><span>TUE</span><span>WED</span>
          </div>
        </div>

        <div className="moonpg__card">
          <div className="moonpg__row"><span className="moonpg__k">Illumination</span><span className="moonpg__v hi">95%</span></div>
          <div className="moonpg__row"><span className="moonpg__k">Moonset</span><span className="moonpg__v">5:24<small>AM</small></span></div>
          <div className="moonpg__row"><span className="moonpg__k">Moonrise</span><span className="moonpg__v">5:11<small>PM</small></span></div>
          <div className="moonpg__row"><span className="moonpg__k">Next Full Moon</span><span className="moonpg__v">2<small>DAYS</small></span></div>
          <div className="moonpg__row"><span className="moonpg__k">Distance</span><span className="moonpg__v">239,810<small>MI</small></span></div>
        </div>

        <h2 className="moonpg__sectitle">Calendar</h2>
        <div className="moonpg__cal">
          <span className="moonpg__nav">‹</span>
          <span className="moonpg__mo">March 2026</span>
          <span className="moonpg__nav">›</span>
        </div>
      </div>
    </div>
  );
}
