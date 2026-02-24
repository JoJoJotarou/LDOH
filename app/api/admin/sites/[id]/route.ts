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
  const payload = await request.json();

  const updateData: Record<string, unknown> = {};
  const allowedFields = [
    "name", "description", "registration_limit", "api_base_url",
    "supports_immersive_translation", "supports_ldc", "supports_checkin",
    "supports_nsfw", "checkin_url", "checkin_note", "benefit_url",
    "rate_limit", "status_url", "is_only_maintainer_visible", "is_active",
    "is_runaway", "is_fake_charity",
  ];

  for (const field of allowedFields) {
    if (payload[field] !== undefined) {
      updateData[field] = payload[field];
    }
  }
  updateData.updated_at = new Date().toISOString();
  updateData.updated_by = admin.userId;

  const { error } = await supabaseAdmin
    .from("site")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id });
}
