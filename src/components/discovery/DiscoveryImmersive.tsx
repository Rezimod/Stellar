'use client';

import { useEffect } from 'react';

/**
 * Flags the document as being in Discovery immersive mode so discovery.css can
 * hide the global chrome (Nav / BottomNav / Footer / StarField) and drop
 * #stellar-main's padding.
 *
 * Same contract the /solar-system page uses via `data-solar-immersive` — see
 * the chrome-hiding block in globals.css. Renders nothing.
 */
export default function DiscoveryImmersive() {
  useEffect(() => {
    document.body.setAttribute('data-discovery-immersive', '1');
    return () => document.body.removeAttribute('data-discovery-immersive');
  }, []);

  return null;
}
