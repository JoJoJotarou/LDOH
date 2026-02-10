import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { is_active } = await request.json();

  if (typeof is_active !== "boolean") {
    return NextResponse.json({ error: "Invalid value" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("site")
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id, is_active });
}
