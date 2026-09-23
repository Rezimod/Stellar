'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * A dialog over the desk, portalled to the body so no stacking context on the
 * page can hold it under the header. It carries `.sidera` itself: the tokens
 * are scoped to that class, and the body is outside the page's tree.
 */
export default function DeskModal({
  title,
  onClose,
  wide,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  /** Pinned under the scrolling body, so its actions never scroll away. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus moves into the dialog, unless a field inside it has already taken it.
  useEffect(() => {
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus();
  }, []);

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
    <div className="sidera sdt-modal" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`sdt-modal__panel${wide ? ' sdt-modal__panel--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="sdt-modal__close" onClick={onClose}>
          Close
          <X size={16} aria-hidden="true" />
        </button>
        <div className="sdt-modal__body">{children}</div>
        {footer && <div className="sdt-modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
