'use client';

import BackButton from '@/components/shared/BackButton';
import { ShoppingBag } from 'lucide-react';

export default function MarketplacePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(245,158,11,0.12)',
        border: '1px solid rgba(245,158,11,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
      }}>
        <ShoppingBag size={36} style={{ color: '#F59E0B' }} />
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>Marketplace</h1>
      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 300, lineHeight: 1.6, margin: '0 0 24px' }}>
        Telescopes, eyepieces, and astronomy gear.
      </p>
      <div style={{
        padding: '12px 28px',
        borderRadius: 24,
        background: 'rgba(245,158,11,0.1)',
        border: '1px solid rgba(245,158,11,0.3)',
        color: '#F59E0B', fontSize: 14, fontWeight: 700,
        letterSpacing: '0.05em',
      }}>
        Coming Soon
      </div>
      <div style={{ marginTop: 40 }}>
        <BackButton />
      </div>
    </div>
  );
}
