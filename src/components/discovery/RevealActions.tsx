'use client';

import { useState } from 'react';
import Link from 'next/link';
import ShippingClaimForm from '@/components/discovery/ShippingClaimForm';
import type { RevealedObject } from '@/lib/discovery/mockReveal';
import { TIER_BY_ID, needsShipping } from '@/lib/discovery/tiers';

function composeUrl(object: RevealedObject): string {
  const tier = TIER_BY_ID[object.tier].name.toUpperCase();
  const text =
    `I just discovered ${object.catalog} · ${object.name} on @stellarr_club. ` +
    `It's ${tier}. See you on Oct 21. stellarr.club/discovery`;
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}

export default function RevealActions({ object }: { object: RevealedObject }) {
  const [claiming, setClaiming] = useState(false);
  const shipping = needsShipping(object.tier);

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-3">
      <a
        href={composeUrl(object)}
        target="_blank"
        rel="noopener noreferrer"
        className="dsc-cta flex items-center justify-center"
        style={{ textDecoration: 'none' }}
      >
        Share Your Discovery
      </a>

      {shipping && !claiming && (
        <button type="button" className="dsc-cta dsc-cta--ghost" onClick={() => setClaiming(true)}>
          Claim Physical Reward
        </button>
      )}

      {shipping && claiming && <ShippingClaimForm onClose={() => setClaiming(false)} />}

      <Link
        href="/leaderboard"
        className="text-center"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          color: 'var(--dsc-ghost-dim)',
          textDecoration: 'underline',
          textUnderlineOffset: 3,
          padding: '6px 0',
        }}
      >
        View Leaderboard
      </Link>
    </div>
  );
}
