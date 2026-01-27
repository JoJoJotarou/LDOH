import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getLdUserWithCache } from "@/lib/auth/ld-user";
import { getSessionIdFromCookies } from "@/lib/auth/ld-oauth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  let viewerTrustLevel = 0;
  if (process.env.ENV === "dev") {
    const devLevel = Number(process.env.LD_DEV_TRUST_LEVEL);
    viewerTrustLevel =
      Number.isFinite(devLevel) && devLevel >= 0 ? devLevel : 2;
  } else {
    const sessionId = getSessionIdFromCookies(request.cookies);
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getLdUserWithCache({ sessionId });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    viewerTrustLevel = user.trust_level ?? 0;
  }

  const nowIso = new Date().toISOString();
  const response = await supabaseAdmin
    .from("system_notifications")
    .select("id, title, content, valid_from, valid_until")
    .eq("is_active", true)
    .lte("valid_from", nowIso)
    .or(`valid_until.is.null,valid_until.gte.${nowIso}`)
    .or(`min_trust_level.is.null,min_trust_level.lte.${viewerTrustLevel}`)
    .order("valid_from", { ascending: false });

  if (response.error) {
    console.error("Failed to fetch notifications:", response.error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }

  return NextResponse.json({ notifications: response.data || [] });
}
