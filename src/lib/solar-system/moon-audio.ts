// What you hear inside the helmet. There is no sound outside it — the Moon
// is silent — so everything here is the suit: the low hum of the life
// support pack, boot strikes and landings carried up through the suit, a
// comms bleep when the base names something. No breath track and no air
// hiss — a loop of blown noise under every scene is fatiguing, and the hum
// alone already says "you are sealed in". Synthesised in Web Audio, created
// on the first gesture.

export interface SuitAudio {
  /** Call from a user gesture; safe to call repeatedly. */
  start: () => void;
  /** Exertion 0..1 lifts the pack a little. Inside the helmet the suit is louder. */
  update: (dt: number, exertion: number, helmet: boolean) => void;
  step: (hard: number) => void;
  bleep: () => void;
  thump: (distance: number) => void;
  dispose: () => void;
}

export function makeSuitAudio(): SuitAudio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let fanGain: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let helmetK = 0;

  const start = () => {
    try {
      if (!ctx) {
        ctx = new AudioContext();
        master = ctx.createGain();
        master.gain.value = 0.22;
        master.connect(ctx.destination);
        noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        // The pack: a low hum, well under the voice band, and nothing else.
        // The lowpass sits at 190 Hz so no part of it reads as blown air.
        const fan = ctx.createOscillator();
        fan.type = 'triangle';
        fan.frequency.value = 78;
        const fanLp = ctx.createBiquadFilter();
        fanLp.type = 'lowpass';
        fanLp.frequency.value = 190;
        fanGain = ctx.createGain();
        fanGain.gain.value = 0.03;
        fan.connect(fanLp); fanLp.connect(fanGain); fanGain.connect(master);
        fan.start();
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
    update(dt, exertion, helmet) {
      if (!ctx || !fanGain) return;
      helmetK += ((helmet ? 1 : 0.45) - helmetK) * (1 - Math.exp(-dt * 4));
      // The pack works a touch harder when you do — heard as level, not as air.
      fanGain.gain.setTargetAtTime((0.026 + exertion * 0.012) * helmetK, ctx.currentTime, 0.2);
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
    dispose() {
      if (ctx) void ctx.close();
      ctx = null;
    },
  };
}
