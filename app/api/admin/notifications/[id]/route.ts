import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const payload = await request.json();

  const updateData: Record<string, unknown> = {};
  if (payload.title !== undefined) updateData.title = payload.title.trim();
  if (payload.content !== undefined) updateData.content = payload.content.trim();
  if (payload.valid_from !== undefined) updateData.valid_from = payload.valid_from;
  if (payload.valid_until !== undefined) updateData.valid_until = payload.valid_until || null;
  if (payload.min_trust_level !== undefined) updateData.min_trust_level = payload.min_trust_level;
  if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

  const { error } = await supabaseAdmin
    .from("system_notifications")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { error } = await supabaseAdmin
    .from("system_notifications")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id });
}
