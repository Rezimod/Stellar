'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { CosmicLoader } from '@/components/solar-system/CosmicLoader';
import { useSideraAuth } from '@/components/sidera/SideraAuth';

const load = () => import('./GameShell');
const loader = () => <div className="game-shell"><CosmicLoader label="Voyage" progress={0.02} /></div>;

/** The whole game is one chunk that only this route asks for. */
const GameShell = dynamic(load, { ssr: false, loading: loader });

/**
 * A saved session brings Privy in as the page settles, and Privy arriving
 * remounts the page. The game waits for that, so the scene is built once;
 * its chunk downloads meanwhile.
 */
export default function VoyageClient() {
  const { settled } = useSideraAuth();
  useEffect(() => {
    load();
  }, []);
  return settled ? <GameShell /> : loader();
}
