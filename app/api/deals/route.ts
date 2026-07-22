import { NextResponse } from "next/server";
import { loadDeals } from "../../../lib/deals";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const country = new URL(request.url).searchParams.get("country")?.toUpperCase() ?? "CN";
  if (country !== "CN") return NextResponse.json({ error: "Phase 1 supports CN only." }, { status: 400 });

  try {
    return NextResponse.json(await loadDeals());
  } catch (error) {
    console.error("deal_sync_failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Deal data is temporarily unavailable." }, { status: 503 });
  }
}
