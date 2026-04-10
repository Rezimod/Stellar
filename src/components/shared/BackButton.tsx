'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors text-sm mb-4"
      aria-label="Go back"
    >
      <ChevronLeft size={16} />
      <span>Back</span>
    </button>
  );
}
