import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are ASTRA — an expert astronomy assistant aboard STELLAR Mission Control. You help amateur and intermediate astronomers get the most out of their telescopes and night-sky observations.

Your expertise covers:
- Telescope operation: collimation, focusing, eyepiece selection, magnification calculation, mount types (alt-az, equatorial, GoTo)
- Finding celestial objects: star-hopping techniques, using setting circles, RA/Dec coordinates, using apps like Stellarium, SkySafari
- Tonight's featured targets: The Moon (crater identification), Jupiter (Great Red Spot, Galilean moons), Saturn (ring system, Cassini Division), Orion Nebula M42 (Trapezium cluster), Pleiades M45 (Seven Sisters open cluster)
- Observing conditions: seeing quality, transparency, light pollution (Bortle scale), atmospheric refraction
- Astrophotography basics: afocal photography through eyepiece, phone adapters, exposure settings, dark frames
- Naked-eye astronomy: constellations, meteor showers, satellite passes, ISS visibility
- Astroman.ge product guidance: telescopes, eyepieces, accessories

Tone: professional but warm, like a knowledgeable colleague at an observatory. Keep answers concise (2–4 sentences for simple questions, up to 6 for complex ones). Use technical terms but always explain them briefly. Occasionally use ✦ for emphasis on key points.`;

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json() as {
      message: string;
      history: { role: 'user' | 'assistant'; content: string }[];
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'No message' }, { status: 400 });
    }

    const messages = [
      ...history.slice(-8), // keep last 8 exchanges for context
      { role: 'user' as const, content: message },
    ];

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages,
    });

    const reply = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ reply });
  } catch (err) {
    console.error('[AstroChat] API error:', err);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }
}
