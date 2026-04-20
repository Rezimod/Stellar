import { NextResponse } from "next/server";
import { resolveMarket } from "@/lib/markets";
import { getServerProgram } from "@/lib/markets/server-program";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  marketId: number;
  outcome: "yes" | "no";
  caller?: string;
}

export async function POST(req: Request) {
  const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET;
  if (!adminWallet) {
    return NextResponse.json({ error: "NEXT_PUBLIC_ADMIN_WALLET not configured" }, { status: 500 });
  }

  const secret = req.headers.get("x-admin-secret");
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.caller && body.caller !== adminWallet) {
    return NextResponse.json({ error: "Caller not authorized" }, { status: 403 });
  }
  if (!Number.isFinite(body.marketId) || body.marketId <= 0) {
    return NextResponse.json({ error: "Invalid marketId" }, { status: 400 });
  }
  if (body.outcome !== "yes" && body.outcome !== "no") {
    return NextResponse.json({ error: "outcome must be 'yes' or 'no'" }, { status: 400 });
  }

  const { program, feePayer } = getServerProgram();
  try {
    const sig = await resolveMarket(program, feePayer.publicKey, body.marketId, body.outcome);
    return NextResponse.json({ txSignature: sig, marketId: body.marketId, outcome: body.outcome });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message?.slice(0, 400) ?? "resolveMarket failed" },
      { status: 500 },
    );
  }
}
