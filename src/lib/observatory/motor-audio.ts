/**
 * The sound of the instrument.
 *
 * A fork mount is not silent. The azimuth and altitude servos whine, the pitch
 * tracks the slew rate, the drive relays click in and out at each end of a
 * move, and the tracking motor hums under everything once you are on target.
 * Hearing it is most of what makes a remote session feel like a machine on a
 * roof rather than a web page.
 *
 * Synthesised, not sampled: two detuned saws plus filtered noise is a servo,
 * it costs no download, and the pitch can follow the real slew rate rather
 * than a clip's fixed length.
 */

type MotorNodes = {
  azimuth: OscillatorNode;
  altitude: OscillatorNode;
  bearing: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
};

/** Servo whine at full slew. Low enough to sit under speech, high enough to read as a motor. */
const BASE_HZ = 62;
const MAX_SLEW_DEG_S = 3;

export class MotorAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private motor: MotorNodes | null = null;
  private tracking: { osc: OscillatorNode; gain: GainNode } | null = null;
  private noiseBuffer: AudioBuffer | null = null;

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
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return true;
    } catch {
      return false;
    }
  }

  stop() {
    this.setSlew(0);
    this.setTracking(false);
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
  }

  get running(): boolean {
    return this.ctx?.state === 'running';
  }

  /**
   * Drive the servos at `rate` degrees per second. Zero spins them down.
   *
   * Pitch rises with rate and the filter opens with it, which is how a loaded
   * motor actually behaves — a slow slew is a hum, a fast one is a whine.
   */
  setSlew(rateDegPerSec: number) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;

    const load = Math.min(1, Math.max(0, rateDegPerSec / MAX_SLEW_DEG_S));
    const now = ctx.currentTime;

    if (load <= 0.001) {
      if (this.motor) {
        const { gain, azimuth, altitude, bearing } = this.motor;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0, now, 0.08);
        azimuth.stop(now + 0.5);
        altitude.stop(now + 0.5);
        bearing.stop(now + 0.5);
        this.motor = null;
      }
      return;
    }

    if (!this.motor) this.motor = this.buildMotor(ctx, master);

    const { azimuth, altitude, filter, gain } = this.motor;
    const hz = BASE_HZ * (0.55 + load * 0.85);
    azimuth.frequency.setTargetAtTime(hz, now, 0.05);
    // The two axes are never perfectly matched; the beat between them is
    // most of what makes it sound mechanical rather than like a synth pad.
    altitude.frequency.setTargetAtTime(hz * 1.0135, now, 0.05);
    filter.frequency.setTargetAtTime(400 + load * 1500, now, 0.08);
    gain.gain.setTargetAtTime(0.05 + load * 0.09, now, 0.08);
  }

  /** The tracking drive, running quietly whenever the mount is holding a target. */
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
    gain.gain.setTargetAtTime(0.022, now, 0.4);
    this.tracking = { osc, gain };
  }

  /** A drive relay closing, or the camera taking a frame. */
  click(kind: 'relay' | 'shutter') {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.noiseBuffer) return;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = kind === 'relay' ? 1800 : 3400;
    band.Q.value = kind === 'relay' ? 3 : 6;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(kind === 'relay' ? 0.32 : 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'relay' ? 0.09 : 0.05));

    src.connect(band).connect(gain).connect(master);
    src.start(now);
    src.stop(now + 0.12);
  }

  private buildMotor(ctx: AudioContext, master: GainNode): MotorNodes {
    const gain = ctx.createGain();
    gain.gain.value = 0;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    filter.Q.value = 4;
    filter.connect(gain).connect(master);

    const azimuth = ctx.createOscillator();
    azimuth.type = 'sawtooth';
    const altitude = ctx.createOscillator();
    altitude.type = 'sawtooth';
    azimuth.connect(filter);
    altitude.connect(filter);

    // Bearing hiss. Without it the servos sound synthetic.
    const bearing = ctx.createBufferSource();
    bearing.buffer = this.noiseBuffer;
    bearing.loop = true;
    const hiss = ctx.createGain();
    hiss.gain.value = 0.05;
    bearing.connect(hiss).connect(filter);

    azimuth.start();
    altitude.start();
    bearing.start();

    return { azimuth, altitude, bearing, filter, gain };
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
}
