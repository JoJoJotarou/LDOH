import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const search = url.searchParams.get("search") || "";
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = 20;
    const offset = (page - 1) * pageSize;

    let query = supabaseAdmin
      .from("site")
      .select("id,name,description,api_base_url,is_only_maintainer_visible,is_active,is_runaway,is_fake_charity,updated_at,registration_limit", { count: "exact" });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,api_base_url.ilike.%${search}%`
      );
    }

    query = query
      .order("updated_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) throw new Error(error.message);

    return NextResponse.json({
      sites: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load sites";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
