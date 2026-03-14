'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';
import { Keypair, Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { Mail, CheckCircle2 } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';

async function ensureDevnetSol(publicKey: PublicKey) {
  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const balance = await connection.getBalance(publicKey);
    if (balance < 50_000_000) {
      console.log('[Airdrop] Requesting devnet SOL...');
      const sig = await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig);
      console.log('[Airdrop] ✅ 1 SOL airdropped');
    }
  } catch {
    console.log('[Airdrop] Rate limited — user may need faucet.solana.com');
  }
}

function createWalletFromEmail(email: string) {
  const keypair = Keypair.generate();
  localStorage.setItem('stellar_wallet_email', email);
  localStorage.setItem('stellar_wallet_address', keypair.publicKey.toString());
  console.log('[Wallet] Created from email:', email, keypair.publicKey.toString());
  return keypair.publicKey.toString();
}

export default function WalletStep() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { state, setWallet } = useAppState();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const done = state.walletConnected;

  useEffect(() => {
    if (connected && publicKey && !state.walletConnected) {
      console.log('[Wallet] Phantom connected:', publicKey.toBase58());
      setWallet(publicKey.toBase58());
      ensureDevnetSol(publicKey);
    }
  }, [connected, publicKey]);

  // Restore email wallet on mount
  useEffect(() => {
    if (!state.walletConnected) {
      const saved = localStorage.getItem('stellar_wallet_address');
      const savedEmail = localStorage.getItem('stellar_wallet_email');
      if (saved && savedEmail) setWallet(saved);
    }
  }, []);

  const handleEmailWallet = () => {
    if (!email || !email.includes('@')) {
      setEmailError('Enter a valid email');
      return;
    }
    setEmailError('');
    const address = createWalletFromEmail(email);
    setWallet(address);
  };

  return (
    <Card glow={done ? 'emerald' : null} className={done ? 'animate-pulse-success' : ''}>
      <div className="flex items-start gap-4">
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1 ${
          done ? 'bg-[#34d399] border-[#34d399] text-black' : 'border-[#FFD166] text-[#FFD166]'
        }`}>
          {done ? '✓' : '1'}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">Connect Wallet</h3>
          {done ? (
            <div className="mt-2 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[#34d399]">
                <CheckCircle2 size={15} />
                <span className="text-sm font-medium">Solana wallet connected</span>
              </div>
              <p className="font-hash text-xs text-[var(--text-secondary)] ml-5">
                {state.walletAddress.slice(0, 8)}...{state.walletAddress.slice(-8)}
              </p>
              {localStorage.getItem('stellar_wallet_email') && (
                <p className="text-xs text-[var(--text-dim)] ml-5">
                  Signed in as {localStorage.getItem('stellar_wallet_email')}
                </p>
              )}
              <a
                href={`https://explorer.solana.com/address/${state.walletAddress}?cluster=devnet`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-[var(--text-dim)] hover:text-[#FFD166] ml-5 transition-colors"
              >
                View on Solana Explorer ↗
              </a>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-4">
              {/* Phantom */}
              <Button variant="solana" onClick={() => setVisible(true)} className="w-full min-h-[44px]">
                👻 Connect Phantom Wallet
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[rgba(56, 240, 255, 0.12)]" />
                <span className="text-slate-600 text-xs">or</span>
                <div className="flex-1 h-px bg-[rgba(56, 240, 255, 0.12)]" />
              </div>

              {/* Email */}
              <div className="bg-[#0F1F3D] border border-[rgba(56, 240, 255, 0.12)] rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-[var(--text-secondary)]" />
                  <p className="text-[var(--text-primary)] text-sm font-medium">Continue with Email</p>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                  placeholder="your@email.com"
                  onKeyDown={e => e.key === 'Enter' && handleEmailWallet()}
                  className="w-full bg-[#070B14] border border-[rgba(56, 240, 255, 0.12)] rounded-lg px-3 py-2.5 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-[#FFD166] min-h-[44px]"
                />
                {emailError && <p className="text-red-400 text-xs">{emailError}</p>}
                <Button variant="brass" onClick={handleEmailWallet} className="w-full min-h-[44px]">
                  Create Wallet &amp; Sign In →
                </Button>
                <p className="text-slate-600 text-xs text-center">No wallet? No problem. We&apos;ll create one for you automatically.</p>
                <p className="text-amber-500/70 text-xs text-center">📧 Email wallets use simulated transactions. Connect Phantom for real on-chain proof.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
