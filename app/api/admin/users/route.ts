import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getAdminUser, isSuperAdmin } from "@/lib/admin/auth";

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request.cookies);
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = request.nextUrl;
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = 20;
    const offset = (page - 1) * pageSize;

    const { data, error, count } = await supabaseAdmin
      .from("auth_sessions")
      .select("id,user_id,user_username,user_trust_level,user_fetched_at,session_expires_at,created_at", { count: "exact" })
      .not("user_id", "is", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);

    return NextResponse.json({
      users: (data ?? []).map((s) => ({
        sessionId: s.id,
        userId: s.user_id,
        username: s.user_username,
        trustLevel: s.user_trust_level,
        lastSeen: s.user_fetched_at,
        sessionExpiresAt: s.session_expires_at,
        createdAt: s.created_at,
      })),
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
