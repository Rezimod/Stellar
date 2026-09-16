// Tbilisi out loud, after the silence of the other worlds: the city's low
// traffic hum, the Mtkvari when you are near it, swifts and sparrows by day,
// crickets after dark, and wind that picks up on the walls of Narikala.
// Synthesised in Web Audio, nothing sampled; started on the first gesture.

import { onSoundChange, soundOn } from '@/lib/solar-system/sound-prefs';

const MASTER_GAIN = 0.16;

export interface CityAmbience {
  start: () => void;
  /** `river` is metres to the water; `height` how far above the valley floor the listener is, m. */
  update: (dt: number, night: number, river: number, height: number) => void;
  dispose: () => void;
}

export function makeCityAmbience(): CityAmbience {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let hum: GainNode | null = null;
  let water: GainNode | null = null;
  let wind: GainNode | null = null;
  let windFilter: BiquadFilterNode | null = null;
  let noise: AudioBuffer | null = null;
  let chirpT = 1.5;
  let cricketT = 0.4;
  let gust = 0;
  const unsubscribe = onSoundChange((on) => {
    if (master && ctx) master.gain.setTargetAtTime(on ? MASTER_GAIN : 0, ctx.currentTime, 0.05);
  });
  const loop = (c: AudioContext, type: BiquadFilterType, f: number, q: number, level: number, out: AudioNode) => {
    const src = c.createBufferSource();
    src.buffer = noise; src.loop = true;
    src.playbackRate.value = 0.5 + Math.random() * 0.2;
    const flt = c.createBiquadFilter();
    flt.type = type; flt.frequency.value = f; flt.Q.value = q;
    const g = c.createGain();
    g.gain.value = level;
    src.connect(flt).connect(g).connect(out);
    src.start();
    return { g, flt };
  };
  return {
    start() {
      try {
        if (!ctx) {
          ctx = new AudioContext();
          master = ctx.createGain();
          master.gain.value = soundOn() ? MASTER_GAIN : 0;
          master.connect(ctx.destination);
          noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
          const d = noise.getChannelData(0);
          // Brownian: most of the energy low, like distance does to traffic.
          let last = 0;
          for (let i = 0; i < d.length; i++) { last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02; d[i] = last * 3.5; }
          hum = loop(ctx, 'lowpass', 180, 0.5, 0.6, master).g;
          water = loop(ctx, 'bandpass', 900, 0.4, 0, master).g;
          const w = loop(ctx, 'bandpass', 420, 1.2, 0, master);
          wind = w.g; windFilter = w.flt;
        }
        if (ctx.state === 'suspended') void ctx.resume();
      } catch { /* no audio */ }
    },
    update(dt, night, river, height) {
      if (!ctx || !master || !hum || !water || !wind || !windFilter) return;
      const now = ctx.currentTime;
      // The city is loudest down in it and in the evening.
      hum.gain.setTargetAtTime(0.5 * Math.max(0.25, 1 - height / 250) * (0.8 + night * 0.25), now, 0.5);
      water.gain.setTargetAtTime(Math.max(0, 1 - river / 60) * 0.35, now, 0.4);
      gust += dt;
      const g = Math.max(0, Math.min(1, (height - 30) / 120)) * (0.5 + 0.5 * Math.sin(gust * 0.37) * Math.sin(gust * 0.11));
      wind.gain.setTargetAtTime(g * 0.5, now, 0.6);
      windFilter.frequency.setTargetAtTime(300 + g * 500, now, 0.6);
      const c = ctx; const m = master;
      if (night < 0.5) {
        chirpT -= dt;
        if (chirpT <= 0) {
          chirpT = 0.6 + Math.random() * 3.2;
          const t0 = now + Math.random() * 0.05;
          const notes = 2 + Math.floor(Math.random() * 4);
          for (let k = 0; k < notes; k++) {
            const o = c.createOscillator();
            o.type = 'sine';
            const f = 3200 + Math.random() * 2200;
            const at = t0 + k * (0.07 + Math.random() * 0.05);
            o.frequency.setValueAtTime(f, at);
            o.frequency.exponentialRampToValueAtTime(f * (0.75 + Math.random() * 0.5), at + 0.06);
            const e = c.createGain();
            e.gain.setValueAtTime(0.0001, at);
            e.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.05 * (1 - night * 2)), at + 0.01);
            e.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
            o.connect(e).connect(m);
            o.onended = () => { o.disconnect(); e.disconnect(); };
            o.start(at); o.stop(at + 0.09);
          }
        }
      }
      if (night > 0.4) {
        cricketT -= dt;
        if (cricketT <= 0) {
          cricketT = 0.35 + Math.random() * 0.5;
          const at = now + 0.01;
          const o = c.createOscillator();
          o.type = 'square';
          o.frequency.value = 4400 + Math.random() * 300;
          const e = c.createGain();
          e.gain.setValueAtTime(0.0001, at);
          for (let k = 0; k < 4; k++) {
            e.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.012 * night), at + k * 0.035 + 0.008);
            e.gain.exponentialRampToValueAtTime(0.0001, at + k * 0.035 + 0.03);
          }
          const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
          o.connect(hp).connect(e).connect(m);
          o.onended = () => { o.disconnect(); hp.disconnect(); e.disconnect(); };
          o.start(at); o.stop(at + 0.16);
        }
      }
    },
    dispose() {
      unsubscribe();
      if (ctx) void ctx.close();
      ctx = null;
    },
  };
}
