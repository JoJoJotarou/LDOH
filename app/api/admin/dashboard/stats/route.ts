import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

export async function GET() {
  try {
    const [sitesRes, healthRes, sessionsRes, reportsRes] = await Promise.all([
      supabaseAdmin
        .from("site")
        .select("id,is_only_maintainer_visible,is_active,is_runaway,is_fake_charity"),
      supabaseAdmin
        .from("site_health_status")
        .select("site_id,status"),
      supabaseAdmin
        .from("auth_sessions")
        .select("user_id,user_username,created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("site_reports")
        .select("report_type")
        .eq("status", "pending"),
    ]);

    if (sitesRes.error) throw new Error(sitesRes.error.message);
    if (healthRes.error) throw new Error(healthRes.error.message);
    if (reportsRes.error) throw new Error(reportsRes.error.message);

    const sites = sitesRes.data ?? [];
    const active = sites.filter((s) => s.is_active);
    const offline = sites.filter((s) => !s.is_active);
    const maintainerOnly = active.filter((s) => s.is_only_maintainer_visible);
    const runaway = sites.filter((s) => s.is_runaway);
    const fakeCharity = sites.filter((s) => s.is_fake_charity);
    const publicVisible = sites.filter(
      (s) =>
        s.is_active &&
        !s.is_only_maintainer_visible &&
        !s.is_runaway &&
        !s.is_fake_charity
    );

    const pendingReports = reportsRes.data ?? [];
    const pendingRunawayReports = pendingReports.filter(
      (r) => r.report_type === "runaway"
    ).length;
    const pendingFakeCharityReports = pendingReports.filter(
      (r) => r.report_type === "fake_charity"
    ).length;

    const healthMap: Record<string, number> = { up: 0, slow: 0, down: 0 };
    for (const h of healthRes.data ?? []) {
      if (h.status in healthMap) {
        healthMap[h.status]++;
      }
    }

    return NextResponse.json({
      totalSites: sites.length,
      activeSites: active.length,
      maintainerOnlySites: maintainerOnly.length,
      offlineSites: offline.length,
      publicVisibleSites: publicVisible.length,
      runawaySites: runaway.length,
      fakeCharitySites: fakeCharity.length,
      pendingReports: pendingReports.length,
      pendingRunawayReports,
      pendingFakeCharityReports,
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
