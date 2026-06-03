import OpenAI from 'openai'
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { TweetKind } from './tweet-agent'

const SIZE = { width: 1792, height: 1024 } as const

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
    } Mountains silhouetted along the bottom edge. Cinematic, ultra-detailed, NASA APOD style. No people, no text, no logos.`,

  space_news: (ctx) =>
    `A wide cinematic illustration evoking this space story: "${String(ctx.title ?? 'space exploration')}". Style: dramatic deep-space photography aesthetic, dark cosmic background with stars and nebulae, single hero subject centered. NASA / ESA / JWST visual language. Ultra-detailed, no text, no logos, no people.`,

  product_spotlight: (ctx) =>
    `A stylized hero illustration for an astronomy app feature called "${String(ctx.feature ?? 'Stellarr')}". Dark cosmic background with a deep purple-to-teal gradient nebula. A single elegant glass-effect geometric shape (sphere, ring, or constellation lines) glowing softly at center. Minimal, premium, refined. No text, no logos, no people.`,

  astro_fact: (ctx) =>
    `An ultra-detailed astrophotograph of ${String(ctx.name ?? 'a deep-sky object')} (${String(ctx.target ?? '')}) in the constellation ${String(ctx.constellation ?? '')}. Style: Hubble Space Telescope deep-field imagery, vivid natural colors of the actual object, surrounded by background stars, deep black space. Wide landscape composition. No text, no logos, no people.`,
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

let cachedLogo: Buffer | null = null
async function loadLogoSvg(): Promise<Buffer> {
  if (cachedLogo) return cachedLogo
  const filePath = path.join(process.cwd(), 'public', 'brand', 'logo-mark.svg')
  cachedLogo = await readFile(filePath)
  return cachedLogo
}

const CORNER_PAD = 36
const LOGO_MARK_W = 32
const BADGE_W = 148
const BADGE_H = 44

async function buildCornerBadge(align: 'left' | 'right'): Promise<Buffer> {
  const logoSvg = await loadLogoSvg()
  const logoPng = await sharp(logoSvg, { density: 600 })
    .resize({ width: LOGO_MARK_W })
    .png()
    .toBuffer()
  const logoMeta = await sharp(logoPng).metadata()
  const logoH = logoMeta.height ?? LOGO_MARK_W
  const logoY = Math.round((BADGE_H - logoH) / 2)
  const logoX = align === 'left' ? 10 : BADGE_W - LOGO_MARK_W - 10
  const textX = align === 'left' ? LOGO_MARK_W + 22 : 14
  const textAnchor = align === 'left' ? 'start' : 'end'

  return sharp({
    create: {
      width: BADGE_W,
      height: BADGE_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE_W}" height="${BADGE_H}">
            <text x="${textX}" y="30" text-anchor="${textAnchor}" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="600" fill="#F4EDE0" opacity="0.92">Stellar</text>
          </svg>`,
        ),
        top: 0,
        left: 0,
      },
      { input: logoPng, top: logoY, left: logoX },
    ])
    .png()
    .toBuffer()
}

async function compositeLogo(photo: Buffer): Promise<Buffer> {
  const resized = await sharp(photo).resize(SIZE.width, SIZE.height, { fit: 'cover' }).toBuffer()
  const [topLeft, topRight] = await Promise.all([
    buildCornerBadge('left'),
    buildCornerBadge('right'),
  ])

  return sharp(resized)
    .composite([
      { input: topLeft, top: CORNER_PAD, left: CORNER_PAD },
      { input: topRight, top: CORNER_PAD, left: SIZE.width - BADGE_W - CORNER_PAD },
    ])
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
