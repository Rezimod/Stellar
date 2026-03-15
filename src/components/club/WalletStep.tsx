'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';
import { Keypair, Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { Mail, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';
import { saveEmailKeypair } from '@/lib/emailWallet';
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
  saveEmailKeypair(keypair, email);
  console.log('[Wallet] Created from email:', email, keypair.publicKey.toString());
  return keypair.publicKey.toString();
}

export default function WalletStep() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { state, setWallet } = useAppState();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [airdropStatus, setAirdropStatus] = useState<'idle' | 'funding' | 'funded' | 'failed'>('idle');
  const [emailBalance, setEmailBalance] = useState<number | null>(null);
  const [isEmailWallet, setIsEmailWallet] = useState(false);
  const [savedEmail, setSavedEmail] = useState('');
  const done = state.walletConnected;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsMobile(mobile);
  }, []);

  const hasPhantomExtension = typeof window !== 'undefined' && !!(window as { phantom?: { solana?: unknown } }).phantom?.solana;
  // Detect if we're already running inside Phantom's built-in browser
  const inPhantomBrowser = isMobile && hasPhantomExtension;

  const handlePhantomClick = () => {
    if (inPhantomBrowser || !isMobile) {
      // In Phantom browser or on desktop — use adapter modal directly
      setVisible(true);
    } else {
      // Try native Phantom deeplink first; fall back to download page if not installed
      const timeout = setTimeout(() => {
        window.open('https://phantom.app/download', '_blank');
      }, 1500);
      window.addEventListener('blur', () => clearTimeout(timeout), { once: true });
      window.location.href = `phantom://browse/${window.location.href}`;
    }
  };

  // If arriving in Phantom's browser, auto-open connect modal
  useEffect(() => {
    if (inPhantomBrowser && !state.walletConnected && !done) {
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, [inPhantomBrowser]);

  useEffect(() => {
    if (connected && publicKey && !state.walletConnected) {
      console.log('[Wallet] Phantom connected:', publicKey.toBase58());
      setWallet(publicKey.toBase58());
      ensureDevnetSol(publicKey);
    }
  }, [connected, publicKey]);

  // Detect email wallet + check balance (client-only)
  useEffect(() => {
    const emailVal = localStorage.getItem('stellar_wallet_email') ?? '';
    setIsEmailWallet(!!emailVal);
    setSavedEmail(emailVal);
    if (done && emailVal && state.walletAddress) {
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      connection.getBalance(new PublicKey(state.walletAddress))
        .then(bal => setEmailBalance(bal))
        .catch(() => setEmailBalance(0));
    }
  }, [done, state.walletAddress]);

  // Restore email wallet on mount
  useEffect(() => {
    if (!state.walletConnected) {
      const saved = localStorage.getItem('stellar_wallet_address');
      const savedEmail = localStorage.getItem('stellar_wallet_email');
      if (saved && savedEmail) setWallet(saved);
    }
  }, []);

  const handleEmailWallet = async () => {
    if (!email || !email.includes('@')) {
      setEmailError('Enter a valid email');
      return;
    }
    setEmailError('');
    const address = createWalletFromEmail(email);
    setWallet(address);
    setAirdropStatus('funding');
    try {
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
      const pk = new PublicKey(address);
      const balance = await connection.getBalance(pk);
      if (balance >= 50_000_000) {
        setAirdropStatus('funded');
        return;
      }
      const sig = await connection.requestAirdrop(pk, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, 'confirmed');
      console.log('[Wallet] Airdropped 1 SOL to email wallet');
      setAirdropStatus('funded');
      setEmailBalance(LAMPORTS_PER_SOL);
    } catch {
      console.log('[Wallet] Airdrop rate limited');
      setAirdropStatus('failed');
      setEmailBalance(0);
    }
  };

  return (
    <Card glow={done ? 'emerald' : null} className={done ? 'animate-pulse-success' : ''}>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          done ? 'bg-[#34d399] border-[#34d399] text-black' : 'border-[#FFD166] text-[#FFD166]'
        }`}>
          {done ? '✓' : '1'}
        </div>
        <div className="w-full">
          <h3 className="text-lg font-semibold text-white">Connect Wallet</h3>
          {done ? (
            <div className="mt-2 flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2 text-[#34d399]">
                <CheckCircle2 size={15} />
                <span className="text-sm font-medium">Solana wallet connected</span>
              </div>
              <p className="font-hash text-xs text-[var(--text-secondary)]">
                {state.walletAddress.slice(0, 8)}...{state.walletAddress.slice(-8)}
              </p>
              {savedEmail && (
                <p className="text-xs text-[var(--text-dim)]">
                  Signed in as {savedEmail}
                </p>
              )}
              {airdropStatus === 'funding' && (
                <p className="text-xs text-[#38F0FF] animate-pulse">Activating wallet on Solana devnet…</p>
              )}
              {airdropStatus === 'funded' && (
                <p className="text-xs text-[#34d399]">✓ Wallet activated — 1 devnet SOL funded</p>
              )}
              {/* Show activation notice if email wallet has no balance */}
              {isEmailWallet && emailBalance === 0 && airdropStatus === 'idle' && (
                <div className="mt-2 w-full rounded-xl p-3 text-left flex flex-col gap-2"
                  style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
                    <p className="text-amber-400 text-xs font-semibold">Wallet registered — needs activation</p>
                  </div>
                  <p className="text-slate-500 text-xs">Your Solana wallet was created. To submit on-chain proofs, top it up with free devnet SOL.</p>
                  <div className="flex items-center gap-2">
                    <code className="text-[10px] text-slate-400 font-mono bg-[#070B14] px-2 py-1 rounded truncate flex-1"
                      style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                      {state.walletAddress}
                    </code>
                    <button onClick={() => navigator.clipboard.writeText(state.walletAddress)}
                      className="text-[10px] text-[#38F0FF] hover:underline whitespace-nowrap flex-shrink-0">Copy</button>
                  </div>
                  <a href="https://faucet.solana.com" target="_blank" rel="noopener noreferrer"
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors text-center">
                    Get free devnet SOL at faucet.solana.com ↗
                  </a>
                </div>
              )}
              {(airdropStatus === 'failed') && (
                <div className="mt-1 flex flex-col items-center gap-1">
                  <p className="text-xs text-amber-400">⚠ Airdrop rate limited — fund manually:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-[10px] text-slate-400 font-mono bg-[#070B14] px-2 py-1 rounded truncate max-w-[180px]">
                      {state.walletAddress}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(state.walletAddress)}
                      className="text-[10px] text-[#38F0FF] hover:underline whitespace-nowrap"
                    >
                      Copy
                    </button>
                  </div>
                  <a
                    href="https://faucet.solana.com"
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Get devnet SOL at faucet.solana.com ↗
                  </a>
                </div>
              )}
              <a
                href={`https://explorer.solana.com/address/${state.walletAddress}?cluster=devnet`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-[var(--text-dim)] hover:text-[#FFD166] transition-colors"
              >
                View on Solana Explorer ↗
              </a>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-4">
              {/* Email — primary */}
              <div className="bg-[#0F1F3D] rounded-xl p-4 flex flex-col gap-3" style={{ border: '1px solid rgba(255,209,102,0.2)' }}>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-[#FFD166]" />
                    <p className="text-white text-sm font-semibold">Continue with Email</p>
                  </div>
                  <p className="text-slate-500 text-xs ml-6">We create a Solana wallet for you automatically. No app needed.</p>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                  placeholder="your@email.com"
                  onKeyDown={e => e.key === 'Enter' && handleEmailWallet()}
                  className="w-full bg-[#070B14] rounded-lg px-3 py-2.5 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-[#FFD166] min-h-[44px]"
                  style={{ border: '1px solid rgba(56,240,255,0.12)' }}
                />
                {emailError && <p className="text-red-400 text-xs">{emailError}</p>}
                <Button variant="brass" onClick={handleEmailWallet} className="w-full min-h-[44px]">
                  Continue with Email →
                </Button>
                <p className="text-slate-600 text-xs text-center">Your wallet stays in your browser. Free to use.</p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'rgba(56,240,255,0.12)' }} />
                <span className="text-slate-600 text-xs">or use wallet</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(56,240,255,0.12)' }} />
              </div>

              {/* Phantom — secondary */}
              <div className="flex flex-col gap-1.5">
                <Button variant="solana" onClick={handlePhantomClick} className="w-full min-h-[44px]">
                  👻 {inPhantomBrowser ? 'Connect Phantom' : isMobile ? 'Open Phantom App' : 'Connect Phantom Wallet'}
                </Button>
                {isMobile && !inPhantomBrowser && (
                  <>
                    <p className="text-slate-600 text-xs text-center">Opens Phantom app. Install it first if you haven&apos;t.</p>
                    <a
                      href={`https://phantom.app/ul/browse/${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/club' : '')}`}
                      className="text-center text-xs text-[#7A5FFF] hover:underline py-1"
                    >
                      Or open this page in Phantom Browser →
                    </a>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
