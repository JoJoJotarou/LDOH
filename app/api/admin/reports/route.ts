import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getAdminUser } from "@/lib/admin/auth";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request.cookies);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const status = searchParams.get("status") || "";

  let query = supabaseAdmin
    .from("site_reports")
    .select(
      "id, site_id, reporter_id, reporter_username, report_type, reason, status, created_at, reviewed_at, reviewed_by, site:site_id(name,api_base_url,site_maintainers(name,username,profile_url))",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (status && ["pending", "reviewed", "dismissed"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []).map((row: Record<string, unknown>) => {
    const siteObj = row.site as { name?: string; api_base_url?: string; site_maintainers?: { name: string; username: string | null; profile_url: string | null }[] } | null;
    return {
      ...row,
      site_name: siteObj?.name ?? "未知站点",
      site_api_base_url: siteObj?.api_base_url ?? null,
      site_maintainers: siteObj?.site_maintainers ?? [],
      site: undefined,
    };
  });

  return NextResponse.json({
    items,
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  });
}
