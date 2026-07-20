'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface Props {
  open: boolean;
  /**
   * DOMRect of the trigger element. Used on desktop to place the popover near
   * the click. Ignored on mobile, where the panel always docks to the bottom
   * of the viewport so it stays close to the user's thumb.
   */
  anchorRect: DOMRect | null;
  onClose: () => void;
  ariaLabel?: string;
  children: React.ReactNode;
  /** Max width in px for desktop popover. Default 340. */
  maxWidth?: number;
}

interface Pos {
  top: number;
  left: number;
  width: number;
  placement: 'below' | 'above';
  arrowLeft: number;
}

const MOBILE_BREAKPOINT = 640;

export default function AnchoredPanel({
  open,
  anchorRect,
  onClose,
  ariaLabel,
  children,
  maxWidth = 340,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!open) return;
    const update = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !anchorRect || isMobile) {
      setPos(null);
      return;
    }
    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 10;
      const panel = panelRef.current;
      const panelHeight = panel?.offsetHeight ?? 280;
      const panelWidth = Math.min(maxWidth, vw - margin * 2);

      const spaceBelow = vh - anchorRect.bottom;
      const spaceAbove = anchorRect.top;
      const placement: 'below' | 'above' =
        spaceBelow >= panelHeight + margin || spaceBelow >= spaceAbove ? 'below' : 'above';

      let top =
        placement === 'below'
          ? anchorRect.bottom + margin
          : anchorRect.top - panelHeight - margin;
      if (top + panelHeight > vh - margin) top = vh - panelHeight - margin;
      if (top < margin) top = margin;

      const anchorCenterX = anchorRect.left + anchorRect.width / 2;
      let left = anchorCenterX - panelWidth / 2;
      if (left < margin) left = margin;
      if (left + panelWidth > vw - margin) left = vw - margin - panelWidth;

      const arrowLeft = Math.max(14, Math.min(panelWidth - 14, anchorCenterX - left));
      setPos({ top, left, width: panelWidth, placement, arrowLeft });
    };
    compute();
    const id = requestAnimationFrame(compute);
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [open, anchorRect, maxWidth, isMobile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const panelBg = 'var(--canvas, #0E1320)';
  const panelBorder = '1px solid rgba(var(--ink), 0.08)';

  // Mobile: bottom sheet docked at bottom of viewport. Always visible near
  // the user's thumb, regardless of scroll position or where the trigger
  // is on the page.
  if (isMobile) {
    return (
      <div
        role="dialog"
        aria-label={ariaLabel}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
          background: 'rgba(7,11,20,0.55)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            background: panelBg,
            border: panelBorder,
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            padding: '14px 16px 22px',
            boxShadow: '0 -10px 32px rgba(0,0,0,0.5)',
            maxHeight: '78vh',
            overflowY: 'auto',
          }}
        >
          <div
            aria-hidden
            style={{
              width: 38,
              height: 4,
              borderRadius: 999,
              background: 'rgba(var(--ink), 0.18)',
              margin: '0 auto 10px',
            }}
          />
          {children}
        </div>
      </div>
    );
  }

  // Desktop: anchored popover near the click.
  if (!anchorRect) return null;

  return (
    <div
      role="dialog"
      aria-label={ariaLabel}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(7,11,20,0.32)',
      }}
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: pos?.top ?? -9999,
          left: pos?.left ?? -9999,
          width: pos?.width ?? maxWidth,
          background: panelBg,
          border: panelBorder,
          borderRadius: 14,
          padding: 14,
          boxShadow: '0 14px 32px rgba(0,0,0,0.5)',
          maxHeight: '70vh',
          overflowY: 'auto',
          opacity: pos ? 1 : 0,
          transition: 'opacity 120ms ease',
        }}
      >
        {pos && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: pos.arrowLeft - 6,
              top: pos.placement === 'below' ? -6 : undefined,
              bottom: pos.placement === 'above' ? -6 : undefined,
              width: 11,
              height: 11,
              transform: 'rotate(45deg)',
              background: panelBg,
              borderTop: pos.placement === 'below' ? panelBorder : 'none',
              borderLeft: pos.placement === 'below' ? panelBorder : 'none',
              borderBottom: pos.placement === 'above' ? panelBorder : 'none',
              borderRight: pos.placement === 'above' ? panelBorder : 'none',
            }}
          />
        )}
        {children}
      </div>
    </div>
  );
}
