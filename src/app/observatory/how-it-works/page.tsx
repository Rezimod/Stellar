import type { Metadata } from 'next';
import Link from 'next/link';
import BackButton from '@/components/shared/BackButton';
import PageContainer from '@/components/layout/PageContainer';
import { NODES, adapterFor } from '@/lib/observatory/nodes';
import '../observatory.css';

export const metadata: Metadata = {
  title: 'How a capture is proved — Stellar Observatory',
  description:
    'What happens between a mount slewing and a record on chain, and why a simulated frame can never mint, earn or be logged as an observation.',
};

/**
 * The chain of custody, written from the code that enforces it.
 *
 * Every claim on this page names the function that makes it true. That is the
 * point: a provenance story a reader cannot check is marketing. If one of
 * these steps is refactored away, this page is wrong and should be changed
 * with it.
 */

type Step = {
  title: string;
  where: string;
  body: string;
};

const STEPS: Step[] = [
  {
    title: 'The mount says where it pointed',
    where: 'node agent',
    body:
      'A phone photograph of the sky proves very little about where the camera was aimed — which is why verifying one takes a vision model, EXIF, a dedup hash, a reverse-image lookup and a visibility cross-check, and still returns a confidence rather than a fact. A node capture starts from the other end. The mount reports the coordinates it slewed to from its own encoders, and the agent records them beside the frame. The pointing is not a claim anyone made about the picture; it is what the instrument did.',
  },
  {
    title: 'The frame is signed where it was taken',
    where: 'node agent',
    body:
      'The agent signs the capture at the node, before it leaves the owner’s network. Stellar never receives node credentials and never addresses a mount or a camera: every command travels through the adapter, expires, is idempotent by command id, and is re-validated locally by the node against its own altitude envelope, horizon mask and Sun avoidance. A command the cloud approved and the node considers unsafe does not move the telescope.',
  },
  {
    title: 'Provenance is declared by the adapter, never by the client',
    where: 'adapter.ts · capture route',
    body:
      'Every adapter carries a readonly provenance. The capture endpoint reads it from adapterFor(node) and ignores the request body entirely — there is no field a client could set. This is the step that matters most, because it is the one an attacker would look for: a browser cannot describe its own frame as instrument-grade, since it is never asked to describe it at all.',
  },
  {
    title: 'One gate decides what a frame is worth',
    where: 'provenance.ts',
    body:
      'admitToCollection() admits a capture only when its provenance is exactly "instrument", and returns the reason when it refuses. Minting, awarding Stars and writing an observation all pass through that one function rather than each surface remembering to check. A rule enforced in six places is a rule that will eventually be enforced in five.',
  },
  {
    title: 'An admitted capture becomes an ordinary observation',
    where: 'observation_log',
    body:
      'Nothing about the record is special-cased. An admitted capture is written to the same observation log a phone photograph writes to, with the same verification columns and the same chain references — so the gallery, the feed, the passport and the share images keep working with no change at all. A stronger input, in the same shape.',
  },
  {
    title: 'The oracle records it on chain',
    where: 'stellar_observations',
    body:
      'The Proof-of-Observation program stores each observation as its own account, seeded by the hash of the frame — which means re-recording the same image fails at account creation, and dedup is a property of the chain rather than a query we remember to run. Attestations are oracle-signed and written gaslessly on the user’s behalf. The user signed up with an email and never touches a key.',
  },
];

export default function HowItWorksPage() {
  const nodes = NODES;
  const live = nodes.filter((node) => adapterFor(node).provenance === 'instrument');

  return (
    <PageContainer variant="wide" className="obs py-6 sm:py-10">
      <BackButton />

      <header className="mt-4 max-w-2xl">
        <h1 className="text-2xl font-medium sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
          How a capture is proved
        </h1>
        <p className="mt-2 text-base" style={{ color: 'var(--text-secondary)' }}>
          What happens between a mount slewing and a record on chain — and, more usefully,
          what the system refuses to do. Each step below names the code that enforces it.
        </p>
      </header>

      <ol className="mt-8 flex flex-col">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="grid gap-x-4 gap-y-2 border-t py-5 sm:grid-cols-[3rem_minmax(0,1fr)]"
            style={{ borderColor: 'var(--obs-rule)' }}
          >
            <span className="obs-label" style={{ paddingTop: '0.2rem' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
                  {step.title}
                </h2>
                <span className="obs-label">{step.where}</span>
              </div>
              <p className="max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <section
        className="mt-8 border p-5"
        style={{ borderColor: 'var(--obs-rule-strong)', background: 'var(--surface)' }}
      >
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          What a simulated frame cannot do
        </h2>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          The simulator is open to everyone and needs no account. It models the real optical
          train, the real slew times and the real safety envelope, and it refuses the same
          targets the instrument would, for the same reasons. What it produces is a teaching
          tool, not evidence.
        </p>
        <ul className="mt-4 max-w-2xl">
          {[
            'Mint a Discovery Attestation',
            'Award a single Star',
            'Be written to the observation log',
            'Be sold, printed, or delivered as a photograph',
          ].map((refusal) => (
            <li
              key={refusal}
              className="flex items-baseline gap-3 border-t py-2 text-sm"
              style={{ borderColor: 'var(--obs-rule)', color: 'var(--text-secondary)' }}
            >
              <span className="obs-label" style={{ color: 'var(--no)' }}>
                no
              </span>
              {refusal}
            </li>
          ))}
        </ul>
        <p className="mt-3 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          Simulated captures are stored and shown, always labelled. They are never quietly
          mixed in with instrument frames.
        </p>
      </section>

      <section className="mt-6 max-w-2xl">
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          Why the rail exists before the telescope does
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          In July 2026 a certify-all window put fourteen compressed NFTs on Solana mainnet
          carrying <span className="font-mono">Verified: yes</span> for observations that
          nothing had verified. They are still there; they cannot be unwritten, and the
          honest count of genuinely verified mints from that period is zero.
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          A simulator that could mint would be that same mistake, made deliberately and at
          scale. So the gate was built before the first instrument was wired, while it was
          still cheap to be strict — and the network was designed so that the only way to
          produce a record is to actually point a telescope at the sky.
        </p>
      </section>

      <section
        className="mt-6 border p-5"
        style={{ borderColor: 'var(--obs-rule)', background: 'var(--surface)' }}
      >
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          Where this stands tonight
        </h2>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
            {live.length}
          </span>{' '}
          of{' '}
          <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
            {nodes.length}
          </span>{' '}
          {nodes.length === 1 ? 'instrument is' : 'instruments are'} wired to real hardware.
          {live.length === 0 ? (
            <>
              {' '}
              Until that number moves, every frame the network produces is simulated and is
              marked as such everywhere it appears — including here. The steps above are
              built and enforced; what they are waiting for is first light.
            </>
          ) : (
            <> The rest run on the simulator and are labelled wherever they appear.</>
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/observatory/simulator"
            className="inline-block rounded-md border px-3 py-2 text-sm"
            style={{
              borderColor: 'var(--accent-border)',
              background: 'var(--accent-dim)',
              color: 'var(--accent-text)',
            }}
          >
            Open the simulator
          </Link>
          <Link
            href="/observatory"
            className="inline-block rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--obs-rule-strong)', color: 'var(--text-primary)' }}
          >
            See the network
          </Link>
          <Link
            href="/observatory/captures"
            className="inline-block rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--obs-rule-strong)', color: 'var(--text-primary)' }}
          >
            Every capture so far
          </Link>
        </div>
      </section>
    </PageContainer>
  );
}
