import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const dir = path.dirname(fileURLToPath(import.meta.url))
const posts = JSON.parse(await fs.readFile(path.join(dir, 'posts.json'), 'utf8'))
const logoPath = path.join(dir, 'logos', 'stellar-logo-white-transparent.png')

await fs.mkdir(path.join(dir, 'images'), { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })

for (const post of posts) {
  const backgroundPath = path.join(dir, post.background)
  const outputPath = path.join(dir, post.image)
  const backgroundUrl = await dataUrl(backgroundPath)
  const logoUrl = await dataUrl(logoPath)
  await page.setContent(renderPost(post, backgroundUrl, logoUrl), { waitUntil: 'networkidle' })
  await page.screenshot({ path: outputPath, type: 'png' })
  console.log(outputPath)
}

await browser.close()

function renderPost(post, backgroundUrl, logoUrl) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
* { box-sizing: border-box; }
html, body { margin: 0; width: 1600px; height: 900px; overflow: hidden; }
body {
  font-family: Geist, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #070a12;
  color: #eef4ff;
}
.frame {
  position: relative;
  width: 1600px;
  height: 900px;
  background-image:
    linear-gradient(180deg, rgba(6, 9, 18, 0.72), rgba(6, 9, 18, 0.36) 42%, rgba(6, 9, 18, 0.82)),
    url("${backgroundUrl}");
  background-size: cover;
  background-position: center;
}
.grain {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at 50% 20%, rgba(255,255,255,0.12) 0 1px, transparent 1px);
  background-size: 37px 37px;
  opacity: 0.12;
}
.logo {
  position: absolute;
  top: 42px;
  left: 50%;
  width: 430px;
  height: 150px;
  transform: translateX(-50%);
  object-fit: contain;
}
.content {
  position: absolute;
  left: 132px;
  right: 132px;
  bottom: 118px;
}
.kicker {
  display: inline-flex;
  align-items: center;
  height: 42px;
  padding: 0 18px;
  border: 1px solid rgba(238, 244, 255, 0.36);
  color: #d7e1ef;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
h1 {
  max-width: 1120px;
  margin: 30px 0 0;
  font-family: Orbitron, Geist, system-ui, sans-serif;
  font-size: 74px;
  line-height: 1.05;
  font-weight: 600;
  letter-spacing: 0;
  text-wrap: balance;
}
p {
  max-width: 940px;
  margin: 28px 0 0;
  color: #c8d3e6;
  font-size: 32px;
  line-height: 1.28;
  font-weight: 600;
}
.rule {
  position: absolute;
  left: 132px;
  right: 132px;
  bottom: 78px;
  height: 1px;
  background: rgba(238, 244, 255, 0.22);
}
.footer {
  position: absolute;
  left: 132px;
  right: 132px;
  bottom: 34px;
  display: flex;
  justify-content: space-between;
  color: #aab7ca;
  font-size: 22px;
  font-weight: 700;
}
.solana {
  position: absolute;
  right: 132px;
  top: 214px;
}
</style>
</head>
<body>
<main class="frame">
  <div class="grain"></div>
  <img class="logo" src="${logoUrl}" alt="">
  ${post.theme === 'solana' ? `<div class="solana">${solanaLogoSvg()}</div>` : ''}
  <section class="content">
    <div class="kicker">${escapeHtml(post.theme)}</div>
    <h1>${escapeHtml(post.headline)}</h1>
    <p>${escapeHtml(post.subhead)}</p>
  </section>
  <div class="rule"></div>
  <div class="footer">
    <span>stellarr.club</span>
    <span>${escapeHtml(post.hashtags.slice(0, 3).join(' '))}</span>
  </div>
</main>
</body>
</html>`
}

function solanaLogoSvg() {
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

async function dataUrl(filePath) {
  const buffer = await fs.readFile(filePath)
  return `data:image/png;base64,${buffer.toString('base64')}`
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char])
}
