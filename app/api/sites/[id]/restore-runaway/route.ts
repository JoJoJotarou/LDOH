import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getLdUserWithCache } from "@/lib/auth/ld-user";
import { getSessionIdFromCookies } from "@/lib/auth/ld-oauth";

function parseMaintainerId(value?: string | null) {
  if (!value) return "";
  const match = value.match(/linux\.do\/u\/([^/]+)\/summary/i);
  return match ? match[1] : value;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: siteId } = await context.params;
    if (!siteId) {
      return NextResponse.json({ error: "Missing site id" }, { status: 400 });
    }

    let actorId = 0;
    let actorUsername = "";

    if (process.env.ENV === "dev") {
      const { getDevUserConfig } = await import("@/lib/auth/dev-user");
      const devUser = getDevUserConfig();
      actorId = devUser.id;
      actorUsername = devUser.username;
    } else {
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
      actorId = user.id;
      actorUsername = user.username;
    }

    const [siteResponse, maintainerResponse] = await Promise.all([
      supabaseAdmin
        .from("site")
        .select("id,is_runaway")
        .eq("id", siteId)
        .maybeSingle(),
      supabaseAdmin
        .from("site_maintainers")
        .select("username,profile_url")
        .eq("site_id", siteId),
    ]);

    if (siteResponse.error) {
      return NextResponse.json({ error: siteResponse.error.message }, { status: 500 });
    }
    if (maintainerResponse.error) {
      return NextResponse.json({ error: maintainerResponse.error.message }, { status: 500 });
    }
    if (!siteResponse.data) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const normalizedActor = actorUsername.toLowerCase();
    const isMaintainer = (maintainerResponse.data ?? []).some((maintainer) => {
      const username = parseMaintainerId(maintainer.username).toLowerCase();
      const profileId = parseMaintainerId(maintainer.profile_url).toLowerCase();
      return username === normalizedActor || profileId === normalizedActor;
    });

    if (!isMaintainer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("site")
      .update({
        is_runaway: false,
        is_active: true,
        updated_at: new Date().toISOString(),
        updated_by: actorId > 0 ? actorId : null,
      })
      .eq("id", siteId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabaseAdmin.from("site_logs").insert({
      site_id: siteId,
      action: "RESTORE_RUNAWAY",
      actor_id: actorId,
      actor_username: actorUsername,
      message: "站长恢复了跑路状态",
    });

    return NextResponse.json({ success: true, id: siteId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to restore runaway site";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
