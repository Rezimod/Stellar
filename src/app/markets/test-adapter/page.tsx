'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import PageContainer from '@/components/layout/PageContainer';
import {
  useStellarProgram,
  useStellarSigner,
  useReadOnlyProgram,
} from '@/lib/markets/privy-adapter';
import { buildPlaceBetTx, getConfig } from '@/lib/markets';

export default function TestAdapterPage() {
  const { ready, authenticated, login } = usePrivy();
  const program = useStellarProgram();
  const roProgram = useReadOnlyProgram();
  const signer = useStellarSigner();

  const [readResult, setReadResult] = useState<string>('(not run)');
  const [buildResult, setBuildResult] = useState<string>('(not run)');
  const [busy, setBusy] = useState(false);

  async function handleRead() {
    setBusy(true);
    setReadResult('loading…');
    try {
      const cfg = await getConfig(program ?? roProgram);
      if (!cfg) {
        setReadResult('getConfig returned null');
        return;
      }
      setReadResult(
        JSON.stringify(
          {
            admin: cfg.admin.toBase58(),
            mint: cfg.mint.toBase58(),
            nextMarketId: cfg.nextMarketId,
            tokenDecimals: cfg.tokenDecimals,
            paused: cfg.paused,
          },
          null,
          2,
        ),
      );
    } catch (err) {
      setReadResult(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleBuildDummy() {
    setBusy(true);
    setBuildResult('loading…');
    try {
      if (!program || !signer.publicKey) {
        throw new Error('No wallet program available — log in first');
      }
      const cfg = await getConfig(program);
      if (!cfg) throw new Error('Config not initialized on-chain');
      const tx = await buildPlaceBetTx(
        program,
        cfg.mint,
        signer.publicKey,
        1,
        'yes',
        1,
      );
      const bytes = tx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
      const b64 =
        typeof window !== 'undefined'
          ? btoa(String.fromCharCode(...bytes))
          : Buffer.from(bytes).toString('base64');
      console.log('[test-adapter] dummy placeBet tx (base64):', b64);
      setBuildResult(b64);
    } catch (err) {
      setBuildResult(
        `ERROR: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContainer variant="wide" className="py-6 flex flex-col gap-4">
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 26,
          color: 'var(--text)',
          margin: 0,
        }}
      >
        Markets Adapter Diagnostic
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'rgba(255,255,255,0.5)',
          margin: 0,
        }}
      >
        Day 4 sanity ping. Delete this page once bet placement works.
      </p>

      <section
        className="rounded-xl"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: 14,
        }}
      >
        <Row k="privy.ready" v={String(ready)} />
        <Row k="privy.authenticated" v={String(authenticated)} />
        <Row k="signer.isReady" v={String(signer.isReady)} />
        <Row
          k="signer.publicKey"
          v={signer.publicKey ? signer.publicKey.toBase58() : '(null)'}
        />
        <Row k="program (writable)" v={program ? 'loaded' : '(null)'} />
        <Row k="program (readonly)" v={roProgram ? 'loaded' : '(null)'} />

        {!authenticated && (
          <button
            onClick={() => login()}
            disabled={!ready}
            style={{
              marginTop: 10,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'var(--stars)',
              color: 'var(--canvas)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Connect with Privy
          </button>
        )}
      </section>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleRead}
          disabled={busy}
          style={btn()}
        >
          Simulate read (getConfig)
        </button>
        <button
          onClick={handleBuildDummy}
          disabled={busy || !authenticated}
          style={btn()}
        >
          Simulate dummy bet (build only)
        </button>
      </div>

      <section>
        <Label>Read result</Label>
        <Pre>{readResult}</Pre>
      </section>

      <section>
        <Label>Build result (serialized tx base64)</Label>
        <Pre>{buildResult}</Pre>
      </section>
    </PageContainer>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        padding: '4px 0',
        borderBottom: '1px dashed rgba(255,255,255,0.06)',
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.5)' }}>{k}</span>
      <span style={{ color: 'var(--text)', wordBreak: 'break-all', textAlign: 'right' }}>
        {v}
      </span>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.4)',
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre
      style={{
        background: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8,
        padding: 12,
        fontSize: 11,
        color: 'var(--text)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        margin: 0,
      }}
    >
      {children}
    </pre>
  );
}

function btn(): React.CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 8,
    background: 'rgba(232, 130, 107,0.18)',
    color: 'var(--text)',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 600,
    border: '1px solid rgba(232, 130, 107,0.4)',
    cursor: 'pointer',
  };
}
