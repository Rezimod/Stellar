'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { readExpeditionStage, type MissionStage } from '@/lib/solar-system/moon-mission';
import { JOB_ORDER, readJobsDone } from '@/lib/solar-system/moon-jobs';
import { DISCOVERIES, readDiscoveryCount } from '@/lib/solar-system/flight-missions';
import { GamePanel } from './GamePanel';

interface MissionsPanelProps {
  onClose: () => void;
}

interface Progress { stage: MissionStage; jobs: number; discoveries: number }

/** What the saves say, read after mount so the first paint has nothing to disagree with. */
export function MissionsPanel({ onClose }: MissionsPanelProps) {
  const t = useTranslations('play');
  const [p, setP] = useState<Progress | null>(null);
  useEffect(() => { setP({ stage: readExpeditionStage(), jobs: readJobsDone().length, discoveries: readDiscoveryCount() }); }, []);
  const empty = p && p.stage === 'survey' && p.jobs === 0 && p.discoveries === 0;
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
        </dl>
      ))}
    </GamePanel>
  );
}
