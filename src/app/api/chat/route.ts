import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { fetchSkyForecast } from '@/lib/sky-data';
import { getVisiblePlanets } from '@/lib/planets';
import { CLAUDE_MODEL } from '@/lib/ai-config';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DEFAULT_LAT = 41.72;
const DEFAULT_LON = 44.83;

const SYSTEM_PROMPT = `You are ASTRA, an expert AI astronomer for Stellar. You have real-time access to sky conditions and planet positions. When asked about tonight's sky or visibility, call get_planet_positions. When asked about upcoming clear nights, call get_sky_forecast. Be concise and enthusiastic. Respond in the same language the user writes in — Georgian or English. Never mention you are Claude. Always include a fun fact about the objects you mention.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_planet_positions',
    description: 'Get current positions and visibility for all planets and the Moon tonight',
    input_schema: {
      type: 'object',
      properties: {
        lat: { type: 'number' },
        lon: { type: 'number' },
      },
      required: [],
    },
  },
  {
    name: 'get_sky_forecast',
    description: 'Get the 7-day sky quality forecast for a location',
    input_schema: {
      type: 'object',
      properties: {
        lat: { type: 'number' },
        lon: { type: 'number' },
      },
      required: [],
    },
  },
];

async function runTool(name: string, input: Record<string, unknown>): Promise<string> {
  const lat = typeof input.lat === 'number' ? input.lat : DEFAULT_LAT;
  const lon = typeof input.lon === 'number' ? input.lon : DEFAULT_LON;

  if (name === 'get_planet_positions') {
    const planets = getVisiblePlanets(lat, lon, new Date());
    return JSON.stringify(planets.map(p => ({
      name: p.key,
      visible: p.visible,
      altitude: p.altitude,
      riseTime: p.rise,
      setTime: p.set,
    })));
  }

  if (name === 'get_sky_forecast') {
    const forecast = await fetchSkyForecast(lat, lon);
    return JSON.stringify(forecast.map(day => {
      const nightHours = day.hours.filter(h => {
        const hour = new Date(h.time).getHours();
        return hour >= 20 || hour <= 4;
      });
      const src = nightHours.length > 0 ? nightHours : day.hours;
      const avgCloud = Math.round(src.reduce((s, h) => s + h.cloudCover, 0) / src.length);
      const badge: 'go' | 'maybe' | 'skip' = avgCloud < 30 ? 'go' : avgCloud < 60 ? 'maybe' : 'skip';
      return { date: day.date, cloudCoverPct: avgCloud, badge };
    }));
  }

  return JSON.stringify({ error: 'Unknown tool' });
}

function sseStream(text: string): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${text.replace(/\n/g, ' ')}\n\n`));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}

export async function POST(req: NextRequest) {
  let message: string;
  let history: { role: 'user' | 'assistant'; content: string }[];
  let locale: string;

  try {
    const body = await req.json() as {
      message: string;
      history: { role: 'user' | 'assistant'; content: string }[];
      locale?: string;
    };
    message = body.message;
    history = body.history ?? [];
    locale = body.locale ?? 'en';
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: 'No message' }), { status: 400 });
  }
  if (message.length > 2000) {
    return new Response(JSON.stringify({ error: 'Message too long (max 2000 chars)' }), { status: 400 });
  }

  const VALID_LOCALES = ['en', 'ka'] as const;
  const sanitizedLocale = VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number]) ? locale : 'en';
  const systemPrompt = `${SYSTEM_PROMPT}\nUSER LANGUAGE: ${sanitizedLocale}`;

  const safeHistory = (history ?? [])
    .filter(h => h.role === 'user' || h.role === 'assistant')
    .filter(h => typeof h.content === 'string' && h.content.length > 0 && h.content.length <= 4000)
    .slice(-8);

  const messages: Anthropic.MessageParam[] = [
    ...safeHistory.map(h => ({ role: h.role, content: h.content })),
    { role: 'user' as const, content: message },
  ];

  // First call — may trigger tool use
  let firstResponse: Anthropic.Message;
  try {
    firstResponse = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });
  } catch (err) {
    console.error('[AstroChat] Claude API error:', err);
    return new Response(JSON.stringify({ error: 'AI temporarily unavailable' }), { status: 503 });
  }

  // No tool use — emit the response directly
  if (firstResponse.stop_reason !== 'tool_use') {
    const text = firstResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');
    return sseStream(text);
  }

  // Execute each requested tool
  const toolUseBlocks = firstResponse.content.filter(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
  );

  const toolResults: Anthropic.ToolResultBlockParam[] = [];
  for (const block of toolUseBlocks) {
    let result: string;
    try {
      result = await runTool(block.name, block.input as Record<string, unknown>);
    } catch (err) {
      console.error(`[AstroChat] Tool ${block.name} failed:`, err);
      result = JSON.stringify({ error: 'Tool execution failed, answer generally.' });
    }
    toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
  }

  const finalMessages: Anthropic.MessageParam[] = [
    ...messages,
    { role: 'assistant' as const, content: firstResponse.content },
    { role: 'user' as const, content: toolResults },
  ];

  // Second call — stream the final response
  try {
    const stream = client.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 600,
      system: systemPrompt,
      messages: finalMessages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(`data: ${chunk.delta.text}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch {
          controller.enqueue(encoder.encode('data: [ERROR]\n\n'));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    });
  } catch (err) {
    console.error('[AstroChat] Claude stream error:', err);
    return new Response(JSON.stringify({ error: 'AI temporarily unavailable' }), { status: 503 });
  }
}
