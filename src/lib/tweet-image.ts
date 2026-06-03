import OpenAI from 'openai'
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { TweetKind } from './tweet-agent'

const SIZE = { width: 1792, height: 1024 } as const
const LOGO_WIDTH = 300
const TOP_PAD = 12

function openai() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing')
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

const IMAGE_PROMPTS: Record<TweetKind, (ctx: Record<string, unknown>) => string> = {
  sky_verdict: (ctx) =>
    `A dramatic wide landscape astrophotograph of a night sky over Tbilisi, Georgia. ${
      Number(ctx.score) >= 70
        ? 'Crystal clear deep-blue sky scattered with thousands of stars, the Milky Way arching overhead'
        : Number(ctx.score) >= 40
          ? 'Partly cloudy night, scattered stars peeking through gaps'
          : 'Overcast cloudy night with very few stars visible'
    }. ${
      Array.isArray(ctx.planets) && ctx.planets.length
        ? `A bright planet (${(ctx.planets as string[])[0]}) glows distinctly above the horizon.`
        : ''
    } Mountains silhouetted along the bottom edge. Cinematic, ultra-detailed, NASA APOD style. No people, no text, no logos, no watermarks, no brand marks, no words anywhere in the image.`,

  space_news: (ctx) =>
    `A wide cinematic illustration evoking this space story: "${String(ctx.title ?? 'space exploration')}". Style: dramatic deep-space photography aesthetic, dark cosmic background with stars and nebulae, single hero subject centered. NASA / ESA / JWST visual language. Ultra-detailed, no text, no logos, no watermarks, no brand marks, no people.`,

  product_spotlight: (ctx) =>
    `A stylized hero illustration for an astronomy app feature. Dark cosmic background with a deep purple-to-teal gradient nebula. A single elegant glass-effect geometric shape (sphere, ring, or constellation lines) glowing softly at center. Minimal, premium, refined. No text, no logos, no watermarks, no brand marks, no words, no people.`,

  astro_fact: (ctx) =>
    `An ultra-detailed astrophotograph of ${String(ctx.name ?? 'a deep-sky object')} (${String(ctx.target ?? '')}) in the constellation ${String(ctx.constellation ?? '')}. Style: Hubble Space Telescope deep-field imagery, vivid natural colors of the actual object, surrounded by background stars, deep black space. Wide landscape composition. No text, no logos, no watermarks, no brand marks, no people.`,
}

async function generateBasePhoto(kind: TweetKind, context: Record<string, unknown>): Promise<Buffer> {
  const prompt = IMAGE_PROMPTS[kind](context)
  const res = await openai().images.generate({
    model: 'gpt-image-1',
    prompt,
    size: '1536x1024',
    quality: 'medium',
    n: 1,
  })
  const b64 = res.data?.[0]?.b64_json
  if (!b64) throw new Error('Image generation returned no b64_json')
  return Buffer.from(b64, 'base64')
}

let cachedWhite: Buffer | null = null
let cachedBlack: Buffer | null = null

async function loadWordmark(variant: 'white' | 'black'): Promise<Buffer> {
  if (variant === 'white') {
    if (!cachedWhite) {
      cachedWhite = await readFile(path.join(process.cwd(), 'public', 'brand', 'logo-white.png'))
    }
    return cachedWhite
  }
  if (!cachedBlack) {
    cachedBlack = await readFile(path.join(process.cwd(), 'public', 'brand', 'logo-black.png'))
  }
  return cachedBlack
}

/** Sample top band luminance; bright sky → black logo, dark sky → white logo. */
async function pickLogoVariant(photo: Buffer): Promise<'white' | 'black'> {
  const resized = await sharp(photo).resize(SIZE.width, SIZE.height, { fit: 'cover' }).toBuffer()
  const bandHeight = Math.max(80, Math.round(SIZE.height * 0.12))
  const { data, info } = await sharp(resized)
    .extract({ left: 0, top: 0, width: SIZE.width, height: bandHeight })
    .resize(64, 36, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  let sum = 0
  const channels = info.channels ?? 3
  for (let i = 0; i < data.length; i += channels) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }
  const avg = sum / (data.length / channels)
  return avg > 140 ? 'black' : 'white'
}

async function compositeLogo(photo: Buffer): Promise<Buffer> {
  const variant = await pickLogoVariant(photo)
  const wordmark = await loadWordmark(variant)
  const logoPng = await sharp(wordmark).trim().resize({ width: LOGO_WIDTH }).png().toBuffer()
  const meta = await sharp(logoPng).metadata()
  const logoW = meta.width ?? LOGO_WIDTH
  const logoH = meta.height ?? 40

  const resized = await sharp(photo).resize(SIZE.width, SIZE.height, { fit: 'cover' }).toBuffer()
  const left = Math.round((SIZE.width - logoW) / 2)

  return sharp(resized)
    .composite([{ input: logoPng, top: TOP_PAD, left }])
    .png({ quality: 90 })
    .toBuffer()
}

export async function generateTweetImage(
  kind: TweetKind,
  context: Record<string, unknown>,
): Promise<Buffer> {
  const photo = await generateBasePhoto(kind, context)
  return compositeLogo(photo)
}
