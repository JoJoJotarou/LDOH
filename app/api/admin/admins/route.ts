import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getAdminUser, isSuperAdmin } from "@/lib/admin/auth";

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request.cookies);
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id,user_id,role,created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ admins: data ?? [] });
}

export async function POST(request: NextRequest) {
  const admin = await getAdminUser(request.cookies);
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { user_id, role } = await request.json();
  if (!user_id || !Number.isFinite(Number(user_id))) {
    return NextResponse.json({ error: "Invalid user_id" }, { status: 400 });
  }

  const validRole = role === "super_admin" ? "super_admin" : "admin";

  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .insert({ user_id: Number(user_id), role: validRole })
    .select("id,user_id,role,created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "该用户已是管理员" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
