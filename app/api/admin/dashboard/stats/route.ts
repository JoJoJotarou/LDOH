import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

export async function GET() {
  try {
    const [sitesRes, healthRes, sessionsRes] = await Promise.all([
      supabaseAdmin
        .from("site")
        .select("id,is_visible,is_active,deleted_at"),
      supabaseAdmin
        .from("site_health_status")
        .select("site_id,status"),
      supabaseAdmin
        .from("auth_sessions")
        .select("user_id,user_username,created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (sitesRes.error) throw new Error(sitesRes.error.message);
    if (healthRes.error) throw new Error(healthRes.error.message);

    const sites = sitesRes.data ?? [];
    const active = sites.filter((s) => s.is_active && !s.deleted_at);
    const hidden = active.filter((s) => !s.is_visible);
    const deleted = sites.filter((s) => s.deleted_at);

    const healthMap: Record<string, number> = { up: 0, slow: 0, down: 0 };
    for (const h of healthRes.data ?? []) {
      if (h.status in healthMap) {
        healthMap[h.status]++;
      }
    }

    return NextResponse.json({
      totalSites: sites.length,
      activeSites: active.length,
      hiddenSites: hidden.length,
      deletedSites: deleted.length,
      health: healthMap,
      recentSessions: (sessionsRes.data ?? []).map((s) => ({
        userId: s.user_id,
        username: s.user_username,
        createdAt: s.created_at,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
