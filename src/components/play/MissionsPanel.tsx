'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLogin, usePrivy } from '@privy-io/react-auth';
import { readExpeditionStage, type MissionStage } from '@/lib/solar-system/moon-mission';
import { JOB_ORDER, readJobsDone } from '@/lib/solar-system/moon-jobs';
import { DISCOVERIES, readDiscoveryCount } from '@/lib/solar-system/flight-missions';
import { localRewardSink } from '@/lib/solar-system/achievements';
import { EXPLORE_MAX_STARS, type ExploreProgress } from '@/lib/games/explore';
import { GamePanel } from './GamePanel';

interface MissionsPanelProps {
  onClose: () => void;
}

interface Progress { stage: MissionStage; jobs: number; discoveries: number; records: number }

/** What the saves say, read after mount so the first paint has nothing to
 *  disagree with; and what the platform has credited for it. */
export function MissionsPanel({ onClose }: MissionsPanelProps) {
  const t = useTranslations('play');
  const { ready, authenticated, getAccessToken } = usePrivy();
  const { login } = useLogin();
  const [p, setP] = useState<Progress | null>(null);
  const [credited, setCredited] = useState<ExploreProgress | null>(null);
  useEffect(() => {
    setP({ stage: readExpeditionStage(), jobs: readJobsDone().length, discoveries: readDiscoveryCount(), records: localRewardSink().list().length });
  }, []);
  useEffect(() => {
    if (!ready || !authenticated) { setCredited(null); return; }
    let cancelled = false;
    getAccessToken().catch(() => null).then((token) => {
      if (cancelled || !token) return;
      fetch('/api/games/explore', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: ExploreProgress | null) => { if (!cancelled && d) setCredited(d); })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [ready, authenticated, getAccessToken]);
  const empty = p && p.stage === 'survey' && p.jobs === 0 && p.discoveries === 0 && p.records === 0;
  const max = credited?.maxStars ?? EXPLORE_MAX_STARS;
  const stars = credited?.totalStars ?? 0;
  return (
    <GamePanel title={t('missions')} onClose={onClose}>
      {p && (empty ? <p className="game-missions__empty">{t('missionsPanel.empty')}</p> : (
        <dl className="game-missions">
          <dt>{t('missionsPanel.moon')}</dt>
          <dd data-done={p.stage === 'done'}>{t(`missionsPanel.stage.${p.stage}`)}</dd>
          <dt>{t('missionsPanel.jobs', { n: p.jobs, total: JOB_ORDER.length })}</dt>
          <dd><span className="game-missions__track"><i style={{ width: `${(p.jobs / JOB_ORDER.length) * 100}%` }} /></span></dd>
          <dt>{t('missionsPanel.discoveries', { n: p.discoveries, total: DISCOVERIES.length })}</dt>
          <dd><span className="game-missions__track"><i style={{ width: `${(p.discoveries / DISCOVERIES.length) * 100}%` }} /></span></dd>
          {ready && authenticated && (
            <>
              <dt>{t('stars.credited', { n: stars, max })}</dt>
              <dd data-done={stars >= max}><span className="game-missions__track"><i style={{ width: `${Math.min(100, (stars / max) * 100)}%` }} /></span></dd>
            </>
          )}
        </dl>
      ))}
      {p && ready && !authenticated && (
        <p className="game-missions__signin">
          {t('stars.signIn', { max })}
          <button type="button" className="game-missions__signin-btn"
            onClick={() => login({ loginMethods: ['email', 'google', 'wallet'], walletChainType: 'solana-only' })}>
            {t('stars.signInAction')}
          </button>
        </p>
      )}
    </GamePanel>
  );
}
