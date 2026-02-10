import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getAdminUser, isSuperAdmin } from "@/lib/admin/auth";

export async function GET(request: NextRequest) {
  const admin = await getAdminUser(request.cookies);
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .select("key,value")
      .order("key");

    if (error) {
      // 表可能不存在，返回空配置
      return NextResponse.json({ settings: {} });
    }

    const settings: Record<string, string> = {};
    for (const row of data ?? []) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ settings: {} });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdminUser(request.cookies);
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = (await request.json()) as Record<string, string>;

    for (const [key, value] of Object.entries(payload)) {
      await supabaseAdmin
        .from("system_settings")
        .upsert({ key, value }, { onConflict: "key" });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
