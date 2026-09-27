'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { FOV_RANGE, getSettings, onSettingsChange, resetSettings, SENSITIVITY_RANGE, updateSettings, type QualityPreset } from '@/game/settings';
import { clearQualityGovernor, governedQuality, QUALITY_LEVELS, type QualityLevel } from '@/game/quality';
import { GamePanel } from './GamePanel';

interface SettingsPanelProps {
  onClose: () => void;
}

const QUALITY_LABEL: Record<QualityLevel, string> = { performance: 'qualityPerformance', balanced: 'qualityBalanced', high: 'qualityHigh' };

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const t = useTranslations('play');
  const s = useSyncExternalStore(onSettingsChange, getSettings, getSettings);
  const governed = governedQuality();
  return (
    <GamePanel title={t('settings')} onClose={onClose}>
      <div className="game-setting">
        <label htmlFor="gs-quality">{t('settingsPanel.quality')}</label>
        <select id="gs-quality" value={s.quality} onChange={(e) => {
          // The player has an opinion: the governor's own finding gives way.
          clearQualityGovernor();
          updateSettings({ quality: e.target.value as QualityPreset });
        }}>
          <option value="auto">{t('settingsPanel.qualityAuto')}</option>
          {QUALITY_LEVELS.map((q) => <option key={q} value={q}>{t(`settingsPanel.${QUALITY_LABEL[q]}`)}</option>)}
        </select>
        <p className="game-setting__note">
          {governed && s.quality === 'auto'
            ? t('settingsPanel.qualityGoverned', { level: t(`settingsPanel.${QUALITY_LABEL[governed]}`) })
            : t('settingsPanel.qualityNote')}
        </p>
      </div>
      <div className="game-setting">
        <label htmlFor="gs-sens">{t('settingsPanel.sensitivity')} <b>{s.sensitivity.toFixed(1)}×</b></label>
        <input id="gs-sens" type="range" min={SENSITIVITY_RANGE[0]} max={SENSITIVITY_RANGE[1]} step={0.1} value={s.sensitivity}
          onChange={(e) => updateSettings({ sensitivity: Number(e.target.value) })} />
      </div>
      <div className="game-setting game-setting--row">
        <label htmlFor="gs-invert">{t('settingsPanel.invertY')}</label>
        <input id="gs-invert" type="checkbox" checked={s.invertY} onChange={(e) => updateSettings({ invertY: e.target.checked })} />
      </div>
      <div className="game-setting">
        <label htmlFor="gs-fov">{t('settingsPanel.fov')} <b>{Math.round(s.fov)}°</b></label>
        <input id="gs-fov" type="range" min={FOV_RANGE[0]} max={FOV_RANGE[1]} step={1} value={s.fov}
          onChange={(e) => updateSettings({ fov: Number(e.target.value) })} />
      </div>
      <div className="game-setting">
        <label htmlFor="gs-vol">{t('settingsPanel.volume')} <b>{Math.round(s.volume * 100)}%</b></label>
        <input id="gs-vol" type="range" min={0} max={1} step={0.05} value={s.volume}
          onChange={(e) => updateSettings({ volume: Number(e.target.value) })} />
      </div>
      <button type="button" className="game-setting__reset" onClick={resetSettings}>{t('settingsPanel.reset')}</button>
    </GamePanel>
  );
}
