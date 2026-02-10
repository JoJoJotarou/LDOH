import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("system_notifications")
    .select("id,title,content,is_active,valid_from,valid_until,min_trust_level,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notifications: data ?? [] });
}

export async function POST(request: NextRequest) {
  const payload = await request.json();

  const { title, content, valid_from, valid_until, min_trust_level, is_active } = payload;
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "标题和内容不能为空" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("system_notifications")
    .insert({
      title: title.trim(),
      content: content.trim(),
      valid_from: valid_from || new Date().toISOString(),
      valid_until: valid_until || null,
      min_trust_level: min_trust_level ?? null,
      is_active: is_active ?? true,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
