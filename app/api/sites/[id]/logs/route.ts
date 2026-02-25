import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getLdUserWithCache } from "@/lib/auth/ld-user";
import { getSessionIdFromCookies } from "@/lib/auth/ld-oauth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const siteId = params.id;
    if (!siteId) {
      return NextResponse.json({ error: "Missing site id" }, { status: 400 });
    }

    if (process.env.ENV !== "dev") {
      const sessionId = getSessionIdFromCookies(request.cookies);
      if (!sessionId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const user = await getLdUserWithCache({ sessionId });
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const siteResponse = await supabaseAdmin
        .from("site")
        .select("is_only_maintainer_visible,is_active,registration_limit")
        .eq("id", siteId)
        .maybeSingle();
      if (siteResponse.error) {
        return NextResponse.json(
          { error: siteResponse.error.message },
          { status: 500 }
        );
      }
      if (!siteResponse.data) {
        return NextResponse.json({ error: "Site not found" }, { status: 404 });
      }

      const isAllowedByLevel =
        Boolean(siteResponse.data.is_active) &&
        !Boolean(siteResponse.data.is_only_maintainer_visible) &&
        (siteResponse.data.registration_limit ?? 0) <= user.trust_level;

      if (!isAllowedByLevel) {
        const maintainerResponse = await supabaseAdmin
          .from("site_maintainers")
          .select("id")
          .eq("site_id", siteId)
          .or(
            `username.ilike.${user.username},profile_url.ilike.%/u/${user.username}/summary%`
          )
          .limit(1);
        if (maintainerResponse.error) {
          return NextResponse.json(
            { error: maintainerResponse.error.message },
            { status: 500 }
          );
        }
        const isMaintainer = (maintainerResponse.data ?? []).length > 0;
        if (!isMaintainer) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    const logResponse = await supabaseAdmin
      .from("site_logs")
      .select("id,action,actor_id,actor_username,message,created_at")
      .eq("site_id", siteId)
      .order("created_at", { ascending: false });

    if (logResponse.error) {
      return NextResponse.json(
        { error: logResponse.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ logs: logResponse.data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
