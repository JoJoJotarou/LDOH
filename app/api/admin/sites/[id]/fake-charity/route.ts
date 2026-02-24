import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getAdminUser } from "@/lib/admin/auth";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser(request.cookies);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const { is_fake_charity } = await request.json();

  if (typeof is_fake_charity !== "boolean") {
    return NextResponse.json({ error: "Invalid value" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {
    is_fake_charity,
    updated_at: new Date().toISOString(),
    updated_by: admin.userId,
  };

  // 恢复伪公益时同步恢复上线
  if (!is_fake_charity) {
    updateData.is_active = true;
  }

  const { error } = await supabaseAdmin
    .from("site")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id, is_fake_charity });
}
