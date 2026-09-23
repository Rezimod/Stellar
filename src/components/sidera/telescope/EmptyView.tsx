'use client';

import Link from 'next/link';
import { Info, Telescope } from 'lucide-react';

/** No telescope on the line yet: one thing to do, and two ways to learn how. */
export default function EmptyView({ onSelect, onGuide }: { onSelect: () => void; onGuide: () => void }) {
  return (
    <div className="sdt-empty">
      <span className="sdt-empty__icon" aria-hidden="true"><Telescope size={44} strokeWidth={1.25} /></span>
      <h2 className="sdt-empty__title">No telescope connected</h2>
      <p className="sdt-empty__lead">Connect to a station under a dark sky, then drive it from the controls beside the view.</p>
      <button type="button" className="sd-btn sd-btn--primary" onClick={onSelect}>
        <Telescope size={16} aria-hidden="true" />
        Select a telescope
      </button>
      <div className="sdt-empty__links">
        <button type="button" onClick={onGuide}>A frame in ten minutes<Info size={14} aria-hidden="true" /></button>
        <Link href="/node">About Node 01<Info size={14} aria-hidden="true" /></Link>
      </div>
    </div>
  );
}
