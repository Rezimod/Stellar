import { z } from 'zod';
import { getBodyPosition, getVisibleNow } from './ephemeris';

/**
 * QVAC tool descriptors for the offline sky agent. Each tool's handler is pure
 * local computation (astronomy-engine) bound to the observer's location — the
 * model decides *when* to call; the answer is grounded in real ephemeris, not
 * the 1B model's guess.
 */

const BODY_ENUM = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as const;

export function buildSkyTools(lat: number, lon: number) {
  return [
    {
      name: 'get_body_position',
      description:
        'Get the current sky position of a planet, the Moon, or the Sun: altitude above the horizon in degrees, compass direction, whether it is visible right now, brightness (magnitude), constellation, and rise/set times. Use for any question about whether or where a specific object is in the sky now.',
      parameters: z.object({
        body: z.enum(BODY_ENUM).describe('the celestial body to locate'),
      }),
      handler: async ({ body }: { body: string }) => {
        const p = getBodyPosition(body, lat, lon);
        return p ?? { error: `Unknown body: ${body}` };
      },
    },
    {
      name: 'get_visible_now',
      description:
        'List every planet and the Moon currently above the horizon at the observer location, highest/brightest first. Use for "what can I see right now / tonight?" questions.',
      parameters: z.object({}),
      handler: async () => {
        const list = getVisibleNow(lat, lon);
        return {
          count: list.length,
          bodies: list.map((b) => ({
            name: b.name,
            altitude: b.altitude,
            direction: b.azimuthDir,
            magnitude: b.magnitude,
            constellation: b.constellation,
          })),
        };
      },
    },
  ];
}

export type SkyTool = ReturnType<typeof buildSkyTools>[number];
