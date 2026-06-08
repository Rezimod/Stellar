import Link from 'next/link';
import { location } from './data';

export default function TopBar() {
  return (
    <header className="sky-top">
      <div className="sky-top__row">
        <div className="sky-top__left">
          <button type="button" className="sky-top__hamburger" aria-label="Menu">
            <span /><span /><span />
          </button>
          <span className="sky-top__mark" aria-hidden="true">
            <span className="sky-top__saturn" />
          </span>
          <span className="sky-top__brand">STELLAR</span>
        </div>
        <div className="sky-top__right">
          <button type="button" className="sky-top__icon" aria-label="Search">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.2-3.2" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" className="sky-top__profile" aria-label="Profile">
            <span className="sky-top__avatar" aria-hidden="true" />
            <span className="sky-top__profile-name">Rezi</span>
          </button>
        </div>
      </div>

      <div className="sky-crumb">
        <Link href="/" className="sky-crumb__back">← BACK TO HOME</Link>
        <span className="sky-crumb__loc">
          <span className="sky-crumb__dot" aria-hidden="true" />
          <span className="sky-crumb__city">{location.city}</span>
          <span className="sky-crumb__coords">{location.coords}</span>
        </span>
      </div>
    </header>
  );
}
