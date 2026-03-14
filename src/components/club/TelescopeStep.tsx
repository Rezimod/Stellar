'use client';

import { useState } from 'react';
import { useAppState } from '@/hooks/useAppState';
import { mintNFT } from '@/lib/solana';
import { TELESCOPE_BRANDS } from '@/lib/constants';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';
import MintAnimation from '@/components/shared/MintAnimation';

export default function TelescopeStep() {
  const { state, setTelescope } = useAppState();
  const unlocked = state.membershipMinted;
  const done = !!state.telescope;
  const [form, setForm] = useState({ brand: 'Celestron', model: '', aperture: '' });
  const [minting, setMinting] = useState(false);
  const [mintDone, setMintDone] = useState(false);

  const handleMint = async () => {
    if (!form.model || !form.aperture) return;
    setMinting(true);
    console.log('[Mint] Starting telescope NFT mint', form);
    const result = await mintNFT(`${form.brand} ${form.model} Passport`, 'SCOPE');
    setMintDone(true);
    setTimeout(() => {
      setMinting(false);
      setMintDone(false);
      setTelescope(form, result.txId);
    }, 1200);
  };

  return (
    <>
      {minting && <MintAnimation done={mintDone} />}
      <Card glow={done ? 'cyan' : null} className={!unlocked ? 'opacity-40 pointer-events-none' : ''}>
        <div className="flex items-start gap-4">
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 ${
            done ? 'bg-[#22d3ee] border-[#22d3ee] text-black' : 'border-[#c9a84c] text-[#c9a84c]'
          }`}>
            {done ? '✓' : '3'}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Register Telescope</h3>
            <p className="text-slate-400 text-sm mb-4">Mint your telescope passport NFT</p>
            {done ? (
              <div className="bg-[#0f1a2e] border border-[#22d3ee]/40 rounded-lg p-4 flex items-center gap-4">
                <span className="text-3xl">🔭</span>
                <div>
                  <p className="text-[#22d3ee] font-semibold">{state.telescope!.brand} {state.telescope!.model}</p>
                  <p className="text-slate-400 text-xs">Aperture: {state.telescope!.aperture}</p>
                  <p className="font-mono text-xs text-slate-500 mt-1">
                    {state.telescopeTx.slice(0, 8)}...{state.telescopeTx.slice(-8)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <select
                  value={form.brand}
                  onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                  className="bg-[#0f1a2e] border border-[#1a2d4d] rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-[#22d3ee]"
                >
                  {TELESCOPE_BRANDS.map(b => <option key={b}>{b}</option>)}
                </select>
                <input
                  value={form.model}
                  onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                  placeholder="Model (e.g. NexStar 8SE)"
                  className="bg-[#0f1a2e] border border-[#1a2d4d] rounded-lg px-3 py-2 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-[#22d3ee]"
                />
                <input
                  value={form.aperture}
                  onChange={e => setForm(f => ({ ...f, aperture: e.target.value }))}
                  placeholder="Aperture (e.g. 203mm)"
                  className="bg-[#0f1a2e] border border-[#1a2d4d] rounded-lg px-3 py-2 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-[#22d3ee]"
                />
                <Button
                  variant="cyan"
                  onClick={handleMint}
                  disabled={!form.model || !form.aperture}
                  className="w-full sm:w-auto"
                >
                  🔭 Mint Telescope Passport NFT
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
