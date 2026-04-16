import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { PublicKey } from '@solana/web3.js';
import Anthropic from '@anthropic-ai/sdk';

// TODO: after claim, regenerate NFT metadata URI to include star name attribute

const CATALOG_ID_RE = /^(HIP|HD|HYG) \d+$/;

interface ClaimedStar {
  id: number;
  hip: number | null;
  hd: number | null;
  proper_name: string | null;
  ra: number;
  dec: number;
  mag: number;
  con: string | null;
  claimed_name: string;
}

async function moderateName(name: string): Promise<{ approved: boolean; reason?: string }> {
  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      system: 'You are a name moderation assistant. Respond only with valid JSON.',
      messages: [
        {
          role: 'user',
          content: `Is this a name appropriate to inscribe on an astronomy NFT? Name: "${name}"

Reject if: offensive, hateful, sexual, a slur, spam, or gibberish.
Allow: personal names, place names, mythological names, words in any language, astronomical terms, creative names.

Respond ONLY with: {"approved":true} or {"approved":false,"reason":"brief reason"}`,
        },
      ],
    });
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    return JSON.parse(text.trim());
  } catch (err) {
    console.error('[star/claim] Moderation error (allowing through):', err);
    return { approved: true };
  }
}


export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { catalogId, chosenName, walletAddress, nftAddress } = body as {
    catalogId: unknown;
    chosenName: unknown;
    walletAddress: unknown;
    nftAddress: unknown;
  };

  if (typeof catalogId !== 'string' || !CATALOG_ID_RE.test(catalogId)) {
    return NextResponse.json({ error: 'Invalid catalogId' }, { status: 400 });
  }
  if (typeof chosenName !== 'string' || chosenName.trim().length < 2 || chosenName.trim().length > 30) {
    return NextResponse.json({ error: 'Name must be 2–30 characters' }, { status: 400 });
  }
  const trimmedName = chosenName.trim();

  if (typeof walletAddress !== 'string') {
    return NextResponse.json({ error: 'Invalid walletAddress' }, { status: 400 });
  }
  try {
    new PublicKey(walletAddress);
  } catch {
    return NextResponse.json({ error: 'Invalid walletAddress' }, { status: 400 });
  }

  if (typeof nftAddress !== 'string' || !nftAddress) {
    return NextResponse.json({ error: 'nftAddress is required' }, { status: 400 });
  }

  const modResult = await moderateName(trimmedName);
  if (!modResult.approved) {
    return NextResponse.json(
      { error: 'Name not approved', reason: modResult.reason },
      { status: 400 }
    );
  }

  const spaceIdx = catalogId.indexOf(' ');
  const prefix = spaceIdx !== -1 ? catalogId.slice(0, spaceIdx) : '';
  const num = spaceIdx !== -1 ? parseInt(catalogId.slice(spaceIdx + 1)) : NaN;
  if (!prefix || isNaN(num)) {
    return NextResponse.json({ error: 'Invalid catalogId' }, { status: 400 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Claim failed' }, { status: 500 });
  }

  try {
    const sql = neon(databaseUrl);
    let rows: ClaimedStar[];
    if (prefix === 'HIP') {
      rows = (await sql`
        UPDATE star_catalog
        SET claimed_by = ${walletAddress}, claimed_name = ${trimmedName},
            claim_nft = ${nftAddress}, claimed_at = NOW()
        WHERE hip = ${num} AND claimed_by IS NULL
        RETURNING id, hip, hd, proper_name, ra, dec, mag, con, claimed_name
      `) as unknown as ClaimedStar[];
    } else if (prefix === 'HD') {
      rows = (await sql`
        UPDATE star_catalog
        SET claimed_by = ${walletAddress}, claimed_name = ${trimmedName},
            claim_nft = ${nftAddress}, claimed_at = NOW()
        WHERE hd = ${num} AND claimed_by IS NULL
        RETURNING id, hip, hd, proper_name, ra, dec, mag, con, claimed_name
      `) as unknown as ClaimedStar[];
    } else {
      rows = (await sql`
        UPDATE star_catalog
        SET claimed_by = ${walletAddress}, claimed_name = ${trimmedName},
            claim_nft = ${nftAddress}, claimed_at = NOW()
        WHERE id = ${num} AND claimed_by IS NULL
        RETURNING id, hip, hd, proper_name, ra, dec, mag, con, claimed_name
      `) as unknown as ClaimedStar[];
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Star already claimed' }, { status: 409 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarrclub.vercel.app';
    const slug = catalogId.replace(' ', '-').toLowerCase();
    const proofUrl = `${appUrl}/star/${encodeURIComponent(slug)}`;

    return NextResponse.json({ success: true, catalogId, chosenName: trimmedName, proofUrl });
  } catch (err) {
    console.error('[star/claim] DB error:', err);
    return NextResponse.json({ error: 'Claim failed' }, { status: 500 });
  }
}
