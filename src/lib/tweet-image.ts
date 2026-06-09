import OpenAI from 'openai'
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { TweetKind } from './tweet-agent'

const SIZE = { width: 1792, height: 1024 } as const
const LOGO_WIDTH = 360
const TOP_PAD = 34

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

  short_post: (ctx) =>
    `A minimal wide night-sky photograph — ${
      ctx.angle === 'app'
        ? 'a telescope silhouette under a star field with soft Milky Way glow'
        : 'a single striking celestial subject (moon, planet, or nebula) in an otherwise dark sky'
    }. Cinematic, calm, premium. No text, no logos, no watermarks, no people.`,

  build_update: (ctx) =>
    `A premium wide astronomy product-development scene for Stellar. Subject: ${String(ctx.focus ?? 'astronomy app development')}. A dark-sky planning desk with telescope silhouette, star chart interface hints, precise scientific mood, realistic night environment, restrained NASA-inspired editorial style. No text, no logos, no watermarks, no brand marks, no people.`,

  solana_infra: (ctx) =>
    `A premium wide astronomy infrastructure scene for Stellar on Solana. Subject: ${String(ctx.focus ?? 'quiet blockchain infrastructure')}. A telescope under a precise star field with subtle network-line geometry in the sky, suggesting invisible infrastructure behind observation proofs and rewards. Calm, scientific, dark cosmic palette. No text, no logos, no watermarks, no brand marks, no trading screens, no people.`,
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

let cachedWhiteLogo: Buffer | null = null

async function loadWhiteWordmark(): Promise<Buffer> {
  if (cachedWhiteLogo) return cachedWhiteLogo

  const raw = await readFile(path.join(process.cwd(), 'public', 'brand', 'stellar-logo-white-transparent.png'))
  cachedWhiteLogo = await sharp(raw).ensureAlpha().png().toBuffer()

  return cachedWhiteLogo
}

async function compositeBranding(photo: Buffer, kind: TweetKind, body: string): Promise<Buffer> {
  const wordmark = await loadWhiteWordmark()
  const logoPng = await sharp(wordmark).trim({ threshold: 10 }).resize({ width: LOGO_WIDTH }).png().toBuffer()
  const meta = await sharp(logoPng).metadata()
  const logoW = meta.width ?? LOGO_WIDTH

  const resized = await sharp(photo).resize(SIZE.width, SIZE.height, { fit: 'cover' }).toBuffer()
  const logoLeft = Math.round((SIZE.width - logoW) / 2)
  const textSvg = buildTextOverlay(body)
  const overlays: sharp.OverlayOptions[] = [
    { input: Buffer.from(textSvg), top: 0, left: 0 },
    { input: logoPng, top: TOP_PAD, left: logoLeft },
  ]

  if (kind === 'solana_infra') {
    overlays.push({
      input: Buffer.from(solanaLogoSvg()),
      top: SIZE.height - 118,
      left: SIZE.width - 342,
    })
  }

  return sharp(resized)
    .composite(overlays)
    .png({ quality: 90 })
    .toBuffer()
}

export async function generateTweetImage(
  kind: TweetKind,
  context: Record<string, unknown>,
  body: string,
): Promise<Buffer> {
  const photo = await generateBasePhoto(kind, context)
  return compositeBranding(photo, kind, body)
}

function buildTextOverlay(body: string): string {
  const cleaned = body
    .replace(/https?:\/\/\S+/g, '')
    .replace(/#[\p{L}\p{N}_]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
  const headline = cleaned.length > 150 ? `${cleaned.slice(0, 147).trim()}...` : cleaned
  const lines = wrapText(headline, 34, 4)
  const text = lines
    .map((line, index) => `<text x="150" y="${626 + index * 74}">${escapeXml(line)}</text>`)
    .join('')

  return `<svg width="${SIZE.width}" height="${SIZE.height}" viewBox="0 0 ${SIZE.width} ${SIZE.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#050812" stop-opacity="0"/>
      <stop offset="0.48" stop-color="#050812" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#050812" stop-opacity="0.9"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#02040a" flood-opacity="0.72"/>
    </filter>
  </defs>
  <rect width="1792" height="1024" fill="url(#shade)"/>
  <g filter="url(#shadow)" font-family="Geist, Arial, sans-serif" font-size="66" font-weight="800" fill="#f2f6ff">${text}</g>
  <text x="150" y="940" font-family="Geist, Arial, sans-serif" font-size="34" font-weight="800" fill="#c8d3e6">stellarr.club</text>
</svg>`
}

function solanaLogoSvg(): string {
  return `<svg width="238" height="70" viewBox="0 0 238 70" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sol" x1="18" y1="8" x2="90" y2="62" gradientUnits="userSpaceOnUse">
      <stop stop-color="#00FFA3"/>
      <stop offset="0.5" stop-color="#DC1FFF"/>
      <stop offset="1" stop-color="#9945FF"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="238" height="70" rx="14" fill="#050812" fill-opacity="0.72"/>
  <path d="M24 17H92L78 29H10L24 17Z" fill="url(#sol)"/>
  <path d="M10 41H78L92 29H24L10 41Z" fill="url(#sol)"/>
  <path d="M24 53H92L78 65H10L24 53Z" fill="url(#sol)"/>
  <text x="108" y="45" font-family="Geist, Arial, sans-serif" font-size="28" font-weight="800" fill="#F5F7FF">SOLANA</text>
</svg>`
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (next.length <= maxChars) {
      line = next
      continue
    }
    if (line) lines.push(line)
    line = word
    if (lines.length === maxLines - 1) break
  }

  if (line && lines.length < maxLines) lines.push(line)
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,;:!?-]*$/, '')}...`
  }

  return lines
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[char]!)
}
