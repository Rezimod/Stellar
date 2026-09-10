/**
 * The sound of a NexStar fork mount.
 *
 * Synthesised from measurements, not guessed. Three recordings of NexStar 8SE
 * slews — the same mount the 6SE on the roof uses — were run through a
 * spectrogram. At full rate each axis motor is a harmonic comb: one axis sits
 * on a fundamental near 606 Hz, the other near 726 Hz, with the third to
 * fifth harmonics loudest and a separate gear-mesh line near 829 Hz. Under the
 * lines is a bed of broadband gear hiss between 1.5 and 5 kHz, about 15 dB
 * down. The motors reach pitch in under half a second; winding down takes
 * about 1.5 s with the pitch audibly falling, and ends in a low thump as the
 * load comes off the gears. At the centring rates they are close to silent.
 *
 * Pitch follows rate throughout, which is why this is a synthesiser fed the
 * measured spectrum rather than a clip: a clip has exactly one speed.
 */

import { MAX_SLEW_DEG_S } from './mount-drive';

type Axis = 'alt' | 'az';

type Voice = {
  comb: OscillatorNode;
  mesh: OscillatorNode;
  wobble: OscillatorNode;
  lowpass: BiquadFilterNode;
  gain: GainNode;
  hiss: GainNode;
  /** Load the voice was last driven at, to know when a spin-down ends. */
  load: number;
};

/** Measured fundamentals at rate 9, hertz. The two axes are never matched. */
const FUNDAMENTAL_HZ: Record<Axis, number> = { az: 606, alt: 726 };
/** The gear-mesh line, as a ratio of the azimuth fundamental: 829 / 606. */
const MESH_RATIO = 1.368;

/**
 * Relative harmonic amplitudes of the comb, index = harmonic number. The
 * third through fifth carry the whine; the fundamental is comparatively weak.
 */
const HARMONICS = [0, 0.55, 0.5, 1.0, 0.85, 0.7, 0.45, 0.35, 0.2, 0.12, 0.08];

export class MotorAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private comb: PeriodicWave | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private voices: Partial<Record<Axis, Voice>> = {};
  private tracking: { osc: OscillatorNode; gain: GainNode } | null = null;

  /** Must be called from a user gesture — browsers refuse to start audio otherwise. */
  async start(): Promise<boolean> {
    try {
      if (!this.ctx) {
        const Ctor: typeof AudioContext =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return false;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
        this.noiseBuffer = this.makeNoise(this.ctx);
        this.comb = this.ctx.createPeriodicWave(
          new Float32Array(HARMONICS.length),
          Float32Array.from(HARMONICS),
        );
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return true;
    } catch {
      return false;
    }
  }

  stop() {
    this.setAxisRates(0, 0);
    this.setTracking(false);
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.comb = null;
    this.noiseBuffer = null;
    this.voices = {};
  }

  get running(): boolean {
    return this.ctx?.state === 'running';
  }

  /**
   * Drive each axis at its current rate, degrees per second, sign ignored.
   * Call every frame with what the axes are actually doing; the ramps live in
   * the drive, so the pitch here simply follows.
   */
  setAxisRates(azDegPerSec: number, altDegPerSec: number) {
    this.drive('az', Math.abs(azDegPerSec));
    this.drive('alt', Math.abs(altDegPerSec));
  }

  /** The tracking drive: on a NexStar it is barely there, a faint hum under everything once on target. */
  setTracking(on: boolean) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const now = ctx.currentTime;

    if (!on) {
      if (this.tracking) {
        this.tracking.gain.gain.setTargetAtTime(0, now, 0.2);
        this.tracking.osc.stop(now + 1);
        this.tracking = null;
      }
      return;
    }
    if (this.tracking) return;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 41;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(master);
    osc.start();
    gain.gain.setTargetAtTime(0.012, now, 0.4);
    this.tracking = { osc, gain };
  }

  /** The camera taking a frame. A CMOS camera is silent; this is the console's own cue. */
  click() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.noiseBuffer) return;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 3400;
    band.Q.value = 6;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    src.connect(band).connect(gain).connect(master);
    src.start(now);
    src.stop(now + 0.12);
  }

  private drive(axis: Axis, degPerSec: number) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;

    const load = Math.min(1, degPerSec / MAX_SLEW_DEG_S);
    const now = ctx.currentTime;
    let voice = this.voices[axis];

    if (load < 0.002) {
      if (!voice) return;
      voice.gain.gain.setTargetAtTime(0, now, 0.03);
      voice.hiss.gain.setTargetAtTime(0, now, 0.03);
      // A fast slew ends with the gears unloading; a centring nudge does not.
      if (voice.load > 0.25) this.thump();
      voice.load = 0;
      return;
    }

    if (!voice) voice = this.voices[axis] = this.buildVoice(ctx, master, axis);

    const hz = FUNDAMENTAL_HZ[axis] * load;
    voice.comb.frequency.setTargetAtTime(hz, now, 0.02);
    voice.mesh.frequency.setTargetAtTime(hz * MESH_RATIO, now, 0.02);
    // The filter opens with speed: a slow axis is a hum, a fast one a whine.
    voice.lowpass.frequency.setTargetAtTime(Math.max(300, hz * 7), now, 0.03);
    voice.gain.gain.setTargetAtTime(0.03 + 0.15 * Math.pow(load, 0.7), now, 0.03);
    voice.hiss.gain.setTargetAtTime(0.16 * Math.pow(load, 1.5), now, 0.05);
    voice.load = load;
  }

  private buildVoice(ctx: AudioContext, master: GainNode, axis: Axis): Voice {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(master);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3000;
    lowpass.Q.value = 0.9;
    lowpass.connect(gain);

    const comb = ctx.createOscillator();
    if (this.comb) comb.setPeriodicWave(this.comb);
    comb.frequency.value = 20;
    const combGain = ctx.createGain();
    combGain.gain.value = 0.4;
    comb.connect(combGain).connect(lowpass);

    const mesh = ctx.createOscillator();
    mesh.type = 'sine';
    mesh.frequency.value = 20;
    const meshGain = ctx.createGain();
    // Only the azimuth train carries the mesh line clearly in the recordings.
    meshGain.gain.value = axis === 'az' ? 0.3 : 0.08;
    mesh.connect(meshGain).connect(lowpass);

    // Speed hunting. The pitch never sits perfectly still on a real drive.
    const wobble = ctx.createOscillator();
    wobble.type = 'sine';
    wobble.frequency.value = 2.7;
    const wobbleDepth = ctx.createGain();
    wobbleDepth.gain.value = 4; // cents-ish: a few hertz either way
    wobble.connect(wobbleDepth);
    wobbleDepth.connect(comb.frequency);
    wobbleDepth.connect(mesh.frequency);

    // Gear hiss, shaped to the 1.5-5 kHz band the recordings show.
    const hiss = ctx.createGain();
    hiss.gain.value = 0;
    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      noise.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 2800;
      band.Q.value = 0.6;
      noise.connect(band).connect(hiss).connect(master);
      noise.start();
    }

    comb.start();
    mesh.start();
    wobble.start();

    return { comb, mesh, wobble, lowpass, gain, hiss, load: 0 };
  }

  /** The load coming off the gears when a fast slew stops. */
  private thump() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(170, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.09);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + 0.12);

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 500;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.18, now);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    src.connect(low).connect(nGain).connect(master);
    src.start(now);
    src.stop(now + 0.08);
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}
