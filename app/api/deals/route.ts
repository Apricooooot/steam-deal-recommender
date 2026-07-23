import { NextResponse } from "next/server";
import { loadDeals } from "../../../lib/deals";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const region = params.get("region") ?? params.get("country") ?? "CN";
  const locale = params.get("locale");

  try {
    return NextResponse.json(await loadDeals({ region, locale }));
  } catch (error) {
    console.error("deal_sync_failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Deal data is temporarily unavailable." }, { status: 503 });
  }
}
