import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getAdminUser, isSuperAdmin } from "@/lib/admin/auth";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request.cookies);
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const { role } = await request.json();
  const validRole = role === "super_admin" ? "super_admin" : "admin";

  const { error } = await supabaseAdmin
    .from("admin_users")
    .update({ role: validRole })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id, role: validRole });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request.cookies);
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  // 查询要删除的管理员
  const { data: target } = await supabaseAdmin
    .from("admin_users")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  if (target && target.user_id === admin.userId) {
    return NextResponse.json({ error: "不可移除自己" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("admin_users")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id });
}
