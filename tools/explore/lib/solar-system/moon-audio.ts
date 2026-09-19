// What you hear inside the helmet. There is no sound outside it — the Moon
// is silent — so everything here is the suit: the fan and pump of the life
// support pack, your own breathing (faster when you work), boot strikes
// and landings carried up through the suit, a comms bleep when the base
// names something. Synthesised in Web Audio, created on the first gesture.

import { onSoundChange, soundOn } from '@/lib/solar-system/sound-prefs';

const MASTER_GAIN = 0.22;

export interface SuitAudio {
  /** Call from a user gesture; safe to call repeatedly. */
  start: () => void;
  /** An act of the expedition closed, a job paid: a short chord through the helmet. */
  milestone: () => void;
  /** Exertion 0..1 drives breath rate and depth. Inside the helmet the suit is louder. */
  update: (dt: number, exertion: number, helmet: boolean) => void;
  step: (hard: number) => void;
  bleep: () => void;
  thump: (distance: number) => void;
  /** The drill through the suit: pitch and weight follow the bit's load. */
  drill: (load: number, running: boolean) => void;
  dispose: () => void;
}

/** `open`: no helmet and no pack — no fan, and breath only when it is hard work. */
export function makeSuitAudio(open = false): SuitAudio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let breathGain: GainNode | null = null;
  let fanGain: GainNode | null = null;
  let breathT = 0;
  let rate = 0.28;
  let noise: AudioBuffer | null = null;
  let helmetK = 0;
  let drillOsc: OscillatorNode | null = null;
  let drillGain: GainNode | null = null;
  const unsubscribe = onSoundChange((on) => {
    if (master && ctx) master.gain.setTargetAtTime(on ? MASTER_GAIN : 0, ctx.currentTime, 0.05);
  });

  const start = () => {
    try {
      if (!ctx) {
        ctx = new AudioContext();
        master = ctx.createGain();
        master.gain.value = soundOn() ? MASTER_GAIN : 0;
        master.connect(ctx.destination);
        noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        // Fan: a soft hum with a whisper of air.
        const fan = ctx.createOscillator();
        fan.type = 'triangle';
        fan.frequency.value = 92;
        const fanLp = ctx.createBiquadFilter();
        fanLp.type = 'lowpass';
        fanLp.frequency.value = 260;
        fanGain = ctx.createGain();
        fanGain.gain.value = 0.05;
        fan.connect(fanLp); fanLp.connect(fanGain); fanGain.connect(master);
        fan.start();
        const air = ctx.createBufferSource();
        air.buffer = noise; air.loop = true;
        const airBp = ctx.createBiquadFilter();
        airBp.type = 'bandpass'; airBp.frequency.value = 900; airBp.Q.value = 0.6;
        const airGain = ctx.createGain();
        airGain.gain.value = 0.035;
        air.connect(airBp); airBp.connect(airGain); airGain.connect(fanGain);
        air.start();
        // Breath: filtered noise, opened and closed by the update loop.
        const breath = ctx.createBufferSource();
        breath.buffer = noise; breath.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.8;
        breathGain = ctx.createGain();
        breathGain.gain.value = 0;
        breath.connect(bp); bp.connect(breathGain); breathGain.connect(master);
        breath.start();
      }
      if (ctx.state === 'suspended') void ctx.resume();
    } catch {
      // No audio — the suit is silent.
    }
  };
  const one = (fn: (c: AudioContext, m: GainNode) => void) => {
    if (!ctx || !master) return;
    try { fn(ctx, master); } catch { /* silent */ }
  };
  return {
    start,
    milestone() {
      one((c, m) => {
        // A major triad on soft pipes, held a moment, let go slowly.
        const t0 = c.currentTime;
        const env = c.createGain();
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.exponentialRampToValueAtTime(0.16, t0 + 0.35);
        env.gain.setValueAtTime(0.16, t0 + 1.1);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
        const lp = c.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 1400;
        env.connect(lp); lp.connect(m);
        const voices = [220, 277.18, 329.63, 440].map((f) => {
          const o = c.createOscillator();
          o.type = 'sine';
          o.frequency.value = f;
          const g = c.createGain(); g.gain.value = 0.3;
          o.connect(g); g.connect(env);
          o.start(t0); o.stop(t0 + 3.3);
          return o;
        });
        voices[0].onended = () => { for (const o of voices) o.disconnect(); env.disconnect(); lp.disconnect(); };
      });
    },
    update(dt, exertion, helmet) {
      if (!ctx || !breathGain || !fanGain) return;
      helmetK += ((open ? 0 : helmet ? 1 : 0.45) - helmetK) * (1 - Math.exp(-dt * 4));
      rate += ((0.24 + exertion * 0.55) - rate) * (1 - Math.exp(-dt * 0.5));
      breathT += dt * rate;
      // In through the first 40 % of the cycle, out through the next 45 %, a rest.
      const ph = breathT % 1;
      const env = ph < 0.4 ? Math.sin(ph / 0.4 * Math.PI) : ph < 0.85 ? Math.sin((ph - 0.4) / 0.45 * Math.PI) * 0.75 : 0;
      const depth = 0.05 + exertion * 0.16;
      breathGain.gain.setTargetAtTime(env * depth * (open ? Math.max(0, exertion - 0.45) * 0.8 : helmetK), ctx.currentTime, 0.05);
      fanGain.gain.setTargetAtTime(0.05 * helmetK, ctx.currentTime, 0.1);
    },
    step(hard) {
      one((c, m) => {
        const g = c.createGain();
        const level = 0.05 + hard * 0.25;
        g.gain.setValueAtTime(level, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.12 + hard * 0.25);
        g.connect(m);
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(70 + hard * 30, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(35, c.currentTime + 0.15);
        o.connect(g); o.start(); o.stop(c.currentTime + 0.4);
        if (noise) {
          const n = c.createBufferSource(); n.buffer = noise;
          const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300 + hard * 400;
          const ng = c.createGain(); ng.gain.setValueAtTime(level * 0.6, c.currentTime); ng.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.08 + hard * 0.1);
          n.connect(lp); lp.connect(ng); ng.connect(m); n.start(); n.stop(c.currentTime + 0.3);
        }
      });
    },
    bleep() {
      one((c, m) => {
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.08, c.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.18);
        g.connect(m);
        const o = c.createOscillator();
        o.type = 'square';
        o.frequency.setValueAtTime(1240, c.currentTime);
        o.frequency.setValueAtTime(1660, c.currentTime + 0.08);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
        o.connect(lp); lp.connect(g); o.start(); o.stop(c.currentTime + 0.2);
      });
    },
    thump(distance) {
      one((c, m) => {
        const g = c.createGain();
        const level = 0.9 * Math.max(0.06, 1 - distance / 170);
        g.gain.setValueAtTime(level, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.6);
        g.connect(m);
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(54, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(22, c.currentTime + 1.3);
        o.connect(g); o.start(); o.stop(c.currentTime + 1.6);
        if (noise) {
          const n = c.createBufferSource(); n.buffer = noise;
          const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
          const ng = c.createGain(); ng.gain.setValueAtTime(level * 0.7, c.currentTime); ng.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.6);
          n.connect(lp); lp.connect(ng); ng.connect(m); n.start(); n.stop(c.currentTime + 0.7);
        }
      });
    },
    drill(load, running) {
      if (!ctx || !master) return;
      if (!drillOsc && running) {
        try {
          drillOsc = ctx.createOscillator();
          drillOsc.type = 'sawtooth';
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass'; lp.frequency.value = 420;
          drillGain = ctx.createGain();
          drillGain.gain.value = 0;
          drillOsc.connect(lp); lp.connect(drillGain); drillGain.connect(master);
          drillOsc.start();
        } catch { drillOsc = null; }
      }
      if (!drillOsc || !drillGain) return;
      drillOsc.frequency.setTargetAtTime(62 + load * 70, ctx.currentTime, 0.08);
      drillGain.gain.setTargetAtTime(running ? 0.025 + load * 0.06 : 0, ctx.currentTime, 0.1);
    },
    dispose() {
      unsubscribe();
      if (ctx) void ctx.close();
      ctx = null;
    },
  };
}
