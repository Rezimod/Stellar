'use client';

// Daily telescope-imagery gallery for the Sky page. Pulls real, daily-updated
// images from /api/space-images (NASA APOD + curated flagship releases).
// Cards open a lightweight popup with the photo's details and a link out to
// the source (NASA / ESA / Webb / Hubble).

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, X } from 'lucide-react';
import './SpaceGallery.css';

interface SpaceImage {
  id: string;
  title: string;
  date: string;
  summary: string;
  imageUrl: string;
  source: 'NASA' | 'ESA' | 'Webb' | 'Hubble';
  sourceUrl: string;
  credit?: string;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function SpaceGallery() {
  const [images, setImages] = useState<SpaceImage[] | null>(null);
  const [error, setError] = useState(false);
  const [active, setActive] = useState<SpaceImage | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/space-images');
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        if (!cancelled) setImages(Array.isArray(data.images) ? data.images : []);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const close = useCallback(() => setActive(null), []);
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, close]);

  if (error) return null;

  return (
    <section className="space-gal" aria-label="Daily telescope images">
      <header className="space-gal__head">
        <div>
          <p className="space-gal__eyebrow">Captured by real telescopes</p>
          <h2 className="space-gal__title">Today in deep space</h2>
        </div>
        <span className="space-gal__sub">NASA · ESA · Webb · updated daily</span>
      </header>

      <div className="space-gal__grid">
        {images == null
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="space-gal__skel" aria-hidden="true" />)
          : images.map((img) => (
              <GalleryCard key={img.id} img={img} onOpen={() => setActive(img)} />
            ))}
      </div>

      {mounted && active && createPortal(
        <div className="space-gal__overlay" role="dialog" aria-modal="true" aria-label={active.title} onClick={close}>
          <div className="space-gal__modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="space-gal__close" onClick={close} aria-label="Close">
              <X size={18} aria-hidden="true" />
            </button>
            <div className="space-gal__modal-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={active.imageUrl} alt={active.title} loading="lazy" decoding="async" />
            </div>
            <div className="space-gal__modal-body">
              <span className={`space-gal__badge space-gal__badge--${active.source.toLowerCase()}`}>{active.source}</span>
              <h3 className="space-gal__modal-title">{active.title}</h3>
              <p className="space-gal__modal-meta">{fmtDate(active.date)}{active.credit ? ` · ${active.credit}` : ''}</p>
              <p className="space-gal__modal-text">{active.summary}</p>
              <a
                className="space-gal__link"
                href={active.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on {active.source} <ExternalLink size={14} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
}

function GalleryCard({ img, onOpen }: { img: SpaceImage; onOpen: () => void }) {
  const [broken, setBroken] = useState(false);
  return (
    <button type="button" className="space-gal__card" onClick={onOpen} aria-label={`${img.title} — ${img.source}`}>
      <span className="space-gal__thumb">
        {broken ? (
          <span className="space-gal__thumb-fallback" aria-hidden="true" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.imageUrl} alt={img.title} loading="lazy" decoding="async" onError={() => setBroken(true)} />
        )}
        <span className={`space-gal__badge space-gal__badge--${img.source.toLowerCase()}`}>{img.source}</span>
      </span>
      <span className="space-gal__card-body">
        <span className="space-gal__card-title">{img.title}</span>
        <span className="space-gal__card-date">{fmtDate(img.date)}</span>
      </span>
    </button>
  );
}
