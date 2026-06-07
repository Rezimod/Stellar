import { qvac } from './qvac';

/**
 * On-device vision: "what am I looking at?" — the user points the phone at their
 * telescope, an eyepiece, an accessory, or the sky, and the VLM identifies it and
 * gives one useful next step. Runs entirely through QVAC's multimodal model; the
 * photo never leaves the device. Built for real Astroman customers — beginners
 * who own gear they can't yet name.
 */

const SYSTEM = [
  'Look carefully at the photo and describe what is ACTUALLY visible in it. Base',
  'every statement only on what you can see in this image.',
  '',
  'If the photo shows a telescope, name the type from its shape:',
  'refractor (long thin tube, eyepiece at the back), Newtonian reflector (eyepiece',
  'on the side near the top), Dobsonian (reflector tube in a boxy base on the',
  'ground), or catadioptric/SCT (short fat tube with a glass plate at the front).',
  'If it shows an eyepiece, mount, finder, Barlow, or filter, name that. If it shows',
  'the Moon, a bright planet, or a constellation, identify it.',
  '',
  'If the photo is NOT astronomy-related, just say plainly what it actually shows —',
  'do NOT pretend it is a telescope or astronomy gear, and do not describe an app.',
  '',
  'Never invent a brand or model number you cannot read in the image. Answer in 2–4',
  'short sentences: first what you see, then (if it is gear or sky) one practical',
  'tip. No preamble, no markdown.',
].join('\n');

const DEFAULT_PROMPT = 'What is in this photo? If it is astronomy gear or the sky, identify it.';

export async function identifyImage(
  imagePath: string,
  userPrompt?: string,
): Promise<{ stream: AsyncIterable<string>; model: string }> {
  const prompt = userPrompt?.trim() || DEFAULT_PROMPT;
  const stream = qvac.seeImage(prompt, imagePath, SYSTEM);
  return { stream, model: 'vlm' };
}
