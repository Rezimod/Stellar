'use client';

import { useState } from 'react';

/**
 * Shipping details for a physical reward (Epic and Legendary only).
 *
 * ⚠ UI-ONLY. There is no endpoint yet, so this writes to localStorage and says
 * so on screen. A real shipping address is personal data — before this ships it
 * needs a server route, encryption at rest, a retention policy and a privacy
 * notice. Do not quietly point this at production storage.
 */

const STORAGE_KEY = 'stellar_discovery_shipping_draft';

type Fields = {
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  country: string;
};

const EMPTY: Fields = { fullName: '', line1: '', city: '', line2: '', postalCode: '', country: '' };

const REQUIRED: (keyof Fields)[] = ['fullName', 'line1', 'city', 'postalCode', 'country'];

const LABELS: Record<keyof Fields, string> = {
  fullName: 'Full name',
  line1: 'Address',
  line2: 'Apartment, suite (optional)',
  city: 'City',
  postalCode: 'Postal code',
  country: 'Country',
};

export default function ShippingClaimForm({ onClose }: { onClose: () => void }) {
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const missing = REQUIRED.filter((k) => fields[k].trim() === '');
    if (missing.length > 0) {
      setError(`Still needed: ${missing.map((k) => LABELS[k].toLowerCase()).join(', ')}.`);
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
      setSaved(true);
      setError(null);
    } catch {
      setError('Could not save on this device. Check your browser settings.');
    }
  }

  if (saved) {
    return (
      <div className="dsc-glass flex flex-col gap-3 p-4">
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--dsc-cyan)' }}>
          Saved on this device.
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--dsc-ghost-dim)', lineHeight: 1.5 }}>
          Nothing has been sent to Stellarr yet — shipping submission goes live with the reveal.
          You will be asked to confirm this address before anything ships.
        </p>
        <button type="button" className="dsc-cta dsc-cta--ghost" onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="dsc-glass flex flex-col gap-3.5 p-4" noValidate>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--dsc-ghost-dim)', lineHeight: 1.5 }}>
        Where should we ship it? Held on this device only until submission opens.
      </p>

      {(Object.keys(LABELS) as (keyof Fields)[]).map((key) => (
        <div key={key}>
          <label className="dsc-form-label" htmlFor={`ship-${key}`}>
            {LABELS[key]}
          </label>
          <input
            id={`ship-${key}`}
            className="dsc-form-input"
            value={fields[key]}
            autoComplete={
              key === 'fullName'
                ? 'name'
                : key === 'line1'
                  ? 'address-line1'
                  : key === 'line2'
                    ? 'address-line2'
                    : key === 'city'
                      ? 'address-level2'
                      : key === 'postalCode'
                        ? 'postal-code'
                        : 'country-name'
            }
            onChange={(e) => {
              setFields({ ...fields, [key]: e.target.value });
              if (error) setError(null);
            }}
          />
        </div>
      ))}

      <p role="status" aria-live="polite" style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--dsc-amber)', minHeight: 15 }}>
        {error ?? ''}
      </p>

      <div className="flex gap-2.5">
        <button type="submit" className="dsc-cta">
          Save address
        </button>
        <button type="button" className="dsc-cta dsc-cta--ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
