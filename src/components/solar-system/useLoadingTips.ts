'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

const TIP_COUNT = 8;

/** The lines the loading screens hand out, in a different order each
 *  mount so a returning pilot does not read the same first one every time. */
export function useLoadingTips(): string[] {
  const t = useTranslations('solarSystem.loading.tips');
  return useMemo(() => {
    const all = Array.from({ length: TIP_COUNT }, (_, i) => t(`t${i + 1}`));
    const start = Math.floor(Math.random() * all.length);
    return [...all.slice(start), ...all.slice(0, start)];
  }, [t]);
}
