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
  const body = await request.json();
  const newStatus = body.status;

  if (!["reviewed", "dismissed"].includes(newStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // 获取报告记录
  const { data: report, error: fetchError } = await supabaseAdmin
    .from("site_reports")
    .select("id, site_id, status, report_type")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // 更新报告状态
  const { error: updateError } = await supabaseAdmin
    .from("site_reports")
    .update({
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.userId,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const updateField =
    report.report_type === "runaway" ? "is_runaway" : "is_fake_charity";

  // 处理通过后，保持对应标记为 true
  if (newStatus === "reviewed") {
    await supabaseAdmin
      .from("site")
      .update({ [updateField]: true, is_active: false })
      .eq("id", report.site_id);
  }

  // 驳回时检查是否还有同类型 pending 报告，若无则恢复对应标记
  if (newStatus === "dismissed") {
    const { count, error: countError } = await supabaseAdmin
      .from("site_reports")
      .select("id", { count: "exact", head: true })
      .eq("site_id", report.site_id)
      .eq("report_type", report.report_type)
      .eq("status", "pending");

    if (!countError && (count === null || count === 0)) {
      await supabaseAdmin
        .from("site")
        .update({ [updateField]: false })
        .eq("id", report.site_id);
    }
  }

  return NextResponse.json({ success: true });
}
