import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { getLdUserWithCache } from "@/lib/auth/ld-user";
import { getSessionIdFromCookies } from "@/lib/auth/ld-oauth";
import { API_ERROR_CODES } from "@/lib/constants/error-codes";

const REPORT_THRESHOLD = 1;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const siteId = params.id;
    if (!siteId) {
      return NextResponse.json({ error: "Missing site id" }, { status: 400 });
    }

    // 认证
    let userId: number;
    let username: string;

    if (process.env.ENV === "dev") {
      const { getDevUserConfig } = await import("@/lib/auth/dev-user");
      const devUser = getDevUserConfig();
      userId = devUser.id;
      username = devUser.username;
    } else {
      const sessionId = getSessionIdFromCookies(request.cookies);
      if (!sessionId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const user = await getLdUserWithCache({ sessionId });
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = user.id;
      username = user.username;
    }

    // 验证站点存在
    const { data: site, error: siteError } = await supabaseAdmin
      .from("site")
      .select("id")
      .eq("id", siteId)
      .maybeSingle();

    if (siteError) {
      return NextResponse.json({ error: siteError.message }, { status: 500 });
    }
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // 解析请求体
    const body = await request.json();
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason || reason.length > 500) {
      return NextResponse.json(
        { error: "举报原因不能为空且不超过500字" },
        { status: 400 }
      );
    }

    // 插入举报记录（唯一索引防重复）
    const { error: insertError } = await supabaseAdmin
      .from("site_reports")
      .insert({
        site_id: siteId,
        reporter_id: userId,
        reporter_username: username,
        reason,
      });

    if (insertError) {
      // 唯一索引冲突 = 重复举报
      if (insertError.code === "23505") {
        return NextResponse.json(
          {
            error: "你已举报过该站点，请勿重复提交",
            code: API_ERROR_CODES.REPORT_DUPLICATE,
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 查询该站点 pending 举报总数，达到阈值则自动隐藏
    const { count, error: countError } = await supabaseAdmin
      .from("site_reports")
      .select("id", { count: "exact", head: true })
      .eq("site_id", siteId)
      .eq("status", "pending");

    if (!countError && count !== null && count >= REPORT_THRESHOLD) {
      await supabaseAdmin
        .from("site")
        .update({ is_active: false })
        .eq("id", siteId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
