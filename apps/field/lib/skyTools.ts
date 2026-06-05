import {
  getBodyPosition,
  getVisibleNow,
  getDsoPosition,
  getMoonConditions,
  getDarkWindow,
  getTonightTargets,
  sunAltitude,
} from './ephemeris';
import { findDso } from './dso';

/**
 * Native QVAC tool registry for the on-device sky agent. These descriptors are
 * handed to `completion({ tools })` so the LLAMA_TOOL_CALLING_1B model can decide
 * which tools to call and orchestrate several of them for a compound question
 * (e.g. "best target tonight and when?" → visibility + moon + dark window).
 *
 * Every handler is pure local computation (astronomy-engine) — no network.
 */

export type ToolCtx = { lat: number; lon: number };

/** OpenAI-function-style descriptor, matching the SDK's `Tool` schema. */
type ToolDef = {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description?: string; enum?: string[] }>;
    required?: string[];
  };
};

type SkyTool = {
  def: ToolDef;
  run: (args: Record<string, unknown>, ctx: ToolCtx) => unknown;
  /** Compact one-line summary of a result, for grounding the final answer. */
  summarize: (result: any) => string;
};

const BODY_ENUM = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

const TOOLS: SkyTool[] = [
  {
    def: {
      type: 'function',
      name: 'get_body_position',
      description: 'Current sky position of a Solar System body (a planet, the Moon, or the Sun): altitude, compass direction, and whether it is viewable now.',
      parameters: {
        type: 'object',
        properties: { body: { type: 'string', description: 'Which body', enum: BODY_ENUM } },
        required: ['body'],
      },
    },
    run: ({ body }, { lat, lon }) => {
      const name = String(body ?? '').toLowerCase();
      const p = getBodyPosition(name, lat, lon);
      return p ?? { error: `unknown body: ${body}` };
    },
    summarize: (r) =>
      r?.error ? String(r.error) : `${r.name}: alt ${r.altitude}°, ${r.azimuthDir}, ${verdictWord(r)}.`,
  },
  {
    def: {
      type: 'function',
      name: 'get_object_position',
      description: 'Current sky position of a named deep-sky object or star (e.g. M31, Andromeda, the Pleiades, Vega).',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string', description: 'Object name, Messier id, or common name' } },
        required: ['name'],
      },
    },
    run: ({ name }, { lat, lon }) => {
      const dso = findDso(String(name ?? ''));
      if (!dso) return { error: `unknown object: ${name}` };
      const p = getDsoPosition(dso.ra, dso.dec, lat, lon);
      return { name: dso.name, type: dso.type, constellation: dso.constellation, magnitude: dso.mag, ...p };
    },
    summarize: (r) =>
      r?.error ? String(r.error) : `${r.name} (${r.type}, mag ${r.magnitude}): alt ${r.altitude}°, ${r.azimuthDir}, ${verdictWord(r)}.`,
  },
  {
    def: {
      type: 'function',
      name: 'get_visible_now',
      description: 'List the Solar System bodies currently above the horizon, brightest/highest first.',
      parameters: { type: 'object', properties: {} },
    },
    run: (_args, { lat, lon }) => {
      const list = getVisibleNow(lat, lon);
      return {
        daylight: sunAltitude(lat, lon) > -6,
        count: list.length,
        bodies: list.map((b) => ({ name: b.name, altitude: b.altitude, direction: b.azimuthDir, observable: b.observable })),
      };
    },
    summarize: (r) =>
      r?.daylight
        ? 'Daytime — nothing observable yet.'
        : r?.bodies?.length
          ? 'Up now: ' + r.bodies.map((b: any) => `${b.name} (${b.altitude}°, ${b.direction})`).join('; ') + '.'
          : 'Nothing above the horizon.',
  },
  {
    def: {
      type: 'function',
      name: 'get_tonight_targets',
      description: 'The bodies that will be above the horizon once the sky is dark TONIGHT (computed at the dark-window start) — what to actually plan to observe tonight.',
      parameters: { type: 'object', properties: {} },
    },
    run: (_args, { lat, lon }) => getTonightTargets(lat, lon),
    summarize: (r) => {
      const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now');
      if (!r.bodies?.length) return `Tonight (from ${fmt(r.fromTime)}): no bright planets up — a good night for deep-sky objects.`;
      const when = r.alreadyDark ? 'now (sky is dark)' : `from ${fmt(r.fromTime)}`;
      return `Tonight ${when}: ` + r.bodies.map((b: any) => `${b.name} (${b.altitude}°, ${b.direction})`).join(', ') + '.';
    },
  },
  {
    def: {
      type: 'function',
      name: 'get_moon_conditions',
      description: 'The Moon\'s illumination, phase, and how much it interferes with faint deep-sky observing right now.',
      parameters: { type: 'object', properties: {} },
    },
    run: (_args, { lat, lon }) => getMoonConditions(lat, lon),
    summarize: (r) =>
      `Moon: ${r.illumination}% lit (${r.phaseName}), ${r.aboveHorizon ? `up, ${r.interference} interference` : 'below horizon — no interference'}.`,
  },
  {
    def: {
      type: 'function',
      name: 'get_dark_window',
      description: 'Tonight\'s astronomical-dark window (when the sky is fully dark, Sun below −18°) for planning faint-object observing.',
      parameters: { type: 'object', properties: {} },
    },
    run: (_args, { lat, lon }) => getDarkWindow(lat, lon),
    summarize: (r) => {
      const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
      if (r.isDarkNow) return `Fully dark now; darkness lasts until ${fmt(r.darkEnd)}.`;
      return `Not dark yet (Sun ${r.sunAltitude}°); astronomical dark ${fmt(r.darkStart)}–${fmt(r.darkEnd)}.`;
    },
  },
];

function verdictWord(p: any): string {
  if (!p?.aboveHorizon) return 'below the horizon, not up';
  if (p.daylight) return 'up but daytime, not viewable yet';
  return 'up and viewable now';
}

const BY_NAME = new Map(TOOLS.map((t) => [t.def.name, t]));

/** Descriptors passed to `completion({ tools })`. */
export const TOOL_DEFS = TOOLS.map((t) => t.def);

export function runTool(name: string, args: Record<string, unknown>, ctx: ToolCtx): unknown {
  const tool = BY_NAME.get(name);
  if (!tool) return { error: `unknown tool: ${name}` };
  return tool.run(args ?? {}, ctx);
}

export function summarizeTool(name: string, result: unknown): string {
  const tool = BY_NAME.get(name);
  if (!tool) return '';
  try {
    return tool.summarize(result);
  } catch {
    return '';
  }
}
