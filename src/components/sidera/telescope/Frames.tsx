'use client';

import { useState } from 'react';
import { Check, Copy, Download, Maximize2 } from 'lucide-react';

export type Capture = {
  id: string;
  dataUrl: string;
  filename: string;
  /** SHA-256 of the PNG bytes, hex. */
  hash: string;
  targetName: string;
  subs: number;
  exposureSec: number;
};

/** The frames taken this observation, newest first, each with the fingerprint of its bytes. */
export default function Frames({ captures, onOpen }: { captures: Capture[]; onOpen: (c: Capture) => void }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (c: Capture) => {
    void navigator.clipboard?.writeText(c.hash).then(() => {
      setCopied(c.id);
      setTimeout(() => setCopied((id) => (id === c.id ? null : id)), 1400);
    });
  };

  return (
    <section className="sdt-card sdt-frames" aria-label="Captured frames">
      <div className="sdt-row">
        <span className="sd-label">Frames</span>
        <span className="sdt-frames__count">{captures.length}</span>
      </div>
      {captures.length === 0 ? (
        <p className="sdt-hint">Frames you capture land here, fingerprinted. They stay on this device.</p>
      ) : (
        <ul className="sdt-frames__list">
          {captures.map((c) => (
            <li key={c.id} className="sdt-frame">
              <button type="button" className="sdt-frame__art" onClick={() => onOpen(c)} aria-label={`Open ${c.filename}`}>
                {/* A data: URL from this session's own canvas — next/image has nothing to optimise. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.dataUrl} alt="" />
                <span className="sdt-frame__expand" aria-hidden="true"><Maximize2 size={13} /></span>
              </button>
              <div className="sdt-frame__body">
                <p className="sdt-frame__name">{c.targetName}</p>
                <p className="sdt-frame__meta">
                  {c.subs} {c.subs === 1 ? 'sub' : 'subs'} · {(c.subs * c.exposureSec).toFixed(c.exposureSec < 1 ? 2 : 0)} s
                </p>
                <p className="sdt-frame__row">
                  <span className="sdt-frame__hash" title={c.hash}>0x{c.hash.slice(0, 8)}…{c.hash.slice(-6)}</span>
                  <button type="button" className="sdt-icon-btn sdt-icon-btn--sm" aria-label="Copy hash" title="Copy hash" onClick={() => copy(c)}>
                    {copied === c.id ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                  </button>
                  <a className="sdt-icon-btn sdt-icon-btn--sm" href={c.dataUrl} download={c.filename} aria-label={`Download ${c.filename}`} title="Download PNG">
                    <Download size={13} aria-hidden="true" />
                  </a>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="sdt-frames__note">Simulated · not filed</p>
    </section>
  );
}
