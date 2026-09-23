import type { Metadata } from 'next';
import Link from 'next/link';
import SideraShell from '@/components/sidera/SideraShell';

export const metadata: Metadata = { title: 'Not found — Sidera', robots: { index: false } };

export default function NotFound() {
  return (
    <SideraShell title="Not found">
      <section className="sd-container sd-top">
        <div className="sd-gate">
          <p className="sd-label">Not found</p>
          <p className="sd-lede">Nothing is catalogued at this address. The set, the capsules and tonight&rsquo;s card are below.</p>
          <div className="sd-links" style={{ justifyContent: 'center' }}>
            <Link href="/set/001" className="sd-chip">Set 001</Link>
            <Link href="/capsules" className="sd-chip">Capsules</Link>
            <Link href="/tonight" className="sd-chip">Tonight</Link>
          </div>
        </div>
      </section>
    </SideraShell>
  );
}
