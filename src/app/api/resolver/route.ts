import { NextResponse } from "next/server";
import {
  findMetadataByMarketId,
  getAllMarkets,
  resolveMarket,
} from "@/lib/markets";
import { getServerProgram } from "@/lib/markets/server-program";
import { dispatchResolver, recipeKind } from "@/lib/oracles/router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Detail {
  marketId: number;
  slug: string | null;
  source: string;
  status: "resolved" | "skipped_manual" | "insufficient_data" | "unknown" | "error";
  outcome?: "yes" | "no";
  confidence?: string;
  evidence?: string;
  txSignature?: string;
  error?: string;
}

function unauthorized(msg: string) {
  return NextResponse.json({ error: msg }, { status: 401 });
}

async function authorized(req: Request): Promise<boolean> {
  const secret = process.env.RESOLVER_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : header;
  if (bearer === secret) return true;
  // Vercel Cron signs with `Authorization: Bearer <CRON_SECRET>`; allow same.
  const vercelSecret = process.env.CRON_SECRET;
  if (vercelSecret && bearer === vercelSecret) return true;
  return false;
}

async function handle(req: Request): Promise<NextResponse> {
  if (!(await authorized(req))) return unauthorized("Missing or invalid RESOLVER_SECRET");

  const { program, feePayer } = getServerProgram();
  const all = await getAllMarkets(program);
  const now = Date.now();
  const pending = all.filter(
    (m) => !m.resolved && !m.cancelled && m.resolutionTime.getTime() <= now,
  );

  const details: Detail[] = [];
  let resolvedCount = 0;
  let pendingManualCount = 0;

  for (const m of pending) {
    const meta = findMetadataByMarketId(m.marketId);
    const slug = meta?.id ?? null;
    const source = meta?.resolutionSource ?? "unknown";

    if (!slug) {
      details.push({ marketId: m.marketId, slug, source, status: "unknown", error: "No metadata binding" });
      continue;
    }

    if (recipeKind(slug) === "manual" || recipeKind(slug) === "unknown") {
      pendingManualCount++;
      details.push({
        marketId: m.marketId,
        slug,
        source,
        status: recipeKind(slug) === "manual" ? "skipped_manual" : "unknown",
      });
      continue;
    }

    const dispatch = await dispatchResolver(slug);
    if (dispatch.status === "manual") {
      pendingManualCount++;
      details.push({ marketId: m.marketId, slug, source, status: "skipped_manual" });
      continue;
    }
    if (dispatch.status === "unknown") {
      details.push({ marketId: m.marketId, slug, source, status: "unknown", error: dispatch.reason });
      continue;
    }

    const { result } = dispatch;
    if (result.outcome === "insufficient_data") {
      details.push({
        marketId: m.marketId,
        slug,
        source,
        status: "insufficient_data",
        evidence: result.evidence,
      });
      continue;
    }

    try {
      const sig = await resolveMarket(program, feePayer.publicKey, m.marketId, result.outcome);
      resolvedCount++;
      details.push({
        marketId: m.marketId,
        slug,
        source,
        status: "resolved",
        outcome: result.outcome,
        confidence: result.confidence,
        evidence: result.evidence,
        txSignature: sig,
      });
    } catch (e) {
      details.push({
        marketId: m.marketId,
        slug,
        source,
        status: "error",
        error: (e as Error).message?.slice(0, 300),
      });
    }
  }

  return NextResponse.json({
    checked: pending.length,
    resolved: resolvedCount,
    pending_manual: pendingManualCount,
    details,
  });
}

export async function POST(req: Request) {
  return handle(req);
}

// Vercel Cron sends GET — accept both.
export async function GET(req: Request) {
  return handle(req);
}
