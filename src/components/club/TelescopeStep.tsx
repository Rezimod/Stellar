'use client';

import { useState } from 'react';
import { Telescope } from 'lucide-react';
import { useAppState } from '@/hooks/useAppState';
import { TELESCOPE_BRANDS } from '@/lib/constants';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';

export default function TelescopeStep() {
  const { state, setTelescope } = useAppState();
  const unlocked = state.membershipMinted;
  const done = !!state.telescope;
  const [form, setForm] = useState({ brand: 'Celestron', model: '', aperture: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.model || !form.aperture) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setTelescope(form, 'local_' + Date.now().toString(36));
    setSaving(false);
  };

  return (
    <Card glow={done ? 'cyan' : null} className={`${done ? 'animate-pulse-success' : ''} ${!unlocked ? 'opacity-40 pointer-events-none transition-opacity duration-500' : 'transition-opacity duration-500'}`}>
      <div className="flex items-start gap-4">
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          done ? 'bg-[#38F0FF] border-[#38F0FF] text-black' : 'border-[#FFD166] text-[#FFD166]'
        }`}>
          {done ? '✓' : '3'}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">Register Telescope</h3>
          <p className="text-slate-400 text-sm mb-4">Register your equipment to start observing</p>
          {done ? (
            <div className="bg-[#0F1F3D] border border-[#38F0FF]/40 rounded-lg p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#38F0FF]/10 border border-[#38F0FF]/20 flex items-center justify-center">
                <Telescope size={22} className="text-[#38F0FF]" />
              </div>
              <div>
                <p className="text-[#38F0FF] font-semibold">{state.telescope!.brand} {state.telescope!.model}</p>
                <p className="text-slate-400 text-xs">Aperture: {state.telescope!.aperture}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <select value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                className="bg-[#0F1F3D] border border-[rgba(56, 240, 255, 0.12)] rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-[#38F0FF]">
                {TELESCOPE_BRANDS.map(b => <option key={b}>{b}</option>)}
              </select>
              <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                placeholder="Model (e.g. NexStar 8SE)"
                className="bg-[#0F1F3D] border border-[rgba(56, 240, 255, 0.12)] rounded-lg px-3 py-2.5 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-[#38F0FF]" />
              <input value={form.aperture} onChange={e => setForm(f => ({ ...f, aperture: e.target.value }))}
                placeholder="Aperture (e.g. 203mm)"
                className="bg-[#0F1F3D] border border-[rgba(56, 240, 255, 0.12)] rounded-lg px-3 py-2.5 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-[#38F0FF]" />
              <Button variant="cyan" onClick={handleSave} disabled={!form.model || !form.aperture || saving} className="w-full sm:w-auto">
                {saving ? 'Saving...' : 'Register Telescope 🔭'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
