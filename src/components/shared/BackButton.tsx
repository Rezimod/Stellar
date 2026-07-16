'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ChevronLeft } from 'lucide-react';

export default function BackButton() {
  const router = useRouter();
  const label = useLocale() === 'ka' ? 'უკან' : 'Back';

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-0.5 text-text-muted hover:text-text-primary transition-colors text-xs"
      aria-label={label}
    >
      <ChevronLeft size={16} />
      <span>{label}</span>
    </button>
  );
}
