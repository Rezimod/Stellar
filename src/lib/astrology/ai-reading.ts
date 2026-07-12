import Anthropic from '@anthropic-ai/sdk';
import type { NatalChart } from './natal-chart';
import { capitalizeSign, getZodiacEmoji } from './natal-chart';

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

function chartToPrompt(chart: NatalChart, name: string): string {
  const sunEmoji = getZodiacEmoji(chart.sunSign);
  const moonEmoji = getZodiacEmoji(chart.moonSign);
  const risingEmoji = getZodiacEmoji(chart.risingSign);

  const planetInfo = Object.entries(chart.planetSigns)
    .map(([planet, sign]) => `${planet}: ${capitalizeSign(sign)}`)
    .join(', ');

  return `I have a natal chart for ${name}:
- Born: ${chart.birthDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Birth location: ${chart.location.name} (${chart.location.lat.toFixed(2)}°, ${chart.location.lon.toFixed(2)}°)
- Sun ${sunEmoji}: ${capitalizeSign(chart.sunSign)}
- Moon ${moonEmoji}: ${capitalizeSign(chart.moonSign)}
- Rising/Ascendant ${risingEmoji}: ${capitalizeSign(chart.risingSign)}
- Planets: ${planetInfo}

Please write a warm, personalized 2-3 paragraph astrology reading for ${name}. Focus on:
1. Their core nature (sun sign) and emotional landscape (moon sign)
2. How they present to the world (rising sign)
3. A poetic insight about their birth moment and what the stars were saying

Keep it warm, encouraging, and personal. This is for their keepsake, not a fortune-telling. Respond in plain text, no markdown.`;
}

export async function generateNatalReading(chart: NatalChart, name: string): Promise<string> {
  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: chartToPrompt(chart, name),
        },
      ],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return text || '';
  } catch (err) {
    console.error('[Astrology] Failed to generate natal reading:', err);
    return '';
  }
}

export async function generateDailyHoroscope(
  chart: NatalChart,
  name: string,
  date: Date = new Date(),
): Promise<string> {
  try {
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const prompt = `${name} is a ${capitalizeSign(chart.sunSign)} (moon: ${capitalizeSign(chart.moonSign)}, rising: ${capitalizeSign(chart.risingSign)}).

Write a brief, encouraging daily horoscope for ${name} for ${dateStr}. Keep it to 2-3 sentences. Focus on:
- A theme or energy for the day
- A gentle suggestion or insight
- An encouraging note about their path

Be warm and poetic, not formulaic. No fortune-telling or scary predictions. Respond in plain text.`;

    const response = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    return text || '';
  } catch (err) {
    console.error('[Astrology] Failed to generate daily horoscope:', err);
    return '';
  }
}
