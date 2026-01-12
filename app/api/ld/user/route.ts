import { NextRequest, NextResponse } from "next/server";
import { getLdUserWithCache } from "@/lib/auth/ld-user";
import { getSessionIdFromCookies } from "@/lib/auth/ld-oauth";

export async function GET(request: NextRequest) {
  try {
    if (process.env.ENV === "dev") {
      const devLevel = Number(process.env.LD_DEV_TRUST_LEVEL);
      const trustLevel =
        Number.isFinite(devLevel) && devLevel >= 0 ? devLevel : 2;
      const devUsername = process.env.LD_DEV_USERNAME || "dev";
      return NextResponse.json({
        id: 0,
        username: devUsername,
        trust_level: trustLevel,
      });
    }

    const sessionId = getSessionIdFromCookies(request.cookies);
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getLdUserWithCache({
      sessionId,
      options: { requireId: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({
      id: user.id,
      username: user.username,
      trust_level: user.trust_level,
      avatar_template: user.avatar_template,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load user";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
