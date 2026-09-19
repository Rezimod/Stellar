// One key does the job in front of you. Anything the crew can use — an
// airlock panel, the rover, a charger, the drill, a patch of regolith —
// registers here with where it is, how far it reaches, and whether it is
// tapped or held. Each step the resolver picks the best one in reach
// (priority first, then what the crew is facing, then distance), keeps it
// while it stays valid so the prompt does not flicker between neighbours,
// and routes the key to it: a press fires a tap, holding runs a hold.

export type InteractKind = 'tap' | 'hold';

export interface Interactable {
  id: string;
  /** Where it is and how far it reaches right now, or null when unavailable. */
  where: () => { x: number; z: number; r: number } | null;
  kind: () => InteractKind;
  /** Key under solarSystem.moon.act for the prompt. */
  label: () => string;
  /** Tap: fired once per press. Hold: every step while held. */
  use: (dt: number) => void;
  /** 0…1 for a hold's ring; −1 for none. */
  progress?: () => number;
  /** Higher wins over nearer. */
  priority?: number;
  /** On foot, from the rover, or either. */
  mode?: 'foot' | 'rover' | 'any';
}

export interface InteractionPrompt {
  active: boolean;
  id: string;
  label: string;
  kind: InteractKind;
  progress: number;
  /** A hold is running this step. */
  holding: boolean;
}

export interface InteractionContext {
  x: number;
  z: number;
  yaw: number;
  driving: boolean;
  /** Edge: the key went down this step. */
  press: boolean;
  /** The key is down. */
  held: boolean;
}

export interface Interactions {
  add: (i: Interactable) => void;
  remove: (id: string) => void;
  prompt: InteractionPrompt;
  update: (dt: number, ctx: InteractionContext) => void;
}

export function makeInteractions(): Interactions {
  const list: Interactable[] = [];
  const prompt: InteractionPrompt = { active: false, id: '', label: '', kind: 'tap', progress: -1, holding: false };
  let current: Interactable | null = null;
  // A press that lands on a hold item still counts as holding until released.
  let pressedOn = '';

  const score = (i: Interactable, ctx: InteractionContext): number => {
    const mode = i.mode ?? 'foot';
    if (mode === 'foot' && ctx.driving) return -Infinity;
    if (mode === 'rover' && !ctx.driving) return -Infinity;
    const w = i.where();
    if (!w) return -Infinity;
    const dx = w.x - ctx.x; const dz = w.z - ctx.z;
    const d = Math.hypot(dx, dz);
    if (d > w.r) return -Infinity;
    const facing = d > 0.3 ? (dx * Math.sin(ctx.yaw) + dz * Math.cos(ctx.yaw)) / d : 1;
    return (i.priority ?? 0) * 10 + facing * 1.5 - d * 0.6;
  };

  return {
    prompt,
    add(i) { list.push(i); },
    remove(id) {
      const k = list.findIndex((i) => i.id === id);
      if (k >= 0) list.splice(k, 1);
      if (current?.id === id) current = null;
    },
    update(dt, ctx) {
      let best: Interactable | null = null;
      let bestScore = -Infinity;
      for (const i of list) {
        const s = score(i, ctx);
        if (s > bestScore) { bestScore = s; best = i; }
      }
      // Stick with the one already shown unless another is clearly better.
      if (current && best !== current) {
        const keepScore = score(current, ctx);
        if (keepScore > -Infinity && keepScore + 1 >= bestScore) best = current;
      }
      current = best;
      prompt.holding = false;
      if (!best) {
        prompt.active = false;
        prompt.id = '';
        pressedOn = '';
        return;
      }
      const kind = best.kind();
      if (!ctx.held) pressedOn = '';
      if (ctx.press) {
        pressedOn = best.id;
        if (kind === 'tap') best.use(0);
      }
      if (kind === 'hold' && ctx.held && pressedOn === best.id) {
        best.use(dt);
        prompt.holding = true;
      }
      // A tap may have removed or changed what is here; read it afresh.
      prompt.active = true;
      prompt.id = best.id;
      prompt.kind = best.kind();
      prompt.label = best.label();
      prompt.progress = best.progress ? best.progress() : -1;
    },
  };
}
