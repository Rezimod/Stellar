import { qvac } from './qvac';

/**
 * On-device vision: "what am I looking at?" — the user points the phone at their
 * telescope, an eyepiece, an accessory, or the sky, and the VLM identifies it and
 * gives one useful next step. Runs entirely through QVAC's multimodal model; the
 * photo never leaves the device. Built for real Astroman customers — beginners
 * who own gear they can't yet name.
 */

const SYSTEM = [
  'You are Astra, an expert astronomy-equipment and night-sky guide built into a',
  'telescope shop\'s app. You are shown one photo from a phone camera. Identify what',
  'is in it as specifically as you can — a telescope (reflector / refractor /',
  'Dobsonian / catadioptric), an eyepiece, a mount, a finder, a filter, a Barlow, or',
  'a sky object (Moon, a bright planet, a constellation). Be concrete about type and',
  'likely use. If you are unsure, say what it most resembles and what detail would',
  'confirm it — never invent a brand or model number you cannot see.',
  'Answer in 2–4 short sentences: (1) what it is, (2) one practical tip for using or',
  'observing it. No preamble, no markdown.',
].join(' ');

const DEFAULT_PROMPT =
  'What is this? Identify the equipment or sky object and give me one practical tip.';

export async function identifyImage(
  imagePath: string,
  userPrompt?: string,
): Promise<{ stream: AsyncIterable<string>; model: string }> {
  const prompt = userPrompt?.trim() || DEFAULT_PROMPT;
  const stream = qvac.seeImage(prompt, imagePath, SYSTEM);
  return { stream, model: 'vlm' };
}
