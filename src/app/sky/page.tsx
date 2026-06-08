'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { skyFontVars } from './fonts';
import TopBar from '@/components/sky/tonight/TopBar';
import PrimeCard from '@/components/sky/tonight/PrimeCard';
import TargetsList from '@/components/sky/tonight/TargetsList';
import SkyMap from '@/components/sky/tonight/SkyMap';
import ObservingWindow from '@/components/sky/tonight/ObservingWindow';
import ConditionsCard from '@/components/sky/tonight/ConditionsCard';
import QuizCard from '@/components/sky/tonight/QuizCard';
import AstraCard from '@/components/sky/tonight/AstraCard';
import StreakCard from '@/components/sky/tonight/StreakCard';
import Scrubber from '@/components/sky/tonight/Scrubber';
import './tonight.css';

export default function SkyPage() {
  // Selecting a target syncs the active row, the targets list, and the sky map.
  const [activeId, setActiveId] = useState('saturn');
  const [mounted, setMounted] = useState(false);

  // Viewport-locked single screen: hide the global app chrome (Nav, Footer,
  // BottomNav) and lock scroll while this page is mounted — see the
  // `html.sky-locked` rules in tonight.css. Restored on unmount.
  useEffect(() => {
    setMounted(true);
    document.documentElement.classList.add('sky-locked');
    return () => { document.documentElement.classList.remove('sky-locked'); };
  }, []);

  // Portal to <body> so the fixed overlay escapes PageTransition's transformed
  // wrapper (a transformed ancestor would otherwise become the containing block
  // for `position: fixed`, trapping the page inside the app shell).
  if (!mounted) return null;

  return createPortal(
    <div className={`skytonight ${skyFontVars}`}>
      <TopBar />

      <div className="skytonight__stage">
        <aside className="skytonight__rail skytonight__rail--left">
          <PrimeCard />
          <TargetsList activeId={activeId} onSelect={setActiveId} />
        </aside>

        <div className="skytonight__center">
          <SkyMap activeId={activeId} onSelect={setActiveId} />
        </div>

        <aside className="skytonight__rail skytonight__rail--right">
          <ObservingWindow />
          <ConditionsCard />
          <QuizCard />
          <AstraCard />
          <StreakCard />
        </aside>
      </div>

      <Scrubber />
    </div>,
    document.body,
  );
}
