'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * A dialog over the console: dark panel, hairline border, one way out.
 * Portalled to the body — the observatory ground is its own stacking context,
 * and nothing inside it can rise above the app's fixed header.
 */
export default function Modal({
  title,
  closeLabel,
  onClose,
  wide,
  children,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="tel-modal" role="presentation" onClick={onClose}>
      <div
        className={`tel-modal__panel${wide ? ' tel-modal__panel--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="tel-modal__close" onClick={onClose}>
          {closeLabel}
          <X size={16} aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
